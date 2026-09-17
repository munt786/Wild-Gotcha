import { Platform, StyleSheet } from 'react-native';
import './apolloFontWeb';

// On Android, specifying numeric or bold `fontWeight` alongside custom fonts causes React Native's
// ReactFontManager to search for a non-existent weight file (e.g. Apollo_800.ttf) and fall back to system Roboto.
// Apollo is inherently bold and futuristic. Removing fontWeight for Apollo on Android guarantees
// Android renders the authentic Apollo typeface everywhere without falling back.
if (Platform.OS === 'android') {
  const originalCreate = StyleSheet.create;
  (StyleSheet as any).create = function <T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(styles: T): T {
    if (styles && typeof styles === 'object') {
      for (const key of Object.keys(styles)) {
        const item = (styles as any)[key];
        if (item && typeof item === 'object' && item.fontFamily && typeof item.fontFamily === 'string') {
          if (item.fontFamily.toLowerCase().includes('apollo')) {
            delete item.fontWeight;
          }
        }
      }
    }
    return originalCreate(styles);
  };
}

export const FONTS = {
  // Apollo - Complete Modern Futuristic Typeface with full 0-9 digits, uppercase, lowercase, and symbols.
  // Perfect for headers, badges, telemetry, stats, and numbers with proper font weights (no missing digits).
  displayBold: Platform.select({
    web: 'Apollo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo',
  }),
  displayRegular: Platform.select({
    web: 'Apollo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo',
  }),
  displayItalic: Platform.select({
    web: 'Apollo-Italic, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo-Italic',
  }),

  // Numbers & Telemetry (Guaranteed clean 0-9 digits, never trial stickers)
  numbers: Platform.select({
    web: 'Apollo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo',
  }),
  tech: Platform.select({
    web: 'Apollo, monospace, sans-serif',
    default: 'Apollo',
  }),

  // Pure display labels
  brandTextOnly: Platform.select({
    web: 'Apollo, system-ui, -apple-system, sans-serif',
    default: 'Apollo',
  }),

  // Backward compatibility aliases
  brandBold: Platform.select({
    web: 'Apollo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo',
  }),
  brandRegular: Platform.select({
    web: 'Apollo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo',
  }),
  brandSemilight: Platform.select({
    web: 'Apollo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: 'Apollo',
  }),

  // Clean body text
  body: Platform.select({
    web: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    default: undefined,
  }),
};
