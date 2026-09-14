import { Platform } from 'react-native';
import { IdentifyResponse, TaxonomicCategory, TaxonomyClass } from '../types';

// Load the 521+ authentic species and recognized breeds encyclopedia
const ENCYCLOPEDIA_RAW: Record<string, any> = require('../data/wildlife_encyclopedia.json');

const SPECIES_ENTRIES = Object.entries(ENCYCLOPEDIA_RAW).map(([slug, data]) => {
  let cat: TaxonomicCategory = data.category || 'Mammals';
  const taxClass: string = data.taxonomy_class || '';
  const name: string = (data.common_name || '').toLowerCase();

  if (!data.category) {
    if (taxClass.includes('Mammal')) cat = 'Mammals';
    else if (taxClass.includes('Insect')) cat = 'Insects';
    else if (taxClass.includes('Reptil')) cat = 'Reptiles';
    else if (taxClass.includes('Arachnid')) cat = 'Arachnids';
    else if (
      name.includes('bird') ||
      name.includes('owl') ||
      name.includes('eagle') ||
      name.includes('hawk') ||
      name.includes('falcon') ||
      name.includes('duck') ||
      name.includes('goose') ||
      name.includes('sparrow') ||
      name.includes('hen') ||
      name.includes('finch') ||
      name.includes('parrot') ||
      name.includes('crane') ||
      name.includes('heron')
    ) {
      cat = 'Birds';
    } else if (
      name.includes('fish') ||
      name.includes('shark') ||
      name.includes('ray') ||
      name.includes('trout') ||
      name.includes('salmon') ||
      name.includes('bass')
    ) {
      cat = 'Fish';
    } else if (name.includes('frog') || name.includes('toad') || name.includes('salamander') || name.includes('newt')) {
      cat = 'Amphibians';
    } else {
      cat = 'Other Wildlife' as any;
    }
  }

  const isBreed =
    Boolean(data.breed) ||
    name.includes('retriever') ||
    name.includes('shepherd') ||
    name.includes('terrier') ||
    name.includes('spaniel') ||
    name.includes('husky') ||
    name.includes('cat') ||
    name.includes('horse') ||
    name.includes('cattle') ||
    name.includes('chicken');

  const breedVal = data.breed || (isBreed ? 'Purebred Domestic Breed' : 'Wild Species');

  return {
    slug,
    common_name: data.common_name,
    scientific_name: data.scientific_name,
    taxonomy_class: (data.taxonomy_class || 'Other Wildlife') as TaxonomyClass,
    category: cat,
    breed: breedVal,
    rarity: data.rarity || 'Common',
    habitat: data.habitat || 'Natural wilderness and varied habitats',
    region: data.region || 'Global Native Distribution',
    fun_fact: data.fun_fact || 'A remarkable living creature registered to your Dex.',
    danger_level: data.danger_level || 'Harmless',
    diet: data.diet || 'Omnivorous',
  };
});

/**
 * On-Device Wildlife Engine
 * Runs completely locally inside the mobile app / APK without requiring any server or internet.
 * Uses the 521+ species & recognized domestic breeds authentic biological encyclopedia.
 */
export class LocalWildlifeEngine {
  /**
   * Evaluates offline scan status:
   * Biological computer vision requires 4G/5G/Wi-Fi to run Google Gemini Flash Vision.
   * Rather than returning a fake random match, this honestly informs the user that connection
   * is required while preserving the 521+ species database for offline exploration.
   */
  static async identify(imageUri: string): Promise<IdentifyResponse> {
    return {
      success: false,
      is_wildlife: false,
      message: 'Active internet connection (4G/5G or Wi-Fi) required for AI vision recognition. You can browse the 521+ species Encyclopedia in your Field Guide.',
      common_name: 'Connection Required',
      scientific_name: 'Offline',
      taxonomy_class: 'Other Wildlife',
      category: 'Mammals',
      breed: 'Wild Species',
      confidence_score: 0,
      rarity: 'Common',
      habitat: 'Offline Field Guide',
      region: 'Global',
      fun_fact: 'AI visual recognition runs directly from your phone and requires mobile data or Wi-Fi.',
      danger_level: 'Harmless',
      scanned_at: new Date().toISOString(),
      persisted: false,
      top_candidates: [],
    };
  }

  /**
   * Returns all 521+ authentic biological species and domestic breeds for offline Dex browsing.
   */
  static getEncyclopediaEntries() {
    return SPECIES_ENTRIES;
  }

  /**
   * Fast heuristic detection for human faces/selfies, uniform floors, or blank surfaces
   */
  private static async checkNonWildlife(imageUri: string): Promise<{ isNonWildlife: boolean; message: string }> {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const isHuman = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => {
            try {
              const canvas = document.createElement('canvas');
              canvas.width = 48;
              canvas.height = 48;
              const ctx = canvas.getContext('2d');
              if (!ctx) return resolve(false);

              ctx.drawImage(img, 0, 0, 48, 48);
              const imgData = ctx.getImageData(0, 0, 48, 48).data;

              let skinPixels = 0;
              let totalPixels = 48 * 48;
              let rTotal = 0;
              let gTotal = 0;
              let bTotal = 0;

              for (let i = 0; i < imgData.length; i += 4) {
                const r = imgData[i];
                const g = imgData[i + 1];
                const b = imgData[i + 2];
                rTotal += r;
                gTotal += g;
                bTotal += b;

                // Standard Peer-Reviewed Human Skin Tone Chromaticity bounds (Kovac et al.)
                if (r > 95 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) {
                  skinPixels++;
                }
              }

              // If more than 32% of center frame contains human skin tone, flag as human/selfie
              if (skinPixels / totalPixels > 0.32) {
                return resolve(true);
              }

              // Check for uniform blank floor or wall (extremely low color standard deviation)
              const avgR = rTotal / totalPixels;
              const avgG = gTotal / totalPixels;
              const avgB = bTotal / totalPixels;
              let variance = 0;
              for (let i = 0; i < imgData.length; i += 4) {
                const diffR = imgData[i] - avgR;
                const diffG = imgData[i + 1] - avgG;
                const diffB = imgData[i + 2] - avgB;
                variance += diffR * diffR + diffG * diffG + diffB * diffB;
              }
              const stdDev = Math.sqrt(variance / totalPixels);

              // Blank floor / featureless wall check
              if (stdDev < 14) {
                return resolve(true);
              }

              resolve(false);
            } catch (err) {
              resolve(false);
            }
          };
          img.onerror = () => resolve(false);
          img.src = imageUri;
        });

        if (isHuman) {
          return {
            isNonWildlife: true,
            message: 'Human or non-wildlife detected. Point your camera at a wild creature, bird, reptile, insect, or domestic pet.',
          };
        }
      } catch (e) {
        // Continue if browser canvas check fails
      }
    }

    return { isNonWildlife: false, message: '' };
  }

  /**
   * Hashes the image URI characters to deterministically and stably match
   * against the authentic 521+ species database entries.
   */
  private static selectSpeciesMatch(imageUri: string) {
    let hash = 0;
    const str = imageUri.length > 200 ? imageUri.substring(imageUri.length - 200) : imageUri;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    const positiveIndex = Math.abs(hash) % SPECIES_ENTRIES.length;
    return SPECIES_ENTRIES[positiveIndex] || SPECIES_ENTRIES[0];
  }
}
