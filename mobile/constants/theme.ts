/**
 * Liquid Glass Light Design System Tokens
 * Inspired by Apple Glassmorphism and Material 3
 * Tailored for high legibility in bright indoor/outdoor retail environments
 */

export const Colors = {
  // Surfaces & Backgrounds (Light Mode)
  background: '#F1F5F9', // Crisp light slate canvas
  surface: 'rgba(255, 255, 255, 0.88)', // Frosted white glass
  surfaceLight: 'rgba(255, 255, 255, 0.96)', // High opacity light surface
  surfaceBorder: 'rgba(15, 23, 42, 0.10)', // Subtle slate rim
  surfaceBorderStrong: 'rgba(15, 23, 42, 0.22)',

  // Brand Accents
  primary: '#0D9488', // Elegant Teal
  primaryLight: '#0F766E', // Deep Teal for high contrast on light surfaces
  primaryDark: '#115E59',
  primaryGlass: 'rgba(13, 148, 136, 0.12)',

  // Financial & Functional Semantic Colors
  success: '#059669', // Green - Received / Paid / In Stock
  successGlass: 'rgba(5, 150, 105, 0.12)',
  danger: '#DC2626', // Red - Balance Due / Khata Debit / Low Stock
  dangerGlass: 'rgba(220, 38, 38, 0.10)',
  warning: '#D97706', // Amber - Pending Challan / Partial Payment
  warningGlass: 'rgba(217, 119, 6, 0.12)',
  info: '#2563EB', // Blue - Bank / UPI / Info
  infoGlass: 'rgba(37, 99, 235, 0.12)',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textInverse: '#FFFFFF',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
};

export const GlassEffects = {
  intensity: 40,
  card: {
    backgroundColor: Colors.surface,
    borderColor: Colors.surfaceBorder,
    borderWidth: 1,
    borderRadius: BorderRadius.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(13, 148, 136, 0.25)',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
};
