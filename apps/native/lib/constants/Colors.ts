/**
 * Nima Design Tokens
 *
 * Static hex color values from the Loro Piana inspired design system.
 * Use these when you need direct access to colors outside of Tailwind classes,
 * e.g. for StatusBar, navigation header tints, or native component styling.
 */

export const Colors = {
  light: {
    background: '#FAF8F5',
    surface: '#F5F0E8',
    surfaceAlt: '#EDE6DC',
    primary: '#5C2A33',
    primaryHover: '#44242D',
    primaryForeground: '#FAF8F5',
    secondary: '#A67C52',
    secondaryHover: '#8C6A50',
    secondaryForeground: '#FAF8F5',
    foreground: '#2D2926',
    mutedForeground: '#6B635B',
    textMuted: '#9C948A',
    card: '#F5F0E8',
    cardForeground: '#2D2926',
    border: '#E0D8CC',
    input: '#E0D8CC',
    ring: '#5C2A33',
    accent: '#F5F0E8',
    accentForeground: '#5C2A33',
    success: '#6B7F5E',
    destructive: '#B85C5C',
    warning: '#C4A35A',
  },
  dark: {
    background: '#1A1614',
    surface: '#252220',
    surfaceAlt: '#302B28',
    primary: '#C9A07A',
    primaryHover: '#D4B896',
    primaryForeground: '#1A1614',
    secondary: '#A66B73',
    secondaryHover: '#B8828A',
    secondaryForeground: '#1A1614',
    foreground: '#F5F0E8',
    mutedForeground: '#C4B8A8',
    textMuted: '#8C8078',
    card: '#252220',
    cardForeground: '#F5F0E8',
    border: '#3D3835',
    input: '#3D3835',
    ring: '#C9A07A',
    accent: '#302B28',
    accentForeground: '#C9A07A',
    success: '#8FA881',
    destructive: '#D4807A',
    warning: '#D4C078',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
