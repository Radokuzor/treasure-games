/**
 * Quick script to reset onboarding for testing
 * Run this while your app is running
 */

const AsyncStorage = require('@react-native-async-storage/async-storage');

(async () => {
  try {
    await AsyncStorage.removeItem('hasSeenOnboarding_v3');
    console.log('✅ Onboarding reset successfully!');
    console.log('📱 Now reload your app to see the onboarding screen');
  } catch (error) {
    console.error('❌ Error resetting onboarding:', error);
  }
})();
