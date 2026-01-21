import React, { useState, useRef, useMemo } from 'react';
import {
  Alert,
  ActivityIndicator,
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
  Modal,
  FlatList,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

// Conditionally import ImagePicker for native only
let ImagePicker;
if (Platform.OS !== 'web') {
  ImagePicker = require('expo-image-picker');
}
import { getDb, getFirebaseAuth, getFirebaseStorage, hasFirebaseConfig } from '../config/firebase';
import { registerForPushNotificationsAsync } from '../notificationService';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// US States data
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'DC', name: 'Washington DC' },
];

// Cities by state
const CITIES_BY_STATE = {
  AL: ['Birmingham', 'Montgomery', 'Huntsville', 'Mobile', 'Tuscaloosa'],
  AK: ['Anchorage', 'Fairbanks', 'Juneau', 'Sitka', 'Ketchikan'],
  AZ: ['Phoenix', 'Tucson', 'Mesa', 'Scottsdale', 'Tempe', 'Chandler', 'Gilbert'],
  AR: ['Little Rock', 'Fort Smith', 'Fayetteville', 'Springdale', 'Jonesboro'],
  CA: ['Los Angeles', 'San Francisco', 'San Diego', 'San Jose', 'Sacramento', 'Oakland', 'Fresno', 'Long Beach', 'Bakersfield', 'Anaheim', 'Santa Ana', 'Riverside', 'Irvine', 'Pasadena', 'Berkeley'],
  CO: ['Denver', 'Colorado Springs', 'Aurora', 'Fort Collins', 'Boulder', 'Lakewood'],
  CT: ['Hartford', 'New Haven', 'Stamford', 'Bridgeport', 'Waterbury'],
  DE: ['Wilmington', 'Dover', 'Newark', 'Middletown', 'Smyrna'],
  FL: ['Miami', 'Orlando', 'Tampa', 'Jacksonville', 'Fort Lauderdale', 'St. Petersburg', 'Hialeah', 'Tallahassee', 'Cape Coral', 'Fort Myers'],
  GA: ['Atlanta', 'Augusta', 'Columbus', 'Savannah', 'Athens', 'Macon'],
  HI: ['Honolulu', 'Pearl City', 'Hilo', 'Kailua', 'Waipahu'],
  ID: ['Boise', 'Meridian', 'Nampa', 'Idaho Falls', 'Pocatello'],
  IL: ['Chicago', 'Aurora', 'Naperville', 'Joliet', 'Rockford', 'Springfield'],
  IN: ['Indianapolis', 'Fort Wayne', 'Evansville', 'South Bend', 'Carmel'],
  IA: ['Des Moines', 'Cedar Rapids', 'Davenport', 'Sioux City', 'Iowa City'],
  KS: ['Wichita', 'Overland Park', 'Kansas City', 'Olathe', 'Topeka'],
  KY: ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro', 'Covington'],
  LA: ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette', 'Lake Charles'],
  ME: ['Portland', 'Lewiston', 'Bangor', 'South Portland', 'Auburn'],
  MD: ['Baltimore', 'Frederick', 'Rockville', 'Gaithersburg', 'Bowie', 'Annapolis'],
  MA: ['Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell', 'Brockton'],
  MI: ['Detroit', 'Grand Rapids', 'Warren', 'Sterling Heights', 'Ann Arbor', 'Lansing'],
  MN: ['Minneapolis', 'St. Paul', 'Rochester', 'Duluth', 'Bloomington'],
  MS: ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg', 'Biloxi'],
  MO: ['Kansas City', 'St. Louis', 'Springfield', 'Columbia', 'Independence'],
  MT: ['Billings', 'Missoula', 'Great Falls', 'Bozeman', 'Butte'],
  NE: ['Omaha', 'Lincoln', 'Bellevue', 'Grand Island', 'Kearney'],
  NV: ['Las Vegas', 'Henderson', 'Reno', 'North Las Vegas', 'Sparks'],
  NH: ['Manchester', 'Nashua', 'Concord', 'Derry', 'Dover'],
  NJ: ['Newark', 'Jersey City', 'Paterson', 'Elizabeth', 'Edison', 'Trenton'],
  NM: ['Albuquerque', 'Las Cruces', 'Rio Rancho', 'Santa Fe', 'Roswell'],
  NY: ['New York', 'Buffalo', 'Rochester', 'Yonkers', 'Syracuse', 'Albany'],
  NC: ['Charlotte', 'Raleigh', 'Greensboro', 'Durham', 'Winston-Salem', 'Fayetteville'],
  ND: ['Fargo', 'Bismarck', 'Grand Forks', 'Minot', 'West Fargo'],
  OH: ['Columbus', 'Cleveland', 'Cincinnati', 'Toledo', 'Akron', 'Dayton'],
  OK: ['Oklahoma City', 'Tulsa', 'Norman', 'Broken Arrow', 'Lawton'],
  OR: ['Portland', 'Salem', 'Eugene', 'Gresham', 'Hillsboro', 'Beaverton'],
  PA: ['Philadelphia', 'Pittsburgh', 'Allentown', 'Reading', 'Erie', 'Scranton'],
  RI: ['Providence', 'Warwick', 'Cranston', 'Pawtucket', 'East Providence'],
  SC: ['Charleston', 'Columbia', 'North Charleston', 'Mount Pleasant', 'Rock Hill'],
  SD: ['Sioux Falls', 'Rapid City', 'Aberdeen', 'Brookings', 'Watertown'],
  TN: ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Clarksville'],
  TX: ['Houston', 'San Antonio', 'Dallas', 'Austin', 'Fort Worth', 'El Paso', 'Arlington', 'Corpus Christi', 'Plano', 'Lubbock'],
  UT: ['Salt Lake City', 'West Valley City', 'Provo', 'West Jordan', 'Orem'],
  VT: ['Burlington', 'South Burlington', 'Rutland', 'Barre', 'Montpelier'],
  VA: ['Virginia Beach', 'Norfolk', 'Chesapeake', 'Richmond', 'Newport News', 'Alexandria'],
  WA: ['Seattle', 'Spokane', 'Tacoma', 'Vancouver', 'Bellevue', 'Kent'],
  WV: ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg', 'Wheeling'],
  WI: ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha', 'Racine'],
  WY: ['Cheyenne', 'Casper', 'Laramie', 'Gillette', 'Rock Springs'],
  DC: ['Washington DC'],
};

// Age options
const AGE_OPTIONS = Array.from({ length: 83 }, (_, i) => (18 + i).toString());

const AuthScreen = ({ navigation }) => {
  const { theme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [age, setAge] = useState('');
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agreedToEULA, setAgreedToEULA] = useState(false);
  const [agreedToSMS, setAgreedToSMS] = useState(false);

  // Picker states
  const [isStatePickerOpen, setIsStatePickerOpen] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [isAgePickerOpen, setIsAgePickerOpen] = useState(false);

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Get cities for selected state
  const citiesForState = useMemo(() => {
    return state ? (CITIES_BY_STATE[state] || []) : [];
  }, [state]);

  const pickProfileImage = async () => {
    if (Platform.OS === 'web') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
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
    }
  };

  const handleAuth = async () => {
    if (isSubmitting) return;

    let didNavigate = false;
    try {
      setIsSubmitting(true);

      if (!hasFirebaseConfig) {
        Alert.alert('Missing Firebase config', 'Set EXPO_PUBLIC_FIREBASE_* env vars and restart Expo to enable login.');
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
        if (!firstName.trim() || !lastName.trim() || !city.trim() || !state.trim() || !age.trim()) {
          Alert.alert('Missing info', 'Please fill in all required fields.');
          return;
        }
        if (!agreedToEULA) {
          Alert.alert('Agreement Required', 'Please agree to the Terms of Service and Privacy Policy.');
          return;
        }
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
              state: state.trim().toUpperCase(),
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
        routes: [{ name: 'MainTabs', params: { userId: credential?.user?.uid } }],
      });

      // Register push notifications
      const uid = credential?.user?.uid ?? firebaseAuth.currentUser?.uid ?? null;
      if (uid) {
        void (async () => {
          try {
            const pushToken = await registerForPushNotificationsAsync();
            if (!pushToken) return;

            const db = getDb();
            if (!db) return;

            await setDoc(
              doc(db, 'users', uid),
              {
                pushToken,
                pushTokenUpdatedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              },
              { merge: true }
            );
          } catch (error) {
            console.log('Push token save failed:', error?.message ?? error);
          }
        })();
      }
    } catch (error) {
      Alert.alert('Auth error', error?.message ?? 'Something went wrong. Please try again.');
    } finally {
      if (!didNavigate) setIsSubmitting(false);
    }
  };

  // Render picker modal
  const renderPickerModal = (isOpen, setIsOpen, title, data, selectedValue, onSelect, renderItem) => (
    <Modal
      visible={isOpen}
      transparent
      animationType="slide"
      onRequestClose={() => setIsOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={() => setIsOpen(false)} style={styles.modalCloseButton}>
              <Ionicons name="close" size={24} color="#1A1A2E" />
            </TouchableOpacity>
          </View>
          <FlatList
            data={data}
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            style={styles.modalList}
          />
        </View>
      </View>
    </Modal>
  );

  // Sign In Form
  const renderSignInForm = () => (
    <View style={styles.formContainer}>
      {/* Email */}
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="your@email.com"
        placeholderTextColor="rgba(26, 26, 46, 0.4)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <Text style={styles.inputLabel}>Password</Text>
      <View style={styles.passwordContainer}>
        <TextInput
          style={[styles.input, styles.passwordInput]}
          placeholder="Enter your password"
          placeholderTextColor="rgba(26, 26, 46, 0.4)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity
          onPress={() => setShowPassword(!showPassword)}
          style={styles.eyeButton}
        >
          <Ionicons
            name={showPassword ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color="rgba(26, 26, 46, 0.6)"
          />
        </TouchableOpacity>
      </View>

      {/* Sign In Button */}
      <TouchableOpacity onPress={handleAuth} activeOpacity={0.8} disabled={isSubmitting}>
        <LinearGradient colors={['#00D4E5', '#00E5CC']} style={styles.submitButton}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Sign In</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Switch to Sign Up */}
      <TouchableOpacity onPress={() => setIsSignUp(true)} style={styles.switchButton}>
        <Text style={styles.switchText}>
          Don't have an account? <Text style={styles.switchTextBold}>Sign Up</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Sign Up Form (matching onboarding style)
  const renderSignUpForm = () => (
    <View style={styles.formContainer}>
      <Text style={styles.formTitle}>Create Your Profile</Text>

      {/* Profile Picture */}
      <TouchableOpacity onPress={pickProfileImage} style={styles.profilePicPicker}>
        {profileImageUri ? (
          <Image source={{ uri: profileImageUri }} style={styles.profilePic} />
        ) : (
          <LinearGradient colors={['#00D4E5', '#00E5CC']} style={styles.profilePicPlaceholder}>
            <Ionicons name="camera" size={32} color="#FFF" />
            <Text style={styles.profilePicText}>Add Photo</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>

      {/* Name Inputs */}
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.inputLabel}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="John"
            placeholderTextColor="rgba(26, 26, 46, 0.4)"
            value={firstName}
            onChangeText={setFirstName}
          />
        </View>
        <View style={styles.inputHalf}>
          <Text style={styles.inputLabel}>Last Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Doe"
            placeholderTextColor="rgba(26, 26, 46, 0.4)"
            value={lastName}
            onChangeText={setLastName}
          />
        </View>
      </View>

      {/* Email */}
      <Text style={styles.inputLabel}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="your@email.com"
        placeholderTextColor="rgba(26, 26, 46, 0.4)"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      {/* Password */}
      <Text style={styles.inputLabel}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Create a strong password"
        placeholderTextColor="rgba(26, 26, 46, 0.4)"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      {/* Phone (optional) */}
      <Text style={styles.inputLabel}>Phone (Optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="(555) 123-4567"
        placeholderTextColor="rgba(26, 26, 46, 0.4)"
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />

      {/* Location (dropdowns) */}
      <View style={styles.inputRow}>
        <View style={styles.inputHalf}>
          <Text style={styles.inputLabel}>State</Text>
          <TouchableOpacity
            onPress={() => setIsStatePickerOpen(true)}
            activeOpacity={0.85}
            style={styles.selectInput}
          >
            <Text style={[styles.selectText, !state && styles.selectPlaceholder]}>
              {state ? US_STATES.find(s => s.code === state)?.name || state : 'Select State'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="rgba(26, 26, 46, 0.6)" />
          </TouchableOpacity>
        </View>
        <View style={[styles.inputHalf, { flex: 2 }]}>
          <Text style={styles.inputLabel}>City</Text>
          <TouchableOpacity
            onPress={() => state ? setIsCityPickerOpen(true) : null}
            activeOpacity={0.85}
            style={[styles.selectInput, !state && styles.selectInputDisabled]}
            disabled={!state}
          >
            <Text style={[styles.selectText, !city && styles.selectPlaceholder]}>
              {city ? city : state ? 'Select city' : 'Select state first'}
            </Text>
            <Ionicons name="chevron-down" size={18} color="rgba(26, 26, 46, 0.6)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Age */}
      <Text style={styles.inputLabel}>Age</Text>
      <TouchableOpacity
        onPress={() => setIsAgePickerOpen(true)}
        activeOpacity={0.85}
        style={styles.selectInput}
      >
        <Text style={[styles.selectText, !age && styles.selectPlaceholder]}>
          {age ? age : '18+'}
        </Text>
        <Ionicons name="chevron-down" size={18} color="rgba(26, 26, 46, 0.6)" />
      </TouchableOpacity>

      {/* EULA Checkbox */}
      <TouchableOpacity
        onPress={() => setAgreedToEULA(!agreedToEULA)}
        style={styles.eulaContainer}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreedToEULA && styles.checkboxChecked]}>
          {agreedToEULA && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
        <Text style={styles.eulaText}>
          I agree to the{' '}
          <Text
            style={styles.eulaLink}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open('/terms', '_blank');
              } else {
                navigation.navigate('Terms');
              }
            }}
          >
            Terms of Service (EULA)
          </Text>
          {' '}and{' '}
          <Text
            style={styles.eulaLink}
            onPress={() => {
              if (Platform.OS === 'web') {
                window.open('/privacy', '_blank');
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

      {/* SMS Opt-in */}
      <TouchableOpacity
        onPress={() => setAgreedToSMS(!agreedToSMS)}
        style={styles.smsContainer}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, agreedToSMS && styles.checkboxChecked]}>
          {agreedToSMS && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
        </View>
        <Text style={styles.smsText}>
          I agree to receive automated promo texts from Grab The Cash. Consent not a condition of purchase. Msg freq varies. Msg & data rates may apply. Reply STOP to opt out.
        </Text>
      </TouchableOpacity>

      {/* Sign Up Button */}
      <TouchableOpacity onPress={handleAuth} activeOpacity={0.8} disabled={isSubmitting}>
        <LinearGradient colors={['#00D4E5', '#00E5CC']} style={styles.submitButton}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.submitButtonText}>Create Account</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Switch to Sign In */}
      <TouchableOpacity onPress={() => setIsSignUp(false)} style={styles.switchButton}>
        <Text style={styles.switchText}>
          Already have an account? <Text style={styles.switchTextBold}>Sign In</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#E8F9FD', '#D4F1F4', '#B5EAD7']} style={styles.gradient}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Header */}
              <View style={styles.header}>
                <LinearGradient colors={['#00D4E5', '#00E5CC']} style={styles.logoCircle}>
                  <Ionicons name="location" size={40} color="#FFF" />
                </LinearGradient>
                <Text style={styles.headerTitle}>Grab The Cash</Text>
                <Text style={styles.headerSubtitle}>Win Real Prizes</Text>
              </View>

              {/* Form */}
              {isSignUp ? renderSignUpForm() : renderSignInForm()}
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        {/* State Picker Modal */}
        {renderPickerModal(
          isStatePickerOpen,
          setIsStatePickerOpen,
          'Select State',
          US_STATES,
          state,
          (item) => {
            setState(item.code);
            setCity(''); // Reset city when state changes
            setIsStatePickerOpen(false);
          },
          ({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, state === item.code && styles.pickerItemSelected]}
              onPress={() => {
                setState(item.code);
                setCity('');
                setIsStatePickerOpen(false);
              }}
            >
              <Text style={[styles.pickerItemText, state === item.code && styles.pickerItemTextSelected]}>
                {item.name}
              </Text>
              {state === item.code && <Ionicons name="checkmark" size={20} color="#00D4E5" />}
            </TouchableOpacity>
          )
        )}

        {/* City Picker Modal */}
        {renderPickerModal(
          isCityPickerOpen,
          setIsCityPickerOpen,
          'Select City',
          citiesForState,
          city,
          (item) => {
            setCity(item);
            setIsCityPickerOpen(false);
          },
          ({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, city === item && styles.pickerItemSelected]}
              onPress={() => {
                setCity(item);
                setIsCityPickerOpen(false);
              }}
            >
              <Text style={[styles.pickerItemText, city === item && styles.pickerItemTextSelected]}>
                {item}
              </Text>
              {city === item && <Ionicons name="checkmark" size={20} color="#00D4E5" />}
            </TouchableOpacity>
          )
        )}

        {/* Age Picker Modal */}
        {renderPickerModal(
          isAgePickerOpen,
          setIsAgePickerOpen,
          'Select Age',
          AGE_OPTIONS,
          age,
          (item) => {
            setAge(item);
            setIsAgePickerOpen(false);
          },
          ({ item }) => (
            <TouchableOpacity
              style={[styles.pickerItem, age === item && styles.pickerItemSelected]}
              onPress={() => {
                setAge(item);
                setIsAgePickerOpen(false);
              }}
            >
              <Text style={[styles.pickerItemText, age === item && styles.pickerItemTextSelected]}>
                {item}
              </Text>
              {age === item && <Ionicons name="checkmark" size={20} color="#00D4E5" />}
            </TouchableOpacity>
          )
        )}
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#00D4E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'rgba(26, 26, 46, 0.7)',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(26, 26, 46, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A2E',
    borderWidth: 1,
    borderColor: 'rgba(26, 26, 46, 0.1)',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputHalf: {
    flex: 1,
  },
  selectInput: {
    backgroundColor: 'rgba(26, 26, 46, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(26, 26, 46, 0.1)',
  },
  selectInputDisabled: {
    opacity: 0.5,
  },
  selectText: {
    fontSize: 16,
    color: '#1A1A2E',
  },
  selectPlaceholder: {
    color: 'rgba(26, 26, 46, 0.4)',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 14,
  },
  profilePicPicker: {
    alignSelf: 'center',
    marginBottom: 16,
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profilePicPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profilePicText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  eulaContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 20,
    gap: 12,
  },
  smsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#00D4E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: '#00D4E5',
  },
  eulaText: {
    flex: 1,
    fontSize: 12,
    color: 'rgba(26, 26, 46, 0.7)',
    lineHeight: 18,
  },
  eulaLink: {
    color: '#00D4E5',
    fontWeight: '700',
  },
  smsText: {
    flex: 1,
    fontSize: 11,
    color: 'rgba(26, 26, 46, 0.6)',
    lineHeight: 16,
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    shadowColor: '#00D4E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  submitButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  switchButton: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    color: 'rgba(26, 26, 46, 0.7)',
  },
  switchTextBold: {
    fontWeight: '800',
    color: '#00D4E5',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalList: {
    paddingHorizontal: 20,
  },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(0, 212, 229, 0.1)',
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  pickerItemText: {
    fontSize: 16,
    color: '#1A1A2E',
  },
  pickerItemTextSelected: {
    fontWeight: '700',
    color: '#00D4E5',
  },
});

export default AuthScreen;
