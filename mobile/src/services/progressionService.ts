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
  { rankNumber: 1, minLevel: 1, maxLevel: 10, title: 'Novice Naturalist', badgeEmoji: '🥉', badgeColor: '#CD7F32' },
  { rankNumber: 2, minLevel: 11, maxLevel: 20, title: 'Field Scout', badgeEmoji: '🥈', badgeColor: '#9CA3AF' },
  { rankNumber: 3, minLevel: 21, maxLevel: 30, title: 'Wilderness Ranger', badgeEmoji: '🥇', badgeColor: '#F59E0B' },
  { rankNumber: 4, minLevel: 31, maxLevel: 40, title: 'Wildlife Explorer', badgeEmoji: '🧭', badgeColor: '#10B981' },
  { rankNumber: 5, minLevel: 41, maxLevel: 50, title: 'Veteran Tracker', badgeEmoji: '🌿', badgeColor: '#059669' },
  { rankNumber: 6, minLevel: 51, maxLevel: 60, title: 'Expert Zoologist', badgeEmoji: '🔬', badgeColor: '#3B82F6' },
  { rankNumber: 7, minLevel: 61, maxLevel: 70, title: 'Master Biologist', badgeEmoji: '🦅', badgeColor: '#6366F1' },
  { rankNumber: 8, minLevel: 71, maxLevel: 80, title: 'Apex Ecologist', badgeEmoji: '🐆', badgeColor: '#8B5CF6' },
  { rankNumber: 9, minLevel: 81, maxLevel: 90, title: 'Mythic Scholar', badgeEmoji: '🌟', badgeColor: '#EC4899' },
  { rankNumber: 10, minLevel: 91, maxLevel: 100, title: 'Grandmaster Dex Sovereign', badgeEmoji: '👑', badgeColor: '#F59E0B' },
];

export const EXP_TABLE = {
  COMMON: 50,
  UNCOMMON: 100,
  RARE: 250,
  EPIC: 500,
  LEGENDARY: 1000,
  UNIQUE_DISCOVERY_BONUS: 300,
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
   * Scales progressively from 100 EXP (Lv 1) up to 6,040 EXP (Lv 99).
   */
  static expRequiredForLevel(level: number): number {
    return 100 + (level - 1) * 60;
  }

  /**
   * Calculates reward for a single catch based on authentic rarity
   * and whether this creature is a brand-new unique Dex discovery.
   */
  static calculateCatchReward(
    rarity: RarityLevel,
    isNewUnique: boolean
  ): { baseExp: number; uniqueBonus: number; totalExpEarned: number } {
    const cleanRarity = (rarity || 'COMMON').toUpperCase() as RarityLevel;
    const baseExp = EXP_TABLE[cleanRarity] || EXP_TABLE.COMMON;
    const uniqueBonus = isNewUnique ? EXP_TABLE.UNIQUE_DISCOVERY_BONUS : 0;
    return {
      baseExp,
      uniqueBonus,
      totalExpEarned: baseExp + uniqueBonus,
    };
  }

  /**
   * Reconstructs deterministic Total EXP from player's entire collection
   * (all catches + unique species discovery bonuses).
   */
  static calculateTotalExp(catches: CatchRecord[], specimens: Specimen[]): number {
    let total = 0;
    for (const c of catches) {
      const cleanRarity = (c.rarity || 'COMMON').toUpperCase() as RarityLevel;
      total += EXP_TABLE[cleanRarity] || EXP_TABLE.COMMON;
    }
    // Add bonus for every unique species registered in Dex
    total += specimens.length * EXP_TABLE.UNIQUE_DISCOVERY_BONUS;
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
