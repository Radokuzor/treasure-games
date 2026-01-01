import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

/**
 * WebResponsiveContainer - Provides responsive max-width container for web
 * On web: Centers content and constrains to maxWidth
 * On mobile: Full width (no constraints)
 */
export const WebResponsiveContainer = ({ children, maxWidth = 1200, style }) => {
  return (
    <View style={[styles.container, Platform.OS === 'web' && { maxWidth }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    ...(Platform.OS === 'web' && {
      alignSelf: 'center',
      paddingHorizontal: 16,
    }),
  },
});
