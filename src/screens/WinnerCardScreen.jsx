import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as MediaLibrary from 'expo-media-library';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ViewShot from 'react-native-view-shot';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = CARD_WIDTH * 1.5;

const WinnerCardScreen = ({ 
  visible, 
  onClose, 
  gameName, 
  position,        // 1, 2, 3, or null
  score,           // User's score (for virtual games)
  gameType,        // 'location' or 'virtual'
  wonMoney = false, // Did they win money THIS time? (first win of day)
  city = null,     // City name for hashtag
  sponsorLogo = null,
  sponsorName = null,
  isCompetitionActive = false, // Is Battle Royale still ongoing?
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [cardSaved, setCardSaved] = useState(false);
  const cardRef = useRef(null);

  // Determine card type and content
  const isCashWinner = wonMoney;
  const isOnPodium = position && position <= 3;

  // Get brand header text
  const getBrandHeader = () => {
    if (isCashWinner) {
      return 'I GRABBED THE CASH!';
    }
    return 'GRAB THE CASH';
  };

  // Get position text with medals on both sides
  const getPositionDisplay = () => {
    if (position === 1) return '🥇 1ST PLACE 🥇';
    if (position === 2) return '🥈 2ND PLACE 🥈';
    if (position === 3) return '🥉 3RD PLACE 🥉';
    return null;
  };


  // Get gradient colors based on card type and position
  const getCardGradient = () => {
    if (isCashWinner) {
      return ['#00F5A0', '#00D9F5', '#00B4D8']; // Vibrant neon green-teal gradient for cash winners
    }
    if (position === 1) return ['#FFD700', '#FFA500', '#FF8C00']; // Gold
    if (position === 2) return ['#C0C0C0', '#A8A8A8', '#8B8B8B']; // Silver
    if (position === 3) return ['#CD7F32', '#B87333', '#A0522D']; // Bronze
    return ['#8B5CF6', '#7C3AED', '#6D28D9']; // Purple for high scores
  };

  // Get hashtag based on context
  const getHashtag = () => {
    const cityTag = city ? `#${city.replace(/\s+/g, '')}Winner` : '#Winner';
    if (isCashWinner) {
      return `#GrabTheCash ${cityTag}`;
    }
    if (isOnPodium) {
      return `#GrabTheCash #Podium`;
    }
    return '#GrabTheCash #HighScore';
  };

  const getShareMessage = () => {
    const cityText = city ? ` in ${city}` : '';
    if (isCashWinner) {
      return `💰 I just grabbed the cash${cityText}! Think you can do it? #GrabTheCash ${city ? `#${city.replace(/\s+/g, '')}Winner` : '#Winner'}`;
    }
    if (isOnPodium) {
      return `🏆 I'm on the podium! ${score ? `Score: ${score.toLocaleString()}` : ''} Think you can beat me? #GrabTheCash #Podium`;
    }
    return `🎯 Just scored ${score?.toLocaleString() || 'big'} on Grab The Cash! Think you can beat it? #GrabTheCash #HighScore`;
  };

  const saveCardToGallery = async () => {
    if (!cardRef.current) return;
    
    setIsSaving(true);
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please allow access to save the image.');
        setIsSaving(false);
        return;
      }

      const uri = await cardRef.current.capture();
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
        message: getShareMessage(),
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1A1A2E', '#16213E', '#0F3460']} style={styles.gradient}>
        {/* Header - X button on right */}
        <View style={styles.header}>
          <View style={{ width: 44 }} />
          <Text style={styles.headerTitle}>🎉 Congrats!</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Scrollable Content */}
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Winner Card */}
          <View style={styles.cardPreviewContainer}>
            <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.winnerCard}>
              <LinearGradient
                colors={getCardGradient()}
                style={styles.cardGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                {/* Decorative confetti elements */}
                <View style={styles.confettiContainer}>
                  {(isCashWinner 
                    ? ['💰', '💵', '🤑', '💸', '✨', '🎉', '💎', '⭐']
                    : ['🎉', '⭐', '✨', '🎊', '💫', '🌟', '🎯', '🔥']
                  ).map((emoji, i) => (
                    <Text 
                      key={i} 
                      style={[
                        styles.confetti, 
                        { 
                          left: `${(i * 12) + 2}%`, 
                          top: `${(i % 4) * 8 + 2}%`,
                          transform: [{ rotate: `${i * 45}deg` }],
                          fontSize: 20 + (i % 3) * 8,
                        }
                      ]}
                    >
                      {emoji}
                    </Text>
                  ))}
                </View>

                {/* Brand Header */}
                <View style={styles.brandHeader}>
                  <View style={styles.brandDivider} />
                  <Text style={styles.brandName}>{getBrandHeader()}</Text>
                  <View style={styles.brandDivider} />
                </View>


                {/* Central Pig Mascot */}
                <View style={styles.mascotContainer}>
                  <View style={[styles.mascotGlow, isCashWinner && styles.mascotGlowCash]} />
                  <Image 
                    source={require('../../assets/images/winningpig.png')} 
                    style={styles.mascotImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Position/Score Info */}
                <View style={styles.infoContainer}>
                  {/* Show trophy and WINNER/CURRENT WINNER for cash winners */}
                  {isCashWinner && (
                    <View style={styles.winnerBadgeContainer}>
                      <Text style={styles.winnerTrophy}>🏆</Text>
                      <Text style={styles.winnerLabel}>
                        {isCompetitionActive && gameType === 'virtual' ? 'CURRENT WINNER!' : 'WINNER!'}
                      </Text>
                    </View>
                  )}

                  {/* Show CURRENT WINNER for non-cash Battle Royale podium positions */}
                  {!isCashWinner && isCompetitionActive && gameType === 'virtual' && isOnPodium && (
                    <View style={styles.currentWinnerBadge}>
                      <Text style={styles.currentWinnerText}>⏳ CURRENT {getPositionDisplay()}</Text>
                    </View>
                  )}

                  {/* Show position badge if on podium (non-cash) - medals on both sides - only for completed games */}
                  {!isCashWinner && isOnPodium && !(isCompetitionActive && gameType === 'virtual') && (
                    <View style={styles.positionBadge}>
                      <Text style={styles.positionText}>{getPositionDisplay()}</Text>
                    </View>
                  )}

                  {/* Show score for virtual games (achievement cards) */}
                  {!isCashWinner && gameType === 'virtual' && score !== undefined && score !== null && (
                    <View style={styles.scoreContainer}>
                      <Text style={styles.scoreLabel}>SCORE</Text>
                      <Text style={styles.scoreText}>{score.toLocaleString()}</Text>
                    </View>
                  )}

                  {/* Game name */}
                  <Text style={styles.gameNameText} numberOfLines={2}>{gameName}</Text>
                </View>

                {/* Powered by section - shows sponsor or default app logo */}
                <View style={styles.sponsorContainer}>
                  <Text style={styles.poweredByText}>Powered by</Text>
                  {sponsorLogo ? (
                    <Image
                      source={typeof sponsorLogo === 'string' ? { uri: sponsorLogo } : sponsorLogo}
                      style={styles.sponsorLogo}
                      resizeMode="contain"
                    />
                  ) : sponsorName ? (
                    <Text style={styles.sponsorNameText}>{sponsorName}</Text>
                  ) : (
                    <Image
                      source={require('./sponsorlogo.png')}
                      style={styles.defaultSponsorLogo}
                      resizeMode="contain"
                    />
                  )}
                </View>

                {/* Footer with app download CTA */}
                <View style={styles.cardFooter}>
                  <Text style={styles.footerCTA}>Think you can grab the cash?</Text>
                  <View style={styles.downloadRow}>
                    <Image 
                      source={require('../../assets/images/appstorelogo.png')} 
                      style={styles.appStoreLogo}
                      resizeMode="contain"
                    />
                    <Text style={styles.downloadText}>
                      Download <Text style={styles.downloadAppName}>Grab The Cash</Text>
                    </Text>
                  </View>
                  <Text style={styles.footerHashtag}>{getHashtag()}</Text>
                </View>

                {/* Corner decorations */}
                <View style={[styles.cornerDecor, styles.cornerTopLeft]} />
                <View style={[styles.cornerDecor, styles.cornerTopRight]} />
                <View style={[styles.cornerDecor, styles.cornerBottomLeft]} />
                <View style={[styles.cornerDecor, styles.cornerBottomRight]} />
              </LinearGradient>
            </View>
          </ViewShot>

          {/* Warning for active Battle Royale - position is temporary */}
          {isCompetitionActive && gameType === 'virtual' && !wonMoney && (
            <View style={styles.temporaryWarning}>
              <Ionicons name="warning" size={20} color="#F59E0B" />
              <Text style={styles.temporaryWarningText}>
                ⏳ Your position is temporary! Someone can still beat your score. Keep playing to secure your win!
              </Text>
            </View>
          )}

          {/* Notice - different for cash winners vs achievement */}
          <View style={[styles.confirmationNotice, isCashWinner && styles.cashNotice]}>
            <Ionicons name="information-circle" size={20} color={isCashWinner ? '#00F5A0' : '#FFD700'} />
            <Text style={[styles.confirmationNoticeText, isCashWinner && styles.cashNoticeText]}>
              {isCashWinner 
                ? 'IMPORTANT: Share your Winner Card on social media to confirm your win and receive your payout!'
                : 'Share your achievement on social media and show off your skills!'
              }
            </Text>
          </View>

          {isCashWinner && (
            <View style={styles.reminderBox}>
              <Text style={styles.reminderText}>
                📸 Post your Winner Card on social media and save the link - you&apos;ll need it when requesting your payout!
              </Text>
            </View>
          )}

          {/* Save Button */}
          <TouchableOpacity
            onPress={saveCardToGallery}
            style={[styles.saveButton, isCashWinner && styles.saveButtonCash]}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <>
                <Ionicons name={cardSaved ? 'checkmark-circle' : 'download'} size={22} color="#FFF" />
                <Text style={styles.saveButtonText}>
                  {cardSaved ? 'Saved to Gallery!' : 'Save to Gallery'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Share Buttons */}
          <Text style={styles.shareTitle}>Share Your {isCashWinner ? 'Win' : 'Achievement'}!</Text>
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

          
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 12,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
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
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  cardGradient: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  confettiContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  confetti: {
    position: 'absolute',
    opacity: 0.6,
  },
  // Brand header
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    gap: 10,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  brandDivider: {
    width: 30,
    height: 2,
    backgroundColor: '#FFF',
    borderRadius: 2,
    opacity: 0.8,
  },
  // Central mascot - 2x bigger pig, smaller glow
  mascotContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
    position: 'relative',
  },
  mascotGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  mascotGlowCash: {
    backgroundColor: 'rgba(16, 185, 129, 0.3)',
  },
  mascotImage: {
    width: 240,
    height: 280,
  },
  // Info container
  infoContainer: {
    alignItems: 'center',
    marginTop: -36,  // Shift up by 40px total
  },
  // Winner badge for cash winners
  winnerBadgeContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  winnerTrophy: {
    fontSize: 36,
  },
  winnerLabel: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 2,
  },
  // Current winner badge for active Battle Royale
  currentWinnerBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#FCD34D',
  },
  currentWinnerText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    letterSpacing: 1,
  },
  positionBadge: {
    alignItems: 'center',
    marginBottom: 4,
  },
  positionText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 1,
  },
  scoreContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 6,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  scoreText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gameNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: 4,
  },
  // Sponsor section (subtle "Powered by")
  sponsorContainer: {
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  poweredByText: {
    fontSize: 7,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 2,
    textTransform: 'lowercase',
    letterSpacing: 0.5,
  },
  sponsorLogo: {
    width: 100,
    height: 35, // 3:1 aspect ratio
  },
  defaultSponsorLogo: {
    width: 140,
    height: 50, // Larger size for the default Grab The Cash logo
  },
  appIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  sponsorNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  // Footer with subtle CTA
  cardFooter: {
    position: 'absolute',
    bottom: 14,
    left: 20,
    right: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.15)',
    paddingVertical: 8,
    borderRadius: 8,
  },
  footerCTA: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.85)',
    fontStyle: 'italic',
    marginBottom: 6,
  },
  downloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  appStoreLogo: {
    width: 16,
    height: 16,
  },
  downloadText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  downloadAppName: {
    fontWeight: '900',
    textDecorationLine: 'underline',
    color: '#FFFFFF',
  },
  footerHashtag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 2,
  },
  // Corner decorations
  cornerDecor: {
    position: 'absolute',
    width: 25,
    height: 25,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  cornerTopLeft: {
    top: 10,
    left: 10,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 6,
  },
  cornerTopRight: {
    top: 10,
    right: 10,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 6,
  },
  cornerBottomLeft: {
    bottom: 10,
    left: 10,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 6,
  },
  cornerBottomRight: {
    bottom: 10,
    right: 10,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 6,
  },
  // Temporary position warning for active Battle Royale
  temporaryWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  temporaryWarningText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    lineHeight: 18,
  },
  // Confirmation notice
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
  cashNotice: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  confirmationNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
    lineHeight: 18,
  },
  cashNoticeText: {
    color: '#00F5A0',
  },
  // Save button
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    backgroundColor: '#8B5CF6',
    borderRadius: 14,
    marginTop: 12,
  },
  saveButtonCash: {
    backgroundColor: '#00D9F5',
  },
  saveButtonText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  // Share buttons
  shareTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 16,
    marginBottom: 10,
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
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
  },
  moreShareText: {
    color: '#FFF',
    fontWeight: '600',
  },
  reminderBox: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderRadius: 12,
    padding: 12,
    marginTop: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  reminderText: {
    color: '#00F5A0',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default WinnerCardScreen;
