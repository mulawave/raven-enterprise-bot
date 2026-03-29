// ─── Raven Mobile Theme ─────────────────────────────────────────────────────
// Brand colors:
//   Navy dark:   #173a6c
//   Navy light:  #1e4d8c
//   Orange warm:  #f5c16c
//   Orange bold:  #f49617
//   White:        #ffffff

export const BrandColors = {
  navyDark: '#173a6c',
  navyLight: '#1e4d8c',
  orangeWarm: '#f5c16c',
  orangeBold: '#f49617',
  white: '#ffffff',
} as const

export const Colors = {
  dark: {
    background: '#0c1929',
    surface: '#132741',
    surfaceElevated: '#1a3356',
    border: '#1e3d6a',
    borderLight: '#2a5088',
    text: '#f1f5f9',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    primary: '#f49617',
    primaryLight: '#f5c16c',
    primaryDark: '#d97f06',
    primaryBg: 'rgba(244, 150, 23, 0.15)',
    accent: '#f5c16c',
    accentLight: '#f7d18a',
    accentBg: 'rgba(245, 193, 108, 0.15)',
    warning: '#f5c16c',
    warningBg: 'rgba(245, 193, 108, 0.15)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.15)',
    info: '#4a90d9',
    infoBg: 'rgba(74, 144, 217, 0.15)',
    card: '#132741',
    cardBorder: '#1e3d6a',
    tabBar: '#0c1929',
    tabBarBorder: '#132741',
    header: '#0f2035',
    statusBar: 'light',
    shimmer: '#1e3d6a',
    overlay: 'rgba(0, 0, 0, 0.6)',
    white: '#ffffff',
    black: '#000000',
  },
  light: {
    background: '#f5f7fb',
    surface: '#ffffff',
    surfaceElevated: '#eef2f9',
    border: '#d4ddef',
    borderLight: '#b8c8e0',
    text: '#0f2035',
    textSecondary: '#4a6284',
    textMuted: '#7b93b0',
    primary: '#f49617',
    primaryLight: '#f5c16c',
    primaryDark: '#d97f06',
    primaryBg: 'rgba(244, 150, 23, 0.10)',
    accent: '#173a6c',
    accentLight: '#1e4d8c',
    accentBg: 'rgba(23, 58, 108, 0.10)',
    warning: '#f49617',
    warningBg: 'rgba(244, 150, 23, 0.10)',
    error: '#ef4444',
    errorBg: 'rgba(239, 68, 68, 0.1)',
    info: '#173a6c',
    infoBg: 'rgba(23, 58, 108, 0.1)',
    card: '#ffffff',
    cardBorder: '#d4ddef',
    tabBar: '#ffffff',
    tabBarBorder: '#d4ddef',
    header: '#ffffff',
    statusBar: 'dark',
    shimmer: '#d4ddef',
    overlay: 'rgba(0, 0, 0, 0.5)',
    white: '#ffffff',
    black: '#000000',
  },
} as const

export type ThemeColors = typeof Colors.dark | typeof Colors.light

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
} as const

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
} as const
