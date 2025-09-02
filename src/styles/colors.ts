// src/styles/colors.ts
// The Better Day - "Gentle Growth" 컬러 시스템

export const Colors = {
  // Primary Colors (주색상)
  primary: {
    sage: '#8FBC8F',           // 신선한 성장, 희망의 새싹
    warmBeige: '#F5F5DC',      // 안정감, 따뜻함, 포용
    softBlue: '#E6F3FF',       // 평온함, 신뢰, 명료함
  },

  // Secondary Colors (보조색상)
  secondary: {
    forestGreen: '#556B2F',    // 깊은 결의, 확고함 (CTA 버튼용)
    goldenYellow: '#F0E68C',   // 작은 승리의 기쁨 (뱃지, 성취 표시)
    lavenderGray: '#E6E6FA',   // 부드러운 배경, 휴식
  },

  // Accent Colors (강조색상)
  accent: {
    coralPink: '#FFB6C1',      // 따뜻한 경고 (실패 표시)
    deepTeal: '#008B8B',       // 강한 의지 (중요 액션)
  },

  // Semantic Colors (의미적 색상)
  semantic: {
    success: '#8FBC8F',        // 성공 (Primary Sage)
    warning: '#FFB6C1',        // 경고 (Coral Pink)
    info: '#E6F3FF',           // 정보 (Soft Blue)
    danger: '#FFB6C1',         // 위험 (Coral Pink)
  },

  // Text Colors (텍스트 색상)
  text: {
    primary: '#2D4A2D',        // 진한 초록 (주요 텍스트)
    secondary: '#556B2F',      // 포레스트 그린 (보조 텍스트)
    light: '#8A9A8A',          // 연한 회색 (비활성 텍스트)
    white: '#FFFFFF',          // 흰색 (버튼 텍스트)
  },

  // Background Colors (배경 색상)
  background: {
    primary: '#FAFAFA',        // 메인 배경
    secondary: '#F5F5DC',      // 카드 배경
    overlay: 'rgba(0,0,0,0.1)', // 오버레이
  },

  // Border Colors (테두리 색상)
  border: {
    light: '#E6E6FA',          // 연한 테두리
    medium: '#8FBC8F',         // 중간 테두리
    dark: '#556B2F',           // 진한 테두리
  },

  // Legacy colors (기존 호환성)
  green: '#8FBC8F',
  lightGreen: '#E8F5E8',
  blue: '#E6F3FF',
  lightBlue: '#F0F8FF',
  gray: '#E6E6FA',
  lightGray: '#F8F8F8',
  red: '#FFB6C1',
  lightRed: '#FFF0F5',
  yellow: '#F0E68C',
  white: '#FFFFFF',
  black: '#2D4A2D',
};

export default Colors;