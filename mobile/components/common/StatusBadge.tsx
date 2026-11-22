import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, BorderRadius } from '../../constants/theme';

export type BadgeVariant = 'success' | 'danger' | 'warning' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  hindiLabel?: string;
  variant?: BadgeVariant;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  hindiLabel,
  variant = 'neutral',
}) => {
  const getBadgeColors = () => {
    switch (variant) {
      case 'success':
        return { bg: Colors.successGlass, border: Colors.success, text: Colors.success };
      case 'danger':
        return { bg: Colors.dangerGlass, border: Colors.danger, text: Colors.danger };
      case 'warning':
        return { bg: Colors.warningGlass, border: Colors.warning, text: Colors.warning };
      case 'info':
        return { bg: Colors.infoGlass, border: Colors.info, text: Colors.info };
      default:
        return {
          bg: 'rgba(255, 255, 255, 0.08)',
          border: Colors.surfaceBorder,
          text: Colors.textSecondary,
        };
    }
  };

  const colors = getBadgeColors();

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.text, { color: colors.text }]}>
        {label}
        {hindiLabel ? ` (${hindiLabel})` : ''}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
