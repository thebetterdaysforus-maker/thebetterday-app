// src/components/ui/Button.tsx
// The Better Day - 재사용 가능한 Button 컴포넌트

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Colors from '../../styles/colors';
import Typography from '../../styles/typography';
import { BorderRadius, Spacing } from '../../styles/spacing';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export default function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    disabled && styles.disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`${variant}Text` as keyof typeof styles],
    styles[`${size}Text` as keyof typeof styles],
    disabled && styles.disabledText,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator 
          color={variant === 'outline' ? Colors.primary.sage : Colors.text.white} 
          size="small"
        />
      ) : (
        <Text style={textStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Base styles
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.lg,
    shadowColor: Colors.background.overlay,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Variants
  primary: {
    backgroundColor: Colors.primary.sage,
  },
  secondary: {
    backgroundColor: Colors.secondary.lavenderGray,
  },
  success: {
    backgroundColor: Colors.secondary.goldenYellow,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: Colors.primary.sage,
  },

  // Sizes
  small: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  large: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },

  // Text styles
  text: {
    textAlign: 'center',
    fontWeight: '600' as const,
  },
  primaryText: {
    color: Colors.text.white,
    fontSize: Typography.fontSize.base,
  },
  secondaryText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
  },
  successText: {
    color: Colors.text.primary,
    fontSize: Typography.fontSize.base,
  },
  outlineText: {
    color: Colors.primary.sage,
    fontSize: Typography.fontSize.base,
  },

  // Size-specific text
  smallText: {
    fontSize: Typography.fontSize.sm,
  },
  mediumText: {
    fontSize: Typography.fontSize.base,
  },
  largeText: {
    fontSize: Typography.fontSize.lg,
  },

  // Disabled states
  disabled: {
    backgroundColor: Colors.secondary.lavenderGray,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabledText: {
    color: Colors.text.light,
  },
});