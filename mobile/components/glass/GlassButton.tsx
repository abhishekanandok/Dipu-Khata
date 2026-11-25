import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacityProps,
  ViewStyle,
  View,
} from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

interface GlassButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
  title,
  variant = 'primary',
  loading = false,
  size = 'md',
  icon,
  disabled,
  style,
  ...props
}) => {
  const getBackgroundColor = (): ViewStyle => {
    if (disabled) return { backgroundColor: 'rgba(148, 163, 184, 0.2)' };
    switch (variant) {
      case 'primary':
        return { backgroundColor: Colors.primary };
      case 'secondary':
        return {
          backgroundColor: '#E2E8F0',
          borderWidth: 1,
          borderColor: Colors.surfaceBorder,
        };
      case 'danger':
        return { backgroundColor: Colors.danger };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: Colors.primary,
        };
      default:
        return { backgroundColor: Colors.primary };
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: 8, paddingHorizontal: 12 };
      case 'lg':
        return { paddingVertical: 16, paddingHorizontal: 24 };
      default:
        return { paddingVertical: 12, paddingHorizontal: 18 };
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled || loading}
      style={[styles.button, getBackgroundColor(), getPadding(), style]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'outline' ? Colors.primary : '#FFFFFF'}
          size="small"
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
          <Text
            style={[
              styles.text,
              variant === 'secondary' && { color: Colors.textPrimary },
              variant === 'outline' && { color: Colors.primary },
              disabled && styles.textDisabled,
            ]}
          >
            {title}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 6,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
  },
  textDisabled: {
    color: Colors.textMuted,
  },
});
