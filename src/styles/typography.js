// Typography 시스템 - 일관된 폰트 크기와 스타일
export const Typography = {
  // 헤딩
  h1: { fontSize: 28, fontWeight: 'bold', lineHeight: 34 },
  h2: { fontSize: 24, fontWeight: 'bold', lineHeight: 30 },
  h3: { fontSize: 20, fontWeight: '600', lineHeight: 26 },
  h4: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  
  // 본문
  body1: { fontSize: 16, fontWeight: '400', lineHeight: 22 },
  body2: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  
  // 캡션 및 보조 텍스트
  caption: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  overline: { fontSize: 10, fontWeight: '500', lineHeight: 14, letterSpacing: 0.5 },
  
  // 버튼
  button: { fontSize: 16, fontWeight: '600', lineHeight: 20 },
  buttonSmall: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
};

// 색상 시스템
export const Colors = {
  // Primary
  primary: '#0066ff',
  primaryLight: '#4285f4',
  primaryDark: '#0052cc',
  
  // Secondary
  secondary: '#6c757d',
  secondaryLight: '#adb5bd',
  
  // Status
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
  
  // Neutral
  white: '#ffffff',
  background: '#f5f5f5',
  surface: '#ffffff',
  
  // Text
  textPrimary: '#333333',
  textSecondary: '#666666',
  textDisabled: '#999999',
  textPlaceholder: '#cccccc',
  
  // Border
  border: '#dddddd',
  borderLight: '#eeeeee',
  
  // Shadow
  shadow: '#000000',
};

// 간격 시스템
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// 둥근모서리 시스템
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  round: 50,
};