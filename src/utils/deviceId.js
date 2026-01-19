import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Conditionally import expo-application for native platforms
let Application = null;
if (Platform.OS !== 'web') {
  try {
    Application = require('expo-application');
  } catch (e) {
    console.warn('expo-application not available');
  }
}

/**
 * Get a unique device identifier
 * - iOS: Uses identifierForVendor (resets on app reinstall)
 * - Android: Uses androidId (persistent across reinstalls)
 * - Web: Generates and persists a UUID in AsyncStorage
 */
export const getDeviceId = async () => {
  try {
    if (Platform.OS === 'web') {
      // For web, generate and persist a UUID
      let webId = await AsyncStorage.getItem('treasureDeviceId');
      if (!webId) {
        webId = 'web_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('treasureDeviceId', webId);
      }
      return webId;
    }

    if (!Application) {
      // Fallback if expo-application isn't available
      let fallbackId = await AsyncStorage.getItem('treasureDeviceId');
      if (!fallbackId) {
        fallbackId = 'fallback_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
        await AsyncStorage.setItem('treasureDeviceId', fallbackId);
      }
      return fallbackId;
    }

    // iOS: Use identifierForVendor
    if (Platform.OS === 'ios') {
      const iosId = await Application.getIosIdForVendorAsync();
      if (iosId) return iosId;
    }

    // Android: Use androidId
    if (Platform.OS === 'android') {
      const androidId = Application.androidId;
      if (androidId) return androidId;
    }

    // Fallback
    let fallbackId = await AsyncStorage.getItem('treasureDeviceId');
    if (!fallbackId) {
      fallbackId = 'device_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
      await AsyncStorage.setItem('treasureDeviceId', fallbackId);
    }
    return fallbackId;
  } catch (error) {
    console.error('Error getting device ID:', error);
    // Ultimate fallback
    return 'error_' + Date.now().toString(36);
  }
};
