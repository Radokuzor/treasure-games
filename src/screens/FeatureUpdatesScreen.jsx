import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getDb, hasFirebaseConfig } from '../config/firebase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// FEATURE UPDATE SCREENS CONFIGURATION
// Add new screens here with incrementing version numbers
// Users will only see screens with versions higher than their lastSeenVersion
// ============================================================================
const FEATURE_SCREENS = [
  {
    version: 1,
    id: 'virtual_games_intro',
    icon: 'game-controller',
    iconColor: '#8B5CF6',
    title: 'Virtual Games Are Here!',
    subtitle: 'Play from anywhere, anytime',
    description: 'Introducing Battle Royale virtual games! Compete against players worldwide without leaving your couch. The player with the best score wins the prize! So play as much as you need to, to stay the highest scorer!',
    gradient: ['#8B5CF6', '#6366F1'],
  },
  {
    version: 2,
    id: 'tap_race_game',
    icon: 'finger-print',
    iconColor: '#10B981',
    title: 'Tap Race',
    subtitle: 'Speed is everything',
    description: 'Race to tap the target number as fast as possible! The player who completes the challenge in the shortest time wins. Every millisecond counts!',
    gradient: ['#10B981', '#059669'],
  },
  {
    version: 3,
    id: 'hold_steady_game',
    icon: 'time',
    iconColor: '#F59E0B',
    title: 'Hold Steady',
    subtitle: 'Last one standing wins',
    description: 'Press and hold as long as you can! The competition runs for hours - whoever holds the longest when time runs out takes the prize. Can you outlast everyone?',
    gradient: ['#F59E0B', '#D97706'],
  },
  {
    version: 4,
    id: 'rhythm_tap_game',
    icon: 'musical-notes',
    iconColor: '#EC4899',
    title: 'Rhythm Tap',
    subtitle: 'Feel the beat',
    description: 'Tap in sync with the rhythm! Hit beats perfectly to rack up points. Accuracy and combos boost your score. The highest scorer wins!',
    gradient: ['#EC4899', '#DB2777'],
  },
  // Add more feature screens here as you release updates
  // {
  //   version: 5,
  //   id: 'new_feature_name',
  //   icon: 'icon-name',
  //   iconColor: '#COLOR',
  //   title: 'Feature Title',
  //   subtitle: 'Feature subtitle',
  //   description: 'Feature description...',
  //   gradient: ['#COLOR1', '#COLOR2'],
  // },
];

// Get the latest version number
const LATEST_VERSION = FEATURE_SCREENS.length > 0 
  ? Math.max(...FEATURE_SCREENS.map(s => s.version)) 
  : 0;

const STORAGE_KEY = '@feature_updates_last_seen_version';

const FeatureUpdatesScreen = ({ userId, onComplete }) => {
  const [screensToShow, setScreensToShow] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAndLoadScreens();
  }, [userId]);

  const checkAndLoadScreens = async () => {
    try {
      let lastSeenVersion = 0;

      // Try to get from Firestore first (synced across devices)
      if (hasFirebaseConfig && userId) {
        const db = getDb();
        if (db) {
          const userDoc = await getDoc(doc(db, 'users', userId));
          if (userDoc.exists()) {
            lastSeenVersion = userDoc.data().featureUpdatesVersion || 0;
          }
        }
      }

      // Fallback to AsyncStorage for non-logged in users or if Firestore fails
      if (lastSeenVersion === 0) {
        const storedVersion = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedVersion) {
          lastSeenVersion = parseInt(storedVersion, 10) || 0;
        }
      }

      console.log('📱 Feature updates - Last seen version:', lastSeenVersion, 'Latest:', LATEST_VERSION);

      // Filter screens to only show new ones
      const newScreens = FEATURE_SCREENS.filter(screen => screen.version > lastSeenVersion);

      if (newScreens.length === 0) {
        // No new screens to show
        console.log('📱 No new feature updates to show');
        onComplete?.();
        return;
      }

      console.log('📱 Showing', newScreens.length, 'new feature screens');
      setScreensToShow(newScreens);
      setIsLoading(false);
    } catch (error) {
      console.error('Error checking feature updates:', error);
      onComplete?.();
    }
  };

  const saveProgress = async (version) => {
    try {
      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_KEY, version.toString());

      // Save to Firestore if logged in
      if (hasFirebaseConfig && userId) {
        const db = getDb();
        if (db) {
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, {
            featureUpdatesVersion: version,
          }).catch(async () => {
            // If update fails (doc doesn't exist), try setDoc with merge
            await setDoc(userRef, { featureUpdatesVersion: version }, { merge: true });
          });
        }
      }
    } catch (error) {
      console.error('Error saving feature updates progress:', error);
    }
  };

  const animateTransition = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback();
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = async () => {
    const currentScreen = screensToShow[currentIndex];
    
    // Save progress for this screen
    await saveProgress(currentScreen.version);

    if (currentIndex < screensToShow.length - 1) {
      animateTransition(() => {
        setCurrentIndex(currentIndex + 1);
      });
    } else {
      // All screens viewed
      onComplete?.();
    }
  };

  const handleSkip = async () => {
    // Save progress for all screens (mark all as seen)
    await saveProgress(LATEST_VERSION);
    onComplete?.();
  };

  if (isLoading || screensToShow.length === 0) {
    return null;
  }

  const currentScreen = screensToShow[currentIndex];
  const isLastScreen = currentIndex === screensToShow.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={currentScreen.gradient}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Skip Button */}
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        {/* Content */}
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons name={currentScreen.icon} size={80} color={currentScreen.iconColor} />
            </View>
          </View>

          {/* Text */}
          <Text style={styles.title}>{currentScreen.title}</Text>
          <Text style={styles.subtitle}>{currentScreen.subtitle}</Text>
          <Text style={styles.description}>{currentScreen.description}</Text>

          {/* Battle Royale Badge */}
          <View style={styles.badge}>
            <Ionicons name="trophy" size={16} color="#FFD700" />
            <Text style={styles.badgeText}>Free-For-All Competition</Text>
          </View>
        </Animated.View>

        {/* Progress Dots */}
        <View style={styles.dotsContainer}>
          {screensToShow.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
          <View style={styles.nextButtonInner}>
            <Text style={styles.nextButtonText}>
              {isLastScreen ? "Let's Go!" : 'Next'}
            </Text>
            <Ionicons 
              name={isLastScreen ? 'checkmark' : 'arrow-forward'} 
              size={24} 
              color={currentScreen.gradient[0]} 
            />
          </View>
        </TouchableOpacity>

        {/* Screen Counter */}
        <Text style={styles.counter}>
          {currentIndex + 1} of {screensToShow.length}
        </Text>
      </LinearGradient>
    </View>
  );
};

// Static method to check if there are updates to show
FeatureUpdatesScreen.hasUpdatesToShow = async (userId) => {
  try {
    let lastSeenVersion = 0;

    // Try Firestore first
    if (hasFirebaseConfig && userId) {
      const db = getDb();
      if (db) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          lastSeenVersion = userDoc.data().featureUpdatesVersion || 0;
        }
      }
    }

    // Fallback to AsyncStorage
    if (lastSeenVersion === 0) {
      const storedVersion = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedVersion) {
        lastSeenVersion = parseInt(storedVersion, 10) || 0;
      }
    }

    return lastSeenVersion < LATEST_VERSION;
  } catch (error) {
    console.error('Error checking for feature updates:', error);
    return false;
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 40,
  },
  skipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  iconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dotActive: {
    width: 24,
    backgroundColor: '#FFFFFF',
  },
  nextButton: {
    marginBottom: 16,
  },
  nextButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  counter: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FeatureUpdatesScreen;
