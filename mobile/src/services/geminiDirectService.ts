import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { Platform, Image as RNImage } from 'react-native';
import { IdentifyResponse } from '../types';

const FALLBACK_ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent',
];

async function prepareOptimizedImage(imageUri: string): Promise<{ base64: string; mimeType: string }> {
  let base64Data = '';
  let mimeType = 'image/jpeg';

  if (imageUri.startsWith('data:')) {
    const parts = imageUri.split(',');
    base64Data = parts[1] || '';
    const match = imageUri.match(/data:([^;]+);/);
    if (match) mimeType = match[1];
  } else if (Platform.OS === 'web') {
    try {
      const res = await fetch(imageUri);
      const blob = await res.blob();
      mimeType = blob.type || 'image/jpeg';
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resStr = reader.result as string;
          resolve(resStr.split(',')[1] || '');
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn('Web blob reading error:', err);
    }
  } else {
    try {
      base64Data = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      if (imageUri.toLowerCase().endsWith('.png')) mimeType = 'image/png';
      else if (imageUri.toLowerCase().endsWith('.webp')) mimeType = 'image/webp';
    } catch (fsErr) {
      console.warn('FileSystem reading error:', fsErr);
    }
  }

  // Downscale if image is overly large (> 500KB) on Web to keep transmission fast
  if (Platform.OS === 'web' && typeof document !== 'undefined' && base64Data.length > 500000) {
    try {
      const downscaled = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const maxDim = 1024;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
              resolve(dataUrl.split(',')[1] || base64Data);
              return;
            }
          } catch (e) {
            console.warn('Canvas downsampling fallback:', e);
          }
          resolve(base64Data);
        };
        img.onerror = () => resolve(base64Data);
        img.src = `data:${mimeType};base64,${base64Data}`;
      });
      base64Data = downscaled;
      mimeType = 'image/jpeg';
    } catch (downscaleErr) {
      console.warn('Downscale failed, continuing with original:', downscaleErr);
    }
  }

  return { base64: base64Data, mimeType };
}

/**
 * On-Device Creature Sticker Crop:
 * Isolates the creature inside the bounding box and generates a clean,
 * focused sticker crop using the native phone graphics engine (0 extra tokens, ~30ms).
 */
export async function generateStickerCrop(
  imageUri: string,
  box2d: [number, number, number, number]
): Promise<string | undefined> {
  try {
    if (Platform.OS === 'web' || !imageUri || imageUri.startsWith('data:')) {
      return undefined;
    }

    const [ymin, xmin, ymax, xmax] = box2d;
    const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      RNImage.getSize(imageUri, (width, height) => resolve({ width, height }), reject);
    });

    const imgW = dimensions.width;
    const imgH = dimensions.height;

    // Convert normalized coordinates (0-1000) to actual pixels with an 8% padding margin
    const padX = Math.round(((xmax - xmin) / 1000) * imgW * 0.08);
    const padY = Math.round(((ymax - ymin) / 1000) * imgH * 0.08);

    const originX = Math.max(0, Math.round((xmin / 1000) * imgW) - padX);
    const originY = Math.max(0, Math.round((ymin / 1000) * imgH) - padY);
    const cropW = Math.min(imgW - originX, Math.round(((xmax - xmin) / 1000) * imgW) + padX * 2);
    const cropH = Math.min(imgH - originY, Math.round(((ymax - ymin) / 1000) * imgH) + padY * 2);

    if (cropW > 20 && cropH > 20) {
      const manip = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX, originY, width: cropW, height: cropH } }],
        { compress: 0.92, format: ImageManipulator.SaveFormat.JPEG }
      );
      return manip.uri;
    }
  } catch (err) {
    console.warn('Sticker cropping error:', err);
  }
  return undefined;
}

const SYSTEM_PROMPT = `You are an expert wildlife biologist, zoologist, and taxonomic classification engine for WildGotcha.
Analyze the user's uploaded camera image with extreme biological accuracy.

RULES:
1. CREATURE SEARCH & LOCALIZATION: First locate the primary animal, bird, insect, reptile, fish, arachnid, or domestic breed in the frame. Return its exact bounding box in "box_2d": [ymin, xmin, ymax, xmax] with coordinates normalized from 0 to 1000.
2. NON-WILDLIFE CHECK: If the image does NOT contain a living animal, bird, insect, reptile, fish, arachnid, or domestic breed (for example: if it is a laptop, electronic device, furniture, empty room, vehicle, or human face), you MUST set "is_wildlife": false and specify the detected object in "message".
3. WILDLIFE IDENTIFICATION: Focus classification strictly on the creature inside "box_2d" to eliminate background guessing. Identify its exact common name, Latin binomial scientific name, and specific breed/subspecies if applicable.
4. BIOGEOGRAPHICAL REGION: Provide the authentic native continent and country/realm of origin (e.g. "South & Southeast Asia", "Siberian Arctic • Worldwide Domestic", "Madagascar", "Australasia (Oceania)", "North America", "South & Central America (Amazon)").
5. CATEGORY: Must be one of: "Mammals", "Birds", "Reptiles", "Amphibians", "Insects", "Arachnids", "Fish", "Other Wildlife".
6. BREED: If it is a domestic breed (e.g. dog, cat, cattle, horse, poultry breed), specify the exact breed name (e.g. "Golden Retriever", "German Shepherd", "Persian Cat", "Holstein Friesian", "Leghorn Chicken"). If it is a wild animal, set "Wild Species".
7. TAXONOMY CLASS: Must be one of: "Mammalia", "Insecta", "Reptilia", "Arachnida", or "Other Wildlife" (for birds, amphibians, fish).
8. RARITY: Based strictly on global population abundance and human encounter frequency:
   - "Common": Abundant species found everywhere in human, urban, or domestic environments (e.g. housefly, mosquito, pigeon, sparrow, black ant, domestic pet).
   - "Uncommon": Wild species found in specific natural habitats or seasons (e.g. red fox, monarch butterfly, kingfisher, tree frog, barn owl).
   - "Rare": Elusive wild species with restricted geographic ranges (e.g. chameleon, tarantula, peregrine falcon, sea turtle).
   - "Epic": Threatened or vulnerable species, or large wilderness apex predators (e.g. tiger, elephant, snow leopard, komodo dragon).
   - "Legendary": Critically endangered species with tiny remaining populations on Earth (e.g. javan rhino, vaquita, amur leopard, pangolin).
   Never classify abundant insects (like houseflies) or common birds as Rare.
9. DANGER LEVEL: Based strictly on immediate physical injury, sting, or bite hazard to a human:
   - "Harmless": Incapable of stinging or physically injuring a human; non-venomous (e.g. housefly, butterfly, moth, earthworm, pigeon, duck, rabbit). A housefly is strictly Harmless.
   - "Mild": Minor nip, scratch, or mild sting if provoked (e.g. honeybee, red ant, garden spider, small crab).
   - "Venomous/Dangerous": Medically significant venom or toxic sting (e.g. wasp swarm, scorpion, pit viper, cobra, black widow).
   - "Predatory": Large apex predators capable of lethal attacks (e.g. lion, tiger, bear, crocodile, wolf).

You must respond ONLY with valid, parseable JSON using this exact structure:
{
  "is_wildlife": true,
  "box_2d": [ymin, xmin, ymax, xmax],
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
`;

export class GeminiDirectService {
  /**
   * Retrieves the Gemini API key from environment variables (EAS build env or local .env.local).
   * No plaintext key is stored in Git, keeping public repositories 100% secure.
   */
  static getApiKey(): string | null {
    const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (key && key.trim().length > 10) {
      return key.trim();
    }
    return null;
  }

  static isAvailable(): boolean {
    return this.getApiKey() !== null;
  }

  /**
   * Classifies an image directly through Google Gemini Flash Vision API on the device.
   * Completely independent of any local PC backend server.
   */
  static async identifyDirectly(imageUri: string): Promise<IdentifyResponse | null> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      return null;
    }

    try {
      const { base64: base64Data, mimeType } = await prepareOptimizedImage(imageUri);

      if (!base64Data) {
        console.warn('Failed to extract base64 data from imageUri');
        return null;
      }

      const payload = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          response_mime_type: 'application/json',
          maxOutputTokens: 350,
        },
      };

      let lastStatus = 0;
      let lastErrorMessage = '';
      let responseData: any = null;

      for (const endpoint of FALLBACK_ENDPOINTS) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const response = await fetch(`${endpoint}?key=${apiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            responseData = await response.json();
            break;
          } else {
            lastStatus = response.status;
            console.warn(`Gemini endpoint ${endpoint} status:`, response.status);
          }
        } catch (subErr: any) {
          lastErrorMessage = subErr?.message || '';
          console.warn(`Gemini endpoint ${endpoint} failed:`, subErr);
        }
      }

      if (lastStatus === 429) {
        return {
          success: false,
          is_wildlife: false,
          message: 'AI request limit reached (HTTP 429). Please wait a few moments and try scanning again.',
          common_name: 'Rate Limit Reached',
          scientific_name: 'Quota Limit',
          taxonomy_class: 'Other Wildlife',
          category: 'Mammals',
          breed: 'Wild Species',
          confidence_score: 0,
          rarity: 'Common',
          habitat: 'Cloud Server',
          region: 'Global',
          fun_fact: 'The Gemini free tier has a per-minute rate limit. Waiting 10-15 seconds will restore scanning.',
          danger_level: 'Harmless',
          scanned_at: new Date().toISOString(),
          persisted: false,
          top_candidates: [],
        };
      }

      if (!responseData || !responseData.candidates || !responseData.candidates[0]) {
        // Network failure / phone offline / airplane mode
        return {
          success: false,
          is_wildlife: false,
          message: 'Network connection required: Please verify your phone has active mobile data (4G/5G) or Wi-Fi.',
          common_name: 'Connection Required',
          scientific_name: 'Offline',
          taxonomy_class: 'Other Wildlife',
          category: 'Mammals',
          breed: 'Wild Species',
          confidence_score: 0,
          rarity: 'Common',
          habitat: 'Mobile Network',
          region: 'Global',
          fun_fact: 'WildGotcha scans species directly from your phone over mobile data or Wi-Fi with 0% dependence on any laptop.',
          danger_level: 'Harmless',
          scanned_at: new Date().toISOString(),
          persisted: false,
          top_candidates: [],
        };
      }

      const rawText = responseData.candidates[0].content?.parts?.[0]?.text;
      if (!rawText) return null;

      const parsed = JSON.parse(rawText);
      const isWildlife = Boolean(parsed.is_wildlife ?? true);

      if (!isWildlife) {
        return {
          success: false,
          is_wildlife: false,
          message: parsed.message || 'No wildlife detected. Center a wild animal, bird, insect, or reptile in view.',
          common_name: 'No Wildlife',
          scientific_name: 'None',
          taxonomy_class: 'Other Wildlife',
          category: 'Mammals',
          breed: 'Wild Species',
          confidence_score: 0,
          rarity: 'Common',
          habitat: 'Non-natural environment',
          region: 'Global Distribution',
          fun_fact: '',
          danger_level: 'Harmless',
          scanned_at: new Date().toISOString(),
          persisted: false,
          top_candidates: [],
        };
      }

      const scanId = 'direct_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);

      let cleanBox: [number, number, number, number] | undefined = undefined;
      if (Array.isArray(parsed.box_2d) && parsed.box_2d.length > 0) {
        let raw = parsed.box_2d;
        if (Array.isArray(raw[0])) raw = raw[0];
        if (raw.length === 4) {
          const b = [Number(raw[0]), Number(raw[1]), Number(raw[2]), Number(raw[3])];
          if (!b.some(isNaN) && b[2] > b[0] && b[3] > b[1]) {
            cleanBox = [b[0], b[1], b[2], b[3]];
          }
        }
      }

      let stickerUri: string | undefined = undefined;
      if (cleanBox) {
        stickerUri = await generateStickerCrop(imageUri, cleanBox);
      }

      return {
        success: true,
        is_wildlife: true,
        scan_id: scanId,
        common_name: parsed.common_name || 'Unknown Species',
        scientific_name: parsed.scientific_name || 'Species sp.',
        taxonomy_class: parsed.taxonomy_class || 'Other Wildlife',
        category: parsed.category || 'Mammals',
        breed: parsed.breed || 'Wild Species',
        confidence_score: Number(parsed.confidence_score ?? 0.95),
        rarity: parsed.rarity || 'Common',
        habitat: parsed.habitat || 'Natural Habitat',
        region: parsed.region || 'Global Distribution',
        fun_fact: parsed.fun_fact || 'A fascinating creature of the wild registered to your Dex.',
        danger_level: parsed.danger_level || 'Harmless',
        box_2d: cleanBox,
        sticker_uri: stickerUri,
        scanned_at: new Date().toISOString(),
        persisted: false,
        message: parsed.message || `Gotcha! ${parsed.common_name} registered to your Dex!`,
        top_candidates: [],
      };
    } catch (err) {
      console.warn('Direct Gemini Mobile identification error:', err);
      return null;
    }
  }
}
