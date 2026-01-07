import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Import unified map components
import { UnifiedCallout, UnifiedMapView, UnifiedMarker } from '../components/UnifiedMapView';

// Conditionally import location module
let Location;
if (Platform.OS !== 'web') {
  Location = require('expo-location');
} else {
  Location = require('expo-location');
}

import { getAuth } from 'firebase/auth';
import { addDoc, collection, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { getFirebaseDb } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

const LEADERBOARD_DATA = [
  { id: '1', name: 'Sarah Johnson', wins: 23, earnings: 12450, avatar: '👩‍🦰', rank: 1 },
  { id: '2', name: 'Mike Chen', wins: 19, earnings: 9800, avatar: '👨', rank: 2 },
  { id: '3', name: 'Jessica Lee', wins: 17, earnings: 8900, avatar: '👩', rank: 3 },
  { id: '4', name: 'David Kim', wins: 15, earnings: 7650, avatar: '👨‍💼', rank: 4 },
  { id: '5', name: 'Emma Wilson', wins: 14, earnings: 7200, avatar: '👱‍♀️', rank: 5 },
];

const RECENT_WINNERS = [
  {
    id: '1',
    name: 'Sarah J.',
    prize: '$500',
    location: 'Central Park',
    time: '2 mins',
    avatar: '👩‍🦰',
    description: 'Found the treasure near the fountain in record time!',
  },
  {
    id: '2',
    name: 'Mike C.',
    prize: '$300',
    location: 'Downtown Plaza',
    time: '5 mins',
    avatar: '👨',
    description: 'Quick thinking led to the win at the city square.',
  },
  {
    id: '3',
    name: 'Jessica L.',
    prize: '$750',
    location: 'Riverside Park',
    time: '3 mins',
    avatar: '👩',
    description: 'Beat 50+ hunters to claim the prize!',
  },
];

const RECENT_DROPS = [
  { id: '1', amount: '$500', lat: 37.7749, lng: -122.4194, claimed: true, winner: 'Sarah' },
  { id: '2', amount: '$300', lat: 37.7849, lng: -122.4094, claimed: true, winner: 'Mike' },
  { id: '3', amount: '$750', lat: 37.7649, lng: -122.4294, claimed: true, winner: 'Jessica' },
  { id: '4', amount: '$400', lat: 37.7749, lng: -122.4094, claimed: false },
  { id: '5', amount: '$600', lat: 37.7549, lng: -122.4394, claimed: false },
];

const CommunityScreen = () => {
  const { theme } = useTheme();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [countdown, setCountdown] = useState({ hours: 2, minutes: 34, seconds: 15 });
  const [selectedTab, setSelectedTab] = useState('liveGames');
  const [showMap, setShowMap] = useState(false); // false = list view, true = map view
  const [liveGames, setLiveGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const mapRef = useRef(null);
  const didCenterMapRef = useRef(false);

  // Listen to live games
  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) {
      setLoadingGames(false);
      return;
    }

    const gamesQuery = query(
      collection(db, 'games'),
      where('status', '==', 'live'),
      where('type', '==', 'location')
    );

    const unsubscribe = onSnapshot(
      gamesQuery,
      (snapshot) => {
        console.log('🎮 CommunityScreen: Received', snapshot.docs.length, 'live games');
        const games = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('🎮 CommunityScreen: Processed games:', games);
        setLiveGames(games);
        setLoadingGames(false);
      },
      (error) => {
        console.error('❌ Error listening to live games:', error);
        setLoadingGames(false);
      }
    );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        let { hours, minutes, seconds } = prev;

        if (seconds > 0) {
          seconds--;
        } else {
          seconds = 59;
          if (minutes > 0) {
            minutes--;
          } else {
            minutes = 59;
            if (hours > 0) {
              hours--;
            }
          }
        }

        return { hours, minutes, seconds };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedTab !== 'liveGames' || !showMap) return;
    if (didCenterMapRef.current) return;

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

        // Add delay for web to ensure ref is ready
        if (Platform.OS === 'web') {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Check if animateToRegion exists before calling (native only)
        if (mapRef.current && typeof mapRef.current.animateToRegion === 'function') {
          didCenterMapRef.current = true;
          mapRef.current.animateToRegion(
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              latitudeDelta: 0.06,
              longitudeDelta: 0.06,
            },
            650
          );
        } else if (Platform.OS === 'web') {
          // On web, animateToRegion isn't supported - map will use region prop instead
          console.log('Map centering via region prop (web)');
          didCenterMapRef.current = true;
        }
      } catch (error) {
        console.log('Community map location error:', error?.message ?? error);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [selectedTab, showMap]);

  const getRankColor = (rank) => {
    switch (rank) {
      case 1: return theme.gradients.accent;
      case 2: return ['#C0C0C0', '#E8E8E8'];
      case 3: return ['#CD7F32', '#FFA500'];
      default: return ['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)'];
    }
  };

  const handleReportUser = async (userId, userName) => {
    Alert.alert(
      'Report User',
      `Report ${userName} for inappropriate username?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Report',
          style: 'destructive',
          onPress: async () => {
            try {
              const auth = getAuth();
              const currentUser = auth.currentUser;

              if (!currentUser) {
                Alert.alert('Error', 'You must be logged in to report users.');
                return;
              }

              const db = getFirebaseDb();
              if (!db) {
                Alert.alert('Error', 'Unable to submit report. Please try again.');
                return;
              }

              await addDoc(collection(db, 'reports'), {
                reportedUserId: userId,
                reportedUserName: userName,
                reporterUserId: currentUser.uid,
                reason: 'inappropriate_username',
                timestamp: serverTimestamp(),
                status: 'pending',
              });

              Alert.alert('Report Submitted', 'Thank you for helping keep our community safe.');
            } catch (error) {
              console.error('Error submitting report:', error);
              Alert.alert('Error', 'Failed to submit report. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderLeaderboardItem = (item) => (
    <TouchableOpacity key={item.id} activeOpacity={0.7}>
      <GradientCard style={styles.leaderboardCard}>
        <LinearGradient
          colors={getRankColor(item.rank)}
          style={styles.rankBadge}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.rankText}>#{item.rank}</Text>
        </LinearGradient>

        <LinearGradient
          colors={theme.gradients.primary}
          style={styles.leaderboardAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.leaderboardAvatarText}>{item.avatar}</Text>
        </LinearGradient>

        <View style={styles.leaderboardInfo}>
          <Text style={[styles.leaderboardName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <View style={styles.leaderboardStats}>
            <View style={styles.statItem}>
              <Ionicons name="trophy-outline" size={14} color={theme.colors.warning} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                {item.wins} wins
              </Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="cash-outline" size={14} color={theme.colors.success} />
              <Text style={[styles.statText, { color: theme.colors.textSecondary }]}>
                ${item.earnings.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => handleReportUser(item.id, item.name)}
          activeOpacity={0.7}
        >
          <View style={[styles.reportButtonCircle, { backgroundColor: theme.colors.cardBackground }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity>
          <LinearGradient
            colors={theme.gradients.accent}
            style={styles.followButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </GradientCard>
    </TouchableOpacity>
  );

  const renderWinnerCard = (item) => (
    <TouchableOpacity key={item.id} activeOpacity={0.7}>
      <GradientCard style={styles.winnerCard}>
        <LinearGradient
          colors={theme.gradients.accent}
          style={styles.winnerAvatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.winnerAvatarText}>{item.avatar}</Text>
        </LinearGradient>

        <View style={styles.winnerInfo}>
          <View style={styles.winnerHeader}>
            <Text style={[styles.winnerName, { color: theme.colors.text }]}>
              {item.name}
            </Text>
            <LinearGradient
              colors={['#FFD700', '#FFA500']}
              style={styles.prizeBadge}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.prizeText}>{item.prize}</Text>
            </LinearGradient>
          </View>

          <Text style={[styles.winnerDescription, { color: theme.colors.textSecondary }]}>
            {item.description}
          </Text>

          <View style={styles.winnerMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.location}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.time}
              </Text>
            </View>
          </View>
        </View>
      </GradientCard>
    </TouchableOpacity>
  );

  return (
    <GradientBackground>
      <ScrollView
        style={[styles.container, { marginBottom: insets.bottom + 85 }]}
        contentContainerStyle={[
          { paddingBottom: insets.bottom + 110 },
          Platform.OS === 'web' && styles.webContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Countdown Timer */}
        <LinearGradient
          colors={theme.gradients.primary}
          style={styles.countdownContainer}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <View style={styles.countdownContent}>
            <Ionicons name="timer-outline" size={32} color="#FFFFFF" />
            <View style={styles.countdownTextContainer}>
              <Text style={styles.countdownLabel}>Next Drop In</Text>
              <View style={styles.countdownNumbers}>
                <View style={styles.timeUnit}>
                  <Text style={styles.timeNumber}>{String(countdown.hours).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>HRS</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeUnit}>
                  <Text style={styles.timeNumber}>{String(countdown.minutes).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>MIN</Text>
                </View>
                <Text style={styles.timeSeparator}>:</Text>
                <View style={styles.timeUnit}>
                  <Text style={styles.timeNumber}>{String(countdown.seconds).padStart(2, '0')}</Text>
                  <Text style={styles.timeLabel}>SEC</Text>
                </View>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Tab Selector */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('liveGames')}
            activeOpacity={0.7}
          >
            {selectedTab === 'liveGames' ? (
              <LinearGradient
                colors={theme.gradients.accent}
                style={styles.activeTab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.activeTabText}>Live Games</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTab}>
                <Text style={[styles.tabText, { color: theme.colors.textSecondary }]}>
                  Live Games
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('leaderboard')}
            activeOpacity={0.7}
          >
            {selectedTab === 'leaderboard' ? (
              <LinearGradient
                colors={theme.gradients.accent}
                style={styles.activeTab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.activeTabText}>Leaderboard</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTab}>
                <Text style={[styles.tabText, { color: theme.colors.textSecondary }]}>
                  Leaderboard
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.tab}
            onPress={() => setSelectedTab('winners')}
            activeOpacity={0.7}
          >
            {selectedTab === 'winners' ? (
              <LinearGradient
                colors={theme.gradients.accent}
                style={styles.activeTab}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.activeTabText}>Recent Winners</Text>
              </LinearGradient>
            ) : (
              <View style={styles.inactiveTab}>
                <Text style={[styles.tabText, { color: theme.colors.textSecondary }]}>
                  Recent Winners
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.headerDivider} />

        {/* Content based on selected tab */}
        <View style={styles.content}>
          {selectedTab === 'leaderboard' && (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                🏆 Top Hunters
              </Text>
              {LEADERBOARD_DATA.map(renderLeaderboardItem)}
            </View>
          )}

          {selectedTab === 'winners' && (
            <View>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                🎉 Recent Winners
              </Text>
              {RECENT_WINNERS.map(renderWinnerCard)}
            </View>
          )}

          {selectedTab === 'liveGames' && (
            <View>
              <View style={styles.mapHeader}>
                <View style={styles.headerLeft}>

                  {loadingGames ? (
                    <ActivityIndicator size="small" color={theme.colors.accent} />
                  ) : (
                    <View style={styles.liveGamesBadge}>
                      <View style={styles.livePulse} />
                      <Text style={[styles.liveGamesCount, { color: theme.colors.text }]}>
                        {liveGames.length} Live
                      </Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.toggleButton}
                  onPress={() => setShowMap(!showMap)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showMap ? 'list' : 'map'}
                    size={20}
                    color={theme.colors.accent}
                  />
                  <Text style={[styles.toggleText, { color: theme.colors.accent }]}>
                    {showMap ? 'List' : 'Map'}
                  </Text>
                </TouchableOpacity>
              </View>

              {!showMap ? (
                // List View
                <View style={styles.listContainer}>
                  {loadingGames ? (
                    <ActivityIndicator size="large" color={theme.colors.accent} style={{ marginTop: 40 }} />
                  ) : liveGames.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="game-controller-outline" size={64} color={theme.colors.textSecondary} />
                      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
                        No live games right now
                      </Text>
                      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
                        Check back soon for new games!
                      </Text>
                    </View>
                  ) : (
                    liveGames.map((game) => (
                      <TouchableOpacity
                        key={game.id}
                        onPress={() => navigation.navigate('LiveGame', { gameId: game.id })}
                        activeOpacity={0.7}
                      >
                        <GradientCard style={styles.gameCard}>
                          <View style={styles.gameCardHeader}>
                            <View style={styles.gameCardLeft}>
                              <Text style={[styles.gameCardTitle, { color: theme.colors.text }]}>
                                {game.name}
                              </Text>
                              <Text style={[styles.gameCardLocation, { color: theme.colors.textSecondary }]}>
                                📍 {game.city}
                              </Text>
                            </View>
                            <View style={styles.gameCardRight}>
                              <LinearGradient
                                colors={['#FFD700', '#FFA500']}
                                style={styles.liveGamePrizeBadge}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                              >
                                <Text style={styles.liveGamePrizeText}>${game.prizeAmount}</Text>
                              </LinearGradient>
                              <View style={[styles.liveGamesBadge, { marginTop: 8 }]}>
                                <View style={styles.livePulse} />
                                <Text style={[styles.liveGamesCount, { color: '#EF4444' }]}>
                                  LIVE
                                </Text>
                              </View>
                            </View>
                          </View>
                          <View style={styles.gameCardFooter}>
                            <View style={styles.gameCardStat}>
                              <Ionicons name="people" size={16} color={theme.colors.accent} />
                              <Text style={[styles.gameCardStatText, { color: theme.colors.textSecondary }]}>
                                {game.winners?.length || 0} / {game.winnerSlots || 3} Winners
                              </Text>
                            </View>
                            <View style={styles.tapToJoinButton}>
                              <Text style={styles.tapToJoinText}>Tap to Join</Text>
                              <Ionicons name="chevron-forward" size={18} color="#00D4E5" />
                            </View>
                          </View>
                        </GradientCard>
                      </TouchableOpacity>
                    ))
                  )}
                </View>
              ) : (
                // Map View
                <View>
                  <GradientCard style={styles.mapCard}>
                    <UnifiedMapView
                      ref={mapRef}
                      style={styles.map}
                      region={{
                        latitude: liveGames.length > 0 ? liveGames[0].location.latitude : 37.7749,
                        longitude: liveGames.length > 0 ? liveGames[0].location.longitude : -122.4194,
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                      }}
                    >
                      {/* Live Games Markers */}
                      {liveGames.map((game) => (
                        <UnifiedMarker
                          key={game.id}
                          coordinate={{
                            latitude: game.location.latitude,
                            longitude: game.location.longitude,
                          }}
                          onPress={() => {
                            navigation.navigate('LiveGame', { gameId: game.id });
                          }}
                        >
                          <View style={styles.markerContainer}>
                            <LinearGradient
                              colors={['#EF4444', '#DC2626']}
                              style={styles.liveMarker}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Ionicons name="trophy" size={20} color="#FFFFFF" />
                              <Text style={styles.liveMarkerText}>${game.prizeAmount}</Text>
                            </LinearGradient>
                            <View style={styles.livePulseBadge}>
                              <View style={styles.livePulseInner} />
                            </View>
                          </View>
                          <UnifiedCallout tooltip>
                            <View style={styles.calloutContainer}>
                              <Text style={styles.calloutTitle}>{game.name}</Text>
                              <Text style={styles.calloutSubtitle}>
                                ${game.prizeAmount} • {game.city}
                              </Text>
                              <Text style={styles.calloutWinners}>
                                {game.winners?.length || 0} / {game.winnerSlots || 3} Winners
                              </Text>
                              <Text style={styles.calloutTap}>Tap to join!</Text>
                            </View>
                          </UnifiedCallout>
                        </UnifiedMarker>
                      ))}

                      {/* Past Drops (mock data) */}
                      {RECENT_DROPS.map((drop) => (
                        <UnifiedMarker
                          key={drop.id}
                          coordinate={{ latitude: drop.lat, longitude: drop.lng }}
                        >
                          <View style={styles.markerContainer}>
                            <LinearGradient
                              colors={drop.claimed ? ['#10B981', '#059669'] : theme.gradients.primary}
                              style={styles.marker}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 1 }}
                            >
                              <Text style={styles.markerText}>{drop.amount}</Text>
                            </LinearGradient>
                            {drop.claimed && (
                              <View style={styles.claimedBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                              </View>
                            )}
                          </View>
                        </UnifiedMarker>
                      ))}
                    </UnifiedMapView>
                  </GradientCard>

                  <View style={styles.mapLegend}>
                    <View style={styles.legendItem}>
                      <LinearGradient
                        colors={['#EF4444', '#DC2626']}
                        style={styles.legendDot}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                        Live Games
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <LinearGradient
                        colors={['#10B981', '#059669']}
                        style={styles.legendDot}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                        Completed
                      </Text>
                    </View>
                    <View style={styles.legendItem}>
                      <LinearGradient
                        colors={theme.gradients.primary}
                        style={styles.legendDot}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      />
                      <Text style={[styles.legendText, { color: theme.colors.textSecondary }]}>
                        Past Drops
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContent: {
    maxWidth: 1000,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  countdownContainer: {
    margin: 16,
    marginTop: 60,
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  countdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countdownTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  countdownLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  countdownNumbers: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeUnit: {
    alignItems: 'center',
  },
  timeNumber: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
  },
  timeLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  timeSeparator: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    marginHorizontal: 4,
  },
  activeTab: {
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  inactiveTab: {
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  tabText: {
    paddingVertical: 12,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  leaderboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 16,
  },
  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  leaderboardAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leaderboardAvatarText: {
    fontSize: 24,
  },
  leaderboardInfo: {
    flex: 1,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  leaderboardStats: {
    flexDirection: 'row',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 13,
    marginLeft: 4,
  },
  reportButton: {
    marginRight: 8,
  },
  reportButtonCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  followButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  winnerCard: {
    flexDirection: 'row',
    marginBottom: 16,
    padding: 16,
  },
  winnerAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  winnerAvatarText: {
    fontSize: 32,
  },
  winnerInfo: {
    flex: 1,
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 18,
    fontWeight: '700',
  },
  prizeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  prizeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  winnerDescription: {
    fontSize: 14,
    lineHeight: 18,
    marginBottom: 8,
  },
  winnerMeta: {
    flexDirection: 'row',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  mapCard: {
    height: 400,
    padding: 0,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
    borderRadius: 20,
  },
  webMapPlaceholder: {
    height: 400,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  webMapText: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  webMapSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  markerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  claimedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
  },
  mapLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    fontWeight: '600',
  },
  mapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  liveGamesBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  liveGamesCount: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  liveMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  liveMarkerText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    marginLeft: 4,
  },
  livePulseBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  livePulseInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  calloutContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 4,
  },
  calloutSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  calloutWinners: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10B981',
    marginBottom: 8,
  },
  calloutTap: {
    fontSize: 12,
    fontWeight: '700',
    color: '#EF4444',
    textAlign: 'center',
  },
  liveGamesList: {
    marginTop: 16,
  },
  liveGameCard: {
    padding: 16,
    marginBottom: 12,
  },
  liveGameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  liveGameInfo: {
    flex: 1,
    marginRight: 12,
  },
  liveGameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  liveGameName: {
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livePulseSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
    marginRight: 4,
  },
  liveText: {
    color: '#EF4444',
    fontSize: 10,
    fontWeight: '800',
  },
  liveGameCity: {
    fontSize: 14,
    fontWeight: '600',
  },
  liveGamePrize: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  liveGamePrizeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  liveGameStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  liveGameStat: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveGameStatText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listContainer: {
    paddingBottom: 16,
  },
  gameCard: {
    padding: 16,
    marginBottom: 12,
  },
  gameCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  gameCardLeft: {
    flex: 1,
    marginRight: 12,
  },
  gameCardRight: {
    alignItems: 'flex-end',
  },
  gameCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  gameCardLocation: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  liveGamePrizeBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gameCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  gameCardStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gameCardStatText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginTop: 8,
    textAlign: 'center',
  },
  tapToJoinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 212, 229, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  tapToJoinText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00D4E5',
  },
});

export default CommunityScreen;
