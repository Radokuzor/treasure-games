import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, getReactNativePersistence, initializeAuth, setPersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Get Firebase config from expo-constants which properly loads EXPO_PUBLIC_ variables
const expoConfig = Constants.expoConfig?.extra || {};

const firebaseConfig = {
  apiKey: expoConfig.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: expoConfig.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: expoConfig.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: expoConfig.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: expoConfig.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: expoConfig.EXPO_PUBLIC_FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

console.log('🔥 Firebase Config Check:', {
  hasApiKey: !!firebaseConfig.apiKey,
  hasProjectId: !!firebaseConfig.projectId,
  projectId: firebaseConfig.projectId,
});

export const hasFirebaseConfig = !!firebaseConfig.apiKey;

let app;
let auth;
let db;
let storage;

export function getFirebaseApp() {
  if (!hasFirebaseConfig) return null;
  if (!app) {
    app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
}

export function getFirebaseAuth() {
  const currentApp = getFirebaseApp();
  if (!currentApp) {
    console.warn('⚠️ Firebase app not initialized');
    return null;
  }

  if (!auth) {
    try {
      // Use different persistence based on platform
      if (Platform.OS === 'web') {
        // Web: Use browser local storage persistence
        console.log('🔧 Initializing Firebase Auth with browser localStorage persistence...');
        auth = initializeAuth(currentApp, {
          persistence: browserLocalPersistence,
        });
        console.log('✅ Firebase Auth initialized for WEB with localStorage persistence');
        console.log('🔐 Auth state will persist in browser localStorage');
      } else {
        // Native: Use AsyncStorage persistence
        console.log('🔧 Initializing Firebase Auth with AsyncStorage persistence...');
        auth = initializeAuth(currentApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
        console.log('✅ Firebase Auth initialized for NATIVE with AsyncStorage persistence');
        console.log('🔐 Auth state will persist across app restarts');
      }
    } catch (error) {
      // If initializeAuth fails because auth is already initialized elsewhere
      if (error.code === 'auth/already-initialized') {
        console.log('⚠️ Auth already initialized - using existing instance');
        auth = getAuth(currentApp);

        // Try to set persistence on existing auth instance
        if (Platform.OS === 'web') {
          setPersistence(auth, browserLocalPersistence)
            .then(() => console.log('✅ Set browser localStorage persistence on existing auth'))
            .catch((e) => console.warn('⚠️ Could not set persistence:', e.message));
        }
      } else {
        console.error('❌ Failed to initialize auth with persistence:', error);

        // Last resort: try to get auth without custom persistence
        try {
          auth = getAuth(currentApp);
          console.warn('⚠️ Using Firebase Auth WITHOUT persistence - user will need to sign in each time');
        } catch (fallbackError) {
          console.error('❌ Complete auth initialization failure:', fallbackError);
          return null;
        }
      }
    }
  }
  return auth;
}

export function getDb() {
  const currentApp = getFirebaseApp();
  if (!currentApp) return null;
  if (!db) {
    db = getFirestore(currentApp);
  }
  return db;
}

// Alias for consistency
export const getFirebaseDb = getDb;

export function getFirebaseStorage() {
  const currentApp = getFirebaseApp();
  if (!currentApp) return null;
  if (!storage) {
    storage = getStorage(currentApp);
  }
  return storage;
}