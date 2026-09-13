import base64
import json
import logging
from typing import Optional, Dict, Any
import httpx
from app.core.config import settings
from app.models.schemas import TaxonomyClass, RarityTier, DangerLevel

logger = logging.getLogger(__name__)

GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"
FALLBACK_ENDPOINTS = [
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent",
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
]

SYSTEM_PROMPT = """You are an expert wildlife biologist, zoologist, and taxonomic classification engine for WildGotcha.
Analyze the user's uploaded camera image with extreme biological accuracy.

RULES:
1. NON-WILDLIFE CHECK: If the image does NOT contain a living animal, bird, insect, reptile, fish, arachnid, or domestic breed (for example: if it is a laptop, electronic device, furniture, empty room, vehicle, or human face), you MUST set "is_wildlife": false and specify the detected object in "message".
2. WILDLIFE IDENTIFICATION: If it IS a living creature, identify its exact common name, Latin binomial scientific name, and specific breed/subspecies if applicable.
3. BIOGEOGRAPHICAL REGION: Provide the authentic native continent and country/realm of origin (e.g. "South & Southeast Asia", "Siberian Arctic • Worldwide Domestic", "Madagascar", "Australasia (Oceania)", "North America", "South & Central America (Amazon)").
4. CATEGORY: Must be one of: "Mammals", "Birds", "Reptiles", "Amphibians", "Insects", "Arachnids", "Fish", "Other Wildlife".
5. BREED: If it is a domestic breed (e.g. dog, cat, cattle, horse, poultry breed), specify the exact breed name (e.g. "Golden Retriever", "German Shepherd", "Persian Cat", "Holstein Friesian", "Leghorn Chicken"). If it is a wild animal, set "Wild Species".
6. TAXONOMY CLASS: Must be one of: "Mammalia", "Insecta", "Reptilia", "Arachnida", or "Other Wildlife" (for birds, amphibians, fish).
7. RARITY: Must be one of: "Common", "Uncommon", "Rare", "Epic", "Legendary".
8. DANGER LEVEL: Must be one of: "Harmless", "Mild", "Venomous/Dangerous", "Predatory".

You must respond ONLY with valid, parseable JSON using this exact structure:
{
  "is_wildlife": true,
  "common_name": "Species Common Name",
  "scientific_name": "Genus species",
  "taxonomy_class": "Mammalia | Insecta | Reptilia | Arachnida | Other Wildlife",
  "category": "Mammals | Birds | Reptiles | Amphibians | Insects | Arachnids | Fish | Other Wildlife",
  "breed": "Breed name or Wild Species",
  "rarity": "Common | Uncommon | Rare | Epic | Legendary",
  "habitat": "Detailed authentic biome and habitat",
  "region": "Authentic native continent / origin",
  "danger_level": "Harmless | Mild | Venomous/Dangerous | Predatory",
  "fun_fact": "A verified, fascinating biological fact about this specific species",
  "diet": "Diet classification",
  "confidence_score": 0.96,
  "message": "Species identified successfully"
}
"""


class GeminiVisionClassifier:
    """
    Multimodal Vision-Language Classifier using Google Gemini Flash.
    Provides global taxonomic coverage across millions of species, birds, insects,
    reptiles, and domestic breeds with authentic geographical regions and zero mock data.
    """

    def __init__(self):
        self._cached_key = getattr(settings, "GEMINI_API_KEY", None) or None

    def get_api_key(self) -> Optional[str]:
        """Dynamically retrieves the configured Gemini API key with runtime .env fallback."""
        key = getattr(settings, "GEMINI_API_KEY", None) or os.environ.get("GEMINI_API_KEY") or self._cached_key
        if key and len(str(key).strip()) > 10:
            return str(key).strip().strip('"').strip("'")

        # Runtime fallback: read backend/.env directly if process started before env edit
        try:
            env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), ".env")
            if os.path.exists(env_file):
                with open(env_file, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line.startswith("GEMINI_API_KEY="):
                            val = line.split("GEMINI_API_KEY=", 1)[1].strip().strip('"').strip("'")
                            if len(val) > 10:
                                self._cached_key = val
                                return val
        except Exception as e:
            logger.debug("Failed to read .env dynamically: %s", str(e))
        return None

    def is_available(self) -> bool:
        """Returns True if Gemini API Key is configured."""
        return self.get_api_key() is not None

    async def classify(self, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Submits image to Gemini Vision for classification.
        Returns parsed species dictionary, or None if API key missing/fails.
        """
        api_key = self.get_api_key()
        if not api_key:
            return None

        try:
            b64_image = base64.b64encode(image_bytes).decode("utf-8")

            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": SYSTEM_PROMPT},
                            {
                                "inline_data": {
                                    "mime_type": "image/jpeg",
                                    "data": b64_image,
                                }
                            },
                        ]
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "response_mime_type": "application/json",
                },
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                data = None
                for endpoint in FALLBACK_ENDPOINTS:
                    url = f"{endpoint}?key={api_key}"
                    try:
                        response = await client.post(url, json=payload)
                        if response.status_code == 200:
                            data = response.json()
                            break
                        else:
                            logger.warning("Gemini endpoint %s returned %d: %s", endpoint, response.status_code, response.text[:200])
                    except Exception as sub_e:
                        logger.warning("Gemini endpoint %s error: %s", endpoint, str(sub_e))

                if not data or "candidates" not in data or not data["candidates"]:
                    return None

                text = data["candidates"][0]["content"]["parts"][0]["text"]
                parsed = json.loads(text)

                # Normalize taxonomy_class enum
                t_str = str(parsed.get("taxonomy_class", "Other Wildlife"))
                if "Mammal" in t_str:
                    tax_class = TaxonomyClass.MAMMALIA
                elif "Insect" in t_str:
                    tax_class = TaxonomyClass.INSECTA
                elif "Reptil" in t_str:
                    tax_class = TaxonomyClass.REPTILIA
                elif "Arachnid" in t_str:
                    tax_class = TaxonomyClass.ARACHNIDA
                else:
                    tax_class = TaxonomyClass.OTHER

                # Normalize rarity
                r_str = str(parsed.get("rarity", "Common")).lower()
                if "legend" in r_str:
                    rarity = RarityTier.LEGENDARY
                elif "epic" in r_str:
                    rarity = RarityTier.EPIC
                elif "rare" in r_str:
                    rarity = RarityTier.RARE
                elif "uncommon" in r_str:
                    rarity = RarityTier.UNCOMMON
                else:
                    rarity = RarityTier.COMMON

                # Normalize danger level
                d_str = str(parsed.get("danger_level", "Harmless")).lower()
                if "venom" in d_str or "danger" in d_str:
                    danger = DangerLevel.VENOMOUS_DANGEROUS
                elif "predator" in d_str:
                    danger = DangerLevel.PREDATORY
                elif "mild" in d_str:
                    danger = DangerLevel.MILD
                else:
                    danger = DangerLevel.HARMLESS

                is_wild = bool(parsed.get("is_wildlife", True))

                # Normalize category
                raw_cat = str(parsed.get("category", "")).title()
                if not raw_cat or raw_cat not in ["Mammals", "Birds", "Reptiles", "Amphibians", "Insects", "Arachnids", "Fish", "Mollusks", "Crustaceans"]:
                    if tax_class == TaxonomyClass.MAMMALIA:
                        raw_cat = "Mammals"
                    elif tax_class == TaxonomyClass.INSECTA:
                        raw_cat = "Insects"
                    elif tax_class == TaxonomyClass.REPTILIA:
                        raw_cat = "Reptiles"
                    elif tax_class == TaxonomyClass.ARACHNIDA:
                        raw_cat = "Arachnids"
                    else:
                        raw_cat = "Birds" if any(w in parsed.get("common_name", "").lower() for w in ["bird", "hen", "owl", "eagle", "falcon", "duck", "goose", "parrot"]) else "Other Wildlife"

                breed_val = parsed.get("breed") or ("Purebred Breed" if any(w in parsed.get("common_name", "").lower() for w in ["retriever", "shepherd", "husky", "terrier", "spaniel", "cat", "cattle", "horse"]) else "Wild Species")

                return {
                    "is_wildlife": is_wild,
                    "success": is_wild,
                    "message": parsed.get("message", f"Successfully identified {parsed.get('common_name')}!"),
                    "common_name": parsed.get("common_name", "Unknown Species"),
                    "scientific_name": parsed.get("scientific_name", "Species sp."),
                    "taxonomy_class": tax_class,
                    "category": raw_cat,
                    "breed": breed_val,
                    "confidence_score": float(parsed.get("confidence_score", 0.95)),
                    "rarity": rarity,
                    "habitat": parsed.get("habitat", "Natural Habitat"),
                    "region": parsed.get("region", "Global Distribution"),
                    "fun_fact": parsed.get("fun_fact", "Fascinating creature of nature."),
                    "danger_level": danger,
                    "top_candidates": [],
                }

        except Exception as e:
            logger.error("Gemini Vision classification failed: %s", str(e))
            return None


gemini_vision_classifier = GeminiVisionClassifier()
