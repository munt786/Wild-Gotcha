import { Platform } from 'react-native';
import { IdentifyResponse, ScanHistoryResponse, StatsResponse } from '../types';
import { GeminiDirectService } from './geminiDirectService';

// Default base URL:
// - Physical Android APK on your Wi-Fi: 'http://10.115.56.35:8000'
// - Web / Localhost: 'http://127.0.0.1:8000'
// - Production Cloud: replace with your Render URL e.g. 'https://wildgotcha-api.onrender.com'
const DEFAULT_URL = Platform.select({
  android: 'http://10.115.56.35:8000',
  ios: 'http://10.115.56.35:8000',
  web: 'http://127.0.0.1:8000',
  default: 'http://10.115.56.35:8000',
});

let currentBaseUrl = DEFAULT_URL;

export const setApiBaseUrl = (url: string) => {
  if (url) {
    currentBaseUrl = url.replace(/\/+$/, ''); // Remove trailing slashes
  }
};

export const getApiBaseUrl = (): string => currentBaseUrl;

export interface IdentifyOptions {
  latitude?: number;
  longitude?: number;
  userId?: string;
}

export class ApiService {
  /**
   * Pings the FastAPI health endpoint to check connection
   */
  static async checkHealth(): Promise<{ healthy: boolean; details?: any; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${currentBaseUrl}/health`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        return { healthy: true, details: data };
      }
      return { healthy: false, error: `HTTP ${response.status}: ${response.statusText}` };
    } catch (err: any) {
      if (GeminiDirectService.isAvailable()) {
        return {
          healthy: true,
          details: { mode: 'direct_gemini_vision', message: 'Direct Cloud Vision AI Active (Zero Local Server Needed)' },
        };
      }
      const errorMsg =
        err.name === 'AbortError'
          ? 'Connection timed out. Ensure the backend server is reachable.'
          : err.message || 'Unable to connect to backend server.';
      return { healthy: false, error: errorMsg };
    }
  }

  /**
   * Uploads captured camera photo or gallery image to FastAPI /api/v1/identify
   */
  static async identifySpecies(
    imageUri: string,
    options: IdentifyOptions = {}
  ): Promise<IdentifyResponse> {
    // 1. Standalone Direct Cloud AI: Instant scan without needing any local server!
    // When the APK is built with EAS, the key is already securely embedded.
    if (GeminiDirectService.isAvailable()) {
      try {
        console.log('Classifying directly via Google Gemini Flash Vision AI (Zero local server needed)...');
        const directResult = await GeminiDirectService.identifyDirectly(imageUri);
        if (directResult) {
          return directResult;
        }
      } catch (directErr) {
        console.warn('Direct Gemini Vision encountered error, trying backend:', directErr);
      }
    }

    const filename = imageUri.split('/').pop() || 'capture.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1].toLowerCase()}` : `image/jpeg`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 35000); // 35s timeout for AI inference

      let response: Response;

      // On Web or if imageUri is a base64 / data URI, send JSON payload directly for 100% reliability
      if (Platform.OS === 'web' || imageUri.startsWith('data:')) {
        response = await fetch(`${currentBaseUrl}/api/v1/identify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            image_base64: imageUri,
            user_id: options.userId || 'web_explorer',
            latitude: options.latitude,
            longitude: options.longitude,
          }),
          signal: controller.signal,
        });
      } else {
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          name: filename,
          type: type === 'image/jpg' ? 'image/jpeg' : type,
        } as any);
        formData.append('image_base64', imageUri);
        formData.append('user_id', options.userId || 'mobile_explorer');
        if (options.latitude !== undefined) {
          formData.append('latitude', options.latitude.toString());
        }
        if (options.longitude !== undefined) {
          formData.append('longitude', options.longitude.toString());
        }

        response = await fetch(`${currentBaseUrl}/api/v1/identify`, {
          method: 'POST',
          body: formData,
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const detail = errorData.detail || `Server error (${response.status})`;
        throw new Error(detail);
      }

      const result: IdentifyResponse = await response.json();
      return result;
    } catch (error: any) {
      console.warn('Identify API local request failed:', error);

      // Standalone Mobile AI Fallback: Direct Gemini Flash Vision via phone internet!
      // This completely untethers the phone from the local PC laptop.
      if (GeminiDirectService.isAvailable()) {
        try {
          console.log('Local backend unreachable. Classifying via Direct Gemini Flash Vision...');
          const directResult = await GeminiDirectService.identifyDirectly(imageUri);
          if (directResult) {
            return directResult;
          }
        } catch (directErr) {
          console.warn('Direct Gemini Vision call encountered error:', directErr);
        }
      }

      // If network fails and direct AI is unavailable, return informative status
      if (
        error.name === 'AbortError' ||
        (error.message && (error.message.includes('Network request failed') || error.message.includes('Failed to fetch')))
      ) {
        return {
          success: false,
          is_wildlife: false,
          message: `Cannot reach AI Backend at ${currentBaseUrl}. Ensure laptop has start_backend.bat running on the same Wi-Fi.`,
          common_name: 'Server Unreachable',
          scientific_name: 'Network Connection Required',
          taxonomy_class: 'Other Wildlife',
          category: 'Mammals',
          breed: 'Wild Species',
          confidence_score: 0,
          rarity: 'Common',
          habitat: 'Local Network',
          region: 'Local Network',
          fun_fact: 'Make sure your phone and laptop are connected to the same Wi-Fi network.',
          danger_level: 'Harmless',
          scanned_at: new Date().toISOString(),
          persisted: false,
          top_candidates: [],
        };
      }
      throw error;
    }
  }

  /**
   * Demo mode fallback when backend is offline so the mobile UI is 100% testable
   */
  static getMockDiscovery(imageUri: string): IdentifyResponse {
    const mockSpecimens: IdentifyResponse[] = [
      {
        success: true,
        scan_id: 'demo_' + Date.now(),
        common_name: 'Monarch Butterfly',
        scientific_name: 'Danaus plexippus',
        taxonomy_class: 'Insecta',
        confidence_score: 0.942,
        rarity: 'Uncommon',
        habitat: 'Fields, meadows, and floral migration waystations',
        fun_fact: 'Monarch butterflies migrate up to 3,000 miles across North America each autumn.',
        danger_level: 'Harmless',
        top_candidates: [
          { common_name: 'Monarch Butterfly', scientific_name: 'Danaus plexippus', taxonomy_class: 'Insecta', confidence: 0.942 },
          { common_name: 'Viceroy Butterfly', scientific_name: 'Limenitis archippus', taxonomy_class: 'Insecta', confidence: 0.045 },
        ],
        scanned_at: new Date().toISOString(),
        persisted: false,
        message: 'Gotcha! Monarch Butterfly registered (Demo Simulator Mode)!',
      },
      {
        success: true,
        scan_id: 'demo_' + Date.now(),
        common_name: 'Yellow Garden Spider',
        scientific_name: 'Argiope aurantia',
        taxonomy_class: 'Arachnida',
        confidence_score: 0.915,
        rarity: 'Common',
        habitat: 'Sunny gardens, tall weeds, and shrubbery',
        fun_fact: 'Weaves a distinctive zig-zag pattern in the center of its web called a stabilimentum.',
        danger_level: 'Harmless',
        top_candidates: [
          { common_name: 'Yellow Garden Spider', scientific_name: 'Argiope aurantia', taxonomy_class: 'Arachnida', confidence: 0.915 },
          { common_name: 'Barn Spider', scientific_name: 'Araneus cavaticus', taxonomy_class: 'Arachnida', confidence: 0.062 },
        ],
        scanned_at: new Date().toISOString(),
        persisted: false,
        message: 'Gotcha! Yellow Garden Spider registered (Demo Simulator Mode)!',
      },
      {
        success: true,
        scan_id: 'demo_' + Date.now(),
        common_name: 'Veiled Chameleon',
        scientific_name: 'Chamaeleo calyptratus',
        taxonomy_class: 'Reptilia',
        confidence_score: 0.887,
        rarity: 'Rare',
        habitat: 'Plateaus, coastal plains, and dense canopies',
        fun_fact: 'Their eyes can swivel and focus independently, granting a 360-degree field of vision.',
        danger_level: 'Harmless',
        top_candidates: [
          { common_name: 'Veiled Chameleon', scientific_name: 'Chamaeleo calyptratus', taxonomy_class: 'Reptilia', confidence: 0.887 },
          { common_name: 'Green Anole', scientific_name: 'Anolis carolinensis', taxonomy_class: 'Reptilia', confidence: 0.071 },
        ],
        scanned_at: new Date().toISOString(),
        persisted: false,
        message: 'Gotcha! Veiled Chameleon registered (Demo Simulator Mode)!',
      },
    ];

    // Pick random specimen for demo
    const chosen = mockSpecimens[Math.floor(Math.random() * mockSpecimens.length)];
    return chosen;
  }

  /**
   * Retrieves scan history from MongoDB via backend
   */
  static async fetchScans(limit: number = 30): Promise<ScanHistoryResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`${currentBaseUrl}/api/v1/scans?limit=${limit}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch Dex scans (${response.status})`);
    }
    return response.json();
  }

  /**
   * Retrieves Dex collection statistics
   */
  static async fetchStats(): Promise<StatsResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${currentBaseUrl}/api/v1/stats`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch stats (${response.status})`);
    }
    return response.json();
  }
}
