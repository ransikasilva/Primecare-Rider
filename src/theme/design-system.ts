/**
 * TransFleet Professional Design System
 * Inspired by world-class apps like Uber, Pickme, Airbnb
 * 
 * This design system ensures consistency, professionalism, 
 * and excellent user experience across all screens.
 */

import { Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ==========================================
// 🎨 PROFESSIONAL COLOR SYSTEM
// ==========================================

export const COLORS = {
  // Primary Brand Colors (Company Teal)
  primary: '#4ECDC4',           // Main brand teal
  primaryDark: '#3BA99F',       // Darker shade for pressed states
  primaryLight: '#7DDDD6',      // Lighter shade for backgrounds
  primaryUltraLight: '#E8F9F7', // Ultra light for subtle backgrounds

  // Semantic Colors
  success: '#00C851',           // Green for success states
  warning: '#FF8800',           // Orange for warnings
  error: '#FF4444',             // Red for errors
  info: '#2196F3',              // Blue for information

  // Neutral Colors (Professional Gray Scale)
  black: '#000000',
  gray900: '#1A1A1A',           // Almost black for headers
  gray800: '#333333',           // Dark gray for primary text
  gray700: '#4A4A4A',           // Medium dark gray
  gray600: '#666666',           // Medium gray for secondary text
  gray500: '#888888',           // Mid gray
  gray400: '#AAAAAA',           // Light gray for placeholders
  gray300: '#CCCCCC',           // Very light gray for borders
  gray200: '#E5E5E5',           // Ultra light gray for dividers
  gray100: '#F5F5F5',           // Background gray
  gray50: '#FAFAFA',            // Subtle background
  white: '#FFFFFF',

  // Surface Colors
  surface: '#FFFFFF',           // Card backgrounds
  surfaceVariant: '#F8F9FA',    // Alternative surface
  background: '#F5F7FA',        // Main app background
  backgroundVariant: '#EBEDEF', // Alternative background

  // Text Colors (Semantic)
  textPrimary: '#1A1A1A',       // Primary text (headings, important text)
  textSecondary: '#666666',     // Secondary text (descriptions, labels)
  textTertiary: '#888888',      // Tertiary text (hints, placeholders)
  textInverse: '#FFFFFF',       // White text on dark backgrounds
  textOnPrimary: '#FFFFFF',     // Text on primary color
  textOnSurface: '#1A1A1A',     // Text on surface colors

  // Interactive Colors
  link: '#2196F3',              // Links and interactive text
  linkPressed: '#1976D2',       // Pressed link state
  disabled: '#CCCCCC',          // Disabled elements
  disabledText: '#999999',      // Disabled text

  // Overlay Colors
  overlay: 'rgba(0, 0, 0, 0.5)', // Modal overlays
  overlayLight: 'rgba(0, 0, 0, 0.3)', // Light overlays
  scrim: 'rgba(0, 0, 0, 0.15)',  // Subtle overlays

  // Status Colors (for order states, etc.)
  statusPending: '#FF8800',     // Orange for pending
  statusActive: '#4ECDC4',      // Teal for active
  statusCompleted: '#00C851',   // Green for completed
  statusCancelled: '#FF4444',   // Red for cancelled
  statusUrgent: '#FF4444',      // Red for urgent
};

// ==========================================
// 📏 PROFESSIONAL SPACING SYSTEM
// ==========================================

export const SPACING = {
  // Base unit (4px) - all spacing should be multiples of this
  unit: 4,
  
  // Common spacing values
  xs: 4,      // 4px  - Tiny spacing
  sm: 8,      // 8px  - Small spacing  
  md: 12,     // 12px - Medium spacing
  lg: 16,     // 16px - Large spacing (default padding)
  xl: 20,     // 20px - Extra large
  xxl: 24,    // 24px - Double extra large
  xxxl: 32,   // 32px - Triple extra large
  huge: 40,   // 40px - Huge spacing
  massive: 48, // 48px - Massive spacing

  // Semantic spacing
  padding: 16,      // Default container padding
  paddingSmall: 12, // Small container padding
  paddingLarge: 20, // Large container padding
  margin: 16,       // Default margin
  marginSmall: 8,   // Small margin
  marginLarge: 24,  // Large margin
};

// ==========================================
// 📝 PROFESSIONAL TYPOGRAPHY SYSTEM
// ==========================================

export const TYPOGRAPHY = {
  // Font Families
  fontFamily: {
    regular: Platform.select({
      ios: 'SF Pro Display',
      android: 'Roboto',
      default: 'System',
    }),
    medium: Platform.select({
      ios: 'SF Pro Display Medium',
      android: 'Roboto Medium', 
      default: 'System',
    }),
    bold: Platform.select({
      ios: 'SF Pro Display Bold',
      android: 'Roboto Bold',
      default: 'System',
    }),
  },

  // Font Sizes (Professional Scale)
  fontSize: {
    xs: 10,   // Tiny text
    sm: 12,   // Small text (captions, labels)
    base: 14, // Base text size (body text)
    md: 16,   // Medium text (input text, button text)
    lg: 18,   // Large text (section titles)
    xl: 20,   // Extra large (card titles)
    xxl: 24,  // Double extra large (screen titles)
    xxxl: 28, // Triple extra large (main headings)
    huge: 32, // Huge text (hero text)
    massive: 36, // Massive text (landing titles)
  },

  // Font Weights
  fontWeight: {
    light: '300' as const,
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },

  // Line Heights (for better readability)
  lineHeight: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
  },

  // Text Styles (Pre-defined combinations)
  styles: {
    // Headings
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
      color: COLORS.textPrimary,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600' as const,
      lineHeight: 30,
      color: COLORS.textPrimary,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 26,
      color: COLORS.textPrimary,
    },
    h4: {
      fontSize: 18,
      fontWeight: '500' as const,
      lineHeight: 24,
      color: COLORS.textPrimary,
    },

    // Body Text
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as const,
      lineHeight: 24,
      color: COLORS.textPrimary,
    },
    body: {
      fontSize: 14,
      fontWeight: '400' as const,
      lineHeight: 20,
      color: COLORS.textPrimary,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as const,
      lineHeight: 18,
      color: COLORS.textSecondary,
    },

    // Special Text
    caption: {
      fontSize: 10,
      fontWeight: '400' as const,
      lineHeight: 14,
      color: COLORS.textTertiary,
    },
    label: {
      fontSize: 12,
      fontWeight: '500' as const,
      lineHeight: 16,
      color: COLORS.textSecondary,
    },
    button: {
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      color: COLORS.textOnPrimary,
    },
    link: {
      fontSize: 14,
      fontWeight: '500' as const,
      lineHeight: 20,
      color: COLORS.link,
    },
  },
};

// ==========================================
// 🔲 PROFESSIONAL LAYOUT SYSTEM
// ==========================================

export const LAYOUT = {
  // Screen dimensions
  screen: {
    width: screenWidth,
    height: screenHeight,
  },

  // Border radius (rounded corners)
  radius: {
    none: 0,
    xs: 2,     // Tiny radius
    sm: 4,     // Small radius
    md: 8,     // Medium radius (default)
    lg: 12,    // Large radius (buttons, cards)
    xl: 16,    // Extra large radius
    xxl: 20,   // Double extra large
    round: 50, // Fully rounded (circular buttons)
    pill: 999, // Pill shape
  },

  // Border widths
  borderWidth: {
    none: 0,
    thin: 0.5,   // Hairline border
    default: 1,   // Default border
    thick: 2,     // Thick border
    heavy: 4,     // Heavy border
  },

  // Container widths
  container: {
    sm: 320,
    md: 375,
    lg: 414,
    xl: 480,
  },

  // Z-index layers
  zIndex: {
    base: 1,
    elevated: 10,
    dropdown: 100,
    sticky: 200,
    overlay: 500,
    modal: 1000,
    toast: 2000,
  },
};

// ==========================================
// ✨ PROFESSIONAL SHADOW SYSTEM
// ==========================================

export const SHADOWS = {
  // iOS-style shadows
  none: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: {
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  xl: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },

  // Card shadows
  card: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHovered: {
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
};

// ==========================================
// 🎬 PROFESSIONAL ANIMATION SYSTEM
// ==========================================

export const ANIMATIONS = {
  // Timing
  duration: {
    fast: 150,      // Fast animations (hover states)
    normal: 250,    // Normal animations (transitions)
    slow: 350,      // Slow animations (modals, sheets)
    slower: 500,    // Very slow animations
  },

  // Easing curves (feel natural and professional)
  easing: {
    linear: 'linear',
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    // Custom cubic-bezier curves for more professional feel
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Material Design standard
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',     // Emphasized entrance
    decelerated: 'cubic-bezier(0, 0, 0.2, 1)',    // Decelerated entrance
  },
};

// ==========================================
// 📱 COMPONENT SPECIFIC STYLES
// ==========================================

export const COMPONENT_STYLES = {
  // Button styles
  button: {
    primary: {
      backgroundColor: COLORS.primary,
      borderRadius: LAYOUT.radius.lg,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xxl,
      ...SHADOWS.sm,
    },
    secondary: {
      backgroundColor: COLORS.white,
      borderColor: COLORS.primary,
      borderWidth: LAYOUT.borderWidth.default,
      borderRadius: LAYOUT.radius.lg,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xxl,
      ...SHADOWS.sm,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: LAYOUT.radius.lg,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xxl,
    },
  },

  // Card styles
  card: {
    default: {
      backgroundColor: COLORS.surface,
      borderRadius: LAYOUT.radius.xl,
      padding: SPACING.lg,
      ...SHADOWS.card,
    },
    elevated: {
      backgroundColor: COLORS.surface,
      borderRadius: LAYOUT.radius.xl,
      padding: SPACING.lg,
      ...SHADOWS.lg,
    },
    flat: {
      backgroundColor: COLORS.surface,
      borderRadius: LAYOUT.radius.xl,
      padding: SPACING.lg,
      borderWidth: LAYOUT.borderWidth.thin,
      borderColor: COLORS.gray200,
    },
  },

  // Input styles
  input: {
    default: {
      backgroundColor: COLORS.white,
      borderColor: COLORS.gray300,
      borderWidth: LAYOUT.borderWidth.default,
      borderRadius: LAYOUT.radius.lg,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      fontSize: TYPOGRAPHY.fontSize.md,
      color: COLORS.textPrimary,
    },
    focused: {
      borderColor: COLORS.primary,
      borderWidth: LAYOUT.borderWidth.thick,
      ...SHADOWS.sm,
    },
    error: {
      borderColor: COLORS.error,
      borderWidth: LAYOUT.borderWidth.thick,
    },
  },
};

// ==========================================
// 📐 HELPER FUNCTIONS
// ==========================================

export const createSpacing = (multiplier: number) => SPACING.unit * multiplier;

export const createFontSize = (size: keyof typeof TYPOGRAPHY.fontSize) => 
  TYPOGRAPHY.fontSize[size];

export const createShadow = (elevation: keyof typeof SHADOWS) => ({
  ...SHADOWS[elevation],
  shadowColor: COLORS.black,
});

// Export everything for easy access
export default {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  LAYOUT,
  SHADOWS,
  ANIMATIONS,
  COMPONENT_STYLES,
  createSpacing,
  createFontSize,
  createShadow,
};