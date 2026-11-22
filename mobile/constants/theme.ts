/**
 * Liquid Glass Design System Tokens
 * Inspired by Apple Glassmorphism and Material 3
 * Tailored for high legibility in indoor/outdoor retail environments
 */

export const Colors = {
  // Surfaces & Backgrounds
  background: '#0B0F19', // Deep dark slate canvas
  surface: 'rgba(30, 41, 59, 0.7)', // Frosted glass dark
  surfaceLight: 'rgba(255, 255, 255, 0.08)', // High translucent glass
  surfaceBorder: 'rgba(255, 255, 255, 0.12)', // Subtle highlight rim
  surfaceBorderStrong: 'rgba(255, 255, 255, 0.25)',

  // Brand Accents
  primary: '#0D9488', // Elegant Teal
  primaryLight: '#14B8A6',
  primaryDark: '#0F766E',
  primaryGlass: 'rgba(13, 148, 136, 0.25)',

  // Financial & Functional Semantic Colors
  success: '#10B981', // Green - Received / Paid / In Stock
  successGlass: 'rgba(16, 185, 129, 0.15)',
  danger: '#EF4444', // Red - Balance Due / Khata Debit / Low Stock
  dangerGlass: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B', // Amber - Pending Challan / Partial Payment
  warningGlass: 'rgba(245, 158, 11, 0.15)',
  info: '#3B82F6', // Blue - Bank / UPI / Info
  infoGlass: 'rgba(59, 130, 246, 0.15)',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  cardHighlight: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1,
    borderRadius: BorderRadius.xl,
  },
};
