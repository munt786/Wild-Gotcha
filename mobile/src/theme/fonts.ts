import { Platform } from 'react-native';
import './apolloFontWeb';

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
