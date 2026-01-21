import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Import unified map components
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from 'firebase/firestore';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { UnifiedCircle, UnifiedMapView, UnifiedMarker } from '../components/UnifiedMapView';
import { getDb, hasFirebaseConfig } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

// Conditionally import native modules
let ImagePicker, Location;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
  Location = require('expo-location');
} else {
  Location = require('expo-location');
}

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
  const [prizeAmount, setPrizeAmount] = useState('10'); // Default $10
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [scheduledTime, setScheduledTime] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [cluePhotos, setCluePhotos] = useState([]); // Array of photo URIs
  const [winnerSlots, setWinnerSlots] = useState('3');
  const [accuracyRadius, setAccuracyRadius] = useState('10');
  
  // Virtual game settings (same options as mini-games)
  const [virtualGameType, setVirtualGameType] = useState('tap_count'); // 'tap_count', 'hold_duration', 'rhythm_tap', 'custom'
  const [virtualTargetTaps, setVirtualTargetTaps] = useState('100');
  const [virtualTimeLimit, setVirtualTimeLimit] = useState('30');
  const [virtualHoldDuration, setVirtualHoldDuration] = useState('5000');
  const [virtualBpm, setVirtualBpm] = useState('120');
  const [virtualRequiredBeats, setVirtualRequiredBeats] = useState('10');
  const [virtualToleranceMs, setVirtualToleranceMs] = useState('150');
  const [customVirtualGameFile, setCustomVirtualGameFile] = useState(null);
  const [customVirtualGameFileName, setCustomVirtualGameFileName] = useState('');
  
  // Battle Royale settings for virtual games
  const [competitionDuration, setCompetitionDuration] = useState('30'); // Duration in minutes
  const [prize1stPercent, setPrize1stPercent] = useState('100');
  const [prize2ndPercent, setPrize2ndPercent] = useState('60');
  const [prize3rdPercent, setPrize3rdPercent] = useState('30');

  // Sponsor settings (optional)
  const [sponsorLogo, setSponsorLogo] = useState(null); // Sponsor logo URI
  const [sponsorName, setSponsorName] = useState(''); // Sponsor name (fallback if no logo)

  // Dropdown modal states
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showDurationPicker, setShowDurationPicker] = useState(false);

  // Duration options for dropdown
  const DURATION_OPTIONS = [
    { label: '15 minutes', value: '15' },
    { label: '30 minutes', value: '30' },
    { label: '1 hour', value: '60' },
    { label: '2 hours', value: '120' },
    { label: '3 hours', value: '180' },
    { label: '6 hours', value: '360' },
    { label: '12 hours', value: '720' },
    { label: '24 hours', value: '1440' },
  ];

  // City options for dropdown
  const CITY_OPTIONS = [
    { label: 'Select a city...', value: '' },
    { label: 'Atlanta', value: 'Atlanta' },
    { label: 'Austin', value: 'Austin' },
    { label: 'Boston', value: 'Boston' },
    { label: 'Charlotte', value: 'Charlotte' },
    { label: 'Chicago', value: 'Chicago' },
    { label: 'Dallas', value: 'Dallas' },
    { label: 'Denver', value: 'Denver' },
    { label: 'Detroit', value: 'Detroit' },
    { label: 'Houston', value: 'Houston' },
    { label: 'Las Vegas', value: 'Las Vegas' },
    { label: 'Los Angeles', value: 'Los Angeles' },
    { label: 'Miami', value: 'Miami' },
    { label: 'Minneapolis', value: 'Minneapolis' },
    { label: 'Nashville', value: 'Nashville' },
    { label: 'New Orleans', value: 'New Orleans' },
    { label: 'New York', value: 'New York' },
    { label: 'Orlando', value: 'Orlando' },
    { label: 'Philadelphia', value: 'Philadelphia' },
    { label: 'Phoenix', value: 'Phoenix' },
    { label: 'Portland', value: 'Portland' },
    { label: 'San Antonio', value: 'San Antonio' },
    { label: 'San Diego', value: 'San Diego' },
    { label: 'San Francisco', value: 'San Francisco' },
    { label: 'Seattle', value: 'Seattle' },
    { label: 'Tampa', value: 'Tampa' },
    { label: 'Washington DC', value: 'Washington DC' },
  ];
  
  // Legacy - keeping for backwards compatibility
  const [targetTaps, setTargetTaps] = useState('1000');

  // Mini-game challenge settings (for location games)
  const [miniGameType, setMiniGameType] = useState('none'); // 'none', 'tap_count', 'hold_duration', 'rhythm_tap', 'custom'
  const [miniGameTargetTaps, setMiniGameTargetTaps] = useState('100');
  const [miniGameTimeLimit, setMiniGameTimeLimit] = useState('30');
  const [miniGameHoldDuration, setMiniGameHoldDuration] = useState('5000');
  const [miniGameBpm, setMiniGameBpm] = useState('120');
  const [miniGameRequiredBeats, setMiniGameRequiredBeats] = useState('10');
  const [miniGameToleranceMs, setMiniGameToleranceMs] = useState('150');
  const [customMiniGameFile, setCustomMiniGameFile] = useState(null); // Custom HTML file URI
  const [customMiniGameFileName, setCustomMiniGameFileName] = useState('');

  // UI states
  const [isCreating, setIsCreating] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [redemptions, setRedemptions] = useState([]);
  const [loadingRedemptions, setLoadingRedemptions] = useState(true);
  const [userDetailsCache, setUserDetailsCache] = useState({}); // Cache for user details by ID

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

  // Fetch user details by ID (with caching)
  const fetchUserDetails = async (userId) => {
    if (!userId) return null;
    
    // Check cache first
    if (userDetailsCache[userId]) {
      return userDetailsCache[userId];
    }

    try {
      const db = getDb();
      if (!db) return null;

      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Build display name from firstName and lastName
        const firstName = userData.firstName || '';
        const lastName = userData.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        const details = {
          displayName: fullName || userData.displayName || userData.name || userData.username || 'Unknown',
          firstName: firstName || 'N/A',
          lastName: lastName || 'N/A',
          email: userData.email || 'No email',
          phone: userData.phone || 'No phone',
          pushToken: userData.pushToken || null,
          city: userData.city || 'N/A',
        };
        
        // Update cache
        setUserDetailsCache(prev => ({ ...prev, [userId]: details }));
        return details;
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
    return null;
  };

  // Fetch user details for all redemptions
  useEffect(() => {
    const fetchAllUserDetails = async () => {
      for (const redemption of redemptions) {
        if (redemption.userId && !userDetailsCache[redemption.userId]) {
          await fetchUserDetails(redemption.userId);
        }
      }
    };
    
    if (redemptions.length > 0) {
      fetchAllUserDetails();
    }
  }, [redemptions]);

  // Show winners details for a game
  const showWinnersDetails = async (game) => {
    if (!game.winners || game.winners.length === 0) {
      Alert.alert('No Winners', 'This game has no winners yet.');
      return;
    }

    // Fetch details for all winners
    const winnerDetails = await Promise.all(
      game.winners.map(async (winner) => {
        const oderId = winner.oderId || winner.userId;
        console.log('Fetching details for winner:', oderId);
        const details = await fetchUserDetails(oderId);
        console.log('Got details:', details);
        return {
          ...winner,
          oderId,
          firstName: details?.firstName || 'N/A',
          lastName: details?.lastName || 'N/A',
          displayName: details?.displayName || 'Unknown',
          email: details?.email || 'No email',
          phone: details?.phone || 'No phone',
          city: details?.city || 'N/A',
        };
      })
    );

    // Build the message with full details
    const winnersText = winnerDetails.map((w, index) => {
      const position = w.position || index + 1;
      const prize = game.virtualGame?.prizeDistribution?.[position] 
        ? `$${Math.round((game.prizeAmount || 0) * game.virtualGame.prizeDistribution[position] / 100)}`
        : `$${game.prizeAmount || 0}`;
      return `🏅 #${position} Winner\n` +
        `👤 ${w.firstName} ${w.lastName}\n` +
        `📧 ${w.email}\n` +
        `📱 ${w.phone}\n` +
        `🏙️ ${w.city}\n` +
        `💰 Prize: ${prize}`;
    }).join('\n\n─────────────\n\n');

    Alert.alert(
      `🏆 Winners - ${game.name}`,
      winnersText,
      [{ text: 'OK', style: 'default' }]
    );
  };

  // Send push notification to a specific user
  const sendPushNotification = async (pushToken, title, body) => {
    if (!pushToken) {
      console.log('No push token available for user');
      return false;
    }

    try {
      const message = {
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: { type: 'redemption_fulfilled' },
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      console.log('Push notification result:', result);
      return true;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  };

  const formatRedemptionTime = (createdAt) => {
    const date = createdAt?.toDate?.() ?? null;
    if (!date) return '';
    return date.toLocaleString();
  };

  const handleFulfillRedemption = async (redemption) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    // Fetch user details
    const userDetails = await fetchUserDetails(redemption.userId);
    const userFirstName = userDetails?.firstName || 'N/A';
    const userLastName = userDetails?.lastName || 'N/A';
    const userEmail = userDetails?.email || 'No email provided';
    const userPhone = userDetails?.phone || 'No phone provided';
    const userCity = userDetails?.city || 'No city';
    const pushToken = userDetails?.pushToken;

    const methodName = redemption.method === 'visa' ? 'Visa Gift Card' : 'Amazon e‑Gift Card';
    const amount = Number(redemption.amount || 0).toFixed(2);
    const socialLink = redemption.socialMediaLink || 'Not provided';

    Alert.alert(
      '📋 Redemption Details',
      `${methodName} - $${amount}\n\n` +
      `👤 First Name: ${userFirstName}\n` +
      `👤 Last Name: ${userLastName}\n` +
      `📧 Email: ${userEmail}\n` +
      `📱 Phone: ${userPhone}\n` +
      `🏙️ City: ${userCity}\n` +
      `🔗 Social Post: ${socialLink}\n\n` +
      `Has this request been fulfilled?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Mark Fulfilled',
          style: 'default',
          onPress: async () => {
            try {
              // Update redemption status
              await updateDoc(doc(db, 'redemptions', redemption.id), {
                status: 'fulfilled',
                fulfilledAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });

              // Send notification to user
              if (pushToken) {
                await sendPushNotification(
                  pushToken,
                  '🎉 Your Reward Has Been Sent!',
                  `Your ${methodName} for $${amount} has been fulfilled! If you have any questions, please email admin@fourthwatchtech.com`
                );
                Alert.alert(
                  'Success!', 
                  `Redemption marked as fulfilled and notification sent to ${userFirstName} ${userLastName}.`
                );
              } else {
                Alert.alert(
                  'Fulfilled', 
                  `Redemption marked as fulfilled.\n\nNote: Could not send notification - user has no push token.\n\nUser email: ${userEmail}`
                );
              }
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

  // Delete a game
  const handleDeleteGame = async (game) => {
    if (!hasFirebaseConfig) return;

    // Confirm deletion
    Alert.alert(
      'Delete Game',
      `Are you sure you want to delete "${game.name}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const db = getDb();
              if (!db) return;

              await deleteDoc(doc(db, 'games', game.id));
              
              Alert.alert('Success', `"${game.name}" has been deleted.`);
              console.log('🗑️ Game deleted:', game.id);
            } catch (error) {
              console.error('Delete game error:', error);
              Alert.alert('Error', 'Failed to delete game. Please try again.');
            }
          },
        },
      ]
    );
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
    setPrizeAmount('10'); // Reset to default $10
    setDescription('');
    setCity('');
    setSelectedLocation(null);
    setScheduledTime('');
    setCluePhotos([]);
    setWinnerSlots('3');
    setAccuracyRadius('10');
    setTargetTaps('1000');
    // Reset virtual game settings
    setVirtualGameType('tap_count');
    setVirtualTargetTaps('100');
    setVirtualTimeLimit('30');
    setVirtualHoldDuration('5000');
    setVirtualBpm('120');
    setVirtualRequiredBeats('10');
    setVirtualToleranceMs('150');
    setCustomVirtualGameFile(null);
    setCustomVirtualGameFileName('');
    // Reset battle royale settings
    setCompetitionDuration('30');
    setPrize1stPercent('100');
    setPrize2ndPercent('60');
    setPrize3rdPercent('30');
    // Reset mini-game settings
    setMiniGameType('none');
    setMiniGameTargetTaps('100');
    setMiniGameTimeLimit('30');
    setMiniGameHoldDuration('5000');
    setMiniGameBpm('120');
    setMiniGameRequiredBeats('10');
    setMiniGameToleranceMs('150');
    setCustomMiniGameFile(null);
    setCustomMiniGameFileName('');
    // Reset sponsor settings
    setSponsorLogo(null);
    setSponsorName('');
  };

  // Pick custom HTML game file
  const pickCustomGameFile = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.html,text/html';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          setCustomMiniGameFileName(file.name);
          // Create a blob URL for the file
          const fileUrl = URL.createObjectURL(file);
          setCustomMiniGameFile({ uri: fileUrl, file: file, name: file.name });
        }
      };

      input.click();
      return;
    }

    // For native, we'll use document picker
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'text/html',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setCustomMiniGameFileName(asset.name);
        setCustomMiniGameFile({ uri: asset.uri, name: asset.name });
      }
    } catch (error) {
      console.error('Document picker error:', error);
      Alert.alert('Error', 'Failed to pick HTML file. Please try again.');
    }
  };

  // Upload custom game HTML to Firebase Storage
  const uploadCustomGameToStorage = async (fileData, gameId) => {
    try {
      let blob;
      
      if (Platform.OS === 'web' && fileData.file) {
        // Web: use the file directly
        blob = fileData.file;
      } else {
        // Native: fetch the file URI
        const response = await fetch(fileData.uri);
        blob = await response.blob();
      }

      const storage = getStorage();
      const filename = `games/${gameId}/mini-game.html`;
      const storageRef = ref(storage, filename);
      
      await uploadBytes(storageRef, blob, {
        contentType: 'text/html',
      });
      
      const downloadURL = await getDownloadURL(storageRef);
      return downloadURL;
    } catch (error) {
      console.error('Custom game upload error:', error);
      throw error;
    }
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

  // Pick sponsor logo image
  const pickSponsorLogo = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const fileUrl = URL.createObjectURL(file);
          setSponsorLogo(fileUrl);
        }
      };

      input.click();
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 1], // Wide aspect ratio for logos
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSponsorLogo(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick sponsor logo. Please try again.');
      console.error('Sponsor logo picker error:', error);
    }
  };

  // Upload sponsor logo to Firebase Storage
  const uploadSponsorLogoToStorage = async (uri, gameId) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();

      const storage = getStorage();
      const storageRef = ref(storage, `games/${gameId}/sponsor-logo.png`);

      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);

      return downloadURL;
    } catch (error) {
      console.error('Sponsor logo upload error:', error);
      throw error;
    }
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
        // Sponsor info (optional)
        sponsorName: sponsorName.trim() || null,
        sponsorLogo: null, // Will be updated after upload if provided
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

        // Add mini-game challenge if configured
        if (miniGameType && miniGameType !== 'none') {
          gameData.miniGame = {
            type: miniGameType === 'custom' ? 'custom' : miniGameType,
            config: {},
          };

          switch (miniGameType) {
            case 'tap_count':
              gameData.miniGame.config = {
                targetTaps: Number(miniGameTargetTaps) || 100,
                timeLimit: Number(miniGameTimeLimit) || 30,
              };
              break;
            case 'hold_duration':
              gameData.miniGame.config = {
                holdDuration: Number(miniGameHoldDuration) || 5000,
              };
              break;
            case 'rhythm_tap':
              gameData.miniGame.config = {
                bpm: Number(miniGameBpm) || 120,
                requiredBeats: Number(miniGameRequiredBeats) || 10,
                toleranceMs: Number(miniGameToleranceMs) || 150,
                requiredScore: 70,
              };
              break;
            case 'custom':
              // Custom game URL will be added after upload
              break;
          }
        }
      }

      // Virtual game specific fields
      if (gameType === 'virtual') {
        const durationMs = Number(competitionDuration) * 60 * 1000; // Convert minutes to ms
        
        gameData.virtualGame = {
          type: virtualGameType,
          config: {},
          // Battle Royale settings
          duration: durationMs,
          prizeDistribution: {
            1: Number(prize1stPercent) || 100,
            2: Number(prize2ndPercent) || 60,
            3: Number(prize3rdPercent) || 30,
          },
        };

        switch (virtualGameType) {
          case 'tap_count':
            gameData.virtualGame.config = {
              targetTaps: Number(virtualTargetTaps) || 100,
              timeLimit: Number(virtualTimeLimit) || 30,
            };
            break;
          case 'hold_duration':
            gameData.virtualGame.config = {
              holdDuration: Number(virtualHoldDuration) || 5000,
            };
            break;
          case 'rhythm_tap':
            gameData.virtualGame.config = {
              bpm: Number(virtualBpm) || 120,
              requiredBeats: Number(virtualRequiredBeats) || 10,
              toleranceMs: Number(virtualToleranceMs) || 150,
              requiredScore: 70,
            };
            break;
          case 'custom':
            // Custom game URL will be added after upload
            break;
        }

        // Initialize empty leaderboard
        gameData.leaderboard = [];

        // Legacy field for backwards compatibility
        gameData.virtualType = virtualGameType;
        if (virtualGameType === 'tap_count') {
          gameData.targetTaps = Number(virtualTargetTaps) || 100;
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

      // Upload custom mini-game HTML if provided (for location games)
      if (gameType === 'location' && miniGameType === 'custom' && customMiniGameFile) {
        try {
          const customGameUrl = await uploadCustomGameToStorage(customMiniGameFile, gameRef.id);

          // Update game document with custom game URL
          await updateDoc(doc(db, 'games', gameRef.id), {
            'miniGame.customGameUrl': customGameUrl,
            updatedAt: serverTimestamp(),
          });
        } catch (customGameError) {
          console.error('Custom game upload error:', customGameError);
          Alert.alert(
            'Warning',
            'Game created but custom mini-game failed to upload. The default game type will be used.'
          );
        }
      }

      // Upload custom virtual game HTML if provided (for virtual games)
      if (gameType === 'virtual' && virtualGameType === 'custom' && customVirtualGameFile) {
        try {
          const customGameUrl = await uploadCustomGameToStorage(customVirtualGameFile, gameRef.id);

          // Update game document with custom game URL
          await updateDoc(doc(db, 'games', gameRef.id), {
            'virtualGame.customGameUrl': customGameUrl,
            updatedAt: serverTimestamp(),
          });
        } catch (customGameError) {
          console.error('Custom virtual game upload error:', customGameError);
          Alert.alert(
            'Warning',
            'Game created but custom game failed to upload. The default Tap Race game will be used.'
          );
        }
      }

      // Upload sponsor logo if provided
      if (sponsorLogo) {
        try {
          const sponsorLogoUrl = await uploadSponsorLogoToStorage(sponsorLogo, gameRef.id);

          // Update game document with sponsor logo URL
          await updateDoc(doc(db, 'games', gameRef.id), {
            sponsorLogo: sponsorLogoUrl,
            updatedAt: serverTimestamp(),
          });
        } catch (sponsorError) {
          console.error('Sponsor logo upload error:', sponsorError);
          Alert.alert(
            'Warning',
            'Game created but sponsor logo failed to upload. You can add it later by editing the game.'
          );
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

  // Check notification stats - helpful for debugging
  const checkNotificationStats = async () => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      let totalUsers = 0;
      let usersWithTokens = 0;
      let usersWithCity = 0;
      const cityCounts = {};

      usersSnapshot.docs.forEach((docSnap) => {
        totalUsers++;
        const userData = docSnap.data();
        
        if (userData?.pushToken) {
          usersWithTokens++;
        }
        
        if (userData?.city) {
          usersWithCity++;
          const cityLower = userData.city.toLowerCase().trim();
          cityCounts[cityLower] = (cityCounts[cityLower] || 0) + 1;
        }
      });

      const topCities = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count]) => `${city}: ${count}`)
        .join('\n');

      Alert.alert(
        '📊 Notification Stats',
        `Total Users: ${totalUsers}\n` +
        `Users with Push Tokens: ${usersWithTokens}\n` +
        `Users with City Set: ${usersWithCity}\n\n` +
        `Top Cities:\n${topCities || 'No cities found'}`,
        [{ text: 'OK' }]
      );

      console.log('📊 Notification Stats:', {
        totalUsers,
        usersWithTokens,
        usersWithCity,
        cityCounts,
      });
    } catch (error) {
      console.error('Error checking notification stats:', error);
      Alert.alert('Error', 'Failed to check notification stats.');
    }
  };

  const handleLaunchGame = async (game) => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    try {
      // For virtual games or games without a city, notify all users
      const isVirtualOrNoCity = game.type === 'virtual' || !game.city;
      const targetAudience = isVirtualOrNoCity ? 'all players' : `players in ${game.city}`;

      Alert.alert(
        'Launch Game?',
        `Launch "${game.name}" and notify ${targetAudience}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Launch',
            style: 'default',
            onPress: async () => {
              // Prepare update data
              const updateData = {
                status: 'live',
                launchedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              };

              // For virtual games, calculate and set the end time
              if (game.type === 'virtual' && game.virtualGame?.duration) {
                const durationMs = game.virtualGame.duration;
                const endsAt = new Date(Date.now() + durationMs);
                updateData['virtualGame.endsAt'] = endsAt;
                console.log('⏱️ Virtual game will end at:', endsAt.toLocaleString());
              }

              await updateDoc(doc(db, 'games', game.id), updateData);

              // Get ALL users first, then filter
              const usersSnapshot = await getDocs(collection(db, 'users'));
              console.log('📊 Total users in database:', usersSnapshot.docs.length);
              console.log('🔍 Game type:', game.type);
              console.log('🔍 Game city:', game.city || 'none');

              // Filter users based on game type and city
              const tokens = usersSnapshot.docs
                .map((docSnap) => {
                  const userData = docSnap.data();
                  const token = userData?.pushToken;
                  const userCity = userData?.city?.toLowerCase?.()?.trim?.() || '';
                  const gameCity = game.city?.toLowerCase?.()?.trim?.() || '';
                  
                  // Log each user for debugging
                  console.log(`User ${docSnap.id}:`, {
                    hasToken: !!token,
                    tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
                    userCity: userCity || 'no city',
                    gameCity: gameCity || 'no city (all users)',
                  });

                  // For virtual games or games without city, include all users with tokens
                  if (isVirtualOrNoCity) {
                    return token;
                  }

                  // For location games with a city, match city (case-insensitive)
                  if (userCity && gameCity && userCity === gameCity) {
                    return token;
                  }

                  // Also include users without a city set (they should get all notifications)
                  if (!userCity && token) {
                    console.log(`  → Including user without city: ${docSnap.id}`);
                    return token;
                  }

                  return null;
                })
                .filter((token) => typeof token === 'string' && token.length > 0);

              console.log('✅ Valid push tokens to notify:', tokens.length);

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
                Alert.alert(
                  'Game Launched!', 
                  'No players to notify.\n\nThis could mean:\n• No users have push tokens\n• Users haven\'t enabled notifications\n• Check console logs for details'
                );
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Launch game error:', error);
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

          {pendingRedemptions.map((redemption) => {
            const userInfo = userDetailsCache[redemption.userId];
            return (
            <View key={redemption.id} style={styles.redemptionRow}>
              <View style={styles.redemptionInfo}>
                <Text style={[styles.redemptionTitle, { color: theme.colors.text }]}>
                  {redemption.method === 'visa' ? 'Visa Gift Card' : 'Amazon e‑Gift Card'} • $
                  {Number(redemption.amount || 0).toFixed(2)}
                </Text>
                <Text style={[styles.redemptionUserName, { color: theme.colors.text }]}>
                  👤 {userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : 'Loading...'}
                </Text>
                <Text style={[styles.redemptionMeta, { color: theme.colors.textSecondary }]}>
                  📧 {userInfo?.email || 'Loading...'}
                </Text>
                <Text style={[styles.redemptionMeta, { color: theme.colors.textSecondary }]}>
                  📱 {userInfo?.phone || 'No phone'}
                </Text>
                <Text style={[styles.redemptionMeta, { color: theme.colors.textSecondary }]}>
                  🏙️ {userInfo?.city || 'No city'}
                </Text>
                {redemption.socialMediaLink && (
                  <TouchableOpacity 
                    onPress={() => {
                      if (Platform.OS === 'web') {
                        window.open(redemption.socialMediaLink, '_blank');
                      } else {
                        import('react-native').then(({ Linking }) => {
                          Linking.openURL(redemption.socialMediaLink);
                        });
                      }
                    }}
                    style={styles.socialLinkButton}
                  >
                    <Ionicons name="link" size={14} color="#8B5CF6" />
                    <Text style={styles.socialLinkText}>View Social Post</Text>
                  </TouchableOpacity>
                )}
                <Text style={[styles.redemptionMeta, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                  {formatRedemptionTime(redemption.createdAt)
                    ? `Requested: ${formatRedemptionTime(redemption.createdAt)}`
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
          );
          })}
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
                placeholder="Downtown Cash Hunt"
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
            <TouchableOpacity
              onPress={() => setShowCityPicker(true)}
              activeOpacity={0.85}
              style={styles.selectInput}
            >
              <Text style={[styles.selectText, !city && styles.selectPlaceholder]}>
                {city || 'Select a city...'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="rgba(26, 26, 46, 0.6)" />
            </TouchableOpacity>
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
                Tap on the map to set the game location
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
                players find the location.
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

            {/* Mini-Game Challenge Settings */}
            <GradientCard style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                🎮 Arrival Challenge (Optional)
              </Text>
              <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
                Add a mini-game challenge that players must complete when they arrive at the location.
                This can be updated without app store submissions!
              </Text>

              {/* Mini-Game Type Selector */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Challenge Type
                </Text>
                <View style={styles.miniGameTypeContainer}>
                  {/* None Option */}
                  <TouchableOpacity
                    style={styles.miniGameTypeOption}
                    onPress={() => setMiniGameType('none')}
                    activeOpacity={0.7}
                  >
                    {miniGameType === 'none' ? (
                      <LinearGradient
                        colors={['#6B7280', '#4B5563']}
                        style={styles.miniGameTypeCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="close-circle" size={28} color="#FFFFFF" />
                        <Text style={styles.miniGameTypeText}>None</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                        <Ionicons name="close-circle-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>None</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Tap Count Option */}
                  <TouchableOpacity
                    style={styles.miniGameTypeOption}
                    onPress={() => setMiniGameType('tap_count')}
                    activeOpacity={0.7}
                  >
                    {miniGameType === 'tap_count' ? (
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.miniGameTypeCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="finger-print" size={28} color="#FFFFFF" />
                        <Text style={styles.miniGameTypeText}>Tap Race</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                        <Ionicons name="finger-print-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Tap Race</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Hold Duration Option */}
                  <TouchableOpacity
                    style={styles.miniGameTypeOption}
                    onPress={() => setMiniGameType('hold_duration')}
                    activeOpacity={0.7}
                  >
                    {miniGameType === 'hold_duration' ? (
                      <LinearGradient
                        colors={['#8B5CF6', '#6366F1']}
                        style={styles.miniGameTypeCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="hand-left" size={28} color="#FFFFFF" />
                        <Text style={styles.miniGameTypeText}>Hold</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                        <Ionicons name="hand-left-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Hold</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Rhythm Tap Option */}
                  <TouchableOpacity
                    style={styles.miniGameTypeOption}
                    onPress={() => setMiniGameType('rhythm_tap')}
                    activeOpacity={0.7}
                  >
                    {miniGameType === 'rhythm_tap' ? (
                      <LinearGradient
                        colors={['#EC4899', '#8B5CF6']}
                        style={styles.miniGameTypeCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="musical-notes" size={28} color="#FFFFFF" />
                        <Text style={styles.miniGameTypeText}>Rhythm</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                        <Ionicons name="musical-notes-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Rhythm</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Custom Upload Option */}
                  <TouchableOpacity
                    style={styles.miniGameTypeOption}
                    onPress={() => setMiniGameType('custom')}
                    activeOpacity={0.7}
                  >
                    {miniGameType === 'custom' ? (
                      <LinearGradient
                        colors={['#F59E0B', '#D97706']}
                        style={styles.miniGameTypeCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Ionicons name="cloud-upload" size={28} color="#FFFFFF" />
                        <Text style={styles.miniGameTypeText}>Custom</Text>
                      </LinearGradient>
                    ) : (
                      <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                        <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.textSecondary} />
                        <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Custom</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tap Count Settings */}
              {miniGameType === 'tap_count' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Target Taps
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="finger-print" size={20} color={theme.colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="100"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={miniGameTargetTaps}
                        onChangeText={setMiniGameTargetTaps}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Time Limit (seconds)
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="timer" size={20} color={theme.colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="30"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={miniGameTimeLimit}
                        onChangeText={setMiniGameTimeLimit}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Hold Duration Settings */}
              {miniGameType === 'hold_duration' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Hold Duration (milliseconds)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="time" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="5000"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={miniGameHoldDuration}
                      onChangeText={setMiniGameHoldDuration}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                    5000ms = 5 seconds
                  </Text>
                </View>
              )}

              {/* Rhythm Tap Settings */}
              {miniGameType === 'rhythm_tap' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      BPM (Beats Per Minute)
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="speedometer" size={20} color={theme.colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="120"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={miniGameBpm}
                        onChangeText={setMiniGameBpm}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Required Beats
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="musical-note" size={20} color={theme.colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="10"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={miniGameRequiredBeats}
                        onChangeText={setMiniGameRequiredBeats}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                  <View style={styles.inputGroup}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                      Timing Tolerance (ms)
                    </Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="pulse" size={20} color={theme.colors.textSecondary} />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="150"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={miniGameToleranceMs}
                        onChangeText={setMiniGameToleranceMs}
                        keyboardType="numeric"
                      />
                    </View>
                    <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                      Lower = harder (150ms is moderate difficulty)
                    </Text>
                  </View>
                </>
              )}

              {/* Custom Game Upload */}
              {miniGameType === 'custom' && (
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Upload Custom HTML Game
                  </Text>
                  <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                    Upload an HTML file with your custom game. The game should send a postMessage with 
                    {' { type: "complete", success: true/false, data: {...} }'} when finished.
                  </Text>
                  
                  <TouchableOpacity
                    style={styles.customGameUploadButton}
                    onPress={pickCustomGameFile}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={customMiniGameFile ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
                      style={styles.customGameUploadGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Ionicons 
                        name={customMiniGameFile ? 'checkmark-circle' : 'cloud-upload'} 
                        size={24} 
                        color="#FFFFFF" 
                      />
                      <Text style={styles.customGameUploadText}>
                        {customMiniGameFile ? customMiniGameFileName : 'Select HTML File'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  {customMiniGameFile && (
                    <TouchableOpacity
                      style={styles.removeCustomGameButton}
                      onPress={() => {
                        setCustomMiniGameFile(null);
                        setCustomMiniGameFileName('');
                      }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.removeCustomGameText}>Remove file</Text>
                    </TouchableOpacity>
                  )}
                </View>
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
            <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
              Choose the game players will play. You can use a preset or upload your own custom HTML game.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Game Type
              </Text>
              <View style={styles.miniGameTypeContainer}>
                {/* Tap Race Option */}
                <TouchableOpacity
                  style={styles.miniGameTypeOption}
                  onPress={() => setVirtualGameType('tap_count')}
                  activeOpacity={0.7}
                >
                  {virtualGameType === 'tap_count' ? (
                    <LinearGradient
                      colors={['#10B981', '#059669']}
                      style={styles.miniGameTypeCard}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="hand-left" size={28} color="#FFFFFF" />
                      <Text style={styles.miniGameTypeText}>Tap Race</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                      <Ionicons name="hand-left-outline" size={28} color={theme.colors.textSecondary} />
                      <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Tap Race</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Hold Option */}
                <TouchableOpacity
                  style={styles.miniGameTypeOption}
                  onPress={() => setVirtualGameType('hold_duration')}
                  activeOpacity={0.7}
                >
                  {virtualGameType === 'hold_duration' ? (
                    <LinearGradient
                      colors={['#8B5CF6', '#6366F1']}
                      style={styles.miniGameTypeCard}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="finger-print" size={28} color="#FFFFFF" />
                      <Text style={styles.miniGameTypeText}>Hold</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                      <Ionicons name="finger-print-outline" size={28} color={theme.colors.textSecondary} />
                      <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Hold</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Rhythm Tap Option */}
                <TouchableOpacity
                  style={styles.miniGameTypeOption}
                  onPress={() => setVirtualGameType('rhythm_tap')}
                  activeOpacity={0.7}
                >
                  {virtualGameType === 'rhythm_tap' ? (
                    <LinearGradient
                      colors={['#EC4899', '#8B5CF6']}
                      style={styles.miniGameTypeCard}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="musical-notes" size={28} color="#FFFFFF" />
                      <Text style={styles.miniGameTypeText}>Rhythm</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                      <Ionicons name="musical-notes-outline" size={28} color={theme.colors.textSecondary} />
                      <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Rhythm</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Custom Upload Option */}
                <TouchableOpacity
                  style={styles.miniGameTypeOption}
                  onPress={() => setVirtualGameType('custom')}
                  activeOpacity={0.7}
                >
                  {virtualGameType === 'custom' ? (
                    <LinearGradient
                      colors={['#F59E0B', '#D97706']}
                      style={styles.miniGameTypeCard}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Ionicons name="cloud-upload" size={28} color="#FFFFFF" />
                      <Text style={styles.miniGameTypeText}>Custom</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[styles.miniGameTypeCard, styles.inactiveCard]}>
                      <Ionicons name="cloud-upload-outline" size={28} color={theme.colors.textSecondary} />
                      <Text style={[styles.miniGameTypeText, { color: theme.colors.textSecondary }]}>Custom</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Tap Count Settings */}
            {virtualGameType === 'tap_count' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Target Taps
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="hand-left" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="100"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={virtualTargetTaps}
                      onChangeText={setVirtualTargetTaps}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Time Limit (seconds)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="timer" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="30"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={virtualTimeLimit}
                      onChangeText={setVirtualTimeLimit}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Hold Duration Settings */}
            {virtualGameType === 'hold_duration' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Hold Duration (milliseconds)
                </Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="time" size={20} color={theme.colors.textSecondary} />
                  <TextInput
                    style={[styles.input, { color: theme.colors.text }]}
                    placeholder="5000"
                    placeholderTextColor={theme.colors.textSecondary}
                    value={virtualHoldDuration}
                    onChangeText={setVirtualHoldDuration}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                  5000ms = 5 seconds
                </Text>
              </View>
            )}

            {/* Rhythm Tap Settings */}
            {virtualGameType === 'rhythm_tap' && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    BPM (Beats Per Minute)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="speedometer" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="120"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={virtualBpm}
                      onChangeText={setVirtualBpm}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Required Beats
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="musical-note" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="10"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={virtualRequiredBeats}
                      onChangeText={setVirtualRequiredBeats}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Timing Tolerance (ms)
                  </Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="pulse" size={20} color={theme.colors.textSecondary} />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="150"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={virtualToleranceMs}
                      onChangeText={setVirtualToleranceMs}
                      keyboardType="numeric"
                    />
                  </View>
                  <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                    Lower = harder (150ms is moderate difficulty)
                  </Text>
                </View>
              </>
            )}

            {/* Custom Game Upload */}
            {virtualGameType === 'custom' && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Upload Custom HTML Game
                </Text>
                <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                  Upload an HTML file with your custom game. The game should send a postMessage with 
                  {' { type: "complete", success: true/false, data: {...} }'} when finished.
                </Text>
                
                <TouchableOpacity
                  style={styles.customGameUploadButton}
                  onPress={pickCustomGameFile}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={customVirtualGameFile ? ['#10B981', '#059669'] : ['#F59E0B', '#D97706']}
                    style={styles.customGameUploadGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Ionicons 
                      name={customVirtualGameFile ? 'checkmark-circle' : 'cloud-upload'} 
                      size={24} 
                      color="#FFFFFF" 
                    />
                    <Text style={styles.customGameUploadText}>
                      {customVirtualGameFile ? customVirtualGameFileName : 'Select HTML File'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                {customVirtualGameFile && (
                  <TouchableOpacity
                    style={styles.removeCustomGameButton}
                    onPress={() => {
                      setCustomVirtualGameFile(null);
                      setCustomVirtualGameFileName('');
                    }}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.removeCustomGameText}>Remove file</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </GradientCard>
        )}

        {/* Battle Royale Settings - Only for Virtual Games */}
        {gameType === 'virtual' && (
          <GradientCard style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              ⏱️ Competition Settings
            </Text>
            <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginBottom: 16 }]}>
              Players compete for the best score within the time limit. Top players win prizes!
            </Text>

            {/* Competition Duration Dropdown */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Competition Duration
              </Text>
              <TouchableOpacity
                onPress={() => setShowDurationPicker(true)}
                activeOpacity={0.85}
                style={styles.selectInput}
              >
                <Text style={styles.selectText}>
                  {DURATION_OPTIONS.find(opt => opt.value === competitionDuration)?.label || 'Select duration...'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="rgba(26, 26, 46, 0.6)" />
              </TouchableOpacity>
            </View>

            {/* Prize Distribution */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Prize Distribution (% of total prize)
              </Text>
              <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginBottom: 12 }]}>
                Set what percentage of the prize pool each winner receives.
              </Text>
              
              <View style={styles.prizeDistributionContainer}>
                {/* 1st Place */}
                <View style={styles.prizeInputRow}>
                  <View style={styles.prizeRankBadge}>
                    <Text style={styles.prizeRankEmoji}>🥇</Text>
                    <Text style={[styles.prizeRankText, { color: theme.colors.text }]}>1st</Text>
                  </View>
                  <View style={styles.prizeInputWrapper}>
                    <TextInput
                      style={[styles.prizeInput, { color: theme.colors.text }]}
                      placeholder="100"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={prize1stPercent}
                      onChangeText={setPrize1stPercent}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.prizePercentSign, { color: theme.colors.textSecondary }]}>%</Text>
                  </View>
                  <Text style={[styles.prizeAmountPreview, { color: theme.colors.success }]}>
                    ${Math.round((Number(prizeAmount) || 0) * (Number(prize1stPercent) || 0) / 100)}
                  </Text>
                </View>

                {/* 2nd Place */}
                <View style={styles.prizeInputRow}>
                  <View style={styles.prizeRankBadge}>
                    <Text style={styles.prizeRankEmoji}>🥈</Text>
                    <Text style={[styles.prizeRankText, { color: theme.colors.text }]}>2nd</Text>
                  </View>
                  <View style={styles.prizeInputWrapper}>
                    <TextInput
                      style={[styles.prizeInput, { color: theme.colors.text }]}
                      placeholder="60"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={prize2ndPercent}
                      onChangeText={setPrize2ndPercent}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.prizePercentSign, { color: theme.colors.textSecondary }]}>%</Text>
                  </View>
                  <Text style={[styles.prizeAmountPreview, { color: theme.colors.success }]}>
                    ${Math.round((Number(prizeAmount) || 0) * (Number(prize2ndPercent) || 0) / 100)}
                  </Text>
                </View>

                {/* 3rd Place */}
                <View style={styles.prizeInputRow}>
                  <View style={styles.prizeRankBadge}>
                    <Text style={styles.prizeRankEmoji}>🥉</Text>
                    <Text style={[styles.prizeRankText, { color: theme.colors.text }]}>3rd</Text>
                  </View>
                  <View style={styles.prizeInputWrapper}>
                    <TextInput
                      style={[styles.prizeInput, { color: theme.colors.text }]}
                      placeholder="30"
                      placeholderTextColor={theme.colors.textSecondary}
                      value={prize3rdPercent}
                      onChangeText={setPrize3rdPercent}
                      keyboardType="numeric"
                    />
                    <Text style={[styles.prizePercentSign, { color: theme.colors.textSecondary }]}>%</Text>
                  </View>
                  <Text style={[styles.prizeAmountPreview, { color: theme.colors.success }]}>
                    ${Math.round((Number(prizeAmount) || 0) * (Number(prize3rdPercent) || 0) / 100)}
                  </Text>
                </View>
              </View>

              <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
                Total: {Number(prize1stPercent || 0) + Number(prize2ndPercent || 0) + Number(prize3rdPercent || 0)}% 
                (${Math.round((Number(prizeAmount) || 0) * (Number(prize1stPercent || 0) + Number(prize2ndPercent || 0) + Number(prize3rdPercent || 0)) / 100)})
              </Text>
            </View>
          </GradientCard>
        )}

        {/* Sponsor Section (Optional) */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🤝 Sponsor (Optional)
          </Text>
          <Text style={[styles.helpText, { color: theme.colors.textSecondary }]}>
            Add a sponsor logo to display on winner cards. Recommended size: 300x100 pixels (3:1 ratio).
          </Text>

          {/* Sponsor Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Sponsor Name
            </Text>
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder="e.g., Nike, Coca-Cola"
              placeholderTextColor={theme.colors.textSecondary}
              value={sponsorName}
              onChangeText={setSponsorName}
            />
          </View>

          {/* Sponsor Logo Upload */}
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Sponsor Logo
            </Text>
            
            {sponsorLogo ? (
              <View style={styles.sponsorLogoPreviewContainer}>
                <Image 
                  source={{ uri: sponsorLogo }} 
                  style={styles.sponsorLogoPreview}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  style={styles.removeSponsorLogoButton}
                  onPress={() => setSponsorLogo(null)}
                >
                  <Ionicons name="close-circle" size={24} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.sponsorLogoUploadButton}
                onPress={pickSponsorLogo}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#7C3AED']}
                  style={styles.sponsorLogoUploadGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="image-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.sponsorLogoUploadText}>Upload Sponsor Logo</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            <Text style={[styles.helpText, { color: theme.colors.textSecondary, marginTop: 8 }]}>
              PNG or JPG, max 300x100px recommended for best display on winner cards.
            </Text>
          </View>
        </GradientCard>

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
            <TouchableOpacity
              onPress={checkNotificationStats}
              style={styles.notificationStatsButton}
              activeOpacity={0.7}
            >
              <Ionicons name="notifications-outline" size={18} color={theme.colors.accent} />
              <Text style={[styles.notificationStatsText, { color: theme.colors.accent }]}>Stats</Text>
            </TouchableOpacity>
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
                    <TouchableOpacity 
                      style={styles.winnersInfo}
                      onPress={() => showWinnersDetails(game)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trophy" size={16} color="#FFD700" />
                      <Text style={[styles.winnersText, { color: theme.colors.text }]}>
                        {game.winners.length} winner{game.winners.length !== 1 ? 's' : ''} - Tap for details
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Delete Button - always visible */}
                  <TouchableOpacity
                    onPress={() => handleDeleteGame(game)}
                    activeOpacity={0.7}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </GradientCard>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* City Picker Modal */}
      <Modal
        visible={showCityPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCityPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowCityPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select city</Text>
              <TouchableOpacity
                onPress={() => setShowCityPicker(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="rgba(26, 26, 46, 0.7)" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CITY_OPTIONS.filter(opt => opt.value !== '')}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCity(item.value);
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, city === item.value && { color: '#8B5CF6' }]}>
                    {item.label}
                  </Text>
                  {city === item.value && (
                    <Ionicons name="checkmark" size={18} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Duration Picker Modal */}
      <Modal
        visible={showDurationPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDurationPicker(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setShowDurationPicker(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Competition duration</Text>
              <TouchableOpacity
                onPress={() => setShowDurationPicker(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="rgba(26, 26, 46, 0.7)" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={DURATION_OPTIONS}
              keyExtractor={(item) => item.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setCompetitionDuration(item.value);
                    setShowDurationPicker(false);
                  }}
                >
                  <Text style={[styles.modalItemText, competitionDuration === item.value && { color: '#8B5CF6' }]}>
                    {item.label}
                  </Text>
                  {competitionDuration === item.value && (
                    <Ionicons name="checkmark" size={18} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
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
  miniGameTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  miniGameTypeOption: {
    width: '25%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  miniGameTypeCard: {
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  miniGameTypeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
    textAlign: 'center',
  },
  customGameUploadButton: {
    marginTop: 8,
  },
  customGameUploadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 10,
  },
  customGameUploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  removeCustomGameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    padding: 8,
    gap: 6,
  },
  removeCustomGameText: {
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
  // Battle Royale / Competition Settings styles
  durationOptionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  durationOptionSelected: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // City dropdown styles
  cityDropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    gap: 6,
  },
  cityOptionSelected: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  cityOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Simple select input styles (matching onboarding)
  selectInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 229, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  selectPlaceholder: {
    color: 'rgba(26, 26, 46, 0.4)',
    fontWeight: '600',
  },
  // Simple modal styles (matching onboarding)
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 24,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 18,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  modalClose: {
    padding: 6,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  prizeDistributionContainer: {
    gap: 12,
  },
  prizeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prizeRankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 70,
    gap: 6,
  },
  prizeRankEmoji: {
    fontSize: 20,
  },
  prizeRankText: {
    fontSize: 14,
    fontWeight: '700',
  },
  prizeInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  prizeInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  prizePercentSign: {
    fontSize: 16,
    fontWeight: '600',
  },
  prizeAmountPreview: {
    fontSize: 14,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'right',
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
  notificationStatsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 229, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  notificationStatsText: {
    fontSize: 13,
    fontWeight: '600',
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
    marginBottom: 8,
  },
  redemptionUserName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  redemptionMeta: {
    fontSize: 13,
    fontWeight: '600',
  },
  socialLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  socialLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B5CF6',
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
  deleteButton: {
    padding: 10,
    marginLeft: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
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
  // Sponsor logo styles
  sponsorLogoPreviewContainer: {
    position: 'relative',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  sponsorLogoPreview: {
    width: 200,
    height: 67, // 3:1 aspect ratio
    borderRadius: 8,
  },
  removeSponsorLogoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  sponsorLogoUploadButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sponsorLogoUploadGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 12,
  },
  sponsorLogoUploadText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default AdminScreen;
