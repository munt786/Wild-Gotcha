export type TaxonomicCategory =
  | 'All'
  | 'Mammals'
  | 'Birds'
  | 'Reptiles'
  | 'Amphibians'
  | 'Fish'
  | 'Insects'
  | 'Arachnids'
  | 'Mollusks'
  | 'Crustaceans'
  | 'Invertebrates';

export type TaxonomyClass =
  | 'Mammalia'
  | 'Insecta'
  | 'Reptilia'
  | 'Arachnida'
  | 'Other Wildlife';

export type RarityLevel = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type RarityTier = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary';
export type DangerLevel = 'Harmless' | 'Mild' | 'Venomous/Dangerous' | 'Predatory';

export type ActiveTab = 'INDEX' | 'SCANNER' | 'CATCHES';

export interface Specimen {
  id: string;
  catalog_id: string; // e.g. #104
  common_name: string;
  scientific_name: string;
  category: TaxonomicCategory;
  breed?: string;
  rarity: RarityLevel;
  image_url: string;
  sticker_url?: string;
  box_2d?: [number, number, number, number];
  lore: string;
  biome: string;
  region: string;
  date_spotted: string;
  danger_level: number; // 1 to 5 pips
  captured_count: number;
  first_caught_at?: string;
}

export interface CatchRecord {
  catch_id: string;
  specimen_id: string;
  catalog_id: string;
  common_name: string;
  scientific_name: string;
  category: TaxonomicCategory;
  breed?: string;
  rarity: RarityLevel;
  image_url: string;
  sticker_url?: string;
  box_2d?: [number, number, number, number];
  biome: string;
  region: string;
  danger_level: number;
  caught_at: string;
  lore: string;
}

export interface UserScan {
  scan_id: string;
  species_common_name: string;
  species_scientific_name: string;
  taxonomy_class: TaxonomyClass;
  confidence_score: number;
  rarity: RarityTier;
  fun_fact: string;
  habitat: string;
  danger_level: DangerLevel;
  latitude?: number;
  longitude?: number;
  image_preview_base64?: string;
  sticker_url?: string;
  box_2d?: [number, number, number, number];
  scanned_at: string;
}

export interface PredictionCandidate {
  common_name: string;
  scientific_name: string;
  taxonomy_class: string;
  confidence: number;
}

export interface IdentifyResponse {
  success: boolean;
  is_wildlife?: boolean;
  scan_id?: string;
  common_name: string;
  scientific_name: string;
  taxonomy_class: string;
  category?: string;
  breed?: string;
  confidence_score: number;
  rarity: string;
  habitat: string;
  region?: string;
  fun_fact: string;
  danger_level: string;
  box_2d?: [number, number, number, number];
  sticker_uri?: string;
  top_candidates: PredictionCandidate[];
  scanned_at: string;
  persisted: boolean;
  message?: string;
}

export interface ScanHistoryResponse {
  total: number;
  scans: UserScan[];
}

export interface StatsResponse {
  total_scans: number;
  unique_species: number;
  class_breakdown: Record<string, number>;
}

export interface PendingScan {
  id: string;
  image_uri: string;
  captured_at: string;
  latitude?: number;
  longitude?: number;
}
