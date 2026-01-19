import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';

// Conditionally import Camera
let Camera, CameraView;
if (Platform.OS !== 'web') {
  try {
    const ExpoCamera = require('expo-camera');
    Camera = ExpoCamera.Camera;
    CameraView = ExpoCamera.CameraView;
  } catch (e) {
    console.log('expo-camera not available');
  }
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.4;

const WinnerCardScreen = ({ 
  visible, 
  onClose, 
  gameName, 
  prizeAmount, 
  position, 
  score,
  gameType, // 'location' or 'virtual'
  isTopThree = true,
}) => {
  const [hasPermission, setHasPermission] = useState(null);
  const [selfieUri, setSelfieUri] = useState(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const cameraRef = useRef(null);
  const cardRef = useRef(null);

  // Request camera permission when screen becomes visible
  const requestCameraPermission = async () => {
    if (Platform.OS === 'web') {
      setHasPermission(false);
      return;
    }

    try {
      // Try the newer API first (expo-camera v14+)
      if (Camera?.requestCameraPermissionsAsync) {
        const { status } = await Camera.requestCameraPermissionsAsync();
        console.log('Camera permission status:', status);
        setHasPermission(status === 'granted');
        return;
      }
      
      // Fallback to older API
      if (Camera?.getCameraPermissionsAsync) {
        const { status: existingStatus } = await Camera.getCameraPermissionsAsync();
        if (existingStatus === 'granted') {
          setHasPermission(true);
          return;
        }
        
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
        return;
      }

      console.log('No camera permission API available');
      setHasPermission(false);
    } catch (e) {
      console.log('Camera permission error:', e);
      setHasPermission(false);
    }
  };

  useEffect(() => {
    if (visible) {
      requestCameraPermission();
    }
  }, [visible]);

  const takeSelfie = async () => {
    if (!cameraRef.current || isTakingPhoto) return;
    
    setIsTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      setSelfieUri(photo.uri);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const retakeSelfie = () => {
    setSelfieUri(null);
    setCardSaved(false);
  };

  const saveCardToGallery = async () => {
    if (!cardRef.current) return;
    
    setIsSaving(true);
    try {
      // Request media library permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the image.');
        return;
      }

      // Capture the card as an image
      const uri = await cardRef.current.capture();
      
      // Save to gallery
      await MediaLibrary.saveToLibraryAsync(uri);
      setCardSaved(true);
      Alert.alert('Saved!', 'Your winner card has been saved to your gallery. Share it on social media!');
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save card. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const shareToInstagram = async () => {
    if (!cardSaved) {
      await saveCardToGallery();
    }
    
    // Open Instagram
    const instagramUrl = 'instagram://camera';
    const canOpen = await Linking.canOpenURL(instagramUrl);
    
    if (canOpen) {
      await Linking.openURL(instagramUrl);
    } else {
      Alert.alert(
        'Instagram not installed',
        'Please install Instagram or share manually from your gallery.',
        [
          { text: 'Open App Store', onPress: () => Linking.openURL('https://apps.apple.com/app/instagram/id389801252') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const shareToTikTok = async () => {
    if (!cardSaved) {
      await saveCardToGallery();
    }
    
    const tiktokUrl = 'tiktok://';
    const canOpen = await Linking.canOpenURL(tiktokUrl);
    
    if (canOpen) {
      await Linking.openURL(tiktokUrl);
    } else {
      Alert.alert(
        'TikTok not installed',
        'Please install TikTok or share manually from your gallery.',
        [
          { text: 'Open App Store', onPress: () => Linking.openURL('https://apps.apple.com/app/tiktok/id835599320') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const shareToFacebook = async () => {
    if (!cardSaved) {
      await saveCardToGallery();
    }
    
    const facebookUrl = 'fb://';
    const canOpen = await Linking.canOpenURL(facebookUrl);
    
    if (canOpen) {
      await Linking.openURL(facebookUrl);
    } else {
      Alert.alert(
        'Facebook not installed',
        'Please install Facebook or share manually from your gallery.',
        [
          { text: 'Open App Store', onPress: () => Linking.openURL('https://apps.apple.com/app/facebook/id284882215') },
          { text: 'OK', style: 'cancel' },
        ]
      );
    }
  };

  const shareGeneric = async () => {
    if (!cardSaved) {
      await saveCardToGallery();
    }
    
    try {
      await Share.share({
        message: `🏆 I just won on Treasure Island City Games! ${gameType === 'virtual' ? `#${position} with a score of ${score}!` : `$${prizeAmount} prize!`} Download the app and play! #TreasureIslandGames #Winner`,
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const getPositionEmoji = () => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return '🏆';
  };

  const getPositionText = () => {
    if (position === 1) return '1ST PLACE';
    if (position === 2) return '2ND PLACE';
    if (position === 3) return '3RD PLACE';
    return 'WINNER';
  };

  if (!visible) return null;

  // Web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#8B5CF6', '#6366F1', '#4F46E5']} style={styles.gradient}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color="#FFF" />
            </TouchableOpacity>
          </View>
          <View style={styles.webFallback}>
            <Text style={styles.webFallbackTitle}>🎉 Congratulations!</Text>
            <Text style={styles.webFallbackText}>
              Winner cards are available on the mobile app. Download the app to take your winner selfie!
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.webCloseButton}>
              <Text style={styles.webCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8B5CF6', '#6366F1', '#4F46E5']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selfieUri ? 'Your Winner Card' : 'Take Your Winner Selfie!'}
          </Text>
          <View style={{ width: 44 }} />
        </View>

        {!selfieUri ? (
          // Camera View
          <View style={styles.cameraContainer}>
            {hasPermission === false ? (
              <View style={styles.noPermission}>
                <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.5)" />
                <Text style={styles.noPermissionText}>Camera access needed</Text>
                <Text style={styles.noPermissionSubtext}>
                  To take your Winner Card selfie, please allow camera access
                </Text>
                <TouchableOpacity
                  onPress={requestCameraPermission}
                  style={styles.requestPermissionButton}
                >
                  <Ionicons name="camera" size={20} color="#FFF" />
                  <Text style={styles.requestPermissionButtonText}>Allow Camera Access</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Linking.openSettings()}
                  style={styles.settingsButton}
                >
                  <Text style={styles.settingsButtonText}>Open Settings</Text>
                </TouchableOpacity>
              </View>
            ) : hasPermission === null ? (
              <ActivityIndicator size="large" color="#FFF" />
            ) : CameraView ? (
              <>
                <CameraView
                  ref={cameraRef}
                  style={styles.camera}
                  facing="front"
                />
                {/* Face guide overlay */}
                <View style={styles.faceGuideContainer}>
                  <View style={styles.faceGuide}>
                    <View style={styles.faceGuideInner} />
                  </View>
                  <Text style={styles.faceGuideText}>Position your face in the circle</Text>
                </View>
              </>
            ) : (
              <View style={styles.noPermission}>
                <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,0.5)" />
                <Text style={styles.noPermissionText}>Camera not available</Text>
              </View>
            )}

            {/* Capture Button */}
            {hasPermission && CameraView && (
              <TouchableOpacity 
                onPress={takeSelfie} 
                style={styles.captureButton}
                disabled={isTakingPhoto}
              >
                <View style={styles.captureButtonOuter}>
                  <View style={styles.captureButtonInner}>
                    {isTakingPhoto ? (
                      <ActivityIndicator color="#8B5CF6" />
                    ) : (
                      <Ionicons name="camera" size={32} color="#8B5CF6" />
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          // Winner Card Preview
          <View style={styles.cardPreviewContainer}>
            <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
              <View style={styles.winnerCard}>
                {/* Confetti Background */}
                <LinearGradient
                  colors={['#FFD700', '#FFA500', '#FF6B6B']}
                  style={styles.cardGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Decorative elements */}
                  <View style={styles.confettiContainer}>
                    {['🎉', '⭐', '✨', '🎊', '💫', '🌟'].map((emoji, i) => (
                      <Text 
                        key={i} 
                        style={[
                          styles.confetti, 
                          { 
                            left: `${(i * 16) + 5}%`, 
                            top: `${(i % 3) * 10 + 5}%`,
                            transform: [{ rotate: `${i * 30}deg` }]
                          }
                        ]}
                      >
                        {emoji}
                      </Text>
                    ))}
                  </View>

                  {/* Header */}
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardHeaderText}>TREASURE ISLAND</Text>
                    <Text style={styles.cardHeaderSubtext}>CITY GAMES</Text>
                  </View>

                  {/* Winner Badge */}
                  <View style={styles.winnerBadge}>
                    <Text style={styles.positionEmoji}>{getPositionEmoji()}</Text>
                    <Text style={styles.positionText}>{getPositionText()}</Text>
                  </View>

                  {/* Selfie Circle */}
                  <View style={styles.selfieContainer}>
                    <View style={styles.selfieFrame}>
                      <Image source={{ uri: selfieUri }} style={styles.selfieImage} />
                    </View>
                  </View>

                  {/* Winning Pig Mascot */}
                  <View style={styles.mascotContainer}>
                    <Image 
                      source={require('../../assets/images/winningpig.png')} 
                      style={styles.mascotImage}
                      resizeMode="contain"
                    />
                  </View>

                  {/* Game Info */}
                  <View style={styles.gameInfoContainer}>
                    <Text style={styles.gameNameText} numberOfLines={2}>{gameName}</Text>
                    {gameType === 'virtual' && score && (
                      <Text style={styles.scoreText}>Score: {score.toLocaleString()}</Text>
                    )}
                    {prizeAmount > 0 && (
                      <View style={styles.prizeContainer}>
                        <Text style={styles.prizeText}>${prizeAmount}</Text>
                        <Text style={styles.prizeLabel}>PRIZE</Text>
                      </View>
                    )}
                  </View>

                  {/* Footer */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.footerText}>Download the app & play!</Text>
                    <Text style={styles.footerHashtag}>#TreasureIslandGames</Text>
                  </View>
                </LinearGradient>
              </View>
            </ViewShot>

            {/* Win Confirmation Notice */}
            <View style={styles.confirmationNotice}>
              <Ionicons name="information-circle" size={20} color="#FFD700" />
              <Text style={styles.confirmationNoticeText}>
                Sharing your Winner Card selfie is required to confirm your win and receive your payout!
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={retakeSelfie} style={styles.retakeSelfieButton}>
                <Ionicons name="camera" size={20} color="#FFF" />
                <Text style={styles.retakeSelfieButtonText}>Take New Selfie</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveCardToGallery}
                style={styles.saveButton}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Ionicons name="download" size={20} color="#FFF" />
                    <Text style={styles.saveButtonText}>
                      {cardSaved ? 'Saved!' : 'Save'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Share Buttons */}
            <Text style={styles.shareTitle}>Share Your Win!</Text>
            <View style={styles.shareButtons}>
              <TouchableOpacity onPress={shareToInstagram} style={[styles.shareButton, styles.instagramButton]}>
                <Ionicons name="logo-instagram" size={28} color="#FFF" />
                <Text style={styles.shareButtonText}>Instagram</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={shareToTikTok} style={[styles.shareButton, styles.tiktokButton]}>
                <Ionicons name="musical-notes" size={28} color="#FFF" />
                <Text style={styles.shareButtonText}>TikTok</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={shareToFacebook} style={[styles.shareButton, styles.facebookButton]}>
                <Ionicons name="logo-facebook" size={28} color="#FFF" />
                <Text style={styles.shareButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={shareGeneric} style={styles.moreShareButton}>
              <Ionicons name="share-outline" size={20} color="#FFF" />
              <Text style={styles.moreShareText}>More sharing options</Text>
            </TouchableOpacity>

            <View style={styles.reminderBox}>
              <Text style={styles.reminderText}>
                📸 Post your Winner Card on social media and save the link - you'll need it when requesting your payout!
              </Text>
            </View>
          </View>
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  // Camera styles
  cameraContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_WIDTH - 48,
    borderRadius: 24,
    overflow: 'hidden',
  },
  faceGuideContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  faceGuide: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: '#FFD700',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceGuideInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  faceGuideText: {
    marginTop: 16,
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  captureButton: {
    position: 'absolute',
    bottom: 40,
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPermission: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  noPermissionText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
  },
  noPermissionSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  requestPermissionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  requestPermissionButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  settingsButton: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  settingsButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  // Card preview styles
  cardPreviewContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  winnerCard: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  cardGradient: {
    flex: 1,
    padding: 16,
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  confetti: {
    position: 'absolute',
    fontSize: 24,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 8,
  },
  cardHeaderText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  cardHeaderSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 2,
  },
  winnerBadge: {
    alignItems: 'center',
    marginBottom: 8,
  },
  positionEmoji: {
    fontSize: 40,
  },
  positionText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  selfieContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  selfieFrame: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#FFF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  selfieImage: {
    width: '100%',
    height: '100%',
  },
  mascotContainer: {
    position: 'absolute',
    bottom: 60,
    right: 8,
  },
  mascotImage: {
    width: 90,
    height: 110,
  },
  gameInfoContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  gameNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  prizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  prizeText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  prizeLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
  },
  cardFooter: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  footerHashtag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  confirmationNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  confirmationNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
    lineHeight: 18,
  },
  retakeSelfieButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
  },
  retakeSelfieButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  retakeButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#10B981',
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '700',
  },
  // Share buttons
  shareTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 12,
  },
  shareButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shareButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  shareButtonText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
  instagramButton: {
    backgroundColor: '#E4405F',
  },
  tiktokButton: {
    backgroundColor: '#000',
  },
  facebookButton: {
    backgroundColor: '#1877F2',
  },
  moreShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  moreShareText: {
    color: '#FFF',
    fontWeight: '600',
  },
  reminderBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  reminderText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Web fallback
  webFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  webFallbackTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 16,
  },
  webFallbackText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 24,
  },
  webCloseButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
  },
  webCloseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default WinnerCardScreen;
