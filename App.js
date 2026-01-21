import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { getDb, getFirebaseAuth, hasFirebaseConfig } from './src/config/firebase';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AdminMediaUploadScreen from './src/screens/AdminMediaUploadScreen';
import AdminScreen from './src/screens/AdminScreen';
import AuthScreen from './src/screens/AuthScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import EditProfileScreen from './src/screens/EditProfileScreen';
import FeatureUpdatesScreen from './src/screens/FeatureUpdatesScreen';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';
import HomeScreen from './src/screens/HomeScreen';
import HowToPlayScreen from './src/screens/HowToPlayScreen';
import LiveGameScreen from './src/screens/LiveGameScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import PrivacyScreen from './src/screens/PrivacyScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TermsScreen from './src/screens/TermsScreen';
import WinnerCardScreen from './src/screens/WinnerCardScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const ONBOARDING_SEEN_KEY = 'hasSeenOnboarding_v4'; // Changed to v5 to test onboarding

// Get current app version from app.json
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

// Helper function to compare semantic versions
// Returns: -1 if v1 < v2, 0 if v1 == v2, 1 if v1 > v2
const compareVersions = (v1, v2) => {
  const parts1 = v1.split('.').map(Number);
  const parts2 = v2.split('.').map(Number);
  
  for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
    const p1 = parts1[i] || 0;
    const p2 = parts2[i] || 0;
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  return 0;
};

const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#FFFFFF" />
  </View>
);

// Tab Navigator Component with Feature Updates
const TabNavigator = ({ route }) => {
  const { theme } = useTheme();
  const [showFeatureUpdates, setShowFeatureUpdates] = useState(true);
  const [pendingWinnerCard, setPendingWinnerCard] = useState(null);
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const userId = route?.params?.userId;

  // Determine if we're using a light theme
  const isLightTheme = theme.colors.text === '#1A1A2E';

  // Check for pending winner card on mount
  useEffect(() => {
    const checkPendingWinnerCard = async () => {
      if (!userId || !hasFirebaseConfig) return;

      try {
        const db = getDb();
        if (!db) return;

        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.pendingWinnerCard) {
            console.log('🎉 Found pending winner card:', userData.pendingWinnerCard);
            setPendingWinnerCard(userData.pendingWinnerCard);
            setShowWinnerCard(true);

            // Clear the pending winner card from Firestore
            await updateDoc(userRef, {
              pendingWinnerCard: deleteField(),
            });
          }
        }
      } catch (error) {
        console.error('Error checking pending winner card:', error);
      }
    };

    checkPendingWinnerCard();
  }, [userId]);

  const handleWinnerCardClose = () => {
    setShowWinnerCard(false);
    setPendingWinnerCard(null);
  };

  return (
    <>
      <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          elevation: 0,
          height: 85,
          paddingBottom: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={[...theme.gradients.background].reverse()}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
          />
        ),
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: isLightTheme ? theme.colors.text : 'rgba(255,255,255,0.4)',
        tabBarLabel: ({ color, children }) => (
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              marginTop: 4,
              color: isLightTheme ? theme.colors.text : color,
            }}
          >
            {children}
          </Text>
        ),
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Community') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          }

          if (focused) {
            return (
              <View style={styles.activeIconContainer}>
                <LinearGradient
                  colors={theme.gradients.accent}
                  style={styles.activeIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name={iconName} size={size} color={color} />
                </LinearGradient>
              </View>
            );
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      })}
    >
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
    
    {/* Feature Updates Overlay */}
    {showFeatureUpdates && (
      <FeatureUpdatesScreen
        userId={userId}
        onComplete={() => setShowFeatureUpdates(false)}
      />
    )}

    {/* Pending Winner Card - shows when user won Battle Royale while away */}
    {showWinnerCard && pendingWinnerCard && (
      <WinnerCardScreen
        visible={showWinnerCard}
        onClose={handleWinnerCardClose}
        gameName={pendingWinnerCard.gameName}
        position={pendingWinnerCard.position}
        score={pendingWinnerCard.score}
        gameType={pendingWinnerCard.gameType}
        wonMoney={pendingWinnerCard.wonMoney || false}
        city={pendingWinnerCard.city}
        sponsorLogo={pendingWinnerCard.sponsorLogo}
        sponsorName={pendingWinnerCard.sponsorName}
        isCompetitionActive={false}
      />
    )}
    </>
  );
};

// Main App Component
export default function App() {
  const [hasSeenOnboarding, setHasSeenOnboarding] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  
  // Version check state
  const [versionConfig, setVersionConfig] = useState(null);
  const [updateStatus, setUpdateStatus] = useState(null); // null, 'optional', 'forced'
  const [skippedUpdate, setSkippedUpdate] = useState(false);

  const navigatorKey = useMemo(() => {
    const onboardingKey = hasSeenOnboarding ? 'seen' : 'new';
    const userKey = user ? 'user' : 'guest';
    return `${onboardingKey}-${userKey}`;
  }, [hasSeenOnboarding, user]);

  // Check app version on startup
  useEffect(() => {
    const checkAppVersion = async () => {
      if (!hasFirebaseConfig) {
        console.log('📱 No Firebase config - skipping version check');
        return;
      }

      try {
        const db = getDb();
        if (!db) {
          console.log('📱 No Firestore - skipping version check');
          return;
        }

        // Fetch version config from Firestore
        const configRef = doc(db, 'config', 'appVersion');
        const configSnap = await getDoc(configRef);

        if (!configSnap.exists()) {
          console.log('📱 No version config found in Firestore');
          return;
        }

        const config = configSnap.data();
        setVersionConfig(config);

        console.log('📱 App Version Check:');
        console.log('   Current:', APP_VERSION);
        console.log('   Minimum:', config.minimumVersion);
        console.log('   Latest:', config.latestVersion);

        // Check if current version is below minimum (force update)
        if (config.minimumVersion && compareVersions(APP_VERSION, config.minimumVersion) < 0) {
          console.log('🚨 Force update required!');
          setUpdateStatus('forced');
          return;
        }

        // Check if there's a newer version available (optional update)
        if (config.latestVersion && compareVersions(APP_VERSION, config.latestVersion) < 0) {
          console.log('📢 Optional update available');
          setUpdateStatus('optional');
          return;
        }

        console.log('✅ App is up to date');
        setUpdateStatus(null);
      } catch (error) {
        console.error('❌ Version check error:', error);
        // Don't block the app if version check fails
        setUpdateStatus(null);
      }
    };

    checkAppVersion();
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const seen = await AsyncStorage.getItem(ONBOARDING_SEEN_KEY);
        if (!isMounted) return;
        setHasSeenOnboarding(seen === 'true');
      } catch (error) {
        console.error('Error checking onboarding:', error);
        if (!isMounted) return;
        setHasSeenOnboarding(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (hasSeenOnboarding === null) return;
    if (!hasSeenOnboarding) {
      setUser(null);
      setInitializing(false);
      return;
    }

    let didFinish = false;
    let unsubscribe = null;

    // 10-second safety net to stop loading spinner if Firebase fails
    // Increased timeout to allow for slow network/auth restoration
    const timeout = setTimeout(() => {
      if (didFinish) return;
      didFinish = true;
      console.warn('⏰ Firebase initialization timeout - proceeding without auth');
      setInitializing(false);
    }, 10000);

    if (!hasFirebaseConfig) {
      didFinish = true;
      setUser(null);
      setInitializing(false);
      clearTimeout(timeout);
      return () => clearTimeout(timeout);
    }

    // Initialize Firebase and set up auth listener
    (async () => {
      try {
        // Wait for Firebase to initialize
        const firebaseAuth = await getFirebaseAuth();

        if (!firebaseAuth) {
          console.warn('⚠️ Firebase Auth not available');
          didFinish = true;
          setInitializing(false);
          clearTimeout(timeout);
          return;
        }

        // Import onAuthStateChanged dynamically
        const { onAuthStateChanged } = await import('firebase/auth');

        // Set up auth state listener
        console.log('👂 Setting up auth state listener');
        unsubscribe = onAuthStateChanged(
          firebaseAuth,
          (nextUser) => {
            if (didFinish) return;
            didFinish = true;

            if (nextUser) {
              console.log('✅ Auth state restored: User logged in');
              console.log('👤 User ID:', nextUser.uid);
              console.log('📧 Email:', nextUser.email);
            } else {
              console.log('👤 Auth state: No user logged in');
            }

            setUser(nextUser);
            setInitializing(false);
            clearTimeout(timeout);
          },
          (error) => {
            console.error('❌ Auth state error:', error);
            if (didFinish) return;
            didFinish = true;
            setUser(null);
            setInitializing(false);
            clearTimeout(timeout);
          }
        );
      } catch (error) {
        console.error('❌ Auth listener setup error:', error);
        if (didFinish) return;
        didFinish = true;
        setUser(null);
        setInitializing(false);
        clearTimeout(timeout);
      }
    })();

    return () => {
      didFinish = true;
      clearTimeout(timeout);
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [hasSeenOnboarding]);

  // Show force update screen if required
  if (updateStatus === 'forced') {
    return (
      <ThemeProvider>
        <ForceUpdateScreen
          currentVersion={APP_VERSION}
          minimumVersion={versionConfig?.minimumVersion}
          latestVersion={versionConfig?.latestVersion}
          updateMessage={versionConfig?.forceUpdateMessage}
          isForced={true}
        />
      </ThemeProvider>
    );
  }

  // Show optional update screen (can be skipped)
  if (updateStatus === 'optional' && !skippedUpdate) {
    return (
      <ThemeProvider>
        <ForceUpdateScreen
          currentVersion={APP_VERSION}
          minimumVersion={versionConfig?.minimumVersion}
          latestVersion={versionConfig?.latestVersion}
          updateMessage={versionConfig?.optionalUpdateMessage}
          isForced={false}
          onSkip={() => setSkippedUpdate(true)}
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      {initializing ? (
        <LoadingScreen />
      ) : (
        <NavigationContainer>
          <Stack.Navigator
            key={navigatorKey}
            initialRouteName={!hasSeenOnboarding ? 'Onboarding' : user ? 'MainTabs' : 'Auth'}
            screenOptions={{ headerShown: false }}
          >
            {!hasSeenOnboarding ? (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            ) : null}
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen 
              name="MainTabs" 
              component={TabNavigator}
              initialParams={{ userId: user?.uid }}
            />
            <Stack.Screen name="Admin" component={AdminScreen} />
            <Stack.Screen name="AdminMediaUpload" component={AdminMediaUploadScreen} />
            <Stack.Screen name="HowToPlay" component={HowToPlayScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Terms" component={TermsScreen} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} />
            <Stack.Screen
              name="LiveGame"
              component={LiveGameScreen}
              options={{
                presentation: 'fullScreenModal',
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
