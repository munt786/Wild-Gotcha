import { Specimen, CatchRecord, TaxonomicCategory } from '../types';

export const ALL_CATEGORIES: TaxonomicCategory[] = [
  'All',
  'Mammals',
  'Birds',
  'Reptiles',
  'Amphibians',
  'Fish',
  'Insects',
  'Arachnids',
  'Mollusks',
  'Crustaceans',
  'Invertebrates',
];

// Empty collection arrays - all specimens are now discovered and logged live via the scanner
export const INITIAL_SPECIMENS: Specimen[] = [];
export const INITIAL_CATCHES: CatchRecord[] = [];
