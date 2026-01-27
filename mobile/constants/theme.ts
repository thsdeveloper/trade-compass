/**
 * Finance-style theme configuration
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    // Primary - Finance Blue
    primary: '#0066FF',
    primaryDark: '#0052CC',
    primaryLight: '#E6F0FF',

    // Backgrounds
    background: '#FFFFFF',
    surface: '#F5F5F5',
    card: '#F0F1F5',

    // Text
    text: '#1A1A1A',
    textSecondary: '#6B6B6B',
    textOnPrimary: '#FFFFFF',

    // UI Elements
    border: '#E5E5E5',
    icon: '#6B6B6B',
    tabIconDefault: '#6B6B6B',
    tabIconSelected: '#0066FF',
    tint: '#0066FF',

    // Semantic
    success: '#00A651',
    successLight: '#E6F7EF',
    danger: '#E53935',
    dangerLight: '#FFEBEE',
    warning: '#FF9800',
    warningLight: '#FFF3E0',
    info: '#2196F3',
    infoLight: '#E3F2FD',
  },
  dark: {
    // Primary - Finance Blue
    primary: '#3B82F6',
    primaryDark: '#0066FF',
    primaryLight: '#1E3A5F',

    // Backgrounds
    background: '#121212',
    surface: '#1E1E1E',
    card: '#2D2D2D',

    // Text
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textOnPrimary: '#FFFFFF',

    // UI Elements
    border: '#374151',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#3B82F6',
    tint: '#3B82F6',

    // Semantic
    success: '#10B981',
    successLight: '#1A2F26',
    danger: '#F87171',
    dangerLight: '#2D1F1F',
    warning: '#FBBF24',
    warningLight: '#2D2A1F',
    info: '#60A5FA',
    infoLight: '#1F2937',
  },
};

// Spacing scale
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

// Border radius scale
export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

// Font sizes
export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
};

// Font weights
export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
