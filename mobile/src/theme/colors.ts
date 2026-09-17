// Gotcha! Lens Minimalist Light High-Contrast Theme
import { TaxonomyClass, RarityTier } from '../types';

export const COLORS = {
  // Backgrounds
  background: '#FCFCFC',
  surface: '#FFFFFF',
  surfaceSubtle: '#F6F6F6',
  surfaceLight: '#F3F4F6',
  surfaceBorder: '#EAEAEA',
  surfaceBorderHover: '#D4D4D4',

  // Primary Monochromatic Base
  textPrimary: '#111111',
  textSecondary: '#666666',
  textMuted: '#888888',
  textLight: '#B0B0B0',

  // Brand Accents
  primary: '#111111',
  primaryInverse: '#FFFFFF',
  accent: '#10B981',
  accentGreen: '#10B981',
  accentGold: '#F59E0B',
  accentRed: '#EF4444',
  accentBlue: '#3B82F6',
  accentPurple: '#8B5CF6',

  // Viewfinder & Glassmorphism
  glassBackground: 'rgba(255, 255, 255, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.4)',
  glassDarkBackground: 'rgba(0, 0, 0, 0.55)',
  glassDarkBorder: 'rgba(255, 255, 255, 0.25)',

  // Laser Scanner
  laserLine: '#10B981',
  laserGlow: 'rgba(16, 185, 129, 0.35)',

  // Rarity Tiers: Common, Uncommon, Rare, Epic, Legendary, Secret
  rarityCommon: '#888888',
  rarityUncommon: '#3B82F6',
  rarityRare: '#8B5CF6',
  rarityEpic: '#D946EF',
  rarityLegendary: '#F59E0B',
  raritySecret: '#EC4899',

  // Danger Pip Meter (1 to 5: Green to Red)
  dangerPip1: '#10B981', // Green
  dangerPip2: '#84CC16', // Lime
  dangerPip3: '#EAB308', // Yellow
  dangerPip4: '#F97316', // Orange
  dangerPip5: '#EF4444', // Red
  dangerPipEmpty: '#E5E7EB',
};

import { Platform } from 'react-native';

export const SHADOWS = {
  soft: Platform.select({
    web: {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 8,
      elevation: 2,
    },
  }) as any,
  polaroid: Platform.select({
    web: {
      boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.09)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.09,
      shadowRadius: 10,
      elevation: 3,
    },
  }) as any,
  heavy: Platform.select({
    web: {
      boxShadow: '0px 8px 16px rgba(0, 0, 0, 0.22)',
    },
    default: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 16,
      elevation: 8,
    },
  }) as any,
};

export const getTaxonomyColor = (taxClass?: string | TaxonomyClass): string => {
  switch (taxClass) {
    case 'Mammalia':
    case 'Mammals':
      return COLORS.accentGold;
    case 'Insecta':
    case 'Insects':
      return COLORS.accentGreen;
    case 'Reptilia':
    case 'Reptiles':
      return '#84CC16';
    case 'Arachnida':
    case 'Arachnids':
      return COLORS.accentPurple;
    default:
      return COLORS.accentBlue;
  }
};

export const getTaxonomyIcon = (taxClass?: string | TaxonomyClass): string => {
  switch (taxClass) {
    case 'Mammalia':
    case 'Mammals':
      return '🦁';
    case 'Insecta':
    case 'Insects':
      return '🦋';
    case 'Reptilia':
    case 'Reptiles':
      return '🦎';
    case 'Arachnida':
    case 'Arachnids':
      return '🕷️';
    default:
      return '🐾';
  }
};

export const getRarityColor = (rarity?: string | RarityTier): string => {
  const clean = String(rarity || '').toUpperCase();
  if (clean === 'LEGENDARY') return COLORS.rarityLegendary;
  if (clean === 'EPIC') return COLORS.rarityEpic;
  if (clean === 'RARE') return COLORS.rarityRare;
  if (clean === 'UNCOMMON') return COLORS.rarityUncommon;
  return COLORS.rarityCommon;
};
