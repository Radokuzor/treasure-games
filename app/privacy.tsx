import React from 'react';
import { ScrollView, StyleSheet, Text, View, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function PrivacyPage() {
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
          <Text style={styles.headerTitle}>Privacy Policy</Text>
          <View style={styles.backButton} />
        </View>

        {/* Content */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
          <Text style={styles.lastUpdated}>Last Updated: January 1, 2026</Text>

          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.paragraph}>
            We collect the following information to provide our services:
          </Text>

          <Text style={styles.subsectionTitle}>Authentication Data:</Text>
          <Text style={styles.paragraph}>
            Phone numbers for secure login and account verification.
          </Text>

          <Text style={styles.subsectionTitle}>User-Generated Data:</Text>
          <Text style={styles.paragraph}>
            Usernames for the leaderboard and profile display.
          </Text>

          <Text style={styles.subsectionTitle}>Device Data:</Text>
          <Text style={styles.paragraph}>
            We use Firebase Analytics to monitor app performance and improve user experience.
          </Text>

          <Text style={styles.sectionTitle}>2. SMS Marketing and Data Handling</Text>
          <Text style={styles.paragraph}>
            If you explicitly opt-in to receive SMS notifications:
          </Text>
          <Text style={styles.paragraph}>
            • We will send you updates about new games and brand-sponsored prizes.
          </Text>
          <Text style={styles.paragraph}>
            • We do not sell or share your SMS opt-in data with third parties for marketing purposes.
          </Text>
          <Text style={styles.paragraph}>
            • Data is shared only with our technical service providers (e.g., Firebase, Twilio) strictly to deliver your messages.
          </Text>

          <Text style={styles.sectionTitle}>SMS Communications</Text>
          <View style={styles.highlightBox}>
            <Text style={styles.highlightText}>
              SMS Disclosure: By providing your phone number and opting in, you consent to receive automated promotional text messages from Treasure Island City Games. Consent is not a condition of purchase or participation. Message frequency varies. Message and data rates may apply. You can opt out at any time by replying STOP to any message. For help, reply HELP. View our Privacy Policy and Terms of Service for more details.
            </Text>
          </View>

          <Text style={styles.sectionTitle}>3. Data Retention and Deletion (Guideline 5.1.1)</Text>
          <Text style={styles.paragraph}>
            You have the right to access or delete your data at any time.
          </Text>
          <Text style={styles.paragraph}>
            To delete your account and all associated data, go to the Profile section in the app and select 'Delete Account' or email us at admin@fourthwatchtech.com.
          </Text>
          <Text style={styles.paragraph}>
            We will process deletion requests within 30 days.
          </Text>

          <Text style={styles.sectionTitle}>4. Third-Party Services</Text>
          <Text style={styles.paragraph}>
            We use Google Firebase for database and authentication services. Please refer to Google's Privacy Policy for more information on how they handle data.
          </Text>

          <Text style={styles.sectionTitle}>5. Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard encryption to protect your phone number and account data. However, no method of transmission over the internet is 100% secure.
          </Text>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Operated by Fourth Watch Technologies LLC
            </Text>
            <Text style={styles.footerText}>
              Treasure Island City Games
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
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 12,
  },
  highlightBox: {
    backgroundColor: 'rgba(0, 212, 229, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: '#00D4E5',
    padding: 16,
    marginVertical: 16,
    borderRadius: 8,
  },
  highlightText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#FFFFFF',
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
