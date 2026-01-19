/**
 * Quick script to reset onboarding for testing
 * 
 * NOTE: This script won't work directly from Node.js because AsyncStorage
 * is a React Native module. Instead, use one of these methods:
 * 
 * METHOD 1: Delete and reinstall the app
 * 
 * METHOD 2: Add this to a component temporarily:
 *   import AsyncStorage from '@react-native-async-storage/async-storage';
 *   AsyncStorage.removeItem('hasSeenOnboarding_v4');
 *   AsyncStorage.removeItem('@feature_updates_last_seen_version');
 * 
 * METHOD 3: Change the version key in App.js:
 *   Change 'hasSeenOnboarding_v4' to 'hasSeenOnboarding_v5'
 *   This will show onboarding to all users again
 */

console.log('');
console.log('📱 To test the INITIAL ONBOARDING (new user experience):');
console.log('');
console.log('   Option 1: Delete the app from your device and reinstall');
console.log('');
console.log('   Option 2: In App.js, change the key version:');
console.log("             'hasSeenOnboarding_v4' → 'hasSeenOnboarding_v5'");
console.log('');
console.log('📱 To test the FEATURE UPDATES onboarding:');
console.log('');
console.log('   In FeatureUpdatesScreen.jsx, set your featureUpdatesVersion');
console.log('   to 0 in Firestore, or clear AsyncStorage key:');
console.log("   '@feature_updates_last_seen_version'");
console.log('');
