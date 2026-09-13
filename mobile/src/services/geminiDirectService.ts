import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { IdentifyResponse } from '../types';

const FALLBACK_ENDPOINTS = [
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent',
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent',
];

async function prepareOptimizedImage(imageUri: string): Promise<{ base64: string; mimeType: string }> {
  // 1. Web browser: Use high-speed HTML5 Canvas downsampling for instant ~100KB payload
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
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
            const parts = dataUrl.split(',');
            resolve({ base64: parts[1] || '', mimeType: 'image/jpeg' });
            return;
          }
        } catch (e) {
          console.warn('Canvas resize fallback:', e);
        }
        if (imageUri.startsWith('data:')) {
          const parts = imageUri.split(',');
          resolve({ base64: parts[1] || '', mimeType: 'image/jpeg' });
        } else {
          resolve({ base64: '', mimeType: 'image/jpeg' });
        }
      };
      img.onerror = () => {
        if (imageUri.startsWith('data:')) {
          const parts = imageUri.split(',');
          resolve({ base64: parts[1] || '', mimeType: 'image/jpeg' });
        } else {
          resolve({ base64: '', mimeType: 'image/jpeg' });
        }
      };
      img.src = imageUri;
    });
  }

  // 2. React Native (Android / iOS): Use FileSystem
  let base64Data = '';
  let mimeType = 'image/jpeg';
  if (imageUri.startsWith('data:')) {
    const parts = imageUri.split(',');
    base64Data = parts[1] || '';
  } else {
    base64Data = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  }
  if (imageUri.toLowerCase().endsWith('.png')) mimeType = 'image/png';
  return { base64: base64Data, mimeType };
}

const SYSTEM_PROMPT = `You are an expert wildlife biologist, zoologist, and taxonomic classification engine for WildGotcha.
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
        },
      };

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
            console.warn(`Gemini endpoint ${endpoint} status:`, response.status);
          }
        } catch (subErr) {
          console.warn(`Gemini endpoint ${endpoint} failed:`, subErr);
        }
      }

      if (!responseData || !responseData.candidates || !responseData.candidates[0]) {
        return null;
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
