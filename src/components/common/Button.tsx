import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

// 일관된 색상 시스템
const Colors = {
  primary: '#0066ff',
  secondary: '#6c757d',
  success: '#28a745',
  error: '#dc3545',
  white: '#ffffff',
  textPrimary: '#333333',
  textSecondary: '#666666',
  border: '#dddddd',
};

const Spacing = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
};

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
}) => {
  const buttonStyle = [
    styles.base,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
  ];

  const textStyle = [
    styles.text,
    styles[`${variant}Text`],
    disabled && styles.disabledText,
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
          size="small" 
          color={variant === 'primary' ? Colors.white : Colors.primary} 
        />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: Spacing.lg,
  },
  
  // Variants
  primary: {
    backgroundColor: Colors.primary,
  },
  secondary: {
    backgroundColor: Colors.secondary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  
  // Sizes
  small: {
    paddingVertical: Spacing.sm,
    minHeight: 36,
  },
  medium: {
    paddingVertical: Spacing.md,
    minHeight: 44,
  },
  large: {
    paddingVertical: Spacing.lg,
    minHeight: 52,
  },
  
  // States
  disabled: {
    opacity: 0.6,
  },
  fullWidth: {
    width: '100%',
  },
  
  // Text styles
  text: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: Colors.white,
  },
  secondaryText: {
    color: Colors.white,
  },
  outlineText: {
    color: Colors.primary,
  },
  ghostText: {
    color: Colors.primary,
  },
  disabledText: {
    opacity: 0.6,
  },
});

export default Button;