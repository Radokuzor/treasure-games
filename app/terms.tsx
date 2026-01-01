import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TermsPage() {
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0B1020', '#1A1A2E', '#16213E']}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <Link href="/" style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </Link>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={styles.backButton} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.lastUpdated}>Last Updated: January 1, 2026</Text>

          <Text style={styles.paragraph}>
            Welcome to Treasure Island City Games. By accessing our app or website, you agree to the following terms:
          </Text>

          <Text style={styles.sectionTitle}>1. Eligibility</Text>
          <Text style={styles.paragraph}>
            You must be at least 13 years of age to use this service. If you are under 18, you must have parental consent. Prizes are subject to local laws and may be restricted by your geographic location.
          </Text>

          <Text style={styles.sectionTitle}>2. Zero-Tolerance Safety Policy (Guideline 1.2)</Text>
          <Text style={styles.paragraph}>
            Treasure Island City Games maintains a zero-tolerance policy regarding objectionable content and abusive behavior.
          </Text>

          <Text style={styles.subsectionTitle}>Prohibited Content:</Text>
          <Text style={styles.paragraph}>
            Users may not create usernames or content that is offensive, defamatory, or promotes illegal activity.
          </Text>

          <Text style={styles.subsectionTitle}>Moderation:</Text>
          <Text style={styles.paragraph}>
            We reserve the right to remove any content and eject any user who violates these terms.
          </Text>

          <Text style={styles.subsectionTitle}>Reporting:</Text>
          <Text style={styles.paragraph}>
            Users can report offensive content via the 'Report' button. We commit to acting on reports and removing violating content within 24 hours.
          </Text>

          <Text style={styles.sectionTitle}>3. No Purchase Necessary</Text>
          <Text style={styles.paragraph}>
            All games and contests within this app are for marketing and promotional purposes. No purchase is necessary to enter or win. A purchase will not increase your chances of winning.
          </Text>

          <Text style={styles.sectionTitle}>4. Apple Inc. Disclaimer</Text>
          <Text style={styles.paragraph}>
            Apple Inc. is not a sponsor of, or involved in, any contests, games, or prizes within this application. All promotions are sponsored solely by Treasure Island City Games and its brand partners.
          </Text>

          <Text style={styles.sectionTitle}>5. Account Termination</Text>
          <Text style={styles.paragraph}>
            We reserve the right to terminate your account without notice if we suspect cheating, bot activity, or a violation of our safety guidelines.
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Operated by Fourth Watch Technologies LLC
            </Text>
            <Text style={styles.footerText}>
              Contact: admin@fourthwatchtech.com
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  lastUpdated: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00D4E5',
    marginTop: 16,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    color: '#FFFFFF',
    marginBottom: 16,
    textShadowColor: '#000000',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  footer: {
    marginTop: 32,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.6)',
    marginBottom: 4,
  },
});
