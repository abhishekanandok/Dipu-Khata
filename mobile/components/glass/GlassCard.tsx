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
        return 'rgba(255, 255, 255, 0.28)';
      case 'accent':
        return Colors.primaryLight;
      case 'danger':
        return Colors.danger;
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
    <BlurView intensity={intensity} tint="dark" style={styles.blurContainer}>
      {content}
    </BlurView>
  );
};

const styles = StyleSheet.create({
  blurContainer: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  innerContainer: {
    padding: 16,
    borderRadius: BorderRadius.lg,
  },
  webGlass: {
    backgroundColor: 'rgba(30, 41, 59, 0.75)',
    backdropFilter: 'blur(16px)',
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: 16,
  } as any,
});
