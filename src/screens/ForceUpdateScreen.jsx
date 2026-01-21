import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import React from 'react';
import {
  BackHandler,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// App Store URLs
const APP_STORE_URL = 'https://apps.apple.com/us/app/treasure-island-city-games/id6756993281';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kingkuz.hoodgames';

const ForceUpdateScreen = ({ 
  currentVersion, 
  minimumVersion, 
  latestVersion,
  updateMessage,
  isForced = false,
  onSkip,
}) => {
  // Prevent back button on Android for forced updates
  React.useEffect(() => {
    if (!isForced) return;

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Return true to prevent default back behavior
      return true;
    });

    return () => backHandler.remove();
  }, [isForced]);

  const handleUpdate = () => {
    const storeUrl = Platform.OS === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
    Linking.openURL(storeUrl).catch((err) => {
      console.error('Failed to open store:', err);
    });
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#1A1A2E', '#16213E', '#0F3460']}
        style={styles.gradient}
      >
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={isForced ? ['#EF4444', '#DC2626'] : ['#F59E0B', '#D97706']}
              style={styles.iconGradient}
            >
              <Ionicons 
                name={isForced ? 'alert-circle' : 'arrow-up-circle'} 
                size={64} 
                color="#FFFFFF" 
              />
            </LinearGradient>
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isForced ? 'Update Required' : 'Update Available'}
          </Text>

          {/* Message */}
          <Text style={styles.message}>
            {updateMessage || (isForced 
              ? 'Your app version is no longer supported. Please update to continue using Treasure Island City Games.'
              : 'A new version of Treasure Island City Games is available with exciting new features and improvements!'
            )}
          </Text>

          {/* Version Info */}
          <View style={styles.versionContainer}>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Current Version:</Text>
              <Text style={styles.versionValue}>{currentVersion}</Text>
            </View>
            <View style={styles.versionRow}>
              <Text style={styles.versionLabel}>Latest Version:</Text>
              <Text style={[styles.versionValue, styles.versionHighlight]}>{latestVersion}</Text>
            </View>
            {isForced && minimumVersion && (
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Minimum Required:</Text>
                <Text style={[styles.versionValue, styles.versionRequired]}>{minimumVersion}</Text>
              </View>
            )}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={handleUpdate}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.updateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="download-outline" size={24} color="#FFFFFF" />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Skip Button (only for non-forced updates) */}
          {!isForced && onSkip && (
            <TouchableOpacity
              style={styles.skipButton}
              onPress={onSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Maybe Later</Text>
            </TouchableOpacity>
          )}

          {/* Warning for forced updates */}
          {isForced && (
            <View style={styles.warningContainer}>
              <Ionicons name="information-circle" size={16} color="#F59E0B" />
              <Text style={styles.warningText}>
                You cannot continue without updating
              </Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  versionContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 32,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  versionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  versionValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  versionHighlight: {
    color: '#10B981',
  },
  versionRequired: {
    color: '#EF4444',
  },
  updateButton: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 12,
  },
  updateButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
  },
});

export default ForceUpdateScreen;
