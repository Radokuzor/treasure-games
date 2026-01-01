import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import { GradientBackground, GradientCard } from '../components/GradientComponents';
import { getFirebaseAuth, getFirebaseDb, getFirebaseStorage, hasFirebaseConfig } from '../config/firebase';
import { useTheme } from '../context/ThemeContext';

const EditProfileScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const auth = getFirebaseAuth();
  const uid = auth?.currentUser?.uid ?? null;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [age, setAge] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);

  const displayName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);

  useEffect(() => {
    if (!hasFirebaseConfig) {
      setIsLoading(false);
      return;
    }
    if (!uid) {
      setIsLoading(false);
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const data = snap.data() ?? {};
        setFirstName(typeof data.firstName === 'string' ? data.firstName : '');
        setLastName(typeof data.lastName === 'string' ? data.lastName : '');
        setPhone(typeof data.phone === 'string' ? data.phone : '');
        setCity(typeof data.city === 'string' ? data.city : '');
        setStateCode(typeof data.state === 'string' ? data.state : '');
        setAge(typeof data.age === 'number' ? String(data.age) : typeof data.age === 'string' ? data.age : '');
        setProfileImageUrl(typeof data.profileImageUrl === 'string' ? data.profileImageUrl : '');
        setIsLoading(false);
      },
      (error) => {
        console.log('Edit profile load error:', error?.message ?? error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [uid]);

  const pickProfileImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setProfileImageUri(result.assets[0].uri);
      }
    } catch (_error) {
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!hasFirebaseConfig) {
      Alert.alert('Firebase not configured', 'Add Firebase env vars to enable profile updates.');
      return;
    }
    if (!uid) {
      Alert.alert('Not signed in', 'Please sign in again.');
      return;
    }

    const db = getFirebaseDb();
    if (!db) {
      Alert.alert('Firebase error', 'Firestore is not available. Please restart the app.');
      return;
    }

    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'Please enter your first and last name.');
      return;
    }

    setIsSaving(true);
    try {
      let nextProfileImageUrl = profileImageUrl;

      if (profileImageUri) {
        const storage = getFirebaseStorage();
        if (storage) {
          const response = await fetch(profileImageUri);
          const blob = await response.blob();
          const storageRef = ref(storage, `profiles/${uid}/avatar.jpg`);
          await uploadBytes(storageRef, blob);
          nextProfileImageUrl = await getDownloadURL(storageRef);
        }
      }

      const parsedAge = Number(age);
      const nextAge = Number.isFinite(parsedAge) ? parsedAge : null;

      await setDoc(
        doc(db, 'users', uid),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          phone: phone.trim() || null,
          city: city.trim() || null,
          state: stateCode.trim() ? stateCode.trim().toUpperCase() : null,
          age: nextAge,
          profileImageUrl: nextProfileImageUrl || null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setProfileImageUri(null);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Save failed', error?.message ?? 'Unable to update your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Profile</Text>
            <View style={styles.backButton} />
          </View>

          <GradientCard style={styles.card}>
            {isLoading ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={theme.colors.text} />
                <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>Loading…</Text>
              </View>
            ) : (
              <>
                <TouchableOpacity onPress={pickProfileImage} activeOpacity={0.8} style={styles.avatarWrap}>
                  <LinearGradient
                    colors={theme.gradients.primary}
                    style={styles.avatarGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {profileImageUri || profileImageUrl ? (
                      <Image
                        source={{ uri: profileImageUri || profileImageUrl }}
                        style={styles.avatarImage}
                      />
                    ) : (
                      <Ionicons name="person" size={52} color="#FFFFFF" />
                    )}
                  </LinearGradient>
                  <Text style={[styles.avatarHint, { color: theme.colors.textSecondary }]}>
                    Tap to change photo
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.displayName, { color: theme.colors.text }]}>{displayName}</Text>

                <View style={styles.row}>
                  <View style={styles.half}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>First name</Text>
                    <TextInput
                      value={firstName}
                      onChangeText={setFirstName}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="First"
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize="words"
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Last name</Text>
                    <TextInput
                      value={lastName}
                      onChangeText={setLastName}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="Last"
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Phone</Text>
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Phone"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="phone-pad"
                />

                <View style={styles.row}>
                  <View style={[styles.half, styles.flex2]}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>City</Text>
                    <TextInput
                      value={city}
                      onChangeText={setCity}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="City"
                      placeholderTextColor={theme.colors.textSecondary}
                    />
                  </View>
                  <View style={styles.half}>
                    <Text style={[styles.label, { color: theme.colors.textSecondary }]}>State</Text>
                    <TextInput
                      value={stateCode}
                      onChangeText={setStateCode}
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="CA"
                      placeholderTextColor={theme.colors.textSecondary}
                      autoCapitalize="characters"
                      maxLength={2}
                    />
                  </View>
                </View>

                <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Age</Text>
                <TextInput
                  value={age}
                  onChangeText={setAge}
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="18"
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                />

                <TouchableOpacity onPress={handleSave} activeOpacity={0.85} disabled={isSaving}>
                  <LinearGradient
                    colors={theme.gradients.accent}
                    style={[styles.saveButton, isSaving ? { opacity: 0.7 } : null]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Ionicons name="save" size={18} color="#FFF" />}
                    <Text style={styles.saveButtonText}>{isSaving ? 'Saving…' : 'Save'}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </>
            )}
          </GradientCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 18, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  card: { padding: 18 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 18 },
  loadingText: { fontSize: 14, fontWeight: '700' },
  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatarGradient: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarHint: { marginTop: 10, fontSize: 12, fontWeight: '700' },
  displayName: { textAlign: 'center', fontSize: 18, fontWeight: '900', marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '800', marginTop: 10, marginBottom: 6 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    fontSize: 15,
    fontWeight: '600',
  },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  flex2: { flex: 2 },
  saveButton: {
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
});

export default EditProfileScreen;
