// src/components/ui/Card.tsx
// The Better Day - 재사용 가능한 Card 컴포넌트

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Colors from '../../styles/colors';
import { BorderRadius, Spacing } from '../../styles/spacing';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export default function Card({
  children,
  style,
  variant = 'default',
  padding = 'medium',
}: CardProps) {
  const cardStyle = [
    styles.base,
    styles[variant],
    styles[padding],
    style,
  ];

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  // Base styles
  base: {
    backgroundColor: Colors.background.secondary,
    borderRadius: BorderRadius.xl,
  },

  // Variants
  default: {
    shadowColor: Colors.background.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  elevated: {
    shadowColor: Colors.background.overlay,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  outlined: {
    borderWidth: 1,
    borderColor: Colors.border.light,
    shadowOpacity: 0,
    elevation: 0,
  },

  // Padding variants
  none: {
    padding: 0,
  },
  small: {
    padding: Spacing.md,
  },
  medium: {
    padding: Spacing.lg,
  },
  large: {
    padding: Spacing.xl,
  },
});