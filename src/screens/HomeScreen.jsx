import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  TextInput,
  FlatList,
  Animated,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useIsFocused } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { GradientBackground } from '../components/GradientComponents';
import { getDb, hasFirebaseConfig } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { getFirebaseAuth } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerForPushNotificationsAsync } from '../notificationService';
import { getDeviceId } from '../utils/deviceId';
import * as Notifications from 'expo-notifications';

// Conditionally import expo-av components only for native
let Audio, Video;
if (Platform.OS !== 'web') {
  const ExpoAV = require('expo-av');
  Audio = ExpoAV.Audio;
  Video = ExpoAV.Video;
}

const { width, height } = Dimensions.get('window');

const BLOCKED_USERS_KEY = 'blockedHomeMediaUsers_v1';

const HomeScreen = () => {
  const { theme } = useTheme();
  const isFocused = useIsFocused();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [videos, setVideos] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [hiddenVideoIds, setHiddenVideoIds] = useState(() => new Set());
  const [blockedUserIds, setBlockedUserIds] = useState(() => new Set());
  const slideAnim = useRef(new Animated.Value(height)).current;

  const visibleVideos = useMemo(() => {
    return videos.filter(
      (v) => !hiddenVideoIds.has(v.id) && !blockedUserIds.has(v.userId ?? v.uid ?? v.username)
    );
  }, [videos, hiddenVideoIds, blockedUserIds]);

  useEffect(() => {
    if (currentIndex < visibleVideos.length) return;
    setCurrentIndex(Math.max(0, visibleVideos.length - 1));
    if (visibleVideos.length === 0) {
      setShowComments(false);
    }
  }, [currentIndex, visibleVideos.length]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const set = new Set(Array.isArray(parsed) ? parsed : []);
        if (isMounted) setBlockedUserIds(set);
      } catch (_error) {
        // ignore
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Check and update missing push token / device ID
  useEffect(() => {
    if (!hasFirebaseConfig) return;
    
    const checkAndUpdateUserTokens = async () => {
      try {
        const auth = getFirebaseAuth();
        const user = auth?.currentUser;
        if (!user) return;

        const db = getDb();
        if (!db) return;

        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) return;
        
        const userData = userSnap.data();
        const updates = {};

        // Check if device ID is missing
        if (!userData.deviceId) {
          try {
            const deviceId = await getDeviceId();
            if (deviceId) {
              updates.deviceId = deviceId;
              console.log('📱 HomeScreen: Adding missing device ID:', deviceId);
            }
          } catch (e) {
            console.log('Could not get device ID:', e?.message ?? e);
          }
        }

        // Check if push token is missing
        if (!userData.pushToken) {
          try {
            // First check if we have notification permissions
            const { status } = await Notifications.getPermissionsAsync();
            
            if (status === 'granted') {
              // We have permission, get the token
              const pushToken = await registerForPushNotificationsAsync();
              if (pushToken) {
                updates.pushToken = pushToken;
                updates.pushTokenUpdatedAt = serverTimestamp();
                console.log('📱 HomeScreen: Adding missing push token:', pushToken);
              }
            } else if (status !== 'denied') {
              // Permission not yet asked, request it
              const { status: newStatus } = await Notifications.requestPermissionsAsync();
              if (newStatus === 'granted') {
                const pushToken = await registerForPushNotificationsAsync();
                if (pushToken) {
                  updates.pushToken = pushToken;
                  updates.pushTokenUpdatedAt = serverTimestamp();
                  console.log('📱 HomeScreen: Got push token after permission request:', pushToken);
                }
              }
            }
          } catch (e) {
            console.log('Could not get push token:', e?.message ?? e);
          }
        }

        // Update user document if we have any updates
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = serverTimestamp();
          await updateDoc(userRef, updates);
          console.log('✅ HomeScreen: Updated user with missing tokens:', Object.keys(updates));
        }
      } catch (error) {
        console.log('HomeScreen token check error:', error?.message ?? error);
      }
    };

    // Run the check after a short delay to not block initial render
    const timer = setTimeout(checkAndUpdateUserTokens, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Load media from Firestore
  useEffect(() => {
    if (!hasFirebaseConfig) {
      setLoadingMedia(false);
      return;
    }

    const db = getDb();
    if (!db) {
      setLoadingMedia(false);
      return;
    }

    const mediaQuery = query(collection(db, 'homeMedia'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
      console.log('📱 HomeScreen: Received', snapshot.docs.length, 'media items');
      const mediaData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
        // Generate avatar from first letter of username
        avatar: docSnap.data().username?.charAt(0).toUpperCase() || '?',
      }));
      console.log('📱 HomeScreen: Processed media data:', mediaData);
      setVideos(mediaData);
      setLoadingMedia(false);
    });

    return () => unsubscribe();
  }, []);

  const handleHideContent = (id) => {
    if (!id) return;
    setHiddenVideoIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const persistBlockedUsers = async (nextSet) => {
    try {
      await AsyncStorage.setItem(BLOCKED_USERS_KEY, JSON.stringify(Array.from(nextSet)));
    } catch (_error) {
      // ignore
    }
  };

  const handleBlockUser = async (item) => {
    const identifier = item?.userId ?? item?.uid ?? item?.username ?? null;
    if (!identifier) {
      Alert.alert('Error', 'Unable to block this user.');
      return;
    }

    setBlockedUserIds((prev) => {
      const next = new Set(prev);
      next.add(identifier);
      void persistBlockedUsers(next);
      return next;
    });

    Alert.alert('User Blocked', `You will no longer see content from @${item.username}.`, [
      { text: 'OK', onPress: () => handleHideContent(item.id) },
    ]);
  };

  const handleReportContent = async (item) => {
    try {
      if (!hasFirebaseConfig) {
        Alert.alert('Error', 'Reporting is not available right now.');
        return;
      }

      const auth = getFirebaseAuth();
      const currentUser = auth?.currentUser ?? null;
      const db = getDb();

      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to report content.');
        return;
      }

      if (!db) {
        Alert.alert('Error', 'Unable to submit report. Please try again.');
        return;
      }

      await addDoc(collection(db, 'reports'), {
        type: 'homeMedia',
        contentId: item.id,
        contentUrl: item.url ?? null,
        reportedUserId: item.userId ?? item.uid ?? null,
        reportedUsername: item.username ?? null,
        reporterUserId: currentUser.uid,
        reason: 'UGC_Safety_Violation',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      Alert.alert('Reported', 'Thank you. Our moderators will review this content.');
      handleHideContent(item.id);
    } catch (error) {
      Alert.alert('Error', error?.message ?? 'Could not submit report.');
    }
  };

  const handleModerationMenu = (item) => {
    const username = item?.username ?? 'user';
    const options = ['Block User', 'Report Content', 'Hide Video', 'Cancel'];
    const destructiveIndex = 0;
    const cancelIndex = 3;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          destructiveButtonIndex: destructiveIndex,
          cancelButtonIndex: cancelIndex,
          title: 'Content Moderation',
          message: `Action regarding @${username}`,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) void handleBlockUser(item);
          else if (buttonIndex === 1) void handleReportContent(item);
          else if (buttonIndex === 2) handleHideContent(item.id);
        }
      );
    } else {
      Alert.alert('Options', 'Choose an action', [
        { text: 'Block User', onPress: () => void handleBlockUser(item), style: 'destructive' },
        { text: 'Report Content', onPress: () => void handleReportContent(item) },
        { text: 'Hide Video', onPress: () => handleHideContent(item.id) },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web') {
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        shouldDuckAndroid: false,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
    }
  }, []);

  const toggleLike = (id) => {
    setVideos(videos.map(v => 
      v.id === id ? { ...v, likes: v.isLiked ? v.likes - 1 : v.likes + 1, isLiked: !v.isLiked } : v
    ));
  };

  const openComments = () => {
    setShowComments(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeComments = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setShowComments(false));
  };

  const renderVideo = ({ item }) => (
    <View style={styles.videoContainer}>
      {item.type === 'video' ? (
        Platform.OS === 'web' ? (
          <video
            src={item.url}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
            autoPlay={visibleVideos[currentIndex]?.id === item.id}
            muted={!isFocused}
            loop
            playsInline
          />
        ) : (
          <Video
            source={{ uri: item.url }}
            style={styles.video}
            resizeMode="cover"
            shouldPlay={visibleVideos[currentIndex]?.id === item.id}
            isMuted={!isFocused}
            isLooping
          />
        )
      ) : (
        <Image
          source={{ uri: item.url }}
          style={styles.video}
          resizeMode="cover"
        />
      )}

      {/* Gradient Overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
        style={styles.gradientOverlay}
      />

      {/* User Info */}
      <View style={styles.userInfoContainer}>
        <View style={styles.userInfo}>
          <LinearGradient
            colors={theme.gradients.primary}
            style={styles.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={styles.avatarText}>{item.avatar}</Text>
          </LinearGradient>
          <View style={styles.userTextContainer}>
            <Text style={styles.username}>@{item.username}</Text>
            <View style={styles.prizeContainer}>
              <Ionicons name="trophy" size={14} color={theme.colors.warning} />
              <Text style={styles.prizeText}>{item.prize}</Text>
              <Text style={styles.locationText}>· {item.location}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.caption}>{item.caption}</Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        {/* Like Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleLike(item.id)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={item.isLiked ? ['#FF1744', '#F50057'] : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={32}
              color="#FFFFFF"
            />
          </LinearGradient>
          <Text style={styles.actionText}>{item.likes}</Text>
        </TouchableOpacity>

        {/* Comment Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={openComments}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chatbubble-outline" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>{item.comments}</Text>
        </TouchableOpacity>

        {/* Share Button */}
        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="arrow-redo-outline" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>{item.shares}</Text>
        </TouchableOpacity>

        {/* Winner Badge */}
        <View style={styles.actionButton}>
          <LinearGradient
            colors={theme.gradients.accent}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="trophy" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>Winner</Text>
        </View>

        {/* More Options Button */}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleModerationMenu(item)}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
            style={styles.actionButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="ellipsis-horizontal" size={28} color="#FFFFFF" />
          </LinearGradient>
          <Text style={styles.actionText}>More</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Show loading state
  if (loadingMedia) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  // Show empty state
  if (visibleVideos.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <Ionicons name="film-outline" size={64} color="rgba(255,255,255,0.3)" />
          <Text style={styles.emptyStateTitle}>No Content Yet</Text>
          <Text style={styles.emptyStateText}>
            The admin has not uploaded any videos or photos yet.{'\n'}Check back soon!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleVideos}
        renderItem={renderVideo}
        keyExtractor={item => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.y / height);
          setCurrentIndex(index);
        }}
      />

      {/* Comments Modal */}
      {showComments && (
        <Animated.View
          style={[
            styles.commentsContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <LinearGradient
            colors={[theme.gradients.background[0], theme.gradients.background[1]]}
            style={styles.commentsGradient}
          >
            {/* Comments Header */}
            <View style={styles.commentsHeader}>
              <View style={styles.commentsDragBar} />
              <Text style={[styles.commentsTitle, { color: theme.colors.text }]}>
                {visibleVideos[currentIndex]?.comments} Comments
              </Text>
              <TouchableOpacity onPress={closeComments} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {/* Sample Comments */}
            <FlatList
              data={[
                { id: '1', user: 'john_doe', text: 'Congrats! How did you find it so fast?', time: '2h' },
                { id: '2', user: 'jane_smith', text: 'Amazing! I was so close 😭', time: '1h' },
                { id: '3', user: 'hunter_pro', text: 'Teach me your ways! 🙏', time: '45m' },
              ]}
              renderItem={({ item }) => (
                <View style={styles.commentItem}>
                  <LinearGradient
                    colors={theme.gradients.accent}
                    style={styles.commentAvatar}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.commentAvatarText}>
                      {item.user.charAt(0).toUpperCase()}
                    </Text>
                  </LinearGradient>
                  <View style={styles.commentContent}>
                    <Text style={[styles.commentUser, { color: theme.colors.text }]}>
                      {item.user}
                    </Text>
                    <Text style={[styles.commentText, { color: theme.colors.textSecondary }]}>
                      {item.text}
                    </Text>
                  </View>
                  <Text style={[styles.commentTime, { color: theme.colors.textSecondary }]}>
                    {item.time}
                  </Text>
                </View>
              )}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.commentsList}
            />

            {/* Comment Input */}
            <View style={[
              styles.commentInputContainer,
              { 
                backgroundColor: theme.colors.cardBg || 'rgba(255,255,255,0.05)',
                borderTopColor: theme.colors.border || 'rgba(255,255,255,0.1)'
              }
            ]}>
              <TextInput
                style={[
                  styles.commentInput, 
                  { 
                    color: theme.colors.text,
                    backgroundColor: theme.colors.cardBg || 'rgba(255,255,255,0.1)'
                  }
                ]}
                placeholder="Add a comment..."
                placeholderTextColor={theme.colors.textSecondary}
                value={commentText}
                onChangeText={setCommentText}
              />
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => {
                  if (commentText.trim()) {
                    // Add comment logic here - for now just clear the input
                    console.log('Comment posted:', commentText);
                    setCommentText('');
                    // In production: add to Firestore comments collection
                  }
                }}
              >
                <LinearGradient
                  colors={theme.gradients.primary}
                  style={styles.sendButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="send" size={20} color="#FFFFFF" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  videoContainer: {
    width,
    height,
  },
  video: {
    width,
    height,
  },
  gradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  userInfoContainer: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 80,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 24,
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizeText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 4,
  },
  locationText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginLeft: 4,
  },
  caption: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
  },
  actionButtons: {
    position: 'absolute',
    right: 12,
    bottom: 100,
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 24,
  },
  actionButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  commentsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.7,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  commentsGradient: {
    flex: 1,
    paddingTop: 16,
  },
  commentsHeader: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  commentsDragBar: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    marginBottom: 12,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
  },
  commentsList: {
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  commentAvatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  commentContent: {
    flex: 1,
  },
  commentUser: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
    lineHeight: 18,
  },
  commentTime: {
    fontSize: 12,
    marginLeft: 8,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  commentInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    marginRight: 12,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
