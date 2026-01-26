import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Timestamp,
  arrayUnion,
  doc,
  getDoc,
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
let Audio, Location, Haptics, Magnetometer;
if (Platform.OS !== 'web') {
  const ExpoAV = require('expo-av');
  Audio = ExpoAV.Audio;
  Location = require('expo-location');
  Haptics = require('expo-haptics');
  const ExpoSensors = require('expo-sensors');
  Magnetometer = ExpoSensors.Magnetometer;
} else {
  // Web fallbacks - use browser Geolocation API
  Location = require('expo-location');
}
// Conditionally import confetti for native only
let ConfettiCannon;
if (Platform.OS !== 'web') {
  ConfettiCannon = require('react-native-confetti').default;
}

import MiniGameWebView from '../components/MiniGameWebView';
import { getFirebaseAuth, getFirebaseDb } from '../config/firebase';
import { sendPushNotification } from '../notificationService';
import { checkWinEligibility, processBattleRoyaleWinners, recordDailyWin } from '../utils/winEligibility';
import WinnerCardScreen from './WinnerCardScreen';

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
  const [previousDistance, setPreviousDistance] = useState(null);
  const [distanceDirection, setDistanceDirection] = useState(null); // 'closer', 'farther', or null
  const [feetChange, setFeetChange] = useState(0); // How many feet changed since last update
  const [proximityPercent, setProximityPercent] = useState(0);
  const [oddsPercent, setOddsPercent] = useState(0);
  
  // Distance pulse animation
  const distancePulseAnim = useRef(new Animated.Value(1)).current;
  const distancePulseColor = useRef(new Animated.Value(0)).current;

  // Compass feature (currently disabled - not accurate enough)
  const [bearing, setBearing] = useState(0);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [compassEnabled, setCompassEnabled] = useState(false); // Disabled - arrow navigation not accurate
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

  // Mini-game state
  const [showMiniGame, setShowMiniGame] = useState(false);
  const [miniGameTriggered, setMiniGameTriggered] = useState(false);
  const [miniGameCompleted, setMiniGameCompleted] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false); // Tracks if auto-open has happened (prevents re-opening after close)

  // Win eligibility state (daily limit)
  const [winEligible, setWinEligible] = useState(true);

  // Podium animation state
  const [showPodium, setShowPodium] = useState(true);
  const podiumAnim1 = useRef(new Animated.Value(0)).current;
  const podiumAnim2 = useRef(new Animated.Value(0)).current;
  const podiumAnim3 = useRef(new Animated.Value(0)).current;
  const podiumScaleAnim = useRef(new Animated.Value(0.8)).current;
  const podiumOpacity = useRef(new Animated.Value(0)).current;
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');

  // Battle Royale state (for virtual games)
  const [timeRemaining, setTimeRemaining] = useState(null); // Time remaining in ms
  const [userBestScore, setUserBestScore] = useState(null);
  const [userRank, setUserRank] = useState(null);
  const [competitionEnded, setCompetitionEnded] = useState(false);

  // Winner card state
  const [showWinnerCard, setShowWinnerCard] = useState(false);
  const [winnerCardData, setWinnerCardData] = useState(null);

  // Instructions modal state (for physical games)
  const [showInstructions, setShowInstructions] = useState(false);

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
    (message, duration = 2600) => {
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
        }, duration);
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

  // Format time remaining for countdown
  const formatTimeRemaining = (ms) => {
    if (ms === null || ms <= 0) return '00:00:00';
    
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Get sorted leaderboard for virtual games
  const getSortedLeaderboard = () => {
    if (!game?.leaderboard) return [];
    
    return [...game.leaderboard].sort((a, b) => {
      // For tap games, lower time (faster) is better
      if (game.virtualGame?.type === 'tap_count') {
        return a.score - b.score;
      }
      // For other games, higher score is better
      return b.score - a.score;
    });
  };

  // Format score for display based on game type
  const formatScore = (score, gameType) => {
    if (gameType === 'tap_count') {
      // Score is time in ms, format as seconds
      return `${(score / 1000).toFixed(2)}s`;
    }
    if (gameType === 'hold_duration') {
      // Score is hold time in ms
      return `${(score / 1000).toFixed(1)}s`;
    }
    // For rhythm and others, just show the score
    return score.toLocaleString();
  };

  const formatDistanceAway = (meters) => {
    if (typeof meters !== 'number' || !Number.isFinite(meters)) return '';

    const metersPerMile = 1609.344;
    const metersPerFoot = 0.3048;

    // Always show feet for more accurate feedback
    if (meters < metersPerMile) {
      const feet = Math.max(0, Math.round(meters / metersPerFoot));
      return `${feet} ${feet === 1 ? 'foot' : 'feet'} away`;
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
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.data();
        // Compass disabled - navigation arrow not accurate enough
        // setCompassEnabled(userData?.compassEnabled !== false);
        setCompassEnabled(false);
      } else {
        setCompassEnabled(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Check win eligibility when game loads (daily limit)
  useEffect(() => {
    const checkEligibility = async () => {
      if (!currentUser || !game) return;

      const db = getFirebaseDb();
      if (!db) return;

      try {
        // Check eligibility based on game type (physical vs battle_royale)
        const gameType = game?.type === 'virtual' ? 'battle_royale' : 'physical';
        const result = await checkWinEligibility(db, currentUser.uid, gameType);
        setWinEligible(result.eligible);
        setEligibilityChecked(true);

        if (!result.eligible && result.message) {
          setEligibilityMessage(result.message);
          // Show toast when they open the game - 10 seconds for important warning
          showToast(result.message, 10000);
        }

        console.log(`🎯 Win eligibility check (${gameType}):`, result.eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE');
      } catch (error) {
        console.error('Error checking eligibility:', error);
        // On error, allow them to play (fail open)
        setWinEligible(true);
        setEligibilityChecked(true);
      }
    };

    checkEligibility();
  }, [currentUser, game?.id]); // Only re-check when user or game changes

  // Battle Royale countdown timer for virtual games
  useEffect(() => {
    if (!game || game.type !== 'virtual') return;
    if (!game.virtualGame?.endsAt) return;

    const updateTimer = () => {
      const endsAt = game.virtualGame.endsAt?.toDate?.() || new Date(game.virtualGame.endsAt);
      const now = new Date();
      const remaining = endsAt.getTime() - now.getTime();

      if (remaining <= 0) {
        setTimeRemaining(0);
        setCompetitionEnded(true);
      } else {
        setTimeRemaining(remaining);
        setCompetitionEnded(false);
      }
    };

    // Initial update
    updateTimer();

    // Update every second
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [game?.virtualGame?.endsAt]);

  // Auto-complete virtual game when timer ends - check directly from endsAt timestamp
  // Use ref to prevent duplicate processing
  const processingWinnersRef = useRef(false);
  
  useEffect(() => {
    if (!game || game.type !== 'virtual' || !game.virtualGame?.endsAt) return;
    if (game.status === 'completed') return; // Already completed
    
    const checkAndComplete = async () => {
      const endsAt = game.virtualGame.endsAt?.toDate?.() || new Date(game.virtualGame.endsAt);
      const now = new Date();
      const hasEnded = endsAt.getTime() <= now.getTime();
      
      if (!hasEnded) {
        // Log every 10 seconds to verify it's checking
        if (Math.floor(Date.now() / 1000) % 10 === 0) {
          const remaining = Math.floor((endsAt.getTime() - now.getTime()) / 1000);
          console.log(`⏱️ Tournament timer check: ${remaining}s remaining`);
        }
        return; // Competition hasn't ended yet
      }
      
      // CRITICAL FIX: Prevent duplicate processing
      if (processingWinnersRef.current) {
        console.log('🔒 Already processing winners, skipping...');
        return;
      }
      
      console.log('🏁 ========================================');
      console.log('🏁 Tournament timer has ended!');
      console.log('🏁 Game ID:', gameId);
      console.log('🏁 Current user:', currentUser?.uid);
      console.log('🏁 ========================================');
      
      processingWinnersRef.current = true; // Lock processing
      
      try {
        const db = getFirebaseDb();
        if (!db) {
          console.error('❌ No database connection!');
          processingWinnersRef.current = false;
          return;
        }
        
        const gameRef = doc(db, 'games', gameId);
        
        // Get fresh game data to ensure we have latest leaderboard
        const gameSnap = await getDoc(gameRef);
        if (!gameSnap.exists()) {
          console.error('❌ Game document not found!');
          processingWinnersRef.current = false;
          return;
        }
        const currentGameData = { ...gameSnap.data(), id: gameId };
        
        // CRITICAL: Check if already completed in database
        if (currentGameData.status === 'completed') {
          console.log('✅ Game already completed in database, skipping');
          processingWinnersRef.current = false;
          return;
        }
        
        console.log('🏁 Game data:', {
          name: currentGameData.name,
          prizeAmount: currentGameData.prizeAmount,
          winnerSlots: currentGameData.winnerSlots,
          leaderboardCount: currentGameData.leaderboard?.length || 0,
          status: currentGameData.status,
        });
        
        // Handle case where no one played - still complete the game with no winners
        if (!currentGameData.leaderboard || currentGameData.leaderboard.length === 0) {
          console.log('ℹ️ No leaderboard entries found - completing game with no winners');
          
          // Use transaction to atomically set processing flag and check status
          let shouldProcess = false;
          
          try {
            await runTransaction(db, async (transaction) => {
              const gameSnap = await transaction.get(gameRef);
              if (!gameSnap.exists()) {
                throw new Error('Game not found');
              }
              
              const transactionGameData = gameSnap.data();
              
              // CRITICAL: Check if already completed or processing
              if (transactionGameData.status === 'completed') {
                console.log('✅ Game already completed, skipping');
                return; // Exit transaction
              }
              
              if (transactionGameData.processingWinners === true) {
                console.log('🔒 Game is already being processed by another instance, skipping');
                return; // Exit transaction
              }
              
              // Atomically set processing flag
              transaction.update(gameRef, {
                processingWinners: true,
                updatedAt: serverTimestamp(),
              });
              
              shouldProcess = true;
              console.log('🔒 Processing lock acquired in transaction');
            });
          } catch (transactionError) {
            console.error('❌ Transaction error:', transactionError);
            processingWinnersRef.current = false;
            return;
          }
          
          if (!shouldProcess) {
            console.log('ℹ️ Skipping winner processing (already completed or being processed)');
            processingWinnersRef.current = false;
            return;
          }
          
          // Complete game with no winners
          await updateDoc(gameRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            tournamentWinners: [], // Empty winners array
            processingWinners: false, // Clear processing flag
          });
          
          console.log('✅ Game completed successfully with no winners');
          processingWinnersRef.current = false;
          return;
        }
        
        // Check if current user is in leaderboard
        const userEntry = currentGameData.leaderboard.find(e => e.oderId === currentUser?.uid);
        if (userEntry) {
          const sorted = [...currentGameData.leaderboard].sort((a, b) => {
            if (currentGameData.virtualGame?.type === 'tap_count') {
              return a.score - b.score;
            }
            return b.score - a.score;
          });
          const userRank = sorted.findIndex(e => e.oderId === currentUser?.uid) + 1;
          console.log(`🏁 Current user rank: #${userRank} with score: ${userEntry.score}`);
        } else {
          console.log('⚠️ Current user not found in leaderboard');
        }
        
        // Use transaction to atomically set processing flag and check status
        let shouldProcess = false;
        
        try {
          await runTransaction(db, async (transaction) => {
            const gameSnap = await transaction.get(gameRef);
            if (!gameSnap.exists()) {
              throw new Error('Game not found');
            }
            
            const transactionGameData = gameSnap.data();
            
            // CRITICAL: Check if already completed or processing
            if (transactionGameData.status === 'completed') {
              console.log('✅ Game already completed, skipping');
              return; // Exit transaction
            }
            
            if (transactionGameData.processingWinners === true) {
              console.log('🔒 Game is already being processed by another instance, skipping');
              return; // Exit transaction
            }
            
            // Atomically set processing flag
            transaction.update(gameRef, {
              processingWinners: true,
              updatedAt: serverTimestamp(),
            });
            
            shouldProcess = true;
            console.log('🔒 Processing lock acquired in transaction');
          });
        } catch (transactionError) {
          console.error('❌ Transaction error:', transactionError);
          processingWinnersRef.current = false;
          return;
        }
        
        if (!shouldProcess) {
          console.log('ℹ️ Skipping winner processing (already completed or being processed)');
          processingWinnersRef.current = false;
          return;
        }
        
        // Process winners and award prizes (outside transaction)
        console.log('🏁 Calling processBattleRoyaleWinners...');
        const winners = await processBattleRoyaleWinners(db, currentGameData, sendPushNotification);
        console.log('🏁 Winners returned:', winners.length);
        console.log('🏁 Winners:', winners.map(w => ({ position: w.position, username: w.username, prize: w.prizeAmount, userId: w.oderId })));
        
        // Complete game even if no winners (shouldn't happen if leaderboard had entries, but handle gracefully)
        if (winners.length === 0) {
          console.log('ℹ️ No winners were processed - completing game with no winners');
          // Still complete the game, just with no winners
          await updateDoc(gameRef, {
            status: 'completed',
            completedAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            tournamentWinners: [], // Empty winners array
            processingWinners: false, // Clear processing flag
          });
          console.log('✅ Game completed successfully with no winners');
          processingWinnersRef.current = false;
          return;
        }
        
        // Update game object with winners and clear processing flag
        await updateDoc(gameRef, {
          status: 'completed',
          completedAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          tournamentWinners: winners,
          processingWinners: false, // Clear processing flag
        });
        
        console.log('✅ Game completed successfully');
        
        // Show winner card or score card to current user if they won
        const userWin = winners.find(w => w.oderId === currentUser?.uid);
        if (userWin) {
          const isEligibleWinner = userWin.eligible !== false; // Default to true if not set
          
          if (isEligibleWinner) {
            // Eligible winner - show winner card with celebration
            console.log(`🎉 User won! Position: #${userWin.position}, Prize: $${userWin.prizeAmount}`);
            // Update eligibility state - user has won today
            setWinEligible(false);
            setEligibilityMessage("🏆 You've already won a tournament today! Play for fun, but prizes go to other players.");
            showToast(`🎉 You won #${userWin.position}! Prize: $${userWin.prizeAmount}!`);
            if (Platform.OS !== 'web' && Haptics) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }
            
            setTimeout(() => {
              setWinnerCardData({
                gameName: currentGameData.name,
                position: userWin.position,
                score: userWin.score,
                gameType: 'virtual',
                wonMoney: true, // Eligible winner gets prize
                city: currentGameData.city || null,
                sponsorLogo: currentGameData.sponsorLogo || null,
                sponsorName: currentGameData.sponsorName || null,
                isCompetitionActive: false,
              });
              setShowWinnerCard(true);
            }, 1000);
          } else {
            // Ineligible winner - show score card only (no prize, no celebration)
            console.log(`📊 User finished #${userWin.position} but already won today - showing score card only`);
            showToast(`📊 You finished #${userWin.position}! Great game, but you already won today.`, 4000);
            
            setTimeout(() => {
              setWinnerCardData({
                gameName: currentGameData.name,
                position: userWin.position,
                score: userWin.score,
                gameType: 'virtual',
                wonMoney: false, // No prize for ineligible winner
                city: currentGameData.city || null,
                sponsorLogo: currentGameData.sponsorLogo || null,
                sponsorName: currentGameData.sponsorName || null,
                isCompetitionActive: false,
              });
              setShowWinnerCard(true);
            }, 1000);
          }
        } else {
          console.log('ℹ️ Current user did not win (not in top winners)');
        }
      } catch (error) {
        console.error('❌ Error completing tournament:', error);
        console.error('Error details:', error.message, error.code);
        console.error('Error stack:', error.stack);
        processingWinnersRef.current = false; // Unlock on error
      }
    };
    
    // Check every 5 seconds instead of every 1 second
    checkAndComplete(); // Check immediately
    const interval = setInterval(checkAndComplete, 5000);
    
    return () => {
      clearInterval(interval);
      processingWinnersRef.current = false; // Reset on cleanup
    };
  }, [game?.virtualGame?.endsAt, game?.status, gameId, currentUser?.uid]);

  // Track user's rank in leaderboard
  useEffect(() => {
    if (!game || game.type !== 'virtual' || !currentUser) return;

    const leaderboard = game.leaderboard || [];
    const userEntry = leaderboard.find(entry => entry.oderId === currentUser.uid);

    if (userEntry) {
      setUserBestScore(userEntry.score);
      // Find rank (leaderboard should be sorted by score)
      const sortedLeaderboard = [...leaderboard].sort((a, b) => {
        // For tap games, lower time is better
        if (game.virtualGame?.type === 'tap_count') {
          return a.score - b.score;
        }
        // For other games, higher score is better
        return b.score - a.score;
      });
      const rank = sortedLeaderboard.findIndex(entry => entry.oderId === currentUser.uid) + 1;
      setUserRank(rank);
    } else {
      setUserBestScore(null);
      setUserRank(null);
    }
  }, [game?.leaderboard, currentUser]);

  // Animate podium on virtual game load
  useEffect(() => {
    if (!game || game.type !== 'virtual' || !showPodium) return;

    // Fade in the podium container
    Animated.timing(podiumOpacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Scale up the container
    Animated.spring(podiumScaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Animate podiums rising up (2nd place, then 1st, then 3rd)
    const animatePodiums = () => {
      // 2nd place rises first
      Animated.spring(podiumAnim2, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }).start();

      // 1st place rises after a delay (tallest)
      setTimeout(() => {
        Animated.spring(podiumAnim1, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 200);

      // 3rd place rises last
      setTimeout(() => {
        Animated.spring(podiumAnim3, {
          toValue: 1,
          tension: 40,
          friction: 6,
          useNativeDriver: true,
        }).start();
      }, 400);
    };

    // Start animation after a brief delay
    const timer = setTimeout(animatePodiums, 300);
    return () => clearTimeout(timer);
  }, [game?.type, showPodium]);

  // Auto-join game when screen loads - use transaction to prevent race conditions
  const joiningRef = useRef(false);
  
  useEffect(() => {
    if (!game || !currentUser || hasJoined) return;
    if (joiningRef.current) return; // Prevent duplicate calls

    const joinGame = async () => {
      joiningRef.current = true;
      
      try {
        const db = getFirebaseDb();
        if (!db) {
          joiningRef.current = false;
          return;
        }
        
        const gameRef = doc(db, 'games', gameId);
        
        // Use transaction to prevent race conditions
        await runTransaction(db, async (transaction) => {
          const gameSnap = await transaction.get(gameRef);
          if (!gameSnap.exists()) {
            throw new Error('Game not found');
          }
          
          const gameData = gameSnap.data();
          const participants = gameData.participants || [];
          
          // Only add if not already in participants
          if (!participants.includes(currentUser.uid)) {
            transaction.update(gameRef, {
              participants: arrayUnion(currentUser.uid),
              updatedAt: serverTimestamp(),
            });
            console.log('✅ Auto-joined game:', gameId);
          } else {
            console.log('ℹ️ Already in participants');
          }
        });
        
        setHasJoined(true);
      } catch (error) {
        console.error('❌ Error joining game:', error);
        joiningRef.current = false; // Allow retry on error
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

          // Show leaderboard if game is completed (only for location games)
          // Virtual games have their own "Competition Ended" view
          if (gameData.status === 'completed' && !showLeaderboard && gameData.type !== 'virtual') {
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

  // Start GPS tracking - stops when user wins to save battery
  useEffect(() => {
    // Don't start or continue tracking if user already won
    if (isWinner) {
      console.log('🏆 User is winner - stopping location tracking');
      return;
    }

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
            // Stop polling if user won
            if (isWinner) {
              if (webPollInterval) clearInterval(webPollInterval);
              return;
            }
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

        // Watch position with high accuracy - update every 1 second for live direction feedback
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location?.Accuracy?.BestForNavigation ?? Location?.Accuracy?.Balanced,
            distanceInterval: 1, // Update every 1 meter for more responsive feedback
            timeInterval: 1000, // Update every 1 second for live direction check
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
  }, [isWinner]);

  // Calculate distance and proximity when location or game changes
  useEffect(() => {
    // Skip distance calculations if user already won
    if (!game?.location || !userLocation || isWinner) return;

    const dist = calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      game.location.latitude,
      game.location.longitude
    );

    // Track direction (closer or farther) based on previous distance
    const metersPerFoot = 0.3048;
    if (previousDistance !== null && distance !== null) {
      const threshold = 0.3; // meters threshold to avoid noise (about 1 foot)
      const changeFeet = Math.round((previousDistance - dist) / metersPerFoot); // positive = getting closer
      
      if (dist < previousDistance - threshold) {
        setDistanceDirection('closer');
        setFeetChange(Math.abs(changeFeet)); // Show positive feet when getting closer
      } else if (dist > previousDistance + threshold) {
        setDistanceDirection('farther');
        setFeetChange(Math.abs(changeFeet)); // Show positive feet when going wrong way
      } else {
        // Within threshold, keep direction but reset feet change
        setFeetChange(0);
      }
    }
    
    setPreviousDistance(distance);
    setDistance(dist);

    const proximity = calculateProximity(dist, game.accuracyRadius || 10);
    setProximityPercent(proximity);

    const odds = calculateOdds(proximity, game.winners?.length || 0, game.winnerSlots || 3);
    setOddsPercent(odds);

    // Calculate bearing for compass (disabled but keeping calculation)
    const bearingDegrees = calculateBearing(
      userLocation.latitude,
      userLocation.longitude,
      game.location.latitude,
      game.location.longitude
    );
    setBearing(bearingDegrees);

    // Auto-trigger mini-game INSTANTLY when user arrives at location (only once)
    const accuracyRadius = Number(game?.accuracyRadius) || 10;
    const hasMiniGame = game?.miniGame?.type;
    const isWithinRadius = dist <= accuracyRadius;
    // Use hasAutoOpened to prevent re-triggering after user closes the mini-game
    const canTrigger = hasMiniGame && isWithinRadius && !hasAutoOpened && !miniGameCompleted && !isWinner && game.status === 'live';

    if (canTrigger) {
      console.log('🎮 User arrived at location! Instantly triggering mini-game:', game.miniGame.type);
      // Trigger immediately without any delay
      setHasAutoOpened(true); // Prevents auto-opening again after close
      setMiniGameTriggered(true);
      setShowMiniGame(true);

      // Haptic feedback for immediate response
      if (Platform.OS !== 'web' && Haptics) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }
  }, [userLocation, game, hasAutoOpened, miniGameCompleted, isWinner]);
  
  // Distance pulse animation - blinks every 1 second (stops when user wins)
  useEffect(() => {
    if (game?.type === 'virtual' || distance === null || isWinner) return;
    
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(distancePulseAnim, {
          toValue: 1.08,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(distancePulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, [game?.type, distance !== null, isWinner]);

  // Subscribe to device magnetometer for real-time compass orientation (disabled - compass not accurate)
  useEffect(() => {
    // Skip magnetometer if compass is disabled or user already won
    if (Platform.OS === 'web' || !Magnetometer || !compassEnabled || isWinner) return;

    let subscription;

    const startMagnetometer = async () => {
      try {
        // Set update interval to 100ms for smooth rotation
        Magnetometer.setUpdateInterval(100);

        subscription = Magnetometer.addListener((data) => {
          // Calculate heading from magnetometer data
          // The magnetometer gives us x, y, z values
          // We use atan2 to get the angle, but need to adjust for device orientation
          const { x, y } = data;
          
          // Calculate angle - atan2(x, y) gives us the heading where:
          // 0 = North, 90 = East, 180 = South, 270 = West
          let heading = Math.atan2(x, y) * (180 / Math.PI);
          
          // Normalize to 0-360 degrees
          if (heading < 0) {
            heading += 360;
          }
          
          setDeviceHeading(heading);
        });
      } catch (error) {
        console.log('⚠️ Magnetometer not available:', error?.message ?? error);
      }
    };

    startMagnetometer();

    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, [compassEnabled, isWinner]);

  // Update compass rotation based on bearing to target and device heading
  useEffect(() => {
    if (bearing === null || bearing === undefined) return;

    // Calculate the rotation needed: bearing to target minus current device heading
    // This makes the arrow always point to the target regardless of phone orientation
    let rotation = bearing - deviceHeading;
    
    // Normalize rotation to -180 to 180 range for shortest path animation
    while (rotation > 180) rotation -= 360;
    while (rotation < -180) rotation += 360;

    Animated.timing(compassRotation, {
      toValue: rotation,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [bearing, deviceHeading, compassRotation]);

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
        }, 100); // 5 seconds hidden
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

  // Check if this is a virtual game
  const isVirtualGame = game?.type === 'virtual';

  // Get the game config source (miniGame for location games, virtualGame for virtual games)
  const getGameSource = () => {
    if (isVirtualGame) {
      return game?.virtualGame;
    }
    return game?.miniGame;
  };

  // Get mini-game URL - returns custom URL if uploaded, otherwise null (will use embedded preset)
  const getMiniGameUrl = () => {
    const source = getGameSource();
    // If admin uploaded a custom HTML game, use that URL
    if (source?.customGameUrl) {
      return source.customGameUrl;
    }
    // Otherwise return null - the MiniGameWebView will use embedded presets
    return null;
  };

  // Get mini-game config from game data
  const getMiniGameConfig = () => {
    const source = getGameSource();
    
    // Calculate remaining time in seconds for the game
    const getRemainingTimeInSeconds = () => {
      console.log('🎮 getRemainingTimeInSeconds - timeRemaining:', timeRemaining, 'endsAt:', game?.virtualGame?.endsAt);
      
      if (timeRemaining !== null && timeRemaining > 0) {
        const seconds = Math.floor(timeRemaining / 1000);
        console.log('🎮 Using timeRemaining:', seconds, 'seconds');
        return seconds; // Convert ms to seconds
      }
      // Fallback: calculate from endsAt if available
      if (game?.virtualGame?.endsAt) {
        const endsAt = game.virtualGame.endsAt?.toDate?.() || new Date(game.virtualGame.endsAt);
        const remaining = Math.floor((endsAt.getTime() - Date.now()) / 1000);
        console.log('🎮 Calculated from endsAt:', remaining, 'seconds');
        return Math.max(0, remaining);
      }
      console.log('🎮 Using default 900 seconds');
      return 900; // Default 15 minutes
    };
    
    // Handle legacy virtual games that don't have virtualGame object
    if (isVirtualGame && !source) {
      // Use legacy targetTaps field if available
      return {
        targetTaps: game?.targetTaps || 100,
        timeLimit: 30,
        remainingTime: getRemainingTimeInSeconds(),
      };
    }
    
    if (!source) return { remainingTime: getRemainingTimeInSeconds() };

    const { type, config } = source;

    // Base config with remaining time for all game types
    const baseConfig = {
      remainingTime: getRemainingTimeInSeconds(),
    };

    switch (type) {
      case 'tap_count':
        return {
          ...baseConfig,
          targetTaps: config?.targetTaps || 100,
          timeLimit: config?.timeLimit || 30,
        };
      case 'hold_duration':
        return {
          ...baseConfig,
          holdDuration: config?.holdDuration || 5000,
        };
      case 'rhythm_tap':
        return {
          ...baseConfig,
          bpm: config?.bpm || 120,
          requiredBeats: config?.requiredBeats || 10,
          toleranceMs: config?.toleranceMs || 150,
          requiredScore: config?.requiredScore || 70,
        };
      case 'last_stand':
      case 'tetris':
      case 'flappy_bird':
        // These games use remainingTime for their countdown
        return {
          ...baseConfig,
          gameTime: config?.gameTime || getRemainingTimeInSeconds(),
        };
      case 'custom':
        // Custom games receive all config as-is plus remaining time
        return { ...baseConfig, ...(config || {}) };
      default:
        return baseConfig;
    }
  };

  // Get the actual game type to use (for custom games, fall back to tap_count if no URL)
  const getEffectiveGameType = () => {
    const source = getGameSource();
    
    // Handle legacy virtual games that don't have virtualGame object
    if (isVirtualGame && !source) {
      // Check for legacy virtualType field
      if (game?.virtualType === 'tap') return 'tap_count';
      return 'tap_count'; // Default for virtual games
    }
    
    if (!source) return 'tap_count';

    const { type, customGameUrl } = source;

    // If it's a custom type but no URL was uploaded, fall back to tap_count
    if (type === 'custom' && !customGameUrl) {
      return 'tap_count';
    }

    return type;
  };

  // Check if game has a mini-game configured (either location mini-game or virtual game)
  const hasGameChallenge = () => {
    if (isVirtualGame) {
      // Virtual games always have a challenge - use virtualGame.type if available, 
      // otherwise fall back to virtualType (legacy) or default to tap_count
      return !!(game?.virtualGame?.type || game?.virtualType || true);
    }
    return !!game?.miniGame?.type;
  };

  // Handle mini-game completion
  const handleMiniGameComplete = async (success, data) => {
    console.log('🎮 Mini-game result:', { success, data, isVirtualGame, gameType: game?.type });
    setShowMiniGame(false);
    setShowPodium(true); // Show podium again after mini-game completes
    setMiniGameCompleted(true);

    // For virtual games (battle royale), update leaderboard
    // Note: We check isVirtualGame OR game.type === 'virtual' to handle all cases
    if (isVirtualGame || game?.type === 'virtual') {
      console.log('🎮 Virtual game detected, updating leaderboard...');
      await updateBattleRoyaleScore(success, data);
      return;
    }

    // For location games with mini-game challenges
    if (success) {
      // User won the mini-game, now record them as a winner
      await recordWinner(data);
    } else {
      // User failed the mini-game
      showToast('Challenge failed! Try again when you return to the location.');
      // Reset so they can try again if they leave and come back
      setTimeout(() => {
        setMiniGameTriggered(false);
        setMiniGameCompleted(false);
      }, 3000);
    }
  };

  // Update battle royale leaderboard score
  const updateBattleRoyaleScore = async (success, data) => {
    console.log('🏆 updateBattleRoyaleScore called:', { success, data, hasGame: !!game, hasUser: !!currentUser });
    
    if (!game || !currentUser) {
      console.log('🏆 Early return - missing game or user');
      return;
    }

    try {
      const db = getFirebaseDb();
      if (!db) {
        console.log('🏆 Early return - no database');
        return;
      }
      
      const gameRef = doc(db, 'games', gameId);

      // Calculate score based on game type
      let score = 0;
      const gameType = game.virtualGame?.type || game.virtualType || 'custom';

      if (gameType === 'tap_count') {
        // For tap games, score is time to complete (lower is better)
        score = data?.timeMs || 999999;
      } else if (gameType === 'hold_duration') {
        // For hold games, score is how long they held
        score = data?.holdTimeMs || 0;
      } else if (gameType === 'rhythm_tap') {
        // For rhythm games, use the calculated score
        score = data?.score || 0;
      } else {
        // Default/custom games: use any score provided (higher is better)
        score = data?.score || data?.timeMs || 0;
      }

      console.log('🏆 Battle Royale score calculated:', { gameType, score, data });

      // Get current leaderboard
      const currentLeaderboard = game.leaderboard || [];
      
      // Find existing entry for this user
      const existingIndex = currentLeaderboard.findIndex(
        entry => entry.oderId === currentUser.uid
      );

      let shouldUpdate = false;
      let newEntry = {
        oderId: currentUser.uid,
        username: currentUser.displayName || currentUser.email?.split('@')[0] || 'Player',
        score,
        oderdAt: new Date(),
        attempts: 1,
      };

      if (existingIndex >= 0) {
        const existingEntry = currentLeaderboard[existingIndex];
        newEntry.attempts = (existingEntry.attempts || 0) + 1;

        // Check if new score is better
        if (gameType === 'tap_count') {
          // Lower time is better
          shouldUpdate = score < existingEntry.score;
        } else {
          // Higher score is better
          shouldUpdate = score > existingEntry.score;
        }

        if (shouldUpdate) {
          newEntry.score = score;
        } else {
          // Keep old score but update attempts
          newEntry.score = existingEntry.score;
        }
      } else {
        shouldUpdate = true;
      }

      // Update leaderboard
      let updatedLeaderboard;
      if (existingIndex >= 0) {
        updatedLeaderboard = [...currentLeaderboard];
        updatedLeaderboard[existingIndex] = newEntry;
      } else {
        updatedLeaderboard = [...currentLeaderboard, newEntry];
      }

      // Sort leaderboard
      updatedLeaderboard.sort((a, b) => {
        if (gameType === 'tap_count') {
          return a.score - b.score; // Lower is better
        }
        return b.score - a.score; // Higher is better
      });

      // Save to Firestore
      console.log('🏆 ========================================');
      console.log('🏆 Saving score to leaderboard');
      console.log('🏆 Game ID:', gameId);
      console.log('🏆 User ID:', currentUser.uid);
      console.log('🏆 Score:', score);
      console.log('🏆 Leaderboard length:', updatedLeaderboard.length);
      console.log('🏆 User entry:', newEntry);
      console.log('🏆 ========================================');
      
      try {
        await updateDoc(gameRef, {
          leaderboard: updatedLeaderboard,
          updatedAt: serverTimestamp(),
        });
        console.log('✅ Leaderboard saved successfully!');
        
        // Verify it was saved
        const verifySnap = await getDoc(gameRef);
        const verifyData = verifySnap.data();
        const verifyEntry = verifyData.leaderboard?.find(e => e.oderId === currentUser.uid);
        if (verifyEntry) {
          console.log('✅ Verified: User entry in leaderboard:', verifyEntry);
        } else {
          console.error('❌ ERROR: User entry NOT found in leaderboard after save!');
        }
      } catch (error) {
        console.error('❌ ERROR saving leaderboard:', error);
        console.error('Error details:', error.message, error.code);
        throw error; // Re-throw to be caught by outer try/catch
      }

      // Find user's new rank
      const newRank = updatedLeaderboard.findIndex(
        entry => entry.oderId === currentUser.uid
      ) + 1;

      // Show feedback to user
      if (shouldUpdate) {
        if (newRank <= 3) {
          showToast(`🎉 New high score! You're now #${newRank}!`);
          if (Platform.OS !== 'web' && Haptics) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        } else {
          showToast(`New personal best! Rank: #${newRank}`);
        }
      } else {
        showToast(`Score: ${formatScore(score, gameType)} • Your best: ${formatScore(newEntry.score, gameType)}`);
      }

      // Allow playing again
      setTimeout(() => {
        setMiniGameTriggered(false);
        setMiniGameCompleted(false);
      }, 2000);

    } catch (error) {
      console.error('Error updating battle royale score:', error);
      showToast('Error saving score. Please try again.');
    }
  };

  // Handle mini-game close (user cancelled)
  const handleMiniGameClose = () => {
    setShowMiniGame(false);
    setShowPodium(true); // Show podium again when mini-game closes
    showToast('Challenge cancelled. Tap "Enter Game" to try again.');
    // Note: We do NOT reset hasAutoOpened here, so the game won't auto-open again
  };

  // Record winner in Firebase (extracted from handleSubmitAttempt)
  const recordWinner = async (miniGameData = null) => {
    if (!game || !currentUser) return;

    // For virtual games, userLocation might not be available
    const isVirtual = game?.type === 'virtual';

    try {
      const db = getFirebaseDb();
      const gameRef = doc(db, 'games', gameId);
      const userRef = doc(db, 'users', currentUser.uid);

      // Check win eligibility (daily limit) - do a fresh check based on game type
      const gameType = isVirtual ? 'battle_royale' : 'physical';
      const eligibility = await checkWinEligibility(db, currentUser.uid, gameType);
      
      if (!eligibility.eligible) {
        // User already won this type of game today - let them know but don't add to winners
        console.log(`🚫 User not eligible for ${gameType} win (daily limit):`, eligibility.reason);
        showToast(eligibility.message || "You've already won today! Great game though!", 10000);
        return;
      }

      const currentTime = Timestamp.now();
      const distanceMeters = typeof distance === 'number' && Number.isFinite(distance) ? distance : 0;

      const attempt = {
        userId: currentUser.uid,
        attemptedAt: currentTime,
        distance: isVirtual ? 0 : distanceMeters,
        location: isVirtual ? null : (userLocation ? {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
        } : null),
        miniGameResult: miniGameData,
      };

      let didWin = false;
      let wasAlreadyWinner = false;

      await runTransaction(db, async (transaction) => {
        const gameSnap = await transaction.get(gameRef);
        if (!gameSnap.exists()) throw new Error('Game not found');

        const gameData = gameSnap.data();
        const winners = Array.isArray(gameData?.winners) ? gameData.winners : [];
        const winnerSlots = Number(gameData?.winnerSlots) || 3;

        wasAlreadyWinner = winners.some((w) => w?.userId === currentUser.uid);
        const canWin = !wasAlreadyWinner && winners.length < winnerSlots;

        const gameUpdate = {
          attempts: arrayUnion(attempt),
          updatedAt: serverTimestamp(),
        };

        if (canWin) {
          const winner = {
            userId: currentUser.uid,
            position: winners.length + 1,
            completedAt: currentTime,
            distance: isVirtual ? 0 : distanceMeters,
            miniGameResult: miniGameData,
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
        // Record the daily win for eligibility tracking (by game type)
        const gameType = isVirtual ? 'battle_royale' : 'physical';
        await recordDailyWin(
          db,
          currentUser.uid,
          gameId,
          game.name,
          Number(game.prizeAmount) || 0,
          gameType
        );

        setIsWinner(true);
        setWinEligible(false); // Update local state immediately
        triggerCelebration();
        console.log('🎉 User won the game!');

        // Show winner card for location games
        if (!isVirtual) {
          setTimeout(() => {
            setWinnerCardData({
              gameName: game.name,
              position: 1, // First to arrive wins
              gameType: 'location',
              wonMoney: true, // They actually won money
              city: game.city || null,
              sponsorLogo: game.sponsorLogo || null,
              sponsorName: game.sponsorName || null,
              isCompetitionActive: false, // Location games are instant wins
            });
            setShowWinnerCard(true);
          }, 2000); // Delay to let celebration play
        }
      } else if (wasAlreadyWinner) {
        setIsWinner(true);
        console.log('🏆 Winner already recorded for this user');
      }
    } catch (error) {
      console.error('❌ Error recording winner:', error);
      showToast('Error recording your win. Please try again.');
    }
  };

  // Submit attempt to reach location
  const handleSubmitAttempt = async () => {
    if (!game || !currentUser || !userLocation) return;

    try {
      if (Platform.OS !== 'web' && Haptics) {
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
        // Show instructions popup to help user understand how to play
        setShowInstructions(true);
        return;
      }

      // Check if game has a mini-game challenge
      if (game?.miniGame?.type && !miniGameCompleted) {
        // Trigger mini-game instead of immediate win
        console.log('🎮 Triggering mini-game challenge:', game.miniGame.type);
        setMiniGameTriggered(true);
        setShowMiniGame(true);
        return;
      }

      // No mini-game, proceed with normal win flow
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
        triggerCelebration();
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

      {/* Compass - DISABLED - navigation arrow not accurate enough */}
      {false && showCompass && compassEnabled && !isWinner && !isVirtualGame && (
        <Animated.View
          style={[
            styles.compassContainer,
            {
              transform: [
                {
                  rotate: compassRotation.interpolate({
                    inputRange: [-180, 0, 180],
                    outputRange: ['-180deg', '0deg', '180deg'],
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
            {/* Virtual Game Badge */}
            {isVirtualGame && (
              <View style={styles.virtualGameBadge}>
                <Ionicons name="game-controller" size={16} color="#8B5CF6" />
                <Text style={styles.virtualGameBadgeText}>Virtual Game</Text>
              </View>
            )}
            {/* Daily Win Limit Badge - shown when user already won today */}
            {eligibilityChecked && !winEligible && !isWinner && (
              <View style={styles.alreadyWonBadge}>
                <Ionicons name="trophy" size={16} color="#F59E0B" />
                <Text style={styles.alreadyWonBadgeText}>Already won today - Play for fun!</Text>
              </View>
            )}
          </Animated.View>

          {/* Location Game: Distance Display with Pulse Animation */}
          {!isVirtualGame && distance !== null && (
            <Animated.View 
              style={[
                styles.distanceContainer,
                distanceDirection === 'closer' && styles.distanceContainerCloser,
                distanceDirection === 'farther' && styles.distanceContainerFarther,
                { transform: [{ scale: distancePulseAnim }] }
              ]}
            >
              <Ionicons 
                name={distanceDirection === 'closer' ? 'arrow-down-circle' : distanceDirection === 'farther' ? 'arrow-up-circle' : 'location'} 
                size={32} 
                color={distanceDirection === 'closer' ? '#10B981' : distanceDirection === 'farther' ? '#EF4444' : '#1A1A2E'} 
              />
              <View style={styles.distanceTextContainer}>
                <Text style={[
                  styles.distanceText,
                  distanceDirection === 'closer' && styles.distanceTextCloser,
                  distanceDirection === 'farther' && styles.distanceTextFarther,
                ]}>{formatDistanceAway(distance)}</Text>
                {distanceDirection && (
                  <View style={styles.directionFeedbackRow}>
                    <Text style={[
                      styles.distanceDirectionText,
                      distanceDirection === 'closer' && styles.distanceDirectionCloser,
                      distanceDirection === 'farther' && styles.distanceDirectionFarther,
                    ]}>
                      {distanceDirection === 'closer' ? '↓ Getting closer!' : '↑ Wrong way!'}
                    </Text>
                    {feetChange > 0 && (
                      <Text style={[
                        styles.feetChangeText,
                        distanceDirection === 'closer' && styles.feetChangeCloser,
                        distanceDirection === 'farther' && styles.feetChangeFarther,
                      ]}>
                        {distanceDirection === 'closer' ? `-${feetChange} ft` : `+${feetChange} ft`}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Virtual Game: Battle Royale Section */}
          {isVirtualGame && game.status === 'live' && !competitionEnded && (
            <View style={styles.battleRoyaleContainer}>
              {/* Countdown Timer */}
              {timeRemaining !== null && (
                <View style={styles.countdownContainer}>
                  <Text style={styles.countdownLabel}>Time Remaining</Text>
                  <Text style={styles.countdownTimer}>{formatTimeRemaining(timeRemaining)}</Text>
                </View>
              )}

              {/* Animated Podium Leaderboard */}
              {showPodium && (
                <Animated.View 
                  style={[
                    styles.podiumContainer,
                    {
                      opacity: podiumOpacity,
                      transform: [{ scale: podiumScaleAnim }],
                    }
                  ]}
                >
                  <Text style={styles.podiumTitle}>🏆 Current Leaders</Text>
                  
                  {getSortedLeaderboard().length > 0 ? (
                    <View style={styles.podiumStage}>
                      {/* 2nd Place - Left */}
                      <Animated.View 
                        style={[
                          styles.podiumPosition,
                          styles.podiumSecond,
                          {
                            transform: [{
                              translateY: podiumAnim2.interpolate({
                                inputRange: [0, 1],
                                outputRange: [100, 0],
                              })
                            }],
                            opacity: podiumAnim2,
                          }
                        ]}
                      >
                        {getSortedLeaderboard()[1] ? (
                          <>
                            <View style={[styles.podiumAvatar, styles.podiumAvatarSecond]}>
                              <Text style={styles.podiumAvatarText}>
                                {getSortedLeaderboard()[1].oderId === currentUser?.uid 
                                  ? '👤' 
                                  : (getSortedLeaderboard()[1].username?.[0]?.toUpperCase() || '?')}
                              </Text>
                            </View>
                            <Text style={styles.podiumMedal}>🥈</Text>
                            <Text style={styles.podiumName} numberOfLines={1}>
                              {getSortedLeaderboard()[1].oderId === currentUser?.uid 
                                ? 'You' 
                                : (getSortedLeaderboard()[1].username || 'Player')}
                            </Text>
                            <Text style={styles.podiumScore}>
                              {formatScore(getSortedLeaderboard()[1].score, game.virtualGame?.type)}
                            </Text>
                            <View style={[styles.podiumBlock, styles.podiumBlockSecond]}>
                              <Text style={styles.podiumBlockText}>2</Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={[styles.podiumAvatar, styles.podiumAvatarEmpty]}>
                              <Text style={styles.podiumAvatarText}>?</Text>
                            </View>
                            <Text style={styles.podiumMedal}>🥈</Text>
                            <Text style={styles.podiumNameEmpty}>Open</Text>
                            <View style={[styles.podiumBlock, styles.podiumBlockSecond]}>
                              <Text style={styles.podiumBlockText}>2</Text>
                            </View>
                          </>
                        )}
                      </Animated.View>

                      {/* 1st Place - Center */}
                      <Animated.View 
                        style={[
                          styles.podiumPosition,
                          styles.podiumFirst,
                          {
                            transform: [{
                              translateY: podiumAnim1.interpolate({
                                inputRange: [0, 1],
                                outputRange: [120, 0],
                              })
                            }],
                            opacity: podiumAnim1,
                          }
                        ]}
                      >
                        {getSortedLeaderboard()[0] ? (
                          <>
                            <View style={[styles.podiumAvatar, styles.podiumAvatarFirst]}>
                              <Text style={styles.podiumAvatarText}>
                                {getSortedLeaderboard()[0].oderId === currentUser?.uid 
                                  ? '👤' 
                                  : (getSortedLeaderboard()[0].username?.[0]?.toUpperCase() || '?')}
                              </Text>
                            </View>
                            <Text style={styles.podiumCrown}>👑</Text>
                            <Text style={styles.podiumMedal}>🥇</Text>
                            <Text style={styles.podiumName} numberOfLines={1}>
                              {getSortedLeaderboard()[0].oderId === currentUser?.uid 
                                ? 'You' 
                                : (getSortedLeaderboard()[0].username || 'Player')}
                            </Text>
                            <Text style={[styles.podiumScore, styles.podiumScoreFirst]}>
                              {formatScore(getSortedLeaderboard()[0].score, game.virtualGame?.type)}
                            </Text>
                            <View style={[styles.podiumBlock, styles.podiumBlockFirst]}>
                              <Text style={styles.podiumBlockText}>1</Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={[styles.podiumAvatar, styles.podiumAvatarEmpty]}>
                              <Text style={styles.podiumAvatarText}>?</Text>
                            </View>
                            <Text style={styles.podiumMedal}>🥇</Text>
                            <Text style={styles.podiumNameEmpty}>Be First!</Text>
                            <View style={[styles.podiumBlock, styles.podiumBlockFirst]}>
                              <Text style={styles.podiumBlockText}>1</Text>
                            </View>
                          </>
                        )}
                      </Animated.View>

                      {/* 3rd Place - Right */}
                      <Animated.View 
                        style={[
                          styles.podiumPosition,
                          styles.podiumThird,
                          {
                            transform: [{
                              translateY: podiumAnim3.interpolate({
                                inputRange: [0, 1],
                                outputRange: [80, 0],
                              })
                            }],
                            opacity: podiumAnim3,
                          }
                        ]}
                      >
                        {getSortedLeaderboard()[2] ? (
                          <>
                            <View style={[styles.podiumAvatar, styles.podiumAvatarThird]}>
                              <Text style={styles.podiumAvatarText}>
                                {getSortedLeaderboard()[2].oderId === currentUser?.uid 
                                  ? '👤' 
                                  : (getSortedLeaderboard()[2].username?.[0]?.toUpperCase() || '?')}
                              </Text>
                            </View>
                            <Text style={styles.podiumMedal}>🥉</Text>
                            <Text style={styles.podiumName} numberOfLines={1}>
                              {getSortedLeaderboard()[2].oderId === currentUser?.uid 
                                ? 'You' 
                                : (getSortedLeaderboard()[2].username || 'Player')}
                            </Text>
                            <Text style={styles.podiumScore}>
                              {formatScore(getSortedLeaderboard()[2].score, game.virtualGame?.type)}
                            </Text>
                            <View style={[styles.podiumBlock, styles.podiumBlockThird]}>
                              <Text style={styles.podiumBlockText}>3</Text>
                            </View>
                          </>
                        ) : (
                          <>
                            <View style={[styles.podiumAvatar, styles.podiumAvatarEmpty]}>
                              <Text style={styles.podiumAvatarText}>?</Text>
                            </View>
                            <Text style={styles.podiumMedal}>🥉</Text>
                            <Text style={styles.podiumNameEmpty}>Open</Text>
                            <View style={[styles.podiumBlock, styles.podiumBlockThird]}>
                              <Text style={styles.podiumBlockText}>3</Text>
                            </View>
                          </>
                        )}
                      </Animated.View>
                    </View>
                  ) : (
                    <View style={styles.emptyPodiumContainer}>
                      <Ionicons name="trophy-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.emptyPodiumText}>No scores yet!</Text>
                      <Text style={styles.emptyPodiumSubtext}>Be the first to claim the podium</Text>
                    </View>
                  )}

                  {/* Score to Beat for Podium */}
                  {getSortedLeaderboard().length >= 3 && (
                    <View style={styles.scoreToBeatPodium}>
                      <Ionicons name="flash" size={16} color="#F59E0B" />
                      <Text style={styles.scoreToBeatPodiumText}>
                        Beat {formatScore(getSortedLeaderboard()[2]?.score, game.virtualGame?.type)} to reach the podium!
                      </Text>
                    </View>
                  )}
                  {getSortedLeaderboard().length > 0 && getSortedLeaderboard().length < 3 && (
                    <View style={styles.scoreToBeatPodium}>
                      <Ionicons name="flash" size={16} color="#10B981" />
                      <Text style={[styles.scoreToBeatPodiumText, { color: '#10B981' }]}>
                        Podium spots available! Play now to claim yours!
                      </Text>
                    </View>
                  )}
                </Animated.View>
              )}

              {/* User's Current Rank */}
              {userRank && userRank > 3 && (
                <View style={styles.userRankContainer}>
                  <Text style={styles.userRankText}>
                    Your Rank: #{userRank} • Best: {formatScore(userBestScore, game.virtualGame?.type)}
                  </Text>
                </View>
              )}

              {/* Play Button */}
              {!showMiniGame && (
                <TouchableOpacity
                  style={styles.playNowButton}
                  onPress={async () => {
                    console.log('🎮 Enter Game button pressed!');
                    
                    // Check eligibility before opening game
                    if (isVirtualGame && eligibilityChecked && !winEligible) {
                      // User already won today - show message but still allow play
                      const message = eligibilityMessage || "🏆 You've already won today! This game is just for fun - no prizes will be awarded.";
                      showToast(message, 5000);
                    }
                    
                    if (miniGameCompleted) {
                      setMiniGameCompleted(false);
                    }
                    setMiniGameTriggered(true);
                    setShowMiniGame(true);
                    setShowPodium(false); // Hide podium when playing
                    if (Platform.OS !== 'web' && Haptics) {
                      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.playNowButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name={miniGameCompleted ? 'refresh' : 'game-controller'} size={24} color="#FFFFFF" />
                    <Text style={styles.playNowButtonText}>
                      {miniGameCompleted ? 'Play Again' : 'Enter Game'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {/* Winner Card Button - for users currently in top 3 */}
              {userRank && userRank <= 3 && !showMiniGame && (
                <View style={styles.topThreeWinnerCardSection}>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => {
                      setWinnerCardData({
                        gameName: game.name,
                        position: userRank,
                        score: userBestScore,
                        gameType: 'virtual',
                        wonMoney: false, // Manual button - just for sharing achievement
                        city: game.city || null,
                        sponsorLogo: game.sponsorLogo || null,
                        sponsorName: game.sponsorName || null,
                        isCompetitionActive: true, // Competition is still ongoing
                      });
                      setShowWinnerCard(true);
                    }}
                    style={styles.topThreeWinnerCardButton}
                  >
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.topThreeWinnerCardGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="trophy" size={20} color="#FFFFFF" />
                      <Text style={styles.topThreeWinnerCardText}>
                        🎉 Get Winner Card
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                  <Text style={styles.topThreeWinnerCardHint}>
                    You&apos;re #{userRank}! Share your win to claim your prize when the game ends.
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Virtual Game: Competition Ended */}
          {isVirtualGame && competitionEnded && (
            <View style={styles.competitionEndedContainer}>
              <Ionicons name="trophy" size={64} color="#FFD700" />
              <Text style={styles.competitionEndedTitle}>Competition Ended!</Text>
              <Text style={styles.competitionEndedSubtitle}>
                {userRank && userRank <= 3 
                  ? `🎉 Congratulations! You finished #${userRank}!`
                  : userRank 
                    ? `You finished #${userRank}`
                    : 'Thanks for playing!'}
              </Text>
              
              {/* Winner Card Button - for top 3 finishers */}
              {userRank && userRank <= 3 && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => {
                    // Competition ended - if user was eligible, they won money
                    setWinnerCardData({
                      gameName: game.name,
                      position: userRank,
                      score: userBestScore,
                      gameType: 'virtual',
                      wonMoney: winEligible, // True if they were eligible to win money
                      city: game.city || null,
                      sponsorLogo: game.sponsorLogo || null,
                      sponsorName: game.sponsorName || null,
                      isCompetitionActive: false, // Competition has ended
                    });
                    setShowWinnerCard(true);
                  }}
                  style={styles.winnerCardButtonLarge}
                >
                  <LinearGradient
                    colors={['#8B5CF6', '#6366F1']}
                    style={styles.winnerCardButtonGradientLarge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="trophy" size={24} color="#FFFFFF" />
                    <Text style={styles.winnerCardButtonTextLarge}>Get Winner Card</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              {userRank && userRank <= 3 && (
                <Text style={styles.winnerCardHintLarge}>Share your win to claim your prize!</Text>
              )}

              {/* Final Leaderboard */}
              <View style={styles.finalLeaderboard}>
                <Text style={styles.finalLeaderboardTitle}>Final Results</Text>
                {getSortedLeaderboard().slice(0, 5).map((entry, index) => (
                  <View 
                    key={entry.oderId} 
                    style={[
                      styles.leaderboardEntry,
                      entry.oderId === currentUser?.uid && styles.leaderboardEntryHighlight
                    ]}
                  >
                    <Text style={styles.leaderboardRank}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                    </Text>
                    <Text style={styles.leaderboardName} numberOfLines={1}>
                      {entry.oderId === currentUser?.uid ? 'You' : (entry.username || `Player ${entry.oderId?.slice(0, 6)}`)}
                    </Text>
                    <Text style={styles.leaderboardScore}>
                      {formatScore(entry.score, game.virtualGame?.type)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Location Game: Odds Meter */}
          {!isVirtualGame && oddsPercent > 0 && (
            <View style={styles.oddsContainer}>
              <View style={styles.oddsBar}>
                <View style={[styles.oddsBarFill, { width: `${oddsPercent}%` }]} />
              </View>
              <Text style={styles.oddsText}>{oddsPercent}% chance of winning</Text>
            </View>
          )}

          {/* Winner Status */}
          {isWinner && (
            <View style={styles.winnerStatusContainer}>
              <View style={styles.winnerBadge}>
                <Ionicons name="trophy" size={32} color="#FFD700" />
                <Text style={styles.winnerText}>🎉 You Won!</Text>
              </View>
              
              {/* Get Winner Card Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => {
                  setWinnerCardData({
                    gameName: game.name,
                    position: userRank || 1,
                    score: userBestScore,
                    gameType: isVirtualGame ? 'virtual' : 'location',
                    wonMoney: !winEligible, // If not eligible now, they already won money
                    city: game.city || null,
                    sponsorLogo: game.sponsorLogo || null,
                    sponsorName: game.sponsorName || null,
                    isCompetitionActive: false, // This button only shows when user already won
                  });
                  setShowWinnerCard(true);
                }}
                style={styles.winnerCardButton}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#6366F1']}
                  style={styles.winnerCardButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="trophy" size={20} color="#FFFFFF" />
                  <Text style={styles.winnerCardButtonText}>Get Winner Card</Text>
                </LinearGradient>
              </TouchableOpacity>
              <Text style={styles.winnerCardHint}>Required to claim your prize!</Text>
            </View>
          )}

          {/* Location Game: Submit Attempt Button */}
          {!isVirtualGame && game.status === 'live' && !isWinner && (
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
                <Text style={styles.submitButtonText}>🎮 Enter Game</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}


          {/* Winners Count - only show for location games */}
          {!isVirtualGame && (
            <Text style={styles.winnersCount}>
              {game.winners?.length || 0} / {game.winnerSlots || 3} Winners
            </Text>
          )}
        </View>
      ) : (
        /* Leaderboard View */
        <View style={styles.leaderboardContainer}>
          <Text style={styles.completedLeaderboardTitle}>🏆 Game Complete!</Text>

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
                <View style={styles.completedLeaderboardRank}>
                  {index === 0 && <Text style={styles.rankEmoji}>🥇</Text>}
                  {index === 1 && <Text style={styles.rankEmoji}>🥈</Text>}
                  {index === 2 && <Text style={styles.rankEmoji}>🥉</Text>}
                  {index > 2 && <Text style={styles.rankNumber}>{index + 1}</Text>}
                </View>
                <View style={styles.leaderboardInfo}>
                  <Text style={styles.completedLeaderboardName}>
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
                      <View style={styles.completedLeaderboardRank}>
                        <Text style={styles.rankNumber}>{index + 1}</Text>
                      </View>
                      <View style={styles.leaderboardInfo}>
                        <Text style={styles.completedLeaderboardName}>
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

      {/* Mini-Game WebView Modal - works for both location mini-games and virtual games */}
      {hasGameChallenge() && (
        <MiniGameWebView
          visible={showMiniGame}
          gameUrl={getMiniGameUrl()}
          gameType={getEffectiveGameType()}
          gameConfig={getMiniGameConfig()}
          onComplete={handleMiniGameComplete}
          onClose={handleMiniGameClose}
        />
      )}

      {/* Score to Beat Overlay - shows during Battle Royale gameplay */}
      {isVirtualGame && showMiniGame && getSortedLeaderboard().length >= 3 && (
        <View style={styles.scoreToBeatOverlay}>
          <LinearGradient
            colors={['rgba(139, 92, 246, 0.95)', 'rgba(99, 102, 241, 0.95)']}
            style={styles.scoreToBeatOverlayGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="podium" size={16} color="#FFFFFF" />
            <Text style={styles.scoreToBeatOverlayText}>
              Beat {formatScore(getSortedLeaderboard()[2]?.score, game?.virtualGame?.type)} for podium!
            </Text>
          </LinearGradient>
        </View>
      )}

      {/* Winner Card Screen - shows after winning */}
      {showWinnerCard && winnerCardData && (
        <WinnerCardScreen
          visible={showWinnerCard}
          onClose={() => {
            setShowWinnerCard(false);
            setWinnerCardData(null);
          }}
          gameName={winnerCardData.gameName}
          position={winnerCardData.position}
          score={winnerCardData.score}
          gameType={winnerCardData.gameType}
          wonMoney={winnerCardData.wonMoney || false}
          city={winnerCardData.city}
          sponsorLogo={winnerCardData.sponsorLogo}
          sponsorName={winnerCardData.sponsorName}
          isCompetitionActive={winnerCardData.isCompetitionActive || false}
        />
      )}

      {/* Instructions Modal - shows when entering physical games */}
      <Modal
        visible={showInstructions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowInstructions(false)}
      >
        <View style={styles.instructionsOverlay}>
          <View style={styles.instructionsCard}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.instructionsHeader}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="map" size={48} color="#FFFFFF" />
              <Text style={styles.instructionsTitle}>How to Play</Text>
            </LinearGradient>
            
            <View style={styles.instructionsContent}>
              <View style={styles.instructionStep}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>1</Text>
                </View>
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.instructionStepTitle}>📸 Use the Photo Clues</Text>
                  <Text style={styles.instructionStepText}>
                    Swipe through the photos to figure out where the game location is hidden.
                  </Text>
                </View>
              </View>

              <View style={styles.instructionStep}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>2</Text>
                </View>
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.instructionStepTitle}>📍 Follow the Distance Tracker</Text>
                  <Text style={styles.instructionStepText}>
                    Watch the pulsing distance counter - it turns GREEN when you&apos;re getting closer and RED when you&apos;re going the wrong way.
                  </Text>
                </View>
              </View>

              <View style={styles.instructionStep}>
                <View style={styles.instructionNumber}>
                  <Text style={styles.instructionNumberText}>3</Text>
                </View>
                <View style={styles.instructionTextContainer}>
                  <Text style={styles.instructionStepTitle}>🎮 Play the Mini-Game</Text>
                  <Text style={styles.instructionStepText}>
                    When you arrive at the correct spot, a mini-game will automatically open. Complete it to WIN!
                  </Text>
                </View>
              </View>

              <View style={styles.instructionTip}>
                <Ionicons name="bulb" size={20} color="#F59E0B" />
                <Text style={styles.instructionTipText}>
                  Tip: First players to arrive and complete the challenge win the prize!
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.instructionsButton}
              onPress={() => setShowInstructions(false)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#10B981', '#059669']}
                style={styles.instructionsButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.instructionsButtonText}>Got it! Let&apos;s Go!</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingTop: Platform.OS === 'ios' ? 60 : 40, // Extra top padding for notch/camera
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  distanceContainerCloser: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10B981',
    shadowColor: '#10B981',
  },
  distanceContainerFarther: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  distanceTextContainer: {
    marginLeft: 12,
    flexDirection: 'column',
  },
  distanceText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  distanceTextCloser: {
    color: '#059669',
  },
  distanceTextFarther: {
    color: '#DC2626',
  },
  directionFeedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 8,
  },
  distanceDirectionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  distanceDirectionCloser: {
    color: '#10B981',
  },
  distanceDirectionFarther: {
    color: '#EF4444',
  },
  feetChangeText: {
    fontSize: 14,
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  feetChangeCloser: {
    color: '#FFFFFF',
    backgroundColor: '#10B981',
  },
  feetChangeFarther: {
    color: '#FFFFFF',
    backgroundColor: '#EF4444',
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
  winnerStatusContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 20,
    marginBottom: 16,
  },
  winnerText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginLeft: 12,
  },
  winnerCardButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  winnerCardButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 10,
  },
  winnerCardButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  winnerCardHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
  },
  winnerCardButtonLarge: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
    marginBottom: 8,
  },
  winnerCardButtonGradientLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 12,
  },
  winnerCardButtonTextLarge: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  winnerCardHintLarge: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    textAlign: 'center',
    marginBottom: 16,
  },
  // Top 3 Winner Card button (during active game)
  topThreeWinnerCardSection: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  topThreeWinnerCardButton: {
    borderRadius: 16,
    overflow: 'hidden',
    width: '100%',
  },
  topThreeWinnerCardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 14,
    gap: 10,
  },
  topThreeWinnerCardText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  topThreeWinnerCardHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
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
  virtualGameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  virtualGameBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  alreadyWonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 8,
    gap: 6,
  },
  alreadyWonBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F59E0B',
  },
  virtualGamePrompt: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
  },
  virtualGamePromptText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 16,
    textAlign: 'center',
  },
  virtualGamePromptSubtext: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  playNowButton: {
    marginTop: 24,
    width: '100%',
    maxWidth: 280,
  },
  playNowButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 16,
    gap: 12,
  },
  playNowButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Battle Royale styles
  battleRoyaleContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    width: '100%',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 16,
  },
  countdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  countdownTimer: {
    fontSize: 36,
    fontWeight: '800',
    color: '#1A1A2E',
    fontVariant: ['tabular-nums'],
  },
  // Podium styles
  podiumContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  podiumTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  podiumStage: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
    minHeight: 220,
  },
  podiumPosition: {
    alignItems: 'center',
    flex: 1,
    maxWidth: 110,
  },
  podiumFirst: {
    marginHorizontal: 4,
  },
  podiumSecond: {
    marginRight: 4,
  },
  podiumThird: {
    marginLeft: 4,
  },
  podiumAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    borderWidth: 3,
  },
  podiumAvatarFirst: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  podiumAvatarSecond: {
    backgroundColor: '#E5E7EB',
    borderColor: '#9CA3AF',
  },
  podiumAvatarThird: {
    backgroundColor: '#FED7AA',
    borderColor: '#EA580C',
  },
  podiumAvatarEmpty: {
    backgroundColor: '#F3F4F6',
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
  },
  podiumAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
  },
  podiumCrown: {
    fontSize: 24,
    position: 'absolute',
    top: -20,
  },
  podiumMedal: {
    fontSize: 28,
    marginBottom: 4,
  },
  podiumName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 2,
    maxWidth: 80,
  },
  podiumNameEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    fontStyle: 'italic',
    marginBottom: 2,
  },
  podiumScore: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8B5CF6',
    marginBottom: 8,
  },
  podiumScoreFirst: {
    fontSize: 13,
    color: '#F59E0B',
  },
  podiumBlock: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  podiumBlockFirst: {
    height: 80,
    backgroundColor: '#F59E0B',
  },
  podiumBlockSecond: {
    height: 60,
    backgroundColor: '#9CA3AF',
  },
  podiumBlockThird: {
    height: 45,
    backgroundColor: '#EA580C',
  },
  podiumBlockText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  emptyPodiumContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyPodiumText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginTop: 12,
  },
  emptyPodiumSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  scoreToBeatPodium: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  scoreToBeatPodiumText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#B45309',
  },
  // Score to beat overlay (during gameplay)
  scoreToBeatOverlay: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    zIndex: 1000,
    alignItems: 'center',
  },
  scoreToBeatOverlayGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  scoreToBeatOverlayText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  leaderboardPreview: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  leaderboardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 12,
    textAlign: 'center',
  },
  leaderboardEntry: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 12,
    marginBottom: 8,
  },
  leaderboardEntryHighlight: {
    backgroundColor: 'rgba(139, 92, 246, 0.2)',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  leaderboardRank: {
    fontSize: 20,
    width: 36,
  },
  leaderboardName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A2E',
    marginLeft: 8,
  },
  leaderboardScore: {
    fontSize: 15,
    fontWeight: '800',
    color: '#8B5CF6',
  },
  noLeaderboardText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingVertical: 20,
  },
  userRankContainer: {
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  userRankText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B5CF6',
  },
  scoreToBeatContainer: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 16,
  },
  scoreToBeatText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F59E0B',
  },
  competitionEndedContainer: {
    alignItems: 'center',
    paddingVertical: 24,
    width: '100%',
  },
  competitionEndedTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    marginTop: 16,
  },
  competitionEndedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  finalLeaderboard: {
    width: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  finalLeaderboardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 16,
    textAlign: 'center',
  },
  leaderboardContainer: {
    flex: 1,
    marginTop: 60,
    padding: 20,
  },
  completedLeaderboardTitle: {
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
  completedLeaderboardRank: {
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
  completedLeaderboardName: {
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
  // Instructions Modal Styles
  instructionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructionsCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  instructionsHeader: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  instructionsTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 12,
  },
  instructionsContent: {
    padding: 20,
  },
  instructionStep: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  instructionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  instructionTextContainer: {
    flex: 1,
  },
  instructionStepTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  instructionStepText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  instructionTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 8,
    gap: 8,
  },
  instructionTipText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 18,
  },
  instructionsButton: {
    margin: 20,
    marginTop: 0,
  },
  instructionsButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  instructionsButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
