import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { useTheme } from '../context/ThemeContext';

const Section = ({ title, children }) => {
  const { theme } = useTheme();
  return (
    <GradientCard style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      {children}
    </GradientCard>
  );
};

const Bullet = ({ children }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: theme.colors.text }]}>•</Text>
      <Text style={[styles.bulletText, { color: theme.colors.textSecondary }]}>{children}</Text>
    </View>
  );
};

const HowToPlayScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <GradientBackground>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>How To Play</Text>
          <View style={styles.headerSpacer} />
        </View>

        <LinearGradient
          colors={theme.gradients.primary}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.heroTitle}>Play Smart. Win Fast.</Text>
          <Text style={styles.heroSubtitle}>
            Treasure Island City Games is a competitive treasure hunt experience. This guide explains how to play and
            what’s allowed.
          </Text>
        </LinearGradient>

        <Section title="Quick Start">
          <Bullet>Turn on notifications so you don’t miss drops.</Bullet>
          <Bullet>Turn on location for nearby games.</Bullet>
          <Bullet>When a game goes live, open it fast and follow the objective.</Bullet>
        </Section>

        <Section title="How Games Work">
          <Bullet>Games can be location-based or virtual, depending on the drop.</Bullet>
          <Bullet>When a game goes live, you’ll see the objective plus any clues or photos.</Bullet>
          <Bullet>Some games allow multiple winners (first X verified claims).</Bullet>
        </Section>

        <Section title="Winning & Claiming">
          <Bullet>Open the live game and follow the objective.</Bullet>
          <Bullet>Tap “Claim” when you’ve met the requirement (usually location/GPS verification).</Bullet>
          <Bullet>If your signal is weak, move to an open area and try again.</Bullet>
        </Section>

        <Section title="Payouts & Rewards">
          <Bullet>Wins are credited instantly in-app.</Bullet>
          <Bullet>Rewards are issued as Amazon gift cards.</Bullet>
          <Bullet>Payouts are processed upon request and may require verification details.</Bullet>
        </Section>

        <Section title="Eligibility & Accounts (18+)">
          <Bullet>You must be 18 or older to play.</Bullet>
          <Bullet>One account per person.</Bullet>
        </Section>

        <Section title="Fair Play">
          <Bullet>No location spoofing, emulators, bots, automation, or modified apps.</Bullet>
          <Bullet>No multi-accounting or attempts to bypass winner limits.</Bullet>
          <Bullet>We may remove invalid wins and suspend accounts for abuse.</Bullet>
        </Section>

        <Section title="Safety">
          <Bullet>Don’t trespass or enter restricted areas—play from public, safe locations.</Bullet>
          <Bullet>Never drive distracted. Pull over before interacting with the app.</Bullet>
        </Section>

        <Section title="Notifications & Timing">
          <Bullet>Turn on notifications to catch drops faster.</Bullet>
          <Bullet>Delivery isn’t guaranteed (device settings, network conditions, and OS limits can delay alerts).</Bullet>
        </Section>

        <Section title="How Games End">
          <Bullet>Games can end when all winner slots are filled.</Bullet>
          <Bullet>Games may also end if an admin stops the game or a time limit is reached.</Bullet>
        </Section>

        <Section title="Apple Disclaimer">
          <Bullet>
            Apple is not a sponsor of this game and is not involved in any manner with the prizes.
          </Bullet>
        </Section>

        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
          By playing Treasure Island City Games, you agree to follow these rules. Updates may be made to keep gameplay
          fair and safe.
        </Text>
      </ScrollView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
  },
  headerSpacer: { width: 44 },
  heroCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  heroSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  sectionCard: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 18,
    fontSize: 18,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  footer: {
    marginTop: 8,
    marginBottom: 24,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
});

export default HowToPlayScreen;
