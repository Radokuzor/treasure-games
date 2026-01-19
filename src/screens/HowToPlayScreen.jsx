import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { useTheme } from '../context/ThemeContext';

const Section = ({ title, children, icon }) => {
  const { theme } = useTheme();
  return (
    <GradientCard style={styles.sectionCard}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
        {icon ? `${icon} ` : ''}{title}
      </Text>
      {children}
    </GradientCard>
  );
};

const Bullet = ({ children, emoji }) => {
  const { theme } = useTheme();
  return (
    <View style={styles.bulletRow}>
      <Text style={[styles.bulletDot, { color: theme.colors.text }]}>{emoji || '•'}</Text>
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
            Treasure Island City Games offers two ways to play: Location hunts and Virtual Battle Royale competitions. This guide explains everything you need to know!
          </Text>
        </LinearGradient>

        <Section title="Quick Start" icon="🚀">
          <Bullet>Turn on notifications so you don't miss drops.</Bullet>
          <Bullet>Turn on location for nearby games.</Bullet>
          <Bullet>When a game goes live, open it fast and follow the objective.</Bullet>
          <Bullet emoji="⚠️">You can only WIN once per day - play smart!</Bullet>
        </Section>

        <Section title="Two Types of Games" icon="🎯">
          <Bullet emoji="🟢">LOCATION GAMES (Green badge): Go to a real-world location to win.</Bullet>
          <Bullet emoji="🟣">VIRTUAL GAMES (Purple badge): Play from anywhere - compete for the best score!</Bullet>
        </Section>

        <Section title="Location Games" icon="📍">
          <Bullet>Use photo clues to find the hidden treasure location.</Bullet>
          <Bullet>Your GPS must verify you're at the correct spot.</Bullet>
          <Bullet>Complete the mini-game challenge when you arrive.</Bullet>
          <Bullet>First players to arrive and complete the challenge win!</Bullet>
          <Bullet>Multiple winner slots available (usually top 3).</Bullet>
        </Section>

        <Section title="Virtual Games (Battle Royale)" icon="🎮">
          <Bullet emoji="⚔️">Compete against ALL players for the highest score!</Bullet>
          <Bullet emoji="🔄">Play as many times as you want during the competition.</Bullet>
          <Bullet emoji="⭐">Only your BEST score counts on the leaderboard.</Bullet>
          <Bullet emoji="⏱️">Competition runs for a set time (15 min to 24 hours).</Bullet>
          <Bullet emoji="🏆">Top 3 players when time runs out WIN prizes!</Bullet>
        </Section>

        <Section title="Virtual Game Types" icon="🕹️">
          <Bullet emoji="👆">TAP RACE: Tap the target as fast as possible. Fastest time wins!</Bullet>
          <Bullet emoji="✋">HOLD STEADY: Press and hold as long as you can. Longest hold wins!</Bullet>
          <Bullet emoji="🎵">RHYTHM TAP: Tap to the beat. Highest accuracy score wins!</Bullet>
        </Section>

        <Section title="How Battle Royale Works" icon="⚔️">
          <Bullet>When a virtual game goes live, a countdown timer starts.</Bullet>
          <Bullet>Play the mini-game to post your score to the leaderboard.</Bullet>
          <Bullet>Keep playing to beat your own score and climb the ranks!</Bullet>
          <Bullet>Watch the live leaderboard to see who you need to beat.</Bullet>
          <Bullet>When the timer hits zero, top 3 players are declared winners!</Bullet>
        </Section>

        <Section title="Prize Distribution" icon="💰">
          <Bullet emoji="📍">Location Games: Each winner gets the full prize amount.</Bullet>
          <Bullet emoji="🎮">Virtual Games: Prizes split among top 3:</Bullet>
          <Bullet emoji="🥇">1st Place: 100% of prize pool</Bullet>
          <Bullet emoji="🥈">2nd Place: 60% of prize pool</Bullet>
          <Bullet emoji="🥉">3rd Place: 30% of prize pool</Bullet>
          <Bullet>Winners are notified and have 30 minutes to claim their prize.</Bullet>
        </Section>

        <Section title="Daily Win Limit" icon="⏰">
          <Bullet emoji="1️⃣">You can only WIN once per day across all games.</Bullet>
          <Bullet emoji="🎮">You can still PLAY unlimited games for fun and practice.</Bullet>
          <Bullet emoji="🤝">This keeps the game fair for everyone!</Bullet>
          <Bullet>Your win limit resets at midnight.</Bullet>
        </Section>

        <Section title="Payouts & Rewards" icon="💳">
          <Bullet>Wins are credited instantly in-app.</Bullet>
          <Bullet>Rewards are issued as Amazon or Visa gift cards.</Bullet>
          <Bullet>Minimum redemption amount: $25.</Bullet>
          <Bullet>Contact admin@fourthwatchtech.com for payout questions.</Bullet>
        </Section>

        <Section title="Winner Card & Social Post" icon="📸">
          <Bullet emoji="🎉">When you win, a Winner Card screen appears!</Bullet>
          <Bullet>Take a selfie to create your personalized winner card.</Bullet>
          <Bullet>Share your winner card on Instagram, TikTok, or Facebook.</Bullet>
          <Bullet emoji="⚠️">You MUST post your winner card to claim your prize!</Bullet>
          <Bullet>When requesting payout, paste the link to your social media post.</Bullet>
          <Bullet>No post = No payout. Help spread the word!</Bullet>
        </Section>

        <Section title="Eligibility & Accounts" icon="✅">
          <Bullet emoji="🔞">You must be 18 or older to play.</Bullet>
          <Bullet>One account per person.</Bullet>
          <Bullet>One win per device per day.</Bullet>
        </Section>

        <Section title="Fair Play" icon="⚖️">
          <Bullet emoji="🚫">No location spoofing, emulators, bots, automation, or modified apps.</Bullet>
          <Bullet emoji="🚫">No multi-accounting or attempts to bypass winner limits.</Bullet>
          <Bullet emoji="🚫">No using multiple devices to win multiple times per day.</Bullet>
          <Bullet>We may remove invalid wins and suspend accounts for abuse.</Bullet>
        </Section>

        <Section title="Safety" icon="🛡️">
          <Bullet>Don't trespass or enter restricted areas—play from public, safe locations.</Bullet>
          <Bullet>Never drive distracted. Pull over before interacting with the app.</Bullet>
        </Section>

        <Section title="Notifications & Timing" icon="🔔">
          <Bullet>Turn on notifications to catch drops faster.</Bullet>
          <Bullet>Virtual game winners are notified when competition ends.</Bullet>
          <Bullet>Delivery isn't guaranteed (device settings, network conditions, and OS limits can delay alerts).</Bullet>
        </Section>

        <Section title="How Games End" icon="🏁">
          <Bullet emoji="📍">Location Games: End when all winner slots are filled.</Bullet>
          <Bullet emoji="🎮">Virtual Games: End when the countdown timer reaches zero.</Bullet>
          <Bullet>Games may also end if an admin stops the game early.</Bullet>
        </Section>

        <Section title="Apple Disclaimer" icon="📱">
          <Bullet>
            Apple is not a sponsor of this game and is not involved in any manner with the prizes.
          </Bullet>
        </Section>

        <Text style={[styles.footer, { color: theme.colors.textSecondary }]}>
          By playing Treasure Island City Games, you agree to follow these rules. Updates may be made to keep gameplay
          fair and safe. Good luck and happy hunting! 🎉
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
    width: 24,
    fontSize: 16,
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
