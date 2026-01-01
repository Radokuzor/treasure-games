import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import LottieView from 'lottie-react-native';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getFirebaseAuth, getDb, getFirebaseStorage } from '../config/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const { width, height } = Dimensions.get('window');
const ONBOARDING_SEEN_KEY = 'hasSeenOnboarding_v4';

const US_STATES = [
  { code: 'DC', name: 'District of Columbia' },
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const OnboardingScreen = ({ navigation }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollViewRef = useRef(null);
  const [isDismissing, setIsDismissing] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [age, setAge] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [isStatePickerOpen, setIsStatePickerOpen] = useState(false);
  const [isCityPickerOpen, setIsCityPickerOpen] = useState(false);
  const [isAgePickerOpen, setIsAgePickerOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [agreedToEULA, setAgreedToEULA] = useState(false);
  const [agreedToSMS, setAgreedToSMS] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const dismissAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    animateSlide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSlide]);

  const dismissOnboardingToAuth = async () => {
    if (isDismissing) return;
    setIsDismissing(true);

    try {
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    } catch (error) {
      console.error('Error saving onboarding flag:', error);
    }

    Animated.timing(dismissAnim, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      navigation.replace('Auth');
    });
  };

  const animateSlide = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(50);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const nextSlide = () => {
    if (currentSlide < 8) {
      const nextIndex = currentSlide + 1;
      setCurrentSlide(nextIndex);

      // Use setTimeout to ensure state update completes before scrolling
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({
          x: nextIndex * width,
          animated: Platform.OS !== 'web' // Disable animation on web for reliability
        });
      }, 50);
    }
  };

  const skipToSignup = () => {
    // Set slide first, then scroll after state update
    setCurrentSlide(8);

    // Use setTimeout to ensure state update completes before scrolling
    // This prevents race conditions on web
    setTimeout(() => {
      scrollViewRef.current?.scrollTo({
        x: 8 * width,
        animated: Platform.OS !== 'web' // Disable animation on web for reliability
      });
    }, 50);
  };

  const onScrollEnd = (event) => {
    const x = event?.nativeEvent?.contentOffset?.x ?? 0;
    const index = Math.round(x / width);
    if (index !== currentSlide) setCurrentSlide(index);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const normalizeStateCode = (value) => {
    if (!value) return '';
    const trimmed = String(value).trim();
    if (!trimmed) return '';

    const upper = trimmed.toUpperCase();
    const byCode = US_STATES.find((item) => item.code === upper);
    if (byCode) return byCode.code;

    const byName = US_STATES.find((item) => item.name.toUpperCase() === upper);
    if (byName) return byName.code;

    return '';
  };

  const tryAutofillCityStateFromLocation = async () => {
    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const results = await Location.reverseGeocodeAsync({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
      const place = results?.[0] ?? null;
      if (!place) return;

      const nextStateCode = normalizeStateCode(place.region);
      const nextCityName = (place.city || place.subregion || '').trim();

      if (!state && nextStateCode) {
        setState(nextStateCode);
        // Trigger city fetch for the detected state
        handleSelectState(nextStateCode);
      }

      if (!city && nextCityName) {
        setCity(nextCityName);
      }
    } catch (error) {
      console.log('Location autofill failed:', error?.message ?? error);
    }
  };

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      await tryAutofillCityStateFromLocation();
      nextSlide();
    }
  };

  const requestNotificationPermission = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      nextSlide();
    }
  };

  const handleSignup = async () => {
    // Validate fields
    if (!email || !password || !firstName || !lastName || !city || !state || !age) {
      alert('Please fill in all fields');
      return;
    }

    if (!agreedToEULA) {
      alert('You must agree to the Terms of Service and Privacy Policy to continue');
      return;
    }

    try {
      // Get Firebase instances
      const auth = getFirebaseAuth();
      const db = getDb();

      if (!auth || !db) {
        alert('Firebase is not configured. Please try again later.');
        return;
      }

      // Create Firebase user account
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);

      // Upload profile image if provided
      let profileImageUrl = null;
      if (profileImage) {
        try {
          const storage = getFirebaseStorage();
          if (storage) {
            const response = await fetch(profileImage);
            const blob = await response.blob();
            const storageRef = ref(storage, `profiles/${userCredential.user.uid}/avatar.jpg`);
            await uploadBytes(storageRef, blob);
            profileImageUrl = await getDownloadURL(storageRef);
          }
        } catch (error) {
          console.log('Profile image upload failed:', error?.message ?? error);
        }
      }

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        city: city.trim(),
        state: state.trim().toUpperCase(),
        age: Number(age) || null,
        profileImageUrl,
        smsOptIn: agreedToSMS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log('✅ User account created successfully:', userCredential.user.uid);

      // Mark onboarding as complete and navigate to main app
      await AsyncStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
      navigation.replace('MainTabs');
    } catch (error) {
      console.error('❌ Signup error:', error);
      alert(error?.message || 'Failed to create account. Please try again.');
    }
  };

  const handleSelectState = async (stateCode) => {
    const nextState = String(stateCode || '').toUpperCase();
    const stateName = US_STATES.find(s => s.code === stateCode)?.name || '';

    setState(nextState);
    setIsStatePickerOpen(false);
    setCity(''); // Reset city when state changes
    setCities([]); // Clear cities while loading

    // Fetch cities from API
    try {
      const response = await fetch('https://countriesnow.space/api/v0.1/countries/state/cities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country: 'United States',
          state: stateName
        })
      });

      const data = await response.json();

      if (data.error === false && data.data && Array.isArray(data.data)) {
        const sortedCities = data.data.sort();
        console.log('State selected:', nextState, 'Cities found:', sortedCities.length);
        setCities(sortedCities);
      } else {
        console.log('No cities found in API response');
        setCities([]);
      }
    } catch (error) {
      console.error('Error fetching cities:', error);
      setCities([]);
    }
  };

  // Slide 1: Hero - Hook them immediately
  const renderHeroSlide = () => (
    <View style={styles.slide}>
      <LinearGradient
        colors={['#00F5D0', '#00D9F5', '#E8F9FD']}
        style={styles.slideGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Animated.View
          style={[
            styles.heroContent,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
            },
          ]}
        >
          <LottieView
            source={require('../../assets/animations/Wallet.json')}
            autoPlay
            loop
            style={styles.heroLottie}
          />
          <Text style={styles.heroTitle}>Become A Winner</Text>
          <Text style={styles.heroSubtitle}>
            Quick, competitive hunts with real prizes — built for students.
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>$50K+</Text>
              <Text style={styles.statLabel}>Paid Out This Month</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>10K+</Text>
              <Text style={styles.statLabel}>Active Players</Text>
            </View>
          </View>

          <TouchableOpacity onPress={nextSlide} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00D4E5', '#00E5CC']}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>Start Hunting</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 2: Step 1 - Get the drop (Notification Bell)
  const renderStep1Slide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#E8F9FD', '#D4F1F4', '#B5EAD7']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.fullScreenAnimation}>
            <LottieView
              source={require('../../assets/animations/NotificationBell.json')}
              autoPlay
              loop
              style={styles.fullScreenLottie}
            />
          </View>

          <Text style={styles.stepTitle}>Get The Drop</Text>
          <Text style={styles.stepDescription}>
            Games go live instantly. Get notified and be ready to win.
          </Text>

          <TouchableOpacity onPress={nextSlide} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#00D4E5" />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 3: Step 2 - Move fast (Running Man)
  const renderStep2Slide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#00D9F5', '#00E5CC', '#B4F8C8']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.fullScreenAnimation}>
            <LottieView
              source={require('../../assets/animations/BoyRunning.json')}
              autoPlay
              loop
              style={styles.fullScreenLottie}
            />
          </View>

          <Text style={styles.stepTitle}>Move Fast</Text>
          <Text style={styles.stepDescription}>
            Quickly get to the location and be among hundreds of winners daily.
          </Text>

          <TouchableOpacity onPress={nextSlide} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#00D4E5" />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 4: Step 3 - Claim the win (Pig Celebrating)
  const renderStep3Slide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#B4F8C8', '#00F5D0', '#00D9F5']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.fullScreenAnimation}>
            <LottieView
              source={require('../../assets/animations/PiggyBankDancing.json')}
              autoPlay
              loop
              style={styles.fullScreenLottie}
            />
          </View>

          <Text style={styles.stepTitle}>Claim The Win</Text>
          <Text style={styles.stepDescription}>
            Win big and cover your next grocery bill or gas bill.
          </Text>

          <TouchableOpacity onPress={nextSlide} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Got it!</Text>
            <Ionicons name="arrow-forward" size={20} color="#00D4E5" />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 5: Social proof - FOMO trigger
  const renderSocialProofSlide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#00D9F5', '#00F5D0', '#E8F9FD']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <Text style={styles.slideTitle}>Easily Cover Your Next Groceries</Text>

          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>😎</Text>
              </View>
              <View style={styles.testimonialInfo}>
                <Text style={styles.testimonialName}>@marcus_23</Text>
                <Text style={styles.testimonialTime}>2 hours ago</Text>
              </View>
            </View>
            <Text style={styles.testimonialText}>
              {'"Hit one on the way home. Covered gas for the week."'}
            </Text>
          </View>

          <View style={styles.testimonialCard}>
            <View style={styles.testimonialHeader}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>💅</Text>
              </View>
              <View style={styles.testimonialInfo}>
                <Text style={styles.testimonialName}>@sarah.joseph</Text>
                <Text style={styles.testimonialTime}>Yesterday</Text>
              </View>
            </View>
            <Text style={styles.testimonialText}>
              {'"Wow just won $75 — this is so much fun."'}
            </Text>
          </View>

          <View style={styles.fomoBanner}>
            <Ionicons name="trending-up" size={24} color="#00D4E5" />
            <Text style={styles.fomoText}>127 players near you are active right now</Text>
          </View>

          <TouchableOpacity onPress={nextSlide} style={styles.nextButton}>
            <Text style={styles.nextButtonText}>Next</Text>
            <Ionicons name="arrow-forward" size={20} color="#00D4E5" />
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 6: Referral hook - Make money inviting friends
  const renderReferralSlide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#00F5D0', '#00D9F5', '#E8F9FD']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.referralAnimation}>
            <LottieView
              source={require('../../assets/animations/NetworkingForAll.json')}
              autoPlay
              loop
              style={styles.referralLottie}
            />
          </View>

          <Text style={styles.slideTitle}>Invite Friends, Earn More</Text>

          <View style={styles.referralCard}>
            <Text style={styles.referralTitle}>+$5 for every 10 friends</Text>
            <Text style={styles.referralSubtitle}>
              Invite friends with your link{'\n'}Earn $5 per 10 signups{'\n'}Run it up for gas or groceries
            </Text>

            <View style={styles.referralMath}>
              <Text style={styles.mathText}>10 friends = $5</Text>
              <Text style={styles.mathText}>50 friends = $25</Text>
              <Text style={styles.mathText}>100 friends = $50</Text>
            </View>
          </View>

          <Text style={styles.referralNote}>{"(You'll get your invite link after signup)"}</Text>

          <TouchableOpacity onPress={nextSlide} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00D4E5', '#00E5CC']}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>Next</Text>
              <Ionicons name="arrow-forward" size={24} color="#FFF" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 9: Sign up form
  const renderSignupSlide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#E8F9FD', '#D4F1F4', '#B5EAD7']} style={styles.slideGradient}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            scrollEnabled={true}
          >
            <Animated.View
              style={[
                styles.formContainer,
                { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
              ]}
            >
              <Text style={styles.formTitle}>Create Your Profile</Text>

              {/* Profile Picture */}
              <TouchableOpacity onPress={pickImage} style={styles.profilePicPicker}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.profilePic} />
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

              {/* Location (dropdowns) - State first, then City */}
              <View style={styles.inputRow}>
                <View style={styles.inputHalf}>
                  <Text style={styles.inputLabel}>State</Text>
                  <TouchableOpacity
                    onPress={() => setIsStatePickerOpen(true)}
                    activeOpacity={0.85}
                    style={styles.selectInput}
                    disabled={isDismissing}
                  >
                    <Text style={[styles.selectText, !state ? styles.selectPlaceholder : null]}>
                      {state ? state : 'State'}
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
                    disabled={isDismissing || !state}
                  >
                    <Text style={[styles.selectText, !city ? styles.selectPlaceholder : null]}>
                      {city ? city : state ? 'Select city' : 'Select state first'}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="rgba(26, 26, 46, 0.6)" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Age - Picker */}
              <Text style={styles.inputLabel}>Age</Text>
              <TouchableOpacity
                onPress={() => setIsAgePickerOpen(true)}
                activeOpacity={0.85}
                style={styles.selectInput}
                disabled={isDismissing}
              >
                <Text style={[styles.selectText, !age ? styles.selectPlaceholder : null]}>
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
                <View
                  style={[
                    styles.checkbox,
                    { borderColor: '#00D4E5' },
                    agreedToEULA ? { backgroundColor: '#00D4E5' } : null,
                  ]}
                >
                  {agreedToEULA && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.eulaText}>
                  I agree to the{' '}
                  <Text
                    style={styles.eulaLink}
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
                    style={styles.eulaLink}
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
                    { borderColor: '#00D4E5' },
                    agreedToSMS ? { backgroundColor: '#00D4E5' } : null,
                  ]}
                >
                  {agreedToSMS && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.smsText}>
                  I agree to receive automated promo texts from Treasure Island City Games. Consent not a condition of purchase. Msg freq varies. Msg & data rates may apply. Reply STOP to opt out.
                </Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleSignup} activeOpacity={0.8}>
                <LinearGradient
                  colors={['#00D4E5', '#00E5CC']}
                  style={styles.primaryButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={styles.primaryButtonText}>Continue</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={dismissOnboardingToAuth}
                style={styles.skipButton}
                disabled={isDismissing}
              >
                <Text style={styles.skipButtonText}>{"Already have an account? Sign in"}</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </View>
  );

  // Slide 7: Location Permission
  const renderLocationSlide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#00F5D0', '#00D9F5', '#E8F9FD']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.permissionIcon}>
            <LottieView
              source={require('../../assets/animations/LocationFinding.json')}
              autoPlay
              loop
              style={styles.permissionLottie}
            />
          </View>

          <Text style={styles.permissionTitle}>Enable Location</Text>
          <Text style={styles.permissionText}>
            We use your location to show nearby games and keep it fair.{'\n'}
            {'\n'}
            You can change this anytime in Settings 📍
          </Text>

          <TouchableOpacity onPress={requestLocationPermission} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00D4E5', '#00E5CC']}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>Allow Location</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={nextSlide} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Not now</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  // Slide 8: Notification Permission
  const renderNotificationsSlide = () => (
    <View style={styles.slide}>
      <LinearGradient colors={['#B4F8C8', '#00F5D0', '#00D9F5']} style={styles.slideGradient}>
        <Animated.View
          style={[
            styles.content,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.permissionIcon}>
            <LottieView
              source={require('../../assets/animations/NotificationBell.json')}
              autoPlay
              loop
              style={styles.permissionLottie}
            />
          </View>

          <Text style={styles.permissionTitle}>Be First</Text>
          <Text style={styles.permissionText}>
            Games can go live at any time.{'\n'}
            {'\n'}
            {'Turn on notifications so you can catch the next drop.'}
          </Text>

          <TouchableOpacity onPress={requestNotificationPermission} activeOpacity={0.8}>
            <LinearGradient
              colors={['#00D4E5', '#00E5CC']}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>Turn On Notifications</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={nextSlide} style={styles.skipButton}>
            <Text style={styles.skipButtonText}>Not now</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: dismissAnim }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!isDismissing && currentSlide !== 8}
        onMomentumScrollEnd={onScrollEnd}
        style={styles.scrollView}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        {renderHeroSlide()}
        {renderStep1Slide()}
        {renderStep2Slide()}
        {renderStep3Slide()}
        {renderSocialProofSlide()}
        {renderReferralSlide()}
        {renderLocationSlide()}
        {renderNotificationsSlide()}
        {renderSignupSlide()}
      </ScrollView>

      {/* Progress Dots */}
      <View style={styles.dotsContainer}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
          <View key={index} style={[styles.dot, currentSlide === index && styles.activeDot]} />
        ))}
      </View>

      {/* Skip Button (only on first 6 slides) */}
      {currentSlide < 6 && (
        <TouchableOpacity onPress={skipToSignup} style={styles.skipTopButton}>
          <Text style={styles.skipTopButtonText}>Skip</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={isStatePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStatePickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsStatePickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select state</Text>
              <TouchableOpacity
                onPress={() => setIsStatePickerOpen(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="rgba(26, 26, 46, 0.7)" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={US_STATES}
              keyExtractor={(item) => item.code}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => handleSelectState(item.code)}>
                  <Text style={styles.modalItemText}>
                    {item.name} ({item.code})
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isCityPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCityPickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsCityPickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select city</Text>
              <TouchableOpacity
                onPress={() => setIsCityPickerOpen(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="rgba(26, 26, 46, 0.7)" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={cities.length > 0 ? [...cities, 'Other'] : ['Loading cities...', 'Other']}
              keyExtractor={(item, index) => `${item}-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    if (item !== 'Loading cities...') {
                      setCity(item);
                      setIsCityPickerOpen(false);
                    }
                  }}
                  disabled={item === 'Loading cities...'}
                >
                  <Text style={[styles.modalItemText, item === 'Loading cities...' && { opacity: 0.5 }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <View style={styles.modalItem}>
                  <Text style={styles.modalItemText}>No cities available</Text>
                </View>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isAgePickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsAgePickerOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsAgePickerOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => { }}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select age</Text>
              <TouchableOpacity
                onPress={() => setIsAgePickerOpen(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="rgba(26, 26, 46, 0.7)" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={Array.from({ length: 83 }, (_, i) => (18 + i).toString())}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalItem}
                  onPress={() => {
                    setAge(item);
                    setIsAgePickerOpen(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
  },
  slideGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroContent: {
    alignItems: 'center',
    width: '100%',
  },
  heroEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: 48,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 56,
    marginBottom: 16,
  },
  heroSubtitle: {
    fontSize: 20,
    color: 'rgba(26, 26, 46, 0.7)',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    marginBottom: 40,
  },
  statBox: {
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 120,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#00D4E5',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(26, 26, 46, 0.6)',
    fontWeight: '600',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
    marginRight: 8,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  slideTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 40,
  },
  stepContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  step: {
    alignItems: 'center',
  },
  stepIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  stepEmoji: {
    fontSize: 48,
  },
  stepText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  stepArrow: {
    marginVertical: 16,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00D4E5',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#00D4E5',
    marginRight: 8,
  },
  testimonialCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  testimonialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E8F9FD',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarEmoji: {
    fontSize: 24,
  },
  testimonialInfo: {
    flex: 1,
  },
  testimonialName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  testimonialTime: {
    fontSize: 12,
    color: 'rgba(26, 26, 46, 0.5)',
    marginTop: 2,
  },
  testimonialText: {
    fontSize: 15,
    color: '#1A1A2E',
    lineHeight: 22,
  },
  fomoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 32,
  },
  fomoText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginLeft: 12,
    flex: 1,
  },
  referralCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  referralTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#00D4E5',
    marginBottom: 8,
  },
  referralSubtitle: {
    fontSize: 16,
    color: '#1A1A2E',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  referralMath: {
    width: '100%',
  },
  mathText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A2E',
    textAlign: 'center',
    marginVertical: 4,
  },
  referralNote: {
    fontSize: 13,
    color: 'rgba(26, 26, 46, 0.6)',
    marginBottom: 24,
    fontStyle: 'italic',
  },
  keyboardView: {
    flex: 1,
    width: '100%',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingVertical: 40,
  },
  formContainer: {
    width: '100%',
  },
  formTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 32,
  },
  profilePicPicker: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  profilePic: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  profilePicPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  inputHalf: {
    flex: 1,
    marginHorizontal: 4,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1A1A2E',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 229, 0.2)',
  },
  selectInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 229, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    opacity: 0.6,
  },
  selectText: {
    fontSize: 16,
    color: '#1A1A2E',
    fontWeight: '600',
  },
  selectPlaceholder: {
    color: 'rgba(26, 26, 46, 0.4)',
    fontWeight: '600',
  },
  permissionIcon: {
    marginBottom: 32,
  },
  permissionIconGradient: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  permissionTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(26, 26, 46, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
  },
  skipButton: {
    marginTop: 16,
  },
  skipButtonText: {
    fontSize: 14,
    color: 'rgba(26, 26, 46, 0.5)',
    fontWeight: '600',
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(26, 26, 46, 0.2)',
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#00D4E5',
  },
  skipTopButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
  },
  skipTopButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00D4E5',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: 24,
    justifyContent: 'center',
  },
  modalCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 18,
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  modalClose: {
    padding: 6,
  },
  modalItem: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  modalItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  // Lottie animation styles
  heroLottie: {
    width: 150,
    height: 150,
    marginBottom: 24,
  },
  lottieIcon: {
    width: 100,
    height: 100,
  },
  arrowLottie: {
    width: 60,
    height: 60,
  },
  permissionLottie: {
    width: 200,
    height: 200,
  },
  fullScreenAnimation: {
    marginBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenLottie: {
    width: 280,
    height: 280,
  },
  stepTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1A1A2E',
    textAlign: 'center',
    marginBottom: 16,
  },
  stepDescription: {
    fontSize: 18,
    color: 'rgba(26, 26, 46, 0.7)',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 40,
    paddingHorizontal: 32,
    fontWeight: '600',
  },
  referralAnimation: {
    alignItems: 'center',
    marginBottom: 24,
  },
  referralLottie: {
    width: 120,
    height: 120,
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
  eulaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  eulaText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: '#1A1A2E',
  },
  eulaLink: {
    fontWeight: '600',
    textDecorationLine: 'underline',
    color: '#00D4E5',
  },
  smsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 16,
  },
  smsText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#1A1A2E',
  },
});

export default OnboardingScreen;
