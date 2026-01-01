import React, { useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Keyboard,
  Pressable,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Conditionally import ImagePicker for native only
let ImagePicker;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
}
import { GradientBackground } from '../components/GradientComponents';
import { getDb, getFirebaseAuth, getFirebaseStorage, hasFirebaseConfig } from '../config/firebase';
import { registerForPushNotificationsAsync } from '../notificationService';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const AuthScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [stateCode, setStateCode] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToEULA, setAgreedToEULA] = useState(false);
  const [agreedToSMS, setAgreedToSMS] = useState(false);

  const pickProfileImage = async () => {
    if (Platform.OS === 'web') {
      // Create a file input element for web
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';

      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          // Create a local URL for the selected file
          const localUrl = URL.createObjectURL(file);
          setProfileImageUri(localUrl);
        }
      };

      input.click();
      return;
    }

    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Allow photo access to add a profile picture.');
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
    } catch (error) {
      Alert.alert('Error', 'Failed to pick an image. Please try again.');
      console.log('Profile image pick failed:', error?.message ?? error);
    }
  };

  const handleAuth = async () => {
    if (isSubmitting) return;

    let didNavigate = false;
    try {
      setIsSubmitting(true);

      if (!hasFirebaseConfig) {
        Alert.alert(
          'Missing Firebase config',
          'Set EXPO_PUBLIC_FIREBASE_* env vars and restart Expo to enable login.'
        );
        return;
      }

      const firebaseAuth = getFirebaseAuth();

      if (!firebaseAuth) {
        Alert.alert('Firebase error', 'Auth is not available yet. Please restart the app.');
        return;
      }

      const firebaseDb = isSignUp ? getDb() : null;
      if (isSignUp && !firebaseDb) {
        Alert.alert('Firebase error', 'Firestore is not available yet. Please restart the app.');
        return;
      }

      if (!email.trim() || !password) {
        Alert.alert('Missing info', 'Please enter an email and password.');
        return;
      }

      if (isSignUp) {
        if (!firstName.trim() || !lastName.trim() || !city.trim() || !stateCode.trim() || !age.trim()) {
          Alert.alert('Missing info', 'Please fill in all required fields.');
          return;
        }
      }

      if (isSignUp && !agreedToEULA) {
        Alert.alert('Agreement Required', 'Please agree to the Terms of Service and Privacy Policy.');
        return;
      }

      let credential = null;
      if (isSignUp) {
        credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);

        if (firebaseDb) {
          try {
            let profileImageUrl = null;
            if (profileImageUri) {
              try {
                const storage = getFirebaseStorage();
                if (storage) {
                  const response = await fetch(profileImageUri);
                  const blob = await response.blob();
                  const storageRef = ref(storage, `profiles/${credential.user.uid}/avatar.jpg`);
                  await uploadBytes(storageRef, blob);
                  profileImageUrl = await getDownloadURL(storageRef);
                }
              } catch (error) {
                console.log('Profile image upload failed:', error?.message ?? error);
              }
            }

		            await setDoc(doc(firebaseDb, 'users', credential.user.uid), {
		              email: email.trim(),
                  firstName: firstName.trim(),
                  lastName: lastName.trim(),
		              phone: phone.trim() || null,
                  state: stateCode.trim().toUpperCase(),
		              city: city.trim() || null,
                  age: Number(age) || null,
                  profileImageUrl,
		              smsOptIn: agreedToSMS,
		              createdAt: serverTimestamp(),
		              updatedAt: serverTimestamp(),
		            });
          } catch (error) {
            console.log('User profile write failed:', error?.message ?? error);
          }
        }
      } else {
        credential = await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      }

      didNavigate = true;
      navigation?.reset?.({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });

      const uid = credential?.user?.uid ?? firebaseAuth.currentUser?.uid ?? null;
      if (uid) {
        void (async () => {
          try {
            console.log('📱 Registering push notifications for user:', uid);
            const pushToken = await registerForPushNotificationsAsync();
            console.log('📱 Push token received:', pushToken ? '✅ Valid token' : '❌ No token');
            if (!pushToken) {
              console.log('⚠️ Push token registration returned null - check device permissions');
              return;
            }

            const db = getDb();
            if (!db) {
              console.log('❌ Firebase not configured');
              return;
            }

            await setDoc(
              doc(db, 'users', uid),
              {
                pushToken,
                pushTokenUpdatedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
            console.log('✅ Push token saved to Firestore for user:', uid);
          } catch (error) {
            console.log('❌ Push token save failed:', error?.message ?? error);
          }
        })();
      }
    } catch (error) {
      Alert.alert('Auth error', error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      if (!didNavigate) setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.webContainer}>
            {/* Logo/Icon Section */}
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={theme.gradients.accent}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="location" size={60} color={theme.colors.text} />
              </LinearGradient>
              <Text style={[styles.title, { color: theme.colors.text }]}>
                Treasure Island City Games
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
                {isSignUp ? 'Create your hunter profile' : 'Welcome back, hunter!'}
              </Text>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              {/* Email Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={theme.colors.textSecondary}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={[styles.input, { color: theme.colors.text }]}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Sign Up Additional Fields */}
	              {isSignUp && (
	                <>
                    <TouchableOpacity
                      onPress={pickProfileImage}
                      activeOpacity={0.8}
                      style={styles.profilePicPicker}
                    >
                      {profileImageUri ? (
                        <Image source={{ uri: profileImageUri }} style={styles.profilePic} />
                      ) : (
                        <LinearGradient
                          colors={theme.gradients.accent}
                          style={styles.profilePicPlaceholder}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                        >
                          <Ionicons name="camera" size={24} color="#FFFFFF" />
                          <Text style={styles.profilePicText}>Add Photo</Text>
                        </LinearGradient>
                      )}
                    </TouchableOpacity>

                    <View style={styles.inputRow}>
                      <View style={styles.inputHalf}>
                        <View style={styles.inputContainer}>
                          <Ionicons
                            name="person-outline"
                            size={20}
                            color={theme.colors.textSecondary}
                            style={styles.inputIcon}
                          />
                          <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="First Name"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={firstName}
                            onChangeText={setFirstName}
                            autoCapitalize="words"
                          />
                        </View>
                      </View>
                      <View style={styles.inputHalf}>
                        <View style={styles.inputContainer}>
                          <Ionicons
                            name="person-outline"
                            size={20}
                            color={theme.colors.textSecondary}
                            style={styles.inputIcon}
                          />
                          <TextInput
                            style={[styles.input, { color: theme.colors.text }]}
                            placeholder="Last Name"
                            placeholderTextColor={theme.colors.textSecondary}
                            value={lastName}
                            onChangeText={setLastName}
                            autoCapitalize="words"
                          />
                        </View>
                      </View>
                    </View>

	                  <View style={styles.inputContainer}>
	                    <Ionicons
	                      name="call-outline"
                      size={20}
                      color={theme.colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="Phone Number"
                      placeholderTextColor={theme.colors.textSecondary}
	                      value={phone}
	                      onChangeText={setPhone}
	                      keyboardType="phone-pad"
	                    />
	                  </View>

                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="map-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="State (e.g., CA)"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={stateCode}
                        onChangeText={setStateCode}
                        autoCapitalize="characters"
                        maxLength={2}
                      />
                    </View>

		                  <View style={styles.inputContainer}>
		                    <Ionicons
		                      name="location-outline"
	                      size={20}
	                      color={theme.colors.textSecondary}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.text }]}
                      placeholder="City"
                      placeholderTextColor={theme.colors.textSecondary}
	                      value={city}
	                      onChangeText={setCity}
		                    />
		                  </View>

                    <View style={styles.inputContainer}>
                      <Ionicons
                        name="calendar-outline"
                        size={20}
                        color={theme.colors.textSecondary}
                        style={styles.inputIcon}
                      />
                      <TextInput
                        style={[styles.input, { color: theme.colors.text }]}
                        placeholder="Age"
                        placeholderTextColor={theme.colors.textSecondary}
                        value={age}
                        onChangeText={setAge}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                    </View>

		                  {/* EULA Checkbox */}
		                  <TouchableOpacity
		                    onPress={() => setAgreedToEULA(!agreedToEULA)}
                    style={styles.eulaContainer}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: theme.gradients.primary[0] },
                        agreedToEULA ? { backgroundColor: theme.gradients.primary[0] } : null,
                      ]}
                    >
                      {agreedToEULA && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.eulaText, { color: theme.colors.textSecondary }]}>
                      I agree to the{' '}
                      <Text
                        style={[styles.eulaLink, { color: theme.colors.accent }]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open('https://treasure-island-city-games.vercel.app/terms', '_blank');
                          } else {
                            navigation.navigate('Terms');
                          }
                        }}
                      >
                        Terms of Service (EULA)
                      </Text>
                      {' '}and{' '}
                      <Text
                        style={[styles.eulaLink, { color: theme.colors.accent }]}
                        onPress={() => {
                          if (Platform.OS === 'web') {
                            window.open('https://treasure-island-city-games.vercel.app/privacy', '_blank');
                          } else {
                            navigation.navigate('Privacy');
                          }
                        }}
                      >
                        Privacy Policy
                      </Text>
                      . I understand there is zero tolerance for objectionable content or abusive behavior.
                    </Text>
                  </TouchableOpacity>

                  {/* SMS Opt-in Checkbox */}
                  <TouchableOpacity
                    onPress={() => setAgreedToSMS(!agreedToSMS)}
                    style={styles.smsContainer}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.checkbox,
                        { borderColor: theme.gradients.primary[0] },
                        agreedToSMS ? { backgroundColor: theme.gradients.primary[0] } : null,
                      ]}
                    >
                      {agreedToSMS && (
                        <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text style={[styles.smsText, { color: theme.colors.textSecondary }]}>
                      I agree to receive automated promo texts from Treasure Island City Games. Consent not a condition of purchase. Msg freq varies. Msg & data rates may apply. Reply STOP to opt out.
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Auth Button */}
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  void handleAuth();
                }}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.authButton,
                  pressed && !isSubmitting ? { opacity: 0.9 } : null,
                ]}
                hitSlop={8}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={theme.gradients.primary}
                  style={styles.authButtonGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
                <View style={styles.authButtonInner}>
                  <View style={styles.authButtonContent}>
                    {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : null}
                    <Text style={styles.authButtonText}>
                      {isSubmitting
                        ? isSignUp
                          ? 'Creating...'
                          : 'Signing In...'
                        : isSignUp
                          ? 'Create Account'
                          : 'Sign In'}
                    </Text>
                  </View>
                </View>
              </Pressable>

              {/* Forgot Password (Sign In Only) */}
              {!isSignUp && (
                <TouchableOpacity style={styles.forgotPassword}>
                  <Text style={[styles.forgotPasswordText, { color: theme.colors.textSecondary }]}>
                    Forgot Password?
                  </Text>
                </TouchableOpacity>
              )}

              {/* Toggle Sign Up/Sign In */}
              <View style={styles.toggleContainer}>
                <Text style={[styles.toggleText, { color: theme.colors.textSecondary }]}>
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </Text>
                <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
                  <LinearGradient
                    colors={theme.gradients.accent}
                    style={styles.toggleGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.toggleButtonText}>
                      {isSignUp ? 'Sign In' : 'Sign Up'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GradientBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    ...(Platform.OS === 'web' && {
      alignItems: 'center',
    }),
  },
  webContainer: {
    width: '100%',
    ...(Platform.OS === 'web' && {
      maxWidth: 480,
    }),
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoGradient: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    marginBottom: 8,
    letterSpacing: 1,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 8,
  },
  authButton: {
    borderRadius: 16,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  authButtonGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16,
  },
  authButtonInner: {
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  authButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  forgotPassword: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  toggleText: {
    fontSize: 14,
    marginRight: 8,
  },
  toggleGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  toggleButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  eulaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profilePicPicker: {
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  profilePic: {
    width: 84,
    height: 84,
    borderRadius: 42,
  },
  profilePicPlaceholder: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  profilePicText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  eulaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  eulaLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  smsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 8,
  },
  smsText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});

export default AuthScreen;
