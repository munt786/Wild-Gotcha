import uuid
import logging
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status, Depends, Request
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db, db_manager
from app.models.schemas import (
    IdentifyResponse,
    ScanHistoryResponse,
    StatsResponse,
    UserScan,
    SpeciesRecord,
    TaxonomyClass,
    RarityTier,
    DangerLevel,
)
from app.services.image_processor import image_processor
from app.services.classifier import species_classifier

logger = logging.getLogger(__name__)

router = APIRouter()

# In-memory fallback scan history if MongoDB is not connected
IN_MEMORY_SCANS: List[dict] = []


@router.post(
    "/identify",
    response_model=IdentifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Identify species from captured photo",
    description="Accepts multipart/form-data image, validates via OpenCV, runs MobileNetV2 classification, and records discovery in MongoDB.",
)
async def identify_species(
    request: Request,
    file: Optional[UploadFile] = File(None, description="Captured image file (JPEG, PNG, WEBP)"),
    image_base64: Optional[str] = Form(None, description="Optional base64 or data URI image string"),
    user_id: Optional[str] = Form("trainer_default", description="User / Device identifier"),
    latitude: Optional[float] = Form(None, description="Optional GPS latitude"),
    longitude: Optional[float] = Form(None, description="Optional GPS longitude"),
    db: Optional[AsyncIOMotorDatabase] = Depends(get_db),
):
    image_bytes = b""
    content_type = request.headers.get("content-type", "")

    # 1. Parse JSON body if Content-Type is application/json
    if "application/json" in content_type:
        try:
            body = await request.json()
            raw_b64 = body.get("image_base64") or body.get("image") or ""
            user_id = body.get("user_id", user_id or "trainer_default")
            latitude = body.get("latitude", latitude)
            longitude = body.get("longitude", longitude)
            if raw_b64:
                if "," in raw_b64:
                    raw_b64 = raw_b64.split(",", 1)[1]
                import base64
                image_bytes = base64.b64decode(raw_b64)
        except Exception as e:
            logger.warning("Failed to parse JSON image payload: %s", str(e))

    # 2. Read bytes from UploadFile if present
    if not image_bytes and file is not None:
        try:
            image_bytes = await file.read()
        except Exception as e:
            logger.warning("Failed to read file payload: %s", str(e))

    # 3. Fallback to image_base64 form field if file is empty
    if not image_bytes and image_base64:
        try:
            raw_b64 = image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]
            import base64
            image_bytes = base64.b64decode(raw_b64)
        except Exception as e:
            logger.error("Failed to decode base64 image: %s", str(e))
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid base64 image data: {str(e)}",
            )

    if not image_bytes or len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No image data provided. Send a multipart file or base64 image payload.",
        )

    # 3. OpenCV Validation and Preprocessing
    # Resizes to 224x224, converts BGR to RGB, normalizes to [-1, 1], generates thumbnail
    tensor, thumbnail_b64 = image_processor.validate_and_preprocess(image_bytes)

    # 4. MobileNetV2 Wildlife Inference
    classification = species_classifier.classify(tensor)

    if not classification.get("is_wildlife", True):
        return IdentifyResponse(
            success=False,
            is_wildlife=False,
            message=classification.get("message", "No wildlife detected. Center a wild animal, insect, bird, or reptile in the viewfinder."),
            common_name="No Wildlife",
            scientific_name="None",
            taxonomy_class=TaxonomyClass.OTHER,
            confidence_score=0.0,
            rarity=RarityTier.COMMON,
            habitat="Non-natural environment",
            fun_fact="",
            danger_level=DangerLevel.HARMLESS,
            scanned_at=datetime.utcnow(),
            persisted=False,
        )

    # 5. Build UserScan Record
    scan_id = str(uuid.uuid4())
    scanned_at = datetime.utcnow()
    persisted = False

    scan_doc = {
        "scan_id": scan_id,
        "user_id": user_id,
        "species_common_name": classification["common_name"],
        "species_scientific_name": classification["scientific_name"],
        "taxonomy_class": classification["taxonomy_class"],
        "confidence_score": classification["confidence_score"],
        "rarity": classification["rarity"],
        "fun_fact": classification["fun_fact"],
        "habitat": classification["habitat"],
        "danger_level": classification["danger_level"],
        "latitude": latitude,
        "longitude": longitude,
        "image_preview_base64": thumbnail_b64,
        "scanned_at": scanned_at,
    }

    # 6. Persist to MongoDB (with async fallback)
    if db is not None:
        try:
            # Insert scan
            await db.user_scans.insert_one(scan_doc.copy())

            # Upsert species registry
            species_doc = {
                "common_name": classification["common_name"],
                "scientific_name": classification["scientific_name"],
                "taxonomy_class": classification["taxonomy_class"],
                "habitat": classification["habitat"],
                "rarity": classification["rarity"],
                "danger_level": classification["danger_level"],
                "fun_fact": classification["fun_fact"],
                "last_seen_at": scanned_at,
            }
            await db.species_records.update_one(
                {"scientific_name": classification["scientific_name"]},
                {"$set": species_doc, "$inc": {"total_sightings": 1}},
                upsert=True,
            )
            persisted = True
            logger.info("Successfully recorded scan %s to MongoDB.", scan_id)
        except Exception as e:
            logger.warning("MongoDB write failed: %s. Using fallback cache.", str(e))
            IN_MEMORY_SCANS.insert(0, scan_doc)
    else:
        # Save in memory cache for offline testing
        IN_MEMORY_SCANS.insert(0, scan_doc)
        if len(IN_MEMORY_SCANS) > 50:
            IN_MEMORY_SCANS.pop()

    return IdentifyResponse(
        success=True,
        scan_id=scan_id,
        common_name=classification["common_name"],
        scientific_name=classification["scientific_name"],
        taxonomy_class=classification["taxonomy_class"],
        confidence_score=classification["confidence_score"],
        rarity=classification["rarity"],
        habitat=classification["habitat"],
        fun_fact=classification["fun_fact"],
        danger_level=classification["danger_level"],
        top_candidates=classification.get("top_candidates", []),
        scanned_at=scanned_at,
        persisted=persisted,
        message=f"Gotcha! {classification['common_name']} registered to your Dex!",
    )


@router.get(
    "/scans",
    response_model=ScanHistoryResponse,
    summary="Get recent scan history",
    description="Retrieves species identified and logged in the user's Gotcha Dex collection.",
)
async def get_scans(
    limit: int = 20,
    user_id: Optional[str] = None,
    db: Optional[AsyncIOMotorDatabase] = Depends(get_db),
):
    scans_list = []

    if db is not None:
        try:
            query = {"user_id": user_id} if user_id else {}
            cursor = db.user_scans.find(query).sort("scanned_at", -1).limit(limit)
            async for doc in cursor:
                doc["_id"] = str(doc.get("_id", ""))
                scans_list.append(UserScan(**doc))
            return ScanHistoryResponse(total=len(scans_list), scans=scans_list)
        except Exception as e:
            logger.warning("Failed querying MongoDB scans: %s. Returning in-memory records.", str(e))

    # Return in-memory fallback
    filtered = [s for s in IN_MEMORY_SCANS if not user_id or s.get("user_id") == user_id]
    for doc in filtered[:limit]:
        item = doc.copy()
        item["_id"] = item.get("scan_id")
        scans_list.append(UserScan(**item))

    return ScanHistoryResponse(total=len(scans_list), scans=scans_list)


@router.get(
    "/stats",
    response_model=StatsResponse,
    summary="Get Dex collection statistics",
    description="Returns aggregate counts across Mammalia, Insecta, Reptilia, and Arachnida.",
)
async def get_stats(
    db: Optional[AsyncIOMotorDatabase] = Depends(get_db),
):
    class_counts = {
        TaxonomyClass.MAMMALIA.value: 0,
        TaxonomyClass.INSECTA.value: 0,
        TaxonomyClass.REPTILIA.value: 0,
        TaxonomyClass.ARACHNIDA.value: 0,
    }
    total_scans = 0
    unique_species = 0

    if db is not None:
        try:
            total_scans = await db.user_scans.count_documents({})
            unique_species = await db.species_records.count_documents({})

            # Aggregate by taxonomy class
            pipeline = [
                {"$group": {"_id": "$taxonomy_class", "count": {"$sum": 1}}}
            ]
            cursor = db.user_scans.aggregate(pipeline)
            async for row in cursor:
                cat = row["_id"]
                if cat in class_counts:
                    class_counts[cat] = row["count"]

            return StatsResponse(
                total_scans=total_scans,
                unique_species=unique_species,
                class_breakdown=class_counts,
            )
        except Exception as e:
            logger.warning("Failed aggregating MongoDB stats: %s", str(e))

    # Calculate from in-memory fallback
    total_scans = len(IN_MEMORY_SCANS)
    seen_species = set()
    for s in IN_MEMORY_SCANS:
        cls_name = s.get("taxonomy_class")
        if hasattr(cls_name, "value"):
            cls_name = cls_name.value
        if cls_name in class_counts:
            class_counts[cls_name] += 1
        seen_species.add(s.get("species_scientific_name"))

    return StatsResponse(
        total_scans=total_scans,
        unique_species=len(seen_species),
        class_breakdown=class_counts,
    )
