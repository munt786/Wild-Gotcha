import { CatchRecord, Specimen, RarityLevel } from '../types';

export interface RankDefinition {
  rankNumber: number; // 1 to 10
  minLevel: number;
  maxLevel: number;
  title: string;
  badgeEmoji: string;
  badgeColor: string;
}

export const RANKS: RankDefinition[] = [
  { rankNumber: 1, minLevel: 1, maxLevel: 10, title: 'Novice Scout', badgeEmoji: '🥉', badgeColor: '#CD7F32' },
  { rankNumber: 2, minLevel: 11, maxLevel: 20, title: 'Field Explorer', badgeEmoji: '🥈', badgeColor: '#9CA3AF' },
  { rankNumber: 3, minLevel: 21, maxLevel: 30, title: 'Wild Tracker', badgeEmoji: '🥇', badgeColor: '#F59E0B' },
  { rankNumber: 4, minLevel: 31, maxLevel: 40, title: 'Habitat Specialist', badgeEmoji: '🧭', badgeColor: '#10B981' },
  { rankNumber: 5, minLevel: 41, maxLevel: 50, title: 'Bio-Researcher', badgeEmoji: '🌿', badgeColor: '#059669' },
  { rankNumber: 6, minLevel: 51, maxLevel: 60, title: 'Elite Ranger', badgeEmoji: '🔬', badgeColor: '#3B82F6' },
  { rankNumber: 7, minLevel: 61, maxLevel: 70, title: 'Apex Naturalist', badgeEmoji: '🦅', badgeColor: '#6366F1' },
  { rankNumber: 8, minLevel: 71, maxLevel: 80, title: 'Wildlife Master', badgeEmoji: '🐆', badgeColor: '#8B5CF6' },
  { rankNumber: 9, minLevel: 81, maxLevel: 90, title: 'Mythic Warden', badgeEmoji: '🌟', badgeColor: '#EC4899' },
  { rankNumber: 10, minLevel: 91, maxLevel: 100, title: 'Grand Overseer', badgeEmoji: '👑', badgeColor: '#F59E0B' },
];

/**
 * Array of EXP needed to advance from level index (0-indexed: index 0 is Lv 1->2).
 * Cumulative total for Level 100 is exactly 1,000,000 EXP.
 */
export const LEVEL_EXP_REQUIREMENTS: number[] = [
  100, 100, 110, 130, 150, 180, 210, 250, 300, 350,
  410, 480, 550, 630, 710, 800, 900, 1000, 1110, 1220,
  1340, 1470, 1600, 1740, 1890, 2040, 2200, 2370, 2540, 2710,
  2900, 3090, 3280, 3480, 3690, 3910, 4130, 4360, 4590, 4830,
  5070, 5320, 5580, 5850, 6120, 6390, 6680, 6970, 7260, 7560,
  7870, 8180, 8500, 8830, 9160, 9500, 9850, 10200, 10560, 10920,
  11290, 11670, 12050, 12440, 12830, 13230, 13640, 14050, 14470, 14900,
  15330, 15770, 16210, 16660, 17120, 17580, 18050, 18530, 19010, 19500,
  19990, 20490, 21000, 21510, 22030, 22560, 23090, 23630, 24170, 24720,
  25280, 25840, 26410, 26980, 27560, 28150, 28740, 29340, 29960,
];

export const EXP_TABLE = {
  COMMON: 50,
  UNCOMMON: 100,
  RARE: 250,
  EPIC: 500,
  LEGENDARY: 1000,
  SECRET: 2000,
  UNIQUE_DISCOVERY_BONUS: 100,
} as const;

export interface LevelInfo {
  level: number; // 1 to 100
  totalExp: number;
  currentLevelExp: number;
  expToNextLevel: number;
  progressPercent: number; // 0 to 100
  isMaxLevel: boolean;
  rankNumber: number; // 1 to 10
  rankTitle: string;
  rankTierRange: string;
  rankBadgeEmoji: string;
  rankBadgeColor: string;
}

export class ProgressionService {
  /**
   * EXP required to go from `level` to `level + 1`.
   * Sum of all requirements from Lv 1 to 99 equals exactly 1,000,000 EXP (Lv 100 cap).
   */
  static expRequiredForLevel(level: number): number {
    if (level < 1) return LEVEL_EXP_REQUIREMENTS[0];
    if (level >= 100) return 0;
    return LEVEL_EXP_REQUIREMENTS[level - 1] ?? LEVEL_EXP_REQUIREMENTS[LEVEL_EXP_REQUIREMENTS.length - 1];
  }

  /**
   * Calculates reward for a single catch.
   * - Brand-new species: Base Rarity EXP + Unique Dex Discovery Bonus (+100 EXP).
   * - New breed of existing species: Base Rarity EXP.
   * - Repeated catch of identical species & breed: 0 EXP.
   */
  static calculateCatchReward(
    rarity: RarityLevel,
    isNewSpecies: boolean,
    isNewBreed: boolean
  ): { baseExp: number; uniqueBonus: number; totalExpEarned: number; isRepeat: boolean } {
    if (!isNewSpecies && !isNewBreed) {
      // Repeat capture of identical species & breed gives 0 EXP
      return {
        baseExp: 0,
        uniqueBonus: 0,
        totalExpEarned: 0,
        isRepeat: true,
      };
    }

    const cleanRarity = (rarity || 'COMMON').toUpperCase() as RarityLevel;
    const baseExp = EXP_TABLE[cleanRarity] || EXP_TABLE.COMMON;
    const uniqueBonus = isNewSpecies ? EXP_TABLE.UNIQUE_DISCOVERY_BONUS : 0;
    return {
      baseExp,
      uniqueBonus,
      totalExpEarned: baseExp + uniqueBonus,
      isRepeat: false,
    };
  }

  /**
   * Reconstructs deterministic Total EXP from player's collection.
   * Only the first catch of each distinct (species + breed) awards EXP.
   * Repeated catches of the identical breed award 0 EXP.
   */
  static calculateTotalExp(catches: CatchRecord[], specimens?: Specimen[]): number {
    let total = 0;
    const seenSpeciesBreeds = new Set<string>();

    for (const c of catches) {
      const key = `${(c.common_name || '').trim().toLowerCase()}___${(c.breed || '').trim().toLowerCase()}`;
      if (!seenSpeciesBreeds.has(key)) {
        seenSpeciesBreeds.add(key);
        const cleanRarity = (c.rarity || 'COMMON').toUpperCase() as RarityLevel;
        total += EXP_TABLE[cleanRarity] || EXP_TABLE.COMMON;
      }
      // Identical repeat captures give 0 EXP
    }

    // Add bonus for every unique species registered in Dex
    if (specimens && specimens.length > 0) {
      total += specimens.length * EXP_TABLE.UNIQUE_DISCOVERY_BONUS;
    }
    return total;
  }

  /**
   * Computes player's current Level (1 to 100), Rank (1 to 10), and EXP progress bar.
   */
  static getLevelInfo(totalExp: number): LevelInfo {
    let remaining = Math.max(0, totalExp);
    let level = 1;

    while (level < 100) {
      const needed = this.expRequiredForLevel(level);
      if (remaining >= needed) {
        remaining -= needed;
        level += 1;
      } else {
        break;
      }
    }

    const isMaxLevel = level >= 100;
    const expToNext = isMaxLevel ? 0 : this.expRequiredForLevel(level);
    const progressPercent = isMaxLevel
      ? 100
      : Math.min(100, Math.max(0, Math.floor((remaining / expToNext) * 100)));

    const rankNumber = Math.min(10, Math.max(1, Math.ceil(level / 10)));
    const rankDef = RANKS[rankNumber - 1] || RANKS[0];

    return {
      level,
      totalExp,
      currentLevelExp: remaining,
      expToNextLevel: expToNext,
      progressPercent,
      isMaxLevel,
      rankNumber,
      rankTitle: rankDef.title,
      rankTierRange: `Lv. ${rankDef.minLevel} - ${rankDef.maxLevel}`,
      rankBadgeEmoji: rankDef.badgeEmoji,
      rankBadgeColor: rankDef.badgeColor,
    };
  }

  /**
   * Helper to get full LevelInfo directly from collections
   */
  static getProgression(catches: CatchRecord[], specimens: Specimen[]): LevelInfo {
    const totalExp = this.calculateTotalExp(catches, specimens);
    return this.getLevelInfo(totalExp);
  }
}
