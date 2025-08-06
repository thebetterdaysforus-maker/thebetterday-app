// src/styles/spacing.ts
// The Better Day - Spacing System

export const Spacing = {
  // Base unit: 4px
  xs: 4,    // 4px
  sm: 8,    // 8px
  md: 12,   // 12px
  lg: 16,   // 16px
  xl: 20,   // 20px
  '2xl': 24, // 24px
  '3xl': 32, // 32px
  '4xl': 40, // 40px
  '5xl': 48, // 48px
  '6xl': 64, // 64px

  // Component specific
  component: {
    buttonPadding: {
      horizontal: 16,
      vertical: 12,
    },
    cardPadding: 16,
    screenPadding: 20,
    sectionGap: 24,
    itemGap: 12,
  },
};

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export default Spacing;