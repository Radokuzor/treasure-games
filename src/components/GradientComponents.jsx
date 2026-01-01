import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export const GradientBackground = ({ children, style, gradientType = 'background' }) => {
  const { theme } = useTheme();
  const colors = theme.gradients[gradientType] || theme.gradients.background;

  return (
    <LinearGradient
      colors={colors}
      style={[styles.gradient, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

export const GradientCard = ({ children, style }) => {
  const { theme } = useTheme();
  
  // Add subtle shadow for light themes
  const isLightTheme = theme.colors.text === '#1A1A2E';
  const cardStyle = isLightTheme ? [
    styles.card, 
    style,
    { 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3,
    }
  ] : [styles.card, style];

  return (
    <LinearGradient
      colors={theme.gradients.card}
      style={cardStyle}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {children}
    </LinearGradient>
  );
};

export const GradientButton = ({ children, onPress, style, gradientType = 'primary' }) => {
  const { theme } = useTheme();
  const colors = theme.gradients[gradientType];

  return (
    <LinearGradient
      colors={colors}
      style={[styles.button, style]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <View style={styles.buttonContent}>
        {children}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  buttonContent: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
