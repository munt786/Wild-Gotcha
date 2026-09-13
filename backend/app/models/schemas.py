from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field


class TaxonomyClass(str, Enum):
    MAMMALIA = "Mammalia"
    INSECTA = "Insecta"
    REPTILIA = "Reptilia"
    ARACHNIDA = "Arachnida"
    OTHER = "Other Wildlife"


class RarityTier(str, Enum):
    COMMON = "Common"
    UNCOMMON = "Uncommon"
    RARE = "Rare"
    EPIC = "Epic"
    LEGENDARY = "Legendary"


class DangerLevel(str, Enum):
    HARMLESS = "Harmless"
    MILD = "Mild"
    VENOMOUS_DANGEROUS = "Venomous/Dangerous"
    PREDATORY = "Predatory"


class SpeciesRecord(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    common_name: str
    scientific_name: str
    taxonomy_class: TaxonomyClass
    category: Optional[str] = "Mammals"
    breed: Optional[str] = "Wild Species"
    habitat: str = "Various ecosystems"
    region: str = "Global Distribution"
    rarity: RarityTier = RarityTier.COMMON
    danger_level: DangerLevel = DangerLevel.HARMLESS
    fun_fact: str = "Fascinating creature of nature."
    diet: Optional[str] = "Omnivore"
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class UserScan(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    scan_id: str
    user_id: Optional[str] = "anonymous_trainer"
    species_common_name: str
    species_scientific_name: str
    taxonomy_class: TaxonomyClass
    category: Optional[str] = "Mammals"
    breed: Optional[str] = "Wild Species"
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    rarity: RarityTier = RarityTier.COMMON
    fun_fact: str = ""
    habitat: str = ""
    region: str = "Global Distribution"
    danger_level: DangerLevel = DangerLevel.HARMLESS
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    image_preview_base64: Optional[str] = None
    scanned_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class PredictionCandidate(BaseModel):
    common_name: str
    scientific_name: str
    taxonomy_class: TaxonomyClass
    confidence: float


class IdentifyResponse(BaseModel):
    success: bool = True
    is_wildlife: bool = True
    scan_id: Optional[str] = None
    common_name: str = ""
    scientific_name: str = ""
    taxonomy_class: TaxonomyClass = TaxonomyClass.OTHER
    category: Optional[str] = "Mammals"
    breed: Optional[str] = "Wild Species"
    confidence_score: float = 0.0
    rarity: RarityTier = RarityTier.COMMON
    habitat: str = ""
    region: str = "Global Distribution"
    fun_fact: str = ""
    danger_level: DangerLevel = DangerLevel.HARMLESS
    top_candidates: List[PredictionCandidate] = []
    scanned_at: datetime = Field(default_factory=datetime.utcnow)
    persisted: bool = False
    message: Optional[str] = "Species identified successfully!"


class ScanHistoryResponse(BaseModel):
    total: int
    scans: List[UserScan]


class StatsResponse(BaseModel):
    total_scans: int
    unique_species: int
    class_breakdown: dict
