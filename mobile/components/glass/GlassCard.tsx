import React from 'react';
import { View, StyleSheet, ViewProps, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Colors, BorderRadius } from '../../constants/theme';

interface GlassCardProps extends ViewProps {
  children: React.ReactNode;
  intensity?: number;
  variant?: 'default' | 'highlight' | 'accent' | 'danger';
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  intensity = 35,
  variant = 'default',
  style,
  ...props
}) => {
  const isWeb = Platform.OS === 'web';

  const getBorderColor = () => {
    switch (variant) {
      case 'highlight':
        return 'rgba(13, 148, 136, 0.28)';
      case 'accent':
        return Colors.primary;
      case 'danger':
        return 'rgba(220, 38, 38, 0.35)';
      default:
        return Colors.surfaceBorder;
    }
  };

  const content = (
    <View style={[styles.innerContainer, { borderColor: getBorderColor() }, style]} {...props}>
      {children}
    </View>
  );

  if (isWeb) {
    return (
      <View style={[styles.webGlass, { borderColor: getBorderColor() }, style]} {...props}>
        {children}
      </View>
    );
  }

  return (
    <BlurView intensity={intensity} tint="light" style={styles.blurContainer}>
      {content}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  innerContainer: {
    padding: 16,
    borderRadius: BorderRadius.lg,
  },
  webGlass: {
    backgroundColor: 'rgba(255, 255, 255, 0.90)',
    backdropFilter: 'blur(16px)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
  } as any,
});
