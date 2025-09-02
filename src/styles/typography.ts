// src/styles/typography.ts
// The Better Day - Typography System

export const Typography = {
  // Font Families
  fontFamily: {
    primary: 'System', // React Native 기본 시스템 폰트
    notoSans: 'Noto Sans KR', // 한글 최적화 폰트
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
    '4xl': 32,
  },

  // Font Weights
  fontWeight: {
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },

  // Text Styles (자주 사용되는 조합)
  textStyles: {
    h1: {
      fontSize: 28,
      fontWeight: '700',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: 24,
      fontWeight: '600',
      lineHeight: 1.3,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600',
      lineHeight: 1.3,
    },
    body: {
      fontSize: 16,
      fontWeight: '400',
      lineHeight: 1.4,
    },
    bodySmall: {
      fontSize: 14,
      fontWeight: '400',
      lineHeight: 1.4,
    },
    caption: {
      fontSize: 12,
      fontWeight: '400',
      lineHeight: 1.3,
    },
    button: {
      fontSize: 16,
      fontWeight: '600',
      lineHeight: 1.2,
    },
    buttonSmall: {
      fontSize: 14,
      fontWeight: '600',
      lineHeight: 1.2,
    },
  },
};

export default Typography;