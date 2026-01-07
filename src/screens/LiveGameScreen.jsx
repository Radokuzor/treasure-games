import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Timestamp,
  arrayUnion,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Conditionally import native modules
let Audio, Location, Haptics;
if (Platform.OS !== 'web') {
  const ExpoAV = require('expo-av');
  Audio = ExpoAV.Audio;
  Location = require('expo-location');
  Haptics = require('expo-haptics');
} else {
  // Web fallbacks - use browser Geolocation API
  Location = require('expo-location');
}
// Conditionally import confetti for native only
let ConfettiCannon;
if (Platform.OS !== 'web') {
  ConfettiCannon = require('react-native-confetti').default;
}

import { getFirebaseAuth, getFirebaseDb } from '../config/firebase';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CAROUSEL_HEIGHT = 400;
const AUTO_ADVANCE_INTERVAL = 4000; // 4 seconds

export default function LiveGameScreen({ route, navigation }) {
  const { gameId } = route.params;

  // Game data
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);

  // User location and tracking
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [proximityPercent, setProximityPercent] = useState(0);
  const [oddsPercent, setOddsPercent] = useState(0);

  // Compass feature
  const [bearing, setBearing] = useState(0);
  const [compassEnabled, setCompassEnabled] = useState(true);
  const [showCompass, setShowCompass] = useState(false);
  const compassRotation = useRef(new Animated.Value(0)).current;

  // Photo carousel
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [fullScreenPhoto, setFullScreenPhoto] = useState(null);
  const scrollViewRef = useRef(null);

  // Game state
  const [hasJoined, setHasJoined] = useState(false);
  const [isWinner, setIsWinner] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Animations
  const celebrationAnim = useRef(new Animated.Value(0)).current;
  const [showConfetti, setShowConfetti] = useState(false);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef(null);
  const [toastMessage, setToastMessage] = useState('');

  // Exit game screen
  const handleExit = () => {
    try {
      if (Platform.OS === 'web') {
        if (navigation?.canGoBack?.()) {
          navigation.goBack();
          return;
        }
        navigation?.navigate?.('MainTabs');
        return;
      }

      navigation?.goBack?.();
    } catch (_error) {
      // no-op
    }
  };

  const showToast = useCallback(
    (message) => {
      setToastMessage(message);
      try {
        if (toastTimeoutRef.current) {
          clearTimeout(toastTimeoutRef.current);
          toastTimeoutRef.current = null;
        }

        toastAnim.stopAnimation();
        toastAnim.setValue(0);

        Animated.timing(toastAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }).start();

        toastTimeoutRef.current = setTimeout(() => {
          Animated.timing(toastAnim, {
            toValue: 0,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            setToastMessage('');
          });
        }, 2600);
      } catch (_error) {
        // no-op
      }
    },
    [toastAnim]
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Trigger celebration animation
  const triggerCelebration = useCallback(async () => {
    try {
      // Haptic feedback
      if (Platform.OS !== 'web' && Haptics) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Trigger confetti
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000); // Hide after 3 seconds

      // Play sound (native only)
      if (Platform.OS !== 'web' && Audio) {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require('../../assets/sounds/celebration.mp3')
          );
          await sound.playAsync();
        } catch (_soundError) {
          console.log('Sound file not found, skipping audio');
        }
      }

      // Scale animation
      Animated.sequence([
        Animated.timing(celebrationAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(celebrationAnim, {
          toValue: 0,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();
    } catch (error) {
      console.error('❌ Celebration error:', error);
    }
  }, [celebrationAnim]);

  // Get current user
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // Convert meters to miles
  const metersToMiles = (meters) => {
    return (meters * 0.000621371).toFixed(1);
  };

  const formatDistanceAway = (meters) => {
    if (typeof meters !== 'number' || !Number.isFinite(meters)) return '';

    const metersPerMile = 1609.344;
    const metersPerYard = 0.9144;
    const metersPerFoot = 0.3048;

    if (meters < 10 * metersPerYard) {
      const feet = Math.max(0, Math.round(meters / metersPerFoot));
      return `${feet} ${feet === 1 ? 'foot' : 'feet'} away`;
    }

    if (meters < metersPerMile) {
      const yards = Math.max(0, Math.round(meters / metersPerYard));
      return `${yards} ${yards === 1 ? 'yard' : 'yards'} away`;
    }

    const miles = meters / metersPerMile;
    const milesRounded = miles >= 10 ? miles.toFixed(0) : miles.toFixed(1);
    const milesNumber = Number(milesRounded);
    return `${milesRounded} ${milesNumber === 1 ? 'mile' : 'miles'} away`;
  };

  // Calculate bearing (direction) from user to target location
  const calculateBearing = (lat1, lon1, lat2, lon2) => {
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
    const θ = Math.atan2(y, x);
    const bearingDegrees = ((θ * 180) / Math.PI + 360) % 360; // Convert to degrees and normalize

    return bearingDegrees;
  };

  // Calculate proximity percentage (0 = far, 100 = at location)
  const calculateProximity = (distanceInMeters, accuracyRadius) => {
    if (!distanceInMeters) return 0;
    if (distanceInMeters <= accuracyRadius) return 100;

    // Keep the background mostly white until you're within ~50 yards,
    // then fade to full green as you approach the actual spot.
    const FADE_START_METERS = 50 * 0.9144; // 50 yards
    const effectiveRadius = Math.max(0, Number(accuracyRadius) || 0);

    if (distanceInMeters >= FADE_START_METERS) return 0;

    // If the radius is >= fade start, just treat anything within fade start as "near".
    if (effectiveRadius >= FADE_START_METERS) {
      const ratio = 1 - distanceInMeters / FADE_START_METERS;
      return Math.max(0, Math.min(100, Math.round(ratio * 100)));
    }

    const ratio =
      1 - (distanceInMeters - effectiveRadius) / (FADE_START_METERS - effectiveRadius);
    return Math.max(0, Math.min(100, Math.round(ratio * 100)));
  };

  // Calculate odds of winning based on proximity and current winners
  const calculateOdds = (proximityPct, currentWinners, totalSlots) => {
    const slotsRemaining = totalSlots - currentWinners;
    if (slotsRemaining <= 0) return 0;

    // Base odds on proximity (0-100%)
    let baseOdds = proximityPct;

    // Boost odds significantly when very close
    if (proximityPct > 90) {
      baseOdds = 95 + (proximityPct - 90); // 95-100%
    } else if (proximityPct > 70) {
      baseOdds = 70 + ((proximityPct - 70) / 20) * 25; // 70-95%
    }

    // Adjust for remaining slots
    const slotMultiplier = slotsRemaining / totalSlots;
    return Math.round(baseOdds * slotMultiplier);
  };

  // Get background gradient colors based on proximity
  const getBackgroundGradient = () => {
    const white = { r: 255, g: 255, b: 255 };
    const green = { r: 16, g: 185, b: 129 }; // #10B981
    const percent = proximityPercent / 100;

    const r = Math.round(white.r + (green.r - white.r) * percent);
    const g = Math.round(white.g + (green.g - white.g) * percent);
    const b = Math.round(white.b + (green.b - white.b) * percent);

    // Create gradient from calculated color to slightly darker version
    const color1 = `rgb(${r}, ${g}, ${b})`;
    const color2 = `rgb(${Math.max(0, r - 20)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;

    return [color1, color2];
  };

  // Check if user has compass feature enabled
  useEffect(() => {
    if (!currentUser) return;

    const db = getFirebaseDb();
    if (!db) return;

    const userRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        setCompassEnabled(userData?.compassEnabled !== false);
      } else {
        setCompassEnabled(true);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Auto-join game when screen loads
  useEffect(() => {
    if (!game || !currentUser || hasJoined) return;

    const joinGame = async () => {
      try {
        const db = getFirebaseDb();
        const gameRef = doc(db, 'games', gameId);

        // Add user to participants if not already there
        if (!game.participants?.includes(currentUser.uid)) {
          await updateDoc(gameRef, {
            participants: arrayUnion(currentUser.uid),
            updatedAt: serverTimestamp(),
          });
          console.log('✅ Auto-joined game:', gameId);
        }

        setHasJoined(true);
      } catch (error) {
        console.error('❌ Error joining game:', error);
      }
    };

    joinGame();
  }, [game, currentUser, hasJoined, gameId]);

  // Listen to game updates
  useEffect(() => {
    if (!gameId) {
      console.error('❌ No gameId provided');
      setLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      console.error('❌ Firebase not configured');
      setLoading(false);
      return;
    }

    const gameRef = doc(db, 'games', gameId);

    console.log('👂 Listening to game:', gameId);
    const unsubscribe = onSnapshot(
      gameRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const gameData = { id: snapshot.id, ...snapshot.data() };
          console.log('✅ Game data loaded:', gameData.name);
          setGame(gameData);

          // Check if current user is a winner
          if (currentUser && gameData.winners) {
            const userWinner = gameData.winners.find((w) => w.userId === currentUser.uid);
            if (userWinner && !isWinner) {
              setIsWinner(true);
              triggerCelebration();
            }
          }

          // Show leaderboard if game is completed
          if (gameData.status === 'completed' && !showLeaderboard) {
            setTimeout(() => setShowLeaderboard(true), 2000);
          }
        } else {
          console.error('❌ Game document does not exist');
          setGame(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('❌ Error listening to game:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [gameId, currentUser, isWinner, showLeaderboard, triggerCelebration]);

  // Start GPS tracking
  useEffect(() => {
    let locationSubscription = null;
    let webPollInterval = null;

    const startTracking = async () => {
      try {
        if (!Location?.requestForegroundPermissionsAsync || !Location?.watchPositionAsync) {
          console.warn('⚠️ Location APIs not available on this platform');
          return;
        }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('⚠️ Location permission denied');
          return;
        }

        // Web: expo-location watchPosition cleanup can crash in some Safari builds.
        // Use polling instead to avoid emitter unsubscribe issues.
        if (Platform.OS === 'web') {
          const poll = async () => {
            try {
              const pos = await Location.getCurrentPositionAsync({
                accuracy: Location?.Accuracy?.Balanced,
              });
              if (pos?.coords) setUserLocation(pos.coords);
            } catch (error) {
              console.log('⚠️ Web location poll error:', error?.message ?? error);
            }
          };

          await poll();
          webPollInterval = setInterval(poll, 2500);
          return;
        }

        // Watch position with high accuracy
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location?.Accuracy?.BestForNavigation ?? Location?.Accuracy?.Balanced,
            distanceInterval: 5, // Update every 5 meters
            timeInterval: 2000, // Update every 2 seconds
          },
          (location) => {
            setUserLocation(location.coords);
          }
        );
      } catch (error) {
        console.error('❌ Error starting location tracking:', error);
      }
    };

    startTracking();

    return () => {
      if (webPollInterval) {
        clearInterval(webPollInterval);
        webPollInterval = null;
      }

      if (locationSubscription) {
        try {
          if (typeof locationSubscription.remove === 'function') locationSubscription.remove();
        } catch (error) {
          console.log('⚠️ Location subscription cleanup error:', error?.message ?? error);
        }
      }
    };
  }, []);

  // Calculate distance and proximity when location or game changes
  useEffect(() => {
    if (!game?.location || !userLocation) return;

    const dist = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      game.location.latitude,
      game.location.longitude
    );

    setDistance(dist);

    const proximity = calculateProximity(dist, game.accuracyRadius || 10);
    setProximityPercent(proximity);

    const odds = calculateOdds(proximity, game.winners?.length || 0, game.winnerSlots || 3);
    setOddsPercent(odds);

    // Calculate bearing for compass
    const bearingDegrees = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      game.location.latitude,
      game.location.longitude
    );
    setBearing(bearingDegrees);

    // Animate compass rotation
    Animated.timing(compassRotation, {
      toValue: bearingDegrees,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [userLocation, game, compassRotation]);

  // Compass show/hide cycle: 7 seconds visible, 5 seconds hidden
  useEffect(() => {
    if (!compassEnabled || isWinner) return;

    let showTimer;
    let hideTimer;

    const startCycle = () => {
      // Show compass for 7 seconds
      setShowCompass(true);

      showTimer = setTimeout(() => {
        // Hide compass for 5 seconds
        setShowCompass(false);

        hideTimer = setTimeout(() => {
          // Start the cycle again
          startCycle();
        }, 5000); // 5 seconds hidden
      }, 7000); // 7 seconds visible
    };

    startCycle();

    return () => {
      if (showTimer) clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [compassEnabled, isWinner]);

  // Auto-advance photo carousel
  useEffect(() => {
    if (!game?.cluePhotos || game.cluePhotos.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentPhotoIndex((prev) => {
        const next = (prev + 1) % game.cluePhotos.length;
        scrollViewRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_INTERVAL);

    return () => clearInterval(interval);
  }, [game?.cluePhotos]);

  // Handle manual photo scroll
  const handlePhotoScroll = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPhotoIndex(index);
  };

  // Submit attempt to reach location
  const handleSubmitAttempt = async () => {
    if (!game || !currentUser || !userLocation) return;

    try {
      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const accuracyRadiusMeters = Number(game?.accuracyRadius) || 10;
      const distanceMeters =
        typeof distance === 'number' && Number.isFinite(distance) ? distance : Number.POSITIVE_INFINITY;

      if (!Number.isFinite(distanceMeters)) {
        showToast('Getting your distance… try again in a second.');
        return;
      }

      if (distanceMeters > accuracyRadiusMeters) {
        const away = formatDistanceAway(distanceMeters);
        showToast(`You're ${away}. Get closer to win.`);
        return;
      }

      const db = getFirebaseDb();
      const gameRef = doc(db, 'games', gameId);
      const userRef = doc(db, 'users', currentUser.uid);

      const currentTime = Timestamp.now();

      const attempt = {
        userId: currentUser.uid,
        attemptedAt: currentTime,
        distance: distance,
        location: {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        },
      };

      let didWin = false;
      let wasAlreadyWinner = false;

      await runTransaction(db, async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists()) throw new Error('Game not found');

        const gameData = gameSnap.data();
        const winners = Array.isArray(gameData?.winners) ? gameData.winners : [];
        const winnerSlots = Number(gameData?.winnerSlots) || 3;
        const accuracyRadius = Number(gameData?.accuracyRadius) || 10;

        wasAlreadyWinner = winners.some((w) => w?.userId === currentUser.uid);

        const isSuccess = distanceMeters <= accuracyRadius;
        const canWin = isSuccess && !wasAlreadyWinner && winners.length < winnerSlots;

        const gameUpdate = {
          attempts: arrayUnion(attempt),
          updatedAt: serverTimestamp(),
        };

        if (canWin) {
          const winner = {
            userId: currentUser.uid,
            position: winners.length + 1,
            completedAt: currentTime,
            distance: distanceMeters,
          };

          gameUpdate.winners = arrayUnion(winner);

          const prizeAmount = Number(gameData?.prizeAmount) || 0;
          transaction.set(
            userRef,
            {
              balance: increment(prizeAmount),
              earnings: increment(prizeAmount),
              wins: increment(1),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          didWin = true;
        }

        transaction.update(gameRef, gameUpdate);
      });

      if (didWin) {
        setIsWinner(true);
        console.log('🎉 User won the game!');
      } else if (wasAlreadyWinner) {
        setIsWinner(true);
        console.log('🏆 Winner already recorded for this user');
      } else {
        console.log('📍 Attempt recorded:', typeof distance === 'number' ? distance.toFixed(2) : '?', 'meters away');
      }
    } catch (error) {
      console.error('❌ Error submitting attempt:', error);
    }
  };

  // Exit game screen
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        {Platform.OS === 'web' ? (
          <TouchableOpacity style={styles.exitButtonTop} onPress={handleExit}>
            <Ionicons name="close" size={32} color="#1A1A2E" />
          </TouchableOpacity>
        ) : null}
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  if (!game) {
    return (
      <View style={styles.errorContainer}>
        {Platform.OS === 'web' ? (
          <TouchableOpacity style={styles.exitButtonTop} onPress={handleExit}>
            <Ionicons name="close" size={32} color="#1A1A2E" />
          </TouchableOpacity>
        ) : null}
        <Ionicons name="alert-circle-outline" size={64} color="#EF4444" />
        <Text style={styles.errorText}>Game not found</Text>
        <TouchableOpacity style={styles.exitButton} onPress={handleExit}>
          <Text style={styles.exitButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const content = (
    <>
      {/* Confetti */}
      {showConfetti && Platform.OS !== 'web' && ConfettiCannon && (
        <ConfettiCannon
          count={200}
          origin={{ x: SCREEN_WIDTH / 2, y: 0 }}
          autoStart={true}
          fadeOut={true}
          fallSpeed={3000}
        />
      )}

      {/* Exit button (always show) */}
      <TouchableOpacity style={styles.exitButtonTop} onPress={handleExit}>
        <Ionicons name="close" size={32} color="#1A1A2E" />
      </TouchableOpacity>

      {/* Compass - shows for 7s, hides for 5s */}
      {showCompass && compassEnabled && !isWinner && (
        <Animated.View
          style={[
            styles.compassContainer,
            {
              transform: [
                {
                  rotate: compassRotation.interpolate({
                    inputRange: [0, 360],
                    outputRange: ['0deg', '360deg'],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={['#10B981', '#059669']}
            style={styles.compassCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.compassArrow}>
              <Ionicons name="navigate" size={32} color="#FFFFFF" />
            </View>
          </LinearGradient>
        </Animated.View>
      )}

      {/* Photo Carousel */}
      {game.cluePhotos && game.cluePhotos.length > 0 && (
        <View style={styles.carouselContainer}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handlePhotoScroll}
            scrollEventThrottle={16}
            style={styles.carousel}
          >
            {game.cluePhotos.map((photoUrl, index) => (
              <TouchableOpacity
                key={index}
                activeOpacity={0.9}
                onPress={() => setFullScreenPhoto(photoUrl)}
                style={styles.photoSlide}
              >
                <Image source={{ uri: photoUrl }} style={styles.photo} resizeMode="cover" />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Photo indicators */}
          <View style={styles.indicatorContainer}>
            {game.cluePhotos.map((_, index) => (
              <View
                key={index}
                style={[styles.indicator, currentPhotoIndex === index && styles.indicatorActive]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Game Info */}
      {!showLeaderboard ? (
        <View style={styles.infoContainer}>
          {/* Game Title */}
          <Animated.View
            style={[
              styles.titleContainer,
              {
                transform: [
                  {
                    scale: celebrationAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.2],
                    }),
                  },
                ],
              },
            ]}
          >
            <Text style={styles.gameTitle}>{game.name}</Text>
            <Text style={styles.prizeAmount}>${game.prizeAmount} Prize</Text>
          </Animated.View>

          {/* Distance Display */}
          {distance !== null && (
            <View style={styles.distanceContainer}>
              <Ionicons name="location" size={32} color="#1A1A2E" />
              <Text style={styles.distanceText}>{formatDistanceAway(distance)}</Text>
            </View>
          )}

          {/* Odds Meter */}
          {oddsPercent > 0 && (
            <View style={styles.oddsContainer}>
              <View style={styles.oddsBar}>
                <View style={[styles.oddsBarFill, { width: `${oddsPercent}%` }]} />
              </View>
              <Text style={styles.oddsText}>{oddsPercent}% chance of winning</Text>
            </View>
          )}

          {/* Winner Status */}
          {isWinner && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleExit}
              accessibilityRole="button"
              accessibilityLabel="You won. Close game."
              style={styles.winnerBadge}
            >
              <Ionicons name="trophy" size={32} color="#FFD700" />
              <Text style={styles.winnerText}>🎉 You Won! Tap to close</Text>
            </TouchableOpacity>
          )}

          {/* Submit Attempt Button */}
          {game.status === 'live' && !isWinner && (
            <TouchableOpacity
              style={[
                styles.submitButton,
                distance <= (game.accuracyRadius || 10) && styles.submitButtonActive,
              ]}
              onPress={handleSubmitAttempt}
            >
              <LinearGradient
                colors={
                  distance <= (game.accuracyRadius || 10)
                    ? ['#10B981', '#059669']
                    : ['#6B7280', '#4B5563']
                }
                style={styles.submitButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.submitButtonText}>
                  {distance <= (game.accuracyRadius || 10) ? '🎯 Claim Your Spot!' : '📍 Submit Attempt'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* Winners Count */}
          <Text style={styles.winnersCount}>
            {game.winners?.length || 0} / {game.winnerSlots || 3} Winners
          </Text>
        </View>
      ) : (
        /* Leaderboard View */
        <View style={styles.leaderboardContainer}>
          <Text style={styles.leaderboardTitle}>🏆 Game Complete!</Text>

          <ScrollView style={styles.leaderboardScroll} scrollEnabled={Platform.OS !== 'web'}>
            {/* Winners */}
            <Text style={styles.leaderboardSection}>Winners</Text>
            {game.winners?.slice(0, game.winnerSlots).map((winner, index) => (
              <View
                key={winner.userId}
                style={[
                  styles.leaderboardRow,
                  winner.userId === currentUser?.uid && styles.leaderboardRowHighlight,
                ]}
              >
                <View style={styles.leaderboardRank}>
                  {index === 0 && <Text style={styles.rankEmoji}>🥇</Text>}
                  {index === 1 && <Text style={styles.rankEmoji}>🥈</Text>}
                  {index === 2 && <Text style={styles.rankEmoji}>🥉</Text>}
                  {index > 2 && <Text style={styles.rankNumber}>{index + 1}</Text>}
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.leaderboardName}>
                    {winner.userId === currentUser?.uid ? 'You' : `Player ${winner.userId.slice(0, 6)}`}
                  </Text>
                  <Text style={styles.leaderboardDistance}>
                    {winner.distance ? `${winner.distance.toFixed(1)}m away` : 'At location'}
                  </Text>
                </View>
              </View>
            ))}

            {/* Top Attempts */}
            {game.attempts && game.attempts.length > 0 && (
              <>
                <Text style={styles.leaderboardSection}>Top 10 Attempts</Text>
                {game.attempts
                  .filter((attempt) => !game.winners?.some((w) => w.userId === attempt.userId))
                  .sort((a, b) => a.distance - b.distance)
                  .slice(0, 10)
                  .map((attempt, index) => (
                    <View
                      key={`${attempt.userId}-${index}`}
                      style={[
                        styles.leaderboardRow,
                        attempt.userId === currentUser?.uid && styles.leaderboardRowHighlight,
                      ]}
                    >
                      <View style={styles.leaderboardRank}>
                        <Text style={styles.rankNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.leaderboardName}>
                          {attempt.userId === currentUser?.uid ? 'You' : `Player ${attempt.userId.slice(0, 6)}`}
                        </Text>
                        <Text style={styles.leaderboardDistance}>
                          {metersToMiles(attempt.distance)} miles away
                        </Text>
                      </View>
                    </View>
                  ))}
              </>
            )}
          </ScrollView>
        </View>
      )}

      {/* Full-Screen Photo Modal */}
      <Modal visible={!!fullScreenPhoto} transparent animationType="fade">
        <View style={styles.fullScreenModal}>
          <TouchableOpacity style={styles.fullScreenClose} onPress={() => setFullScreenPhoto(null)}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {fullScreenPhoto && (
            <Image source={{ uri: fullScreenPhoto }} style={styles.fullScreenPhoto} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </>
  );

  return (
    <LinearGradient colors={getBackgroundGradient()} style={styles.container}>
      {Platform.OS === 'web' ? (
        <ScrollView
          style={styles.webScroll}
          contentContainerStyle={styles.webScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}

      {toastMessage ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toastContainer,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.toastBubble}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </Animated.View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // Fallback color for web
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0B1020',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  exitButtonTop: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  carouselContainer: {
    marginTop: 60,
  },
  carousel: {
    height: CAROUSEL_HEIGHT,
  },
  photoSlide: {
    width: SCREEN_WIDTH,
    height: CAROUSEL_HEIGHT,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    marginHorizontal: 4,
  },
  indicatorActive: {
    backgroundColor: '#1A1A2E',
    width: 24,
  },
  infoContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  gameTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 8,
  },
  prizeAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  distanceText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A2E',
    marginLeft: 12,
  },
  oddsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  oddsBar: {
    width: '100%',
    height: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  oddsBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 6,
  },
  oddsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 24,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginLeft: 12,
  },
  submitButton: {
    width: '100%',
    marginBottom: 16,
  },
  submitButtonActive: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  submitButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  winnersCount: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1A1A2E',
  },
  leaderboardContainer: {
    flex: 1,
    marginTop: 60,
    padding: 20,
  },
  leaderboardTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 24,
  },
  leaderboardScroll: {
    flex: 1,
  },
  leaderboardSection: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
    marginTop: 16,
    marginBottom: 12,
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  leaderboardRowHighlight: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  leaderboardRank: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rankEmoji: {
    fontSize: 32,
  },
  rankNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  leaderboardDistance: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  fullScreenModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 100,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenPhoto: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  exitButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  exitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  webScroll: {
    flex: 1,
  },
  webScrollContent: {
    flexGrow: 1,
    paddingBottom: 220,
  },
  toastContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    alignItems: 'center',
    zIndex: 9999,
  },
  toastBubble: {
    maxWidth: 520,
    width: '100%',
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  compassContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    zIndex: 50,
  },
  compassCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  compassArrow: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
