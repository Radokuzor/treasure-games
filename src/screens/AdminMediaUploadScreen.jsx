import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Video } from 'expo-av';
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { getDb, hasFirebaseConfig } from '../config/firebase';
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const AdminMediaUploadScreen = ({ navigation }) => {
  const { theme } = useTheme();

  // Upload states
  const [uploadType, setUploadType] = useState('video'); // 'video' or 'photo'
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [username, setUsername] = useState('');
  const [caption, setCaption] = useState('');
  const [prize, setPrize] = useState('');
  const [location, setLocation] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Media list state
  const [mediaList, setMediaList] = useState([]);
  const [loadingMedia, setLoadingMedia] = useState(true);

  // Load media from Firestore
  useEffect(() => {
    if (!hasFirebaseConfig) return;

    const db = getDb();
    if (!db) return;

    const mediaQuery = query(collection(db, 'homeMedia'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(mediaQuery, (snapshot) => {
      const mediaData = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setMediaList(mediaData);
      setLoadingMedia(false);
    });

    return () => unsubscribe();
  }, []);

  const pickMedia = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'We need media library permissions to upload content.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes:
          uploadType === 'video'
            ? ImagePicker.MediaTypeOptions.Videos
            : ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: uploadType === 'video' ? 0.8 : 0.9,
        videoMaxDuration: 60, // 60 seconds max for videos
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setSelectedMedia(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media. Please try again.');
      console.error('Media picker error:', error);
    }
  };

  const uploadMediaToStorage = async (uri, type) => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const storage = getStorage();
      const extension = type === 'video' ? 'mp4' : 'jpg';
      const filename = `homeMedia/${type}-${Date.now()}.${extension}`;
      const storageRef = ref(storage, filename);
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      return { downloadURL, storagePath: filename };
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!hasFirebaseConfig) {
      Alert.alert('Firebase not configured', 'Add Firebase env vars to enable uploads.');
      return;
    }

    if (!selectedMedia) {
      Alert.alert('No media selected', 'Please select a video or photo to upload.');
      return;
    }

    if (!username.trim() || !caption.trim()) {
      Alert.alert('Missing info', 'Please provide a username and caption.');
      return;
    }

    setIsUploading(true);

    try {
      const db = getDb();
      if (!db) {
        Alert.alert('Firebase error', 'Firestore is not available.');
        setIsUploading(false);
        return;
      }

      // Upload media to storage
      const { downloadURL, storagePath } = await uploadMediaToStorage(
        selectedMedia.uri,
        uploadType
      );

      // Add to Firestore
      await addDoc(collection(db, 'homeMedia'), {
        type: uploadType,
        url: downloadURL,
        storagePath,
        username: username.trim(),
        caption: caption.trim(),
        prize: prize.trim() || null,
        location: location.trim() || null,
        likes: 0,
        comments: 0,
        shares: 0,
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        'Success!',
        `${uploadType === 'video' ? 'Video' : 'Photo'} uploaded successfully!`,
        [
          {
            text: 'OK',
            onPress: () => {
              // Reset form
              setSelectedMedia(null);
              setUsername('');
              setCaption('');
              setPrize('');
              setLocation('');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Error', error?.message ?? 'Failed to upload. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (media) => {
    if (!hasFirebaseConfig) return;

    Alert.alert('Delete Media', 'Are you sure you want to delete this item?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const db = getDb();
            const storage = getStorage();

            // Delete from storage
            if (media.storagePath) {
              const storageRef = ref(storage, media.storagePath);
              await deleteObject(storageRef);
            }

            // Delete from Firestore
            await deleteDoc(doc(db, 'homeMedia', media.id));

            Alert.alert('Deleted', 'Media deleted successfully.');
          } catch (error) {
            console.error('Delete error:', error);
            Alert.alert('Error', 'Failed to delete media.');
          }
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
            Upload Home Content
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Upload Type Selector */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📤 Upload Type
          </Text>
          <View style={styles.typeContainer}>
            <TouchableOpacity
              style={styles.typeOption}
              onPress={() => {
                setUploadType('video');
                setSelectedMedia(null);
              }}
              activeOpacity={0.7}
            >
              {uploadType === 'video' ? (
                <LinearGradient
                  colors={theme.gradients.primary}
                  style={styles.typeCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="videocam" size={40} color="#FFFFFF" />
                  <Text style={styles.typeText}>Video</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.typeCard, styles.inactiveCard]}>
                  <Ionicons name="videocam-outline" size={40} color={theme.colors.textSecondary} />
                  <Text style={[styles.typeText, { color: theme.colors.textSecondary }]}>
                    Video
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.typeOption}
              onPress={() => {
                setUploadType('photo');
                setSelectedMedia(null);
              }}
              activeOpacity={0.7}
            >
              {uploadType === 'photo' ? (
                <LinearGradient
                  colors={theme.gradients.accent}
                  style={styles.typeCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Ionicons name="image" size={40} color="#FFFFFF" />
                  <Text style={styles.typeText}>Photo</Text>
                </LinearGradient>
              ) : (
                <View style={[styles.typeCard, styles.inactiveCard]}>
                  <Ionicons name="image-outline" size={40} color={theme.colors.textSecondary} />
                  <Text style={[styles.typeText, { color: theme.colors.textSecondary }]}>
                    Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </GradientCard>

        {/* Media Picker */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {uploadType === 'video' ? '🎬 Select Video' : '📸 Select Photo'}
          </Text>

          {selectedMedia ? (
            <View style={styles.mediaPreviewContainer}>
              {uploadType === 'video' ? (
                <Video
                  source={{ uri: selectedMedia.uri }}
                  style={styles.videoPreview}
                  resizeMode="cover"
                  useNativeControls
                />
              ) : (
                <Image source={{ uri: selectedMedia.uri }} style={styles.photoPreviewLarge} />
              )}
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => setSelectedMedia(null)}
              >
                <Ionicons name="close-circle" size={32} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={pickMedia} activeOpacity={0.8}>
              <LinearGradient
                colors={theme.gradients.secondary}
                style={styles.pickButton}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons
                  name={uploadType === 'video' ? 'videocam' : 'image'}
                  size={48}
                  color="#FFFFFF"
                />
                <Text style={styles.pickButtonText}>
                  {uploadType === 'video' ? 'Pick Video' : 'Pick Photo'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </GradientCard>

        {/* Media Details Form */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>✏️ Details</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Username *
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="winner_username"
                placeholderTextColor={theme.colors.textSecondary}
                value={username}
                onChangeText={setUsername}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Caption *
            </Text>
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <TextInput
                style={[styles.input, styles.textArea, { color: theme.colors.text }]}
                placeholder="Just won $500 in downtown! 🎉"
                placeholderTextColor={theme.colors.textSecondary}
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Prize Amount
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="cash-outline" size={20} color={theme.colors.success} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="$500"
                placeholderTextColor={theme.colors.textSecondary}
                value={prize}
                onChangeText={setPrize}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Location
            </Text>
            <View style={styles.inputContainer}>
              <Ionicons name="location-outline" size={20} color={theme.colors.textSecondary} />
              <TextInput
                style={[styles.input, { color: theme.colors.text }]}
                placeholder="Downtown Plaza"
                placeholderTextColor={theme.colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />
            </View>
          </View>
        </GradientCard>

        {/* Upload Button */}
        <View style={styles.uploadButtonContainer}>
          <TouchableOpacity
            onPress={handleUpload}
            activeOpacity={0.8}
            disabled={isUploading || !selectedMedia}
          >
            <LinearGradient
              colors={
                isUploading || !selectedMedia
                  ? ['#6B7280', '#4B5563']
                  : theme.gradients.primary
              }
              style={styles.uploadButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {isUploading ? (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={24} color="#FFFFFF" />
                  <Text style={styles.uploadButtonText}>Upload to Home Feed</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Media List */}
        <GradientCard style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            📱 Current Home Feed ({mediaList.length})
          </Text>

          {loadingMedia ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text} />
            </View>
          ) : mediaList.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={48} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No media uploaded yet
              </Text>
            </View>
          ) : (
            mediaList.map((media) => (
              <View key={media.id} style={styles.mediaCard}>
                <View style={styles.mediaCardContent}>
                  {media.type === 'video' ? (
                    <View style={styles.mediaThumbnail}>
                      <Ionicons name="videocam" size={32} color={theme.colors.accent} />
                    </View>
                  ) : (
                    <Image source={{ uri: media.url }} style={styles.mediaThumbnail} />
                  )}
                  <View style={styles.mediaInfo}>
                    <Text style={[styles.mediaUsername, { color: theme.colors.text }]}>
                      @{media.username}
                    </Text>
                    <Text
                      style={[styles.mediaCaption, { color: theme.colors.textSecondary }]}
                      numberOfLines={2}
                    >
                      {media.caption}
                    </Text>
                    {media.prize && (
                      <Text style={styles.mediaPrize}>💰 {media.prize}</Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDelete(media)}
                  style={styles.deleteButton}
                  activeOpacity={0.7}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
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
    fontSize: 20,
    fontWeight: '800',
  },
  placeholder: {
    width: 40,
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
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  typeOption: {
    flex: 1,
    marginHorizontal: 6,
  },
  typeCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  inactiveCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  typeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 12,
  },
  mediaPreviewContainer: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  videoPreview: {
    width: '100%',
    height: '100%',
  },
  photoPreviewLarge: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 16,
  },
  pickButton: {
    padding: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
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
    minHeight: 60,
    textAlignVertical: 'top',
    paddingTop: 0,
  },
  uploadButtonContainer: {
    padding: 16,
  },
  uploadButton: {
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
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    marginLeft: 12,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  uploadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
  },
  mediaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  mediaCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mediaThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  mediaInfo: {
    flex: 1,
  },
  mediaUsername: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  mediaCaption: {
    fontSize: 13,
    lineHeight: 18,
  },
  mediaPrize: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: '600',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
});

export default AdminMediaUploadScreen;
