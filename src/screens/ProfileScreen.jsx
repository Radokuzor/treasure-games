import React, { useEffect, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { getFirebaseAuth, getFirebaseDb, hasFirebaseConfig } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';

const FRIENDS_DATA = [
  { id: '1', name: 'Sarah', avatar: '👩‍🦰', status: 'online' },
  { id: '2', name: 'Mike', avatar: '👨', status: 'offline' },
  { id: '3', name: 'Jessica', avatar: '👩', status: 'online' },
  { id: '4', name: 'David', avatar: '👨‍💼', status: 'online' },
];

const ProfileScreen = ({ navigation }) => {
  const { theme, currentTheme, changeTheme, allThemes } = useTheme();
  const insets = useSafeAreaInsets();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [showRedeemModal, setShowRedeemModal] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [uid, setUid] = useState(null);
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    username: '',
    profileImageUrl: '',
  });

  const [stats, setStats] = useState({
    balance: 75.0,
    earnings: 750.0,
    wins: 10,
    friends: 47,
  });
  const canRedeem = stats.balance >= 25 && !isRedeeming;

  useEffect(() => {
    if (!hasFirebaseConfig) return;

    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid ?? null);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!hasFirebaseConfig) return;
    if (!uid) {
      setProfile({ firstName: '', lastName: '', username: '', profileImageUrl: '' });
      return;
    }

    const db = getFirebaseDb();
    if (!db) return;

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() ?? {};

        const firstName = typeof data.firstName === 'string' ? data.firstName : '';
        const lastName = typeof data.lastName === 'string' ? data.lastName : '';
        const username = typeof data.username === 'string' ? data.username : '';
        const profileImageUrl = typeof data.profileImageUrl === 'string' ? data.profileImageUrl : '';

        setProfile({
          firstName,
          lastName,
          username,
          profileImageUrl,
        });

        setStats((prev) => ({
          ...prev,
          balance: typeof data.balance === 'number' ? data.balance : prev.balance,
          earnings: typeof data.earnings === 'number' ? data.earnings : prev.earnings,
          wins: typeof data.wins === 'number' ? data.wins : prev.wins,
        }));
      },
      (error) => {
        console.log('Profile stats listener error:', error?.message ?? error);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const handleRedeem = async (method) => {
    if (isRedeeming) return;
    if (!hasFirebaseConfig) {
      Alert.alert('Firebase not configured', 'Add Firebase env vars to enable redeem.');
      return;
    }

    const auth = getFirebaseAuth();
    const uid = auth?.currentUser?.uid ?? null;
    if (!uid) {
      Alert.alert('Not signed in', 'Please sign in again to redeem.');
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      Alert.alert('Firebase error', 'Firestore is not available. Please restart the app.');
      return;
    }

    try {
      setIsRedeeming(true);

      const userRef = doc(db, 'users', uid);
      const redemptionRef = doc(collection(db, 'redemptions'));

      const { redeemedAmount } = await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userRef);
        const data = snap.data() ?? {};
        const currentBalance = typeof data.balance === 'number' ? data.balance : 0;

        if (currentBalance < 25) {
          throw new Error('Minimum redemption amount is $25.');
        }

        transaction.set(
          redemptionRef,
          {
            userId: uid,
            method, // 'amazon' | 'visa'
            amount: currentBalance,
            status: 'requested',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        transaction.set(
          userRef,
          {
            balance: 0,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        return { redeemedAmount: currentBalance };
      });

      setShowRedeemModal(false);
      Alert.alert(
        'Redeem Requested',
        `Your ${method === 'amazon' ? 'Amazon e-gift card' : 'Visa gift card'} request for $${redeemedAmount.toFixed(
          2
        )} has been submitted. An email link will be sent to you.`
      );
    } catch (error) {
      Alert.alert('Redeem error', error?.message ?? 'Failed to redeem. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

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
        {/* Profile Header */}
        <View style={styles.header}>
          <LinearGradient
            colors={theme.gradients.primary}
            style={styles.profilePicture}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {profile.profileImageUrl ? (
              <Image source={{ uri: profile.profileImageUrl }} style={styles.profileImage} />
            ) : (
              <Text style={styles.profileEmoji}>👤</Text>
            )}
          </LinearGradient>
          
          <Text style={[styles.profileName, { color: theme.colors.text }]}>
            {profile.firstName || profile.lastName ? `${profile.firstName} ${profile.lastName}`.trim() : ''}
          </Text>
          <Text style={[styles.profileUsername, { color: theme.colors.textSecondary }]}>
            {profile.username ? `@${profile.username}` : ''}
          </Text>

          <TouchableOpacity
            onPress={() => navigation.getParent?.()?.navigate?.('EditProfile')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={theme.gradients.accent}
              style={styles.editButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="create-outline" size={16} color="#FFFFFF" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setShowRedeemModal(true)}
            accessibilityRole="button"
            accessibilityLabel="Redeem balance"
            style={{ flex: 1 }}
          >
            <GradientCard style={styles.statCard}>
              <Ionicons name="wallet-outline" size={32} color={theme.colors.success} />
              <Text style={[styles.statValue, { color: theme.colors.text }]}>
                ${stats.balance.toLocaleString()}
              </Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                Balance
              </Text>
            </GradientCard>
          </TouchableOpacity>

          <GradientCard style={styles.statCard}>
            <Ionicons name="trending-up-outline" size={32} color={theme.colors.warning} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              ${stats.earnings.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Earnings
            </Text>
          </GradientCard>
        </View>

        <View style={styles.statsContainer}>
          <GradientCard style={styles.statCard}>
            <Ionicons name="trophy-outline" size={32} color="#FFD700" />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats.wins}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Wins
            </Text>
          </GradientCard>

          <GradientCard style={styles.statCard}>
            <Ionicons name="people-outline" size={32} color="#00D9F5" />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {stats.friends}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              Friends
            </Text>
          </GradientCard>
        </View>

        {/* Theme Selector */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            🎨 Theme
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {Object.keys(allThemes).map((themeName) => (
              <TouchableOpacity
                key={themeName}
                onPress={() => changeTheme(themeName)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={allThemes[themeName].gradients.primary}
                  style={[
                    styles.themeOption,
                    currentTheme === themeName && styles.selectedTheme,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {currentTheme === themeName && (
                    <View style={styles.selectedBadge}>
                      <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
                    </View>
                  )}
                </LinearGradient>
                <Text
                  style={[
                    styles.themeName,
                    { color: theme.colors.textSecondary },
                    currentTheme === themeName && { color: theme.colors.text, fontWeight: '700' },
                  ]}
                >
                  {allThemes[themeName].name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GradientCard>

        {/* Friends Section */}
        <GradientCard style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
              👥 Friends
            </Text>
            <TouchableOpacity>
              <Text style={[styles.seeAllText, { color: theme.colors.textSecondary }]}>
                See All
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.friendsList}>
            {FRIENDS_DATA.map((friend) => (
              <View key={friend.id} style={styles.friendItem}>
                <LinearGradient
                  colors={theme.gradients.accent}
                  style={styles.friendAvatar}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.friendEmoji}>{friend.avatar}</Text>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: friend.status === 'online' ? '#10B981' : '#6B7280' },
                    ]}
                  />
                </LinearGradient>
                <Text style={[styles.friendName, { color: theme.colors.textSecondary }]}>
                  {friend.name}
                </Text>
              </View>
            ))}
          </View>
        </GradientCard>

        {/* Settings */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            ⚙️ Settings
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={24} color={theme.colors.text} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#3e3e3e', true: theme.gradients.accent[0] }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="location-outline" size={24} color={theme.colors.text} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                Location Services
              </Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#3e3e3e', true: theme.gradients.accent[0] }}
              thumbColor="#FFFFFF"
            />
          </View>

          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('HowToPlay')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="book-outline" size={24} color={theme.colors.text} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>How To Play</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.settingItem} 
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Admin')}
          >
            <View style={styles.settingLeft}>
              <Ionicons name="shield-outline" size={24} color={theme.colors.warning} />
              <Text style={[styles.settingText, { color: theme.colors.text }]}>
                Admin Panel
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </GradientCard>

        {/* Logout Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.logoutContainer}
          onPress={async () => {
            if (!hasFirebaseConfig) {
              Alert.alert('Firebase not configured', 'Add Firebase env vars to enable logout.');
              return;
            }

            const firebaseAuth = getFirebaseAuth();
            if (!firebaseAuth) {
              Alert.alert('Firebase error', 'Auth is not available yet. Please restart the app.');
              return;
            }

            try {
              await signOut(firebaseAuth);
              const rootNavigation = navigation.getParent?.();
              rootNavigation?.reset?.({
                index: 0,
                routes: [{ name: 'Auth' }],
              });
            } catch (error) {
              Alert.alert('Logout error', error?.message ?? 'Something went wrong. Please try again.');
            }
          }}
        >
          <LinearGradient
            colors={['#EF4444', '#DC2626']}
            style={styles.logoutButton}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="log-out-outline" size={24} color="#FFFFFF" />
            <Text style={styles.logoutText}>Logout</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Redeem Modal */}
      <Modal visible={showRedeemModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <GradientCard style={styles.redeemCard}>
            <Ionicons name="gift-outline" size={64} color={theme.colors.success} />
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Redeem</Text>
            <Text style={[styles.modalSubtitle, { color: theme.colors.textSecondary }]}>
              An email link will be sent to you
            </Text>
            <Text style={[styles.redeemNote, { color: theme.colors.textSecondary }]}>
              Minimum redemption: $25
            </Text>

            <TouchableOpacity
              onPress={() => void handleRedeem('amazon')}
              activeOpacity={0.85}
              style={styles.fullWidth}
              disabled={!canRedeem}
            >
              <LinearGradient
                colors={theme.gradients.primary}
                style={[styles.submitButton, !canRedeem ? { opacity: 0.5 } : null]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isRedeeming ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text style={styles.submitButtonText}>{isRedeeming ? 'Processing...' : 'Amazon'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => void handleRedeem('visa')}
              activeOpacity={0.85}
              style={styles.fullWidth}
              disabled={!canRedeem}
            >
              <LinearGradient
                colors={theme.gradients.accent}
                style={[styles.submitButton, !canRedeem ? { opacity: 0.5 } : null]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {isRedeeming ? <ActivityIndicator color="#FFFFFF" /> : null}
                <Text style={styles.submitButtonText}>{isRedeeming ? 'Processing...' : 'Visa'}</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowRedeemModal(false)}
              activeOpacity={0.8}
              style={styles.cancelButton}
              disabled={isRedeeming}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </GradientCard>
        </View>
      </Modal>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webContent: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 24,
  },
  profilePicture: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  profileEmoji: {
    fontSize: 60,
  },
  profileName: {
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 20,
    marginHorizontal: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 12,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    margin: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  themeOption: {
    width: 80,
    height: 80,
    borderRadius: 16,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedTheme: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  selectedBadge: {
    position: 'absolute',
  },
  themeName: {
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  friendsList: {
    flexDirection: 'row',
  },
  friendItem: {
    alignItems: 'center',
    marginRight: 20,
  },
  friendAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  friendEmoji: {
    fontSize: 32,
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  friendName: {
    fontSize: 12,
    fontWeight: '600',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  settingSubtext: {
    fontSize: 12,
    marginLeft: 16,
    marginTop: 2,
  },
  logoutContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
  },
  logoutText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  redeemCard: {
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
  redeemNote: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 18,
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
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

export default ProfileScreen;
