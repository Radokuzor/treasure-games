import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

// Import unified map components
import { UnifiedMapView, UnifiedMarker, UnifiedCircle } from '../components/UnifiedMapView';

// Conditionally import native modules
let ImagePicker, Location;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
  Location = require('expo-location');
} else {
  Location = require('expo-location');
}
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { getDb, hasFirebaseConfig } from '../config/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  where,
  onSnapshot,
  orderBy,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ADMIN_PASSWORD = '1234';

const AdminScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const locationMapRef = useRef(null);
  const didCenterOnUserRef = useRef(false);

  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(true);

  // Form states
  const [gameType, setGameType] = useState('location');
  const [gameName, setGameName] = useState('');
  const [prizeAmount, setPrizeAmount] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [cluePhotos, setCluePhotos] = useState([]); // Array of photo URIs
  const [winnerSlots, setWinnerSlots] = useState('3');
  const [accuracyRadius, setAccuracyRadius] = useState('10');
  const [virtualGameType, setVirtualGameType] = useState('tap');
  const [targetTaps, setTargetTaps] = useState('1000');

  // UI states
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [redemptions, setRedemptions] = useState([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (gameType !== 'location') return;
    if (didCenterOnUserRef.current) return;

    let isMounted = true;
    (async () => {
      try {
        const { status: existingStatus } = await Location.getForegroundPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Location.requestForegroundPermissionsAsync();
          finalStatus = status;
        }
        if (!isMounted || finalStatus !== 'granted') return;

        const lastKnown = await Location.getLastKnownPositionAsync({});
        const position =
          lastKnown ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));

        if (!isMounted || !position?.coords) return;
        didCenterOnUserRef.current = true;

        locationMapRef.current?.animateToRegion(
          {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          },
          650
        );
      } catch (error) {
        console.log('Admin map location error:', error?.message ?? error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, gameType]);

  useEffect(() => {
    if (gameType !== 'location') didCenterOnUserRef.current = false;
  }, [gameType]);

  // Load games from Firebase
  useEffect(() => {
    if (!hasFirebaseConfig || !isAuthenticated) return;

    const db = getDb();
    if (!db) return;

    const gamesQuery = query(collection(db, 'games'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(gamesQuery, (snapshot) => {
      const gamesData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setGames(gamesData);
      setLoadingGames(false);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!hasFirebaseConfig || !isAuthenticated) return;

    const db = getDb();
    if (!db) return;

    const redemptionsQuery = query(
      collection(db, 'redemptions'),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      redemptionsQuery,
      (snapshot) => {
        const items = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setRedemptions(items);
        setLoadingRedemptions(false);
      },
      (error) => {
        console.log('Redemptions listener error:', error?.message ?? error);
        setLoadingRedemptions(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated]);

  const pendingRedemptions = redemptions.filter((r) => r?.status === 'requested');

  const formatRedemptionTime = (createdAt) => {
    const date = createdAt?.toDate?.() ?? null;
    if (!date) return '';
    return date.toLocaleString();
  };

  const handleFulfillRedemption = (redemption) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    Alert.alert(
      'Mark Fulfilled?',
      `Mark ${redemption.method === 'visa' ? 'Visa' : 'Amazon'} request for $${Number(
        redemption.amount || 0
      ).toFixed(2)} as fulfilled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Fulfilled',
          style: 'default',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'redemptions', redemption.id), {
                status: 'fulfilled',
                fulfilledAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              Alert.alert('Updated', 'Redemption marked as fulfilled.');
            } catch (error) {
              Alert.alert('Error', error?.message ?? 'Failed to update redemption.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteRedemption = (redemption) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    Alert.alert('Delete Request?', 'Delete this redemption request? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'redemptions', redemption.id));
          } catch (error) {
            Alert.alert('Error', error?.message ?? 'Failed to delete redemption.');
          }
        },
      },
    ]);
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordModal(false);
      setPasswordInput('');
    } else {
      Alert.alert('Access Denied', 'Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const handleGameStatusChange = async (game, newStatus) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    try {
      await updateDoc(doc(db, 'games', game.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      Alert.alert('Success', `Game status updated to ${newStatus}`);
    } catch (error) {
      console.error('Status update error:', error);
      Alert.alert('Error', 'Failed to update game status.');
    }
  };

  const handleDeclareWinners = async (game) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    try {
      // Get participants sorted by completion time or score
      const sortedParticipants = [...(game.participants || [])].sort((a, b) => {
        if (a.completedAt && b.completedAt) {
          return new Date(a.completedAt) - new Date(b.completedAt);
        }
        return (b.score || 0) - (a.score || 0);
      });

      const winnerSlots = game.winnerSlots || 3;
      const winners = sortedParticipants.slice(0, winnerSlots);

      await updateDoc(doc(db, 'games', game.id), {
        winners,
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        'Winners Declared!',
        `${winners.length} winner${winners.length !== 1 ? 's' : ''} declared successfully.`
      );
    } catch (error) {
      console.error('Declare winners error:', error);
      Alert.alert('Error', 'Failed to declare winners.');
    }
  };

  const sendExpoPushNotifications = async (messages) => {
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const json = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(json?.errors?.[0]?.message ?? `Expo push failed (${response.status})`);
    }
    return json;
  };

  const chunk = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size));
    }
    return chunks;
  };

  const resetForm = () => {
    setGameName('');
    setPrizeAmount('');
    setDescription('');
    setCity('');
    setSelectedLocation(null);
    setScheduledTime('');
    setCluePhotos([]);
    setWinnerSlots('3');
    setAccuracyRadius('10');
    setTargetTaps('1000');
  };

  const pickImages = async () => {
    if (Platform.OS === 'web') {
      // Create a file input element for web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      input.onchange = (e) => {
        const files = Array.from(e.target.files);
        const fileUrls = files.map((file) => URL.createObjectURL(file));
        setCluePhotos([...cluePhotos, ...fileUrls].slice(0, 10)); // Max 10 photos
      };

      input.click();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need camera roll permissions to add photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets) {
        const newPhotos = result.assets.map((asset) => asset.uri);
        setCluePhotos([...cluePhotos, ...newPhotos].slice(0, 10)); // Max 10 photos
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick images. Please try again.');
      console.error('Image picker error:', error);
    }
  };

  const removePhoto = (index) => {
    setCluePhotos(cluePhotos.filter((_, i) => i !== index));
  };

  const uploadPhotoToStorage = async (uri, gameId, index) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();
      const filename = `games/${gameId}/clue-${index}-${Date.now()}.jpg`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Photo upload error:', error);
      throw error;
    }
  };

  const handleCreateGame = async () => {
    if (isCreating) return;

    if (!hasFirebaseConfig) {
      Alert.alert('Firebase not configured', 'Add Firebase env vars to enable admin actions.');
      return;
    }

    const db = getDb();
    if (!db) {
      Alert.alert('Firebase error', 'Firestore is not available. Please restart the app.');
      return;
    }

    if (!gameName.trim()) {
      Alert.alert('Missing info', 'Please enter a game name.');
      return;
    }

    if (gameType === 'location' && !selectedLocation) {
      Alert.alert('Missing location', 'Please select a location on the map.');
      return;
    }

    if (gameType === 'location' && !city.trim()) {
      Alert.alert('Missing city', 'Please enter a city for location-based games.');
      return;
    }

    // Validate photos for location-based games
    if (gameType === 'location' && cluePhotos.length === 0) {
      Alert.alert('Missing photos', 'Please add at least one photo clue for players.');
      return;
    }

    setIsCreating(true);
    setUploadingPhotos(true);
    const status = scheduledTime.trim() ? 'scheduled' : 'pending';

    try {
      // Build game data structure
      const gameData = {
        type: gameType,
        name: gameName.trim(),
        prizeAmount: prizeAmount ? Number(prizeAmount) : 0,
        description: description.trim() || null,
        city: city.trim() || null,
        difficulty,
        status,
        scheduledTime: scheduledTime.trim() || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants: [],
        winners: [],
        attempts: [],
      };

      // Location-based game specific fields
      if (gameType === 'location') {
        gameData.location = {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        };
        gameData.winnerSlots = Number(winnerSlots) || 3;
        gameData.accuracyRadius = Number(accuracyRadius) || 10;
        gameData.cluePhotos = []; // Will be updated after upload
      }

      // Virtual game specific fields
      if (gameType === 'virtual') {
        gameData.virtualType = virtualGameType;
        if (virtualGameType === 'tap') {
          gameData.targetTaps = Number(targetTaps) || 1000;
        }
      }

      const gameRef = await addDoc(collection(db, 'games'), gameData);

      // Upload photos if this is a location-based game
      if (gameType === 'location' && cluePhotos.length > 0) {
        try {
          const photoURLs = [];
          for (let i = 0; i < cluePhotos.length; i++) {
            const downloadURL = await uploadPhotoToStorage(cluePhotos[i], gameRef.id, i);
            photoURLs.push(downloadURL);
          }

          // Update game document with photo URLs
          await updateDoc(doc(db, 'games', gameRef.id), {
            cluePhotos: photoURLs,
            updatedAt: serverTimestamp(),
          });
        } catch (photoError) {
          console.error('Photo upload error:', photoError);
          Alert.alert(
            'Warning',
            'Game created but some photos failed to upload. You may need to recreate the game.'
          );
          setIsCreating(false);
          setUploadingPhotos(false);
          return;
        }
      }

      setUploadingPhotos(false);
      Alert.alert(
        'Success!',
        `Game "${gameName.trim()}" created successfully with status: ${status}${
          gameType === 'location' ? ` and ${cluePhotos.length} photo(s) uploaded` : ''
        }`,
        [
          {
            text: 'OK',
            onPress: () => resetForm(),
          },
        ]
      );
    } catch (error) {
      console.error('Game creation error:', error);
      Alert.alert('Error', error?.message ?? 'Failed to create game. Please try again.');
    } finally {
      setIsCreating(false);
      setUploadingPhotos(false);
    }
  };

  const handleLaunchGame = async (game) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    try {
      Alert.alert(
        'Launch Game?',
        `Launch "${game.name}" and notify all players in ${game.city || 'all cities'}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Launch',
            style: 'default',
            onPress: async () => {
              await updateDoc(doc(db, 'games', game.id), {
                status: 'live',
                launchedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              // Send notifications
              const usersQuery = game.city
                ? query(collection(db, 'users'), where('city', '==', game.city))
                : query(collection(db, 'users'));

              const usersSnapshot = await getDocs(usersQuery);
              console.log('📊 Total users found in database:', usersSnapshot.docs.length);
              console.log('🔍 Querying for city:', game.city || 'all cities');

              const tokens = usersSnapshot.docs
                .map((docSnap) => {
                  const userData = docSnap.data();
                  const token = userData?.pushToken;
                  console.log(`User ${docSnap.id}:`, {
                    hasToken: !!token,
                    tokenLength: token?.length || 0,
                    city: userData?.city || 'no city',
                  });
                  return token;
                })
                .filter((token) => typeof token === 'string' && token.length > 0);

              console.log('✅ Valid push tokens collected:', tokens.length);

              if (tokens.length > 0) {
                const notifications = tokens.map((token) => ({
                  to: token,
                  sound: 'default',
                  title: '🎮 Game is LIVE!',
                  body: `${game.name} is LIVE! Prize: $${game.prizeAmount || '0'}`,
                  data: { gameId: game.id, type: 'game_live' },
                }));

                const batches = chunk(notifications, 100);
                for (const batch of batches) {
                  await sendExpoPushNotifications(batch);
                }

                Alert.alert('Game Launched!', `Notified ${tokens.length} players.`);
              } else {
                Alert.alert('Game Launched!', 'No players to notify.');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', error?.message ?? 'Failed to launch game.');
    }
  };


  const filteredGames = games.filter((game) => {
    if (statusFilter === 'all') return true;
    return game.status === statusFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'live':
        return ['#10B981', '#059669'];
      case 'scheduled':
        return ['#F59E0B', '#D97706'];
      case 'pending':
        return ['#3B82F6', '#2563EB'];
      case 'completed':
        return ['#8B5CF6', '#7C3AED'];
      case 'inactive':
        return ['#6B7280', '#4B5563'];
      default:
        return theme.gradients.accent;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'live':
        return '🔴';
      case 'scheduled':
        return '⏱️';
      case 'pending':
        return '⏸️';
      case 'completed':
        return '✅';
      case 'inactive':
        return '⭕';
      default:
        return '📍';
    }
  };

  // Password Modal
  if (showPasswordModal || !isAuthenticated) {
    return (
      <GradientBackground>
        <Modal visible={true} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <GradientCard style={styles.passwordCard}>
              <Ionicons name="shield-checkmark" size={64} color={theme.colors.accent} />
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                Admin Access Required
              </Text>
              <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
                Enter admin password to access the panel
              </Text>

              <View style={styles.passwordInputContainer}>
                <Ionicons name="key-outline" size={20} color={theme.colors.textSecondary} />
                <TextInput
                  style={[styles.passwordInput, { color: theme.colors.text }]}
                  placeholder="Enter password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry
                  onSubmitEditing={handlePasswordSubmit}
                />
              </View>

              <TouchableOpacity
                onPress={handlePasswordSubmit}
                activeOpacity={0.8}
                style={styles.fullWidth}
              >
                <LinearGradient
                  colors={theme.gradients.primary}
                  style={styles.submitButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.submitButtonText}>Submit</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
                style={styles.cancelButton}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </GradientCard>
          </View>
        </Modal>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
	        <View style={styles.header}>
	          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
	            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
	          </TouchableOpacity>
	          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Admin Panel</Text>
	          <View style={styles.placeholder} />
	        </View>

        {/* Redemption Requests */}
        <GradientCard style={styles.section}>
          <View style={styles.redemptionsHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🎁 Redemption Requests</Text>
            {loadingRedemptions ? (
              <ActivityIndicator size="small" color={theme.colors.accent} />
            ) : (
              <View style={styles.redemptionsBadge}>
                <Text style={styles.redemptionsBadgeText}>{pendingRedemptions.length} Pending</Text>
              </View>
            )}
          </View>

          {!loadingRedemptions && pendingRedemptions.length === 0 ? (
            <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
              No pending redemption requests.
            </Text>
          ) : null}

          {pendingRedemptions.map((redemption) => (
            <View key={redemption.id} style={styles.redemptionRow}>
              <View style={styles.redemptionInfo}>
                <Text style={[styles.redemptionTitle, { color: theme.colors.text }]}>
                  {redemption.method === 'visa' ? 'Visa Gift Card' : 'Amazon e‑Gift Card'} • $
                  {Number(redemption.amount || 0).toFixed(2)}
                </Text>
                <Text style={[styles.redemptionMeta, { color: theme.colors.textSecondary }]}>
                  User: {String(redemption.userId || '').slice(0, 10)}
                  {formatRedemptionTime(redemption.createdAt)
                    ? ` • ${formatRedemptionTime(redemption.createdAt)}`
                    : ''}
                </Text>
              </View>

              <View style={styles.redemptionActions}>
                <TouchableOpacity
                  onPress={() => handleFulfillRedemption(redemption)}
                  activeOpacity={0.8}
                  style={styles.redemptionActionButton}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669']}
                    style={styles.redemptionActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.redemptionActionText}>Fulfill</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDeleteRedemption(redemption)}
                  activeOpacity={0.8}
                  style={styles.redemptionActionButton}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626']}
                    style={styles.redemptionActionGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.redemptionActionText}>Delete</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </GradientCard>

	        {/* Home Media Upload Button */}
	        <View style={styles.mediaUploadButtonContainer}>
	          <TouchableOpacity
	            onPress={() => navigation.navigate('AdminMediaUpload')}
	            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.mediaUploadButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="cloud-upload" size={24} color="#FFFFFF" />
              <Text style={styles.mediaUploadButtonText}>Upload Home Feed Content</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Game Type Selector */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🎮 Game Type</Text>
          <View style={styles.gameTypeContainer}>
            <TouchableOpacity
              style={styles.gameTypeOption}
              onPress={() => setGameType('location')}
              activeOpacity={0.7}
            >
              {gameType === 'location' ? (
                <LinearGradient
                  colors={theme.gradients.primary}
                  style={styles.gameTypeCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="location" size={40} color="#FFFFFF" />
                  <Text style={styles.gameTypeText}>Location Based</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.gameTypeCard, styles.inactiveCard]}>
                  <Ionicons
                    name="location-outline"
                    size={40}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.gameTypeText, { color: theme.colors.textSecondary }]}>
                    Location Based
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gameTypeOption}
              onPress={() => setGameType('virtual')}
              activeOpacity={0.7}
            >
              {gameType === 'virtual' ? (
                <LinearGradient
                  colors={theme.gradients.accent}
                  style={styles.gameTypeCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="game-controller" size={40} color="#FFFFFF" />
                  <Text style={styles.gameTypeText}>Virtual Game</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.gameTypeCard, styles.inactiveCard]}>
                  <Ionicons
                    name="game-controller-outline"
                    size={40}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={[styles.gameTypeText, { color: theme.colors.textSecondary }]}>
                    Virtual Game
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </GradientCard>

        {/* Game Details */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>📝 Game Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Game Name *
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="trophy-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Downtown Treasure Hunt"
                placeholderTextColor={theme.colors.textSecondary}
                value={gameName}
                onChangeText={setGameName}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Prize Amount ($)
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.success} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="500"
                placeholderTextColor={theme.colors.textSecondary}
                value={prizeAmount}
                onChangeText={setPrizeAmount}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Description
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.colors.text }]}
                placeholder="Add game description..."
                placeholderTextColor={theme.colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              City {gameType === 'location' ? '*' : '(Optional)'}
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="San Francisco"
                placeholderTextColor={theme.colors.textSecondary}
                value={city}
                onChangeText={setCity}
              />
            </View>
          </View>
        </GradientCard>

        {/* Location-Based Game Settings */}
        {gameType === 'location' && (
          <>
            <GradientCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                📍 Location Settings
              </Text>
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                Tap on the map to set the treasure location
              </Text>
              <View style={styles.mapContainer}>
                <UnifiedMapView
                  ref={locationMapRef}
                  style={styles.map}
                  region={{
                    latitude: 37.7749,
                    longitude: -122.4194,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                  onPress={(e) => setSelectedLocation(e.nativeEvent.coordinate)}
                >
                  {selectedLocation && (
                    <>
                      <UnifiedMarker coordinate={selectedLocation}>
                        <LinearGradient
                          colors={theme.gradients.accent}
                          style={styles.customMarker}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="location" size={32} color="#FFFFFF" />
                        </LinearGradient>
                      </UnifiedMarker>
                      <UnifiedCircle
                        center={selectedLocation}
                        radius={Number(accuracyRadius) || 10}
                        fillColor="rgba(16, 185, 129, 0.2)"
                        strokeColor="rgba(16, 185, 129, 0.5)"
                        strokeWidth={2}
                      />
                    </>
                  )}
                </UnifiedMapView>
              </View>
              {selectedLocation && (
                <View style={styles.coordinatesContainer}>
                  <Text style={[styles.coordinatesText, { color: theme.colors.textSecondary }]}>
                    📍 Lat: {selectedLocation.latitude.toFixed(6)}, Lng:{' '}
                    {selectedLocation.longitude.toFixed(6)}
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Winner Slots (Top N players)
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="trophy-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="3"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={winnerSlots}
                    onChangeText={setWinnerSlots}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Accuracy Radius (meters)
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="radio-outline" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="10"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={accuracyRadius}
                    onChangeText={setAccuracyRadius}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </GradientCard>

            <GradientCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                📸 Photo Clues
              </Text>
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                Add 5-10 photos showing the location. These will be displayed as a slideshow to help
                players find the treasure.
              </Text>

              {/* Photo Grid */}
              <View style={styles.photoGrid}>
                {cluePhotos.map((photoUri, index) => (
                  <View key={index} style={styles.photoContainer}>
                    <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => removePhoto(index)}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                    <Text style={styles.photoNumber}>{index + 1}</Text>
                  </View>
                ))}

                {/* Add Photo Button */}
                {cluePhotos.length < 10 && (
                  <TouchableOpacity style={styles.addPhotoButton} onPress={pickImages}>
                    <LinearGradient
                      colors={theme.gradients.accent}
                      style={styles.addPhotoGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="camera" size={32} color="#FFFFFF" />
                      <Text style={styles.addPhotoText}>Add Photos</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>

              {cluePhotos.length > 0 && (
                <Text style={[styles.photoCount, { color: theme.colors.textSecondary }]}>
                  {cluePhotos.length} photo{cluePhotos.length !== 1 ? 's' : ''} selected (max 10)
                </Text>
              )}
            </GradientCard>
          </>
        )}

        {/* Virtual Game Settings */}
        {gameType === 'virtual' && (
          <GradientCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              🎯 Virtual Game Settings
            </Text>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Game Type
              </Text>
              <View style={styles.virtualTypeContainer}>
                <TouchableOpacity
                  style={styles.virtualTypeOption}
                  onPress={() => setVirtualGameType('tap')}
                  activeOpacity={0.7}
                >
                  {virtualGameType === 'tap' ? (
                    <LinearGradient
                      colors={theme.gradients.accent}
                      style={styles.virtualTypeCard}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons name="hand-left" size={24} color="#FFFFFF" />
                      <Text style={styles.virtualTypeText}>Tap Race</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.virtualTypeCard, styles.inactiveCard]}>
                      <Ionicons
                        name="hand-left-outline"
                        size={24}
                        color={theme.colors.textSecondary}
                      />
                      <Text
                        style={[styles.virtualTypeText, { color: theme.colors.textSecondary }]}
                      >
                        Tap Race
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {virtualGameType === 'tap' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Target Taps
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="finger-print" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="1000"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={targetTaps}
                    onChangeText={setTargetTaps}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            )}
          </GradientCard>
        )}

        {/* Difficulty Level */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            ⚡ Difficulty Level
          </Text>
          <View style={styles.difficultyContainer}>
            {['easy', 'medium', 'hard'].map((level) => (
              <TouchableOpacity
                key={level}
                onPress={() => setDifficulty(level)}
                activeOpacity={0.7}
                style={styles.difficultyOption}
              >
                {difficulty === level ? (
                  <LinearGradient
                    colors={
                      level === 'easy'
                        ? ['#10B981', '#059669']
                        : level === 'medium'
                          ? ['#F59E0B', '#D97706']
                          : ['#EF4444', '#DC2626']
                    }
                    style={styles.difficultyButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.difficultyTextActive}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.difficultyButton, styles.inactiveDifficulty]}>
                    <Text
                      style={[styles.difficultyTextInactive, { color: theme.colors.textSecondary }]}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </GradientCard>

        {/* Schedule */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🕐 Schedule</Text>
          <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
            Leave blank to create as “pending” (manual launch). Add time for scheduled launch.
          </Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Launch Time (Optional)
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="time-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="2024-12-25 14:00"
                placeholderTextColor={theme.colors.textSecondary}
                value={scheduledTime}
                onChangeText={setScheduledTime}
              />
            </View>
          </View>
        </GradientCard>

        {/* Create Button */}
        <View style={styles.createButtonContainer}>
          <TouchableOpacity
            onPress={handleCreateGame}
            activeOpacity={0.8}
            disabled={isCreating}
          >
            <LinearGradient
              colors={theme.gradients.primary}
              style={styles.createButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isCreating ? (
                <View style={styles.creatingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.creatingText}>
                    {uploadingPhotos ? 'Uploading photos...' : 'Creating game...'}
                  </Text>
                </View>
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.createButtonText}>Create Game</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Games List */}
        <GradientCard style={styles.section}>
          <View style={styles.gamesHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>🎯 All Games</Text>
          </View>

          {/* Status Filter */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {['all', 'pending', 'live', 'scheduled', 'completed', 'inactive'].map((status) => (
              <TouchableOpacity
                key={status}
                onPress={() => setStatusFilter(status)}
                activeOpacity={0.7}
                style={styles.filterButton}
              >
                {statusFilter === status ? (
                  <LinearGradient
                    colors={
                      status === 'all' ? theme.gradients.primary : getStatusColor(status)
                    }
                    style={styles.filterButtonActive}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.filterTextActive}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={[styles.filterButtonInactive]}>
                    <Text style={[styles.filterTextInactive, { color: theme.colors.textSecondary }]}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {loadingGames ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Loading games...
              </Text>
            </View>
          ) : filteredGames.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="game-controller-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No games found
              </Text>
            </View>
          ) : (
            filteredGames.map((game) => (
              <View key={game.id} style={styles.gameCard}>
                <View style={styles.gameCardHeader}>
                  <View style={styles.gameInfo}>
                    <Text style={[styles.gameName, { color: theme.colors.text }]}>
                      {game.name}
                    </Text>
                    <View style={styles.gameMeta}>
                      <View style={styles.gameMetaItem}>
                        <Ionicons name="cash-outline" size={14} color={theme.colors.success} />
                        <Text style={[styles.gameMetaText, { color: theme.colors.textSecondary }]}>
                          ${game.prizeAmount || 0}
                        </Text>
                      </View>
                      <View style={styles.gameMetaItem}>
                        <Ionicons
                          name={game.type === 'location' ? 'location-outline' : 'game-controller-outline'}
                          size={14}
                          color={theme.colors.textSecondary}
                        />
                        <Text style={[styles.gameMetaText, { color: theme.colors.textSecondary }]}>
                          {game.type === 'location' ? game.city || 'N/A' : 'Virtual'}
                        </Text>
                      </View>
                      {game.participants && game.participants.length > 0 && (
                        <View style={styles.gameMetaItem}>
                          <Ionicons name="people-outline" size={14} color={theme.colors.textSecondary} />
                          <Text style={[styles.gameMetaText, { color: theme.colors.textSecondary }]}>
                            {game.participants.length}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <LinearGradient
                    colors={getStatusColor(game.status)}
                    style={styles.statusBadge}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.statusText}>
                      {getStatusIcon(game.status)} {game.status.toUpperCase()}
                    </Text>
                  </LinearGradient>
                </View>

                {/* Game Control Buttons */}
                <View style={styles.gameControlsContainer}>
                  {game.status === 'pending' && (
                    <TouchableOpacity
                      onPress={() => handleLaunchGame(game)}
                      activeOpacity={0.7}
                      style={styles.gameControlButton}
                    >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.gameControlGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="rocket-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.gameControlText}>Start</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {game.status === 'live' && (
                    <>
                      <TouchableOpacity
                        onPress={() => handleGameStatusChange(game, 'pending')}
                        activeOpacity={0.7}
                        style={styles.gameControlButton}
                      >
                        <LinearGradient
                          colors={['#F59E0B', '#D97706']}
                          style={styles.gameControlGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Ionicons name="pause-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.gameControlText}>Pause</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleGameStatusChange(game, 'inactive')}
                        activeOpacity={0.7}
                        style={styles.gameControlButton}
                      >
                        <LinearGradient
                          colors={['#EF4444', '#DC2626']}
                          style={styles.gameControlGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Ionicons name="stop-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.gameControlText}>Stop</Text>
                        </LinearGradient>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => handleDeclareWinners(game)}
                        activeOpacity={0.7}
                        style={styles.gameControlButton}
                      >
                        <LinearGradient
                          colors={['#8B5CF6', '#7C3AED']}
                          style={styles.gameControlGradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                        >
                          <Ionicons name="trophy-outline" size={16} color="#FFFFFF" />
                          <Text style={styles.gameControlText}>Winners</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}

                  {(game.status === 'scheduled' || game.status === 'inactive') && (
                    <TouchableOpacity
                      onPress={() => handleLaunchGame(game)}
                      activeOpacity={0.7}
                      style={styles.gameControlButton}
                    >
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.gameControlGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                        <Text style={styles.gameControlText}>Resume</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}

                  {game.status === 'completed' && game.winners && game.winners.length > 0 && (
                    <View style={styles.winnersInfo}>
                      <Ionicons name="trophy" size={16} color="#FFD700" />
                      <Text style={[styles.winnersText, { color: theme.colors.text }]}>
                        {game.winners.length} winner{game.winners.length !== 1 ? 's' : ''} declared
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            ))
          )}
        </GradientCard>

        <View style={{ height: 100 }} />
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  placeholder: {
    width: 40,
  },
  mediaUploadButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  mediaUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  mediaUploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    marginHorizontal: 12,
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  helpText: {
    fontSize: 13,
    marginBottom: 8,
  },
  gameTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gameTypeOption: {
    flex: 1,
    marginHorizontal: 6,
  },
  gameTypeCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  inactiveCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  gameTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  mapContainer: {
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  customMarker: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  coordinatesContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  coordinatesText: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  virtualTypeContainer: {
    flexDirection: 'row',
  },
  virtualTypeOption: {
    flex: 1,
    marginRight: 8,
  },
  virtualTypeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  virtualTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  difficultyContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  difficultyOption: {
    flex: 1,
    marginHorizontal: 4,
  },
  difficultyButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  inactiveDifficulty: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  difficultyTextActive: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  difficultyTextInactive: {
    fontSize: 14,
    fontWeight: '600',
  },
  createButtonContainer: {
    padding: 16,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  gamesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  redemptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  redemptionsBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  redemptionsBadgeText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '800',
  },
  redemptionRow: {
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  redemptionInfo: {
    marginBottom: 12,
  },
  redemptionTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  redemptionMeta: {
    fontSize: 12,
    fontWeight: '600',
  },
  redemptionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  redemptionActionButton: {
    flex: 1,
  },
  redemptionActionGradient: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redemptionActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  filterScroll: {
    marginBottom: 16,
  },
  filterButton: {
    marginRight: 8,
  },
  filterButtonActive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterButtonInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  filterTextInactive: {
    fontSize: 13,
    fontWeight: '600',
  },
  gameCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gameCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gameInfo: {
    flex: 1,
  },
  gameName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  gameMeta: {
    flexDirection: 'row',
  },
  gameMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  gameMetaText: {
    fontSize: 13,
    marginLeft: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  launchButton: {
    marginTop: 12,
  },
  launchButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  launchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 12,
  },
  photoContainer: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
  },
  photoNumber: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addPhotoGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addPhotoText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  photoCount: {
    fontSize: 13,
    marginTop: 12,
    textAlign: 'center',
  },
  creatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  gameControlsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  gameControlButton: {
    flex: 1,
    minWidth: 90,
  },
  gameControlGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  gameControlText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 6,
  },
  winnersInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
  },
  winnersText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  passwordCard: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    padding: 32,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  passwordInputContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    marginBottom: 24,
  },
  passwordInput: {
    flex: 1,
    paddingVertical: 14,
    paddingLeft: 12,
    fontSize: 16,
  },
  fullWidth: {
    width: '100%',
  },
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cancelButton: {
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminScreen;
