# HoodGames / Treasure Island - AI Onboarding Guide

**Version**: 1.0.0
**Last Updated**: January 2026
**Project**: Treasure Island City Games (HoodGames)
**Purpose**: Comprehensive onboarding documentation for AI tools and assistants

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Quick Start Guide](#2-quick-start-guide)
3. [Project Structure](#3-project-structure)
4. [Tech Stack](#4-tech-stack)
5. [Core Features](#5-core-features)
6. [Screen-by-Screen Breakdown](#6-screen-by-screen-breakdown)
7. [Key Components](#7-key-components)
8. [Data Models & Firebase](#8-data-models--firebase)
9. [Authentication & State Management](#9-authentication--state-management)
10. [Navigation Architecture](#10-navigation-architecture)
11. [Platform-Specific Considerations](#11-platform-specific-considerations)
12. [Development Workflow](#12-development-workflow)
13. [Build & Deployment](#13-build--deployment)
14. [Common Tasks & Patterns](#14-common-tasks--patterns)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Project Overview

### What is HoodGames?

**HoodGames (Treasure Island City Games)** is a location-based, real-time treasure hunt gaming platform where players:
- 🗺️ Compete to find virtual treasure at real-world locations
- 💰 Win real cash prizes by being first to find the treasure
- 📸 View photo clues that reveal the treasure location
- 🏆 Track their progress on live leaderboards
- 🌍 Play games in their city

### Platform Support
- **iOS**: Native app (React Native)
- **Android**: Native app (React Native)
- **Web**: Progressive Web App (PWA) - fully installable

### Key Technologies
- **Frontend**: React Native 0.81.5 + Expo 54
- **Backend**: Firebase (Firestore, Auth, Storage)
- **Maps**: react-native-maps (native), MapLibre GL (web)
- **UI**: Custom gradient-based design system

### Repository
- **Location**: `/Users/radokuzor@pgatourhq.com/Documents/HoodGames`
- **Git Branch (Main)**: `main`
- **Git Branch (PWA Work)**: `pwa-work`
- **Package Manager**: npm
- **Current Version**: 1.0.4

---

## 2. Quick Start Guide

### First-Time Setup

```bash
# Navigate to project
cd /Users/radokuzor@pgatourhq.com/Documents/HoodGames

# Install dependencies
npm install

# Start development server
npx expo start

# Press 'w' for web, 'i' for iOS, 'a' for Android
```

### Key Files to Understand First

1. **App.js** - Main entry point, navigation setup
2. **src/config/firebase.js** - Firebase initialization
3. **src/config/theme.config.js** - Theme definitions
4. **src/screens/** - All screen components
5. **FIREBASE_DATA_MODEL.md** - Complete database schema

### Environment Setup

**Required**: `.env` file with Firebase credentials (already configured)

```env
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyB6_JmheMEXnCwAQwBUMzBu6KAssbvGQXQ
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=hoodgames-61259.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=hoodgames-61259
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=hoodgames-61259.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=867389178952
EXPO_PUBLIC_FIREBASE_APP_ID=1:867389178952:web:f3531f53a9cb0fb040447d
```

---

## 3. Project Structure

```
HoodGames/
│
├── App.js                          # Main entry point (navigation setup)
├── app.json                        # Expo configuration
├── app.config.js                   # Dynamic config (env vars)
├── metro.config.js                 # Metro bundler configuration
├── eas.json                        # EAS Build configuration
├── package.json                    # Dependencies
├── .env                            # Firebase credentials
│
├── app/                            # Expo Router (web PWA routing)
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx
│   │   └── explore.tsx
│   ├── _layout.tsx
│   ├── modal.tsx
│   ├── privacy.tsx
│   └── terms.tsx
│
├── src/
│   ├── config/
│   │   ├── firebase.js             # Firebase init & helpers
│   │   └── theme.config.js         # 8 theme definitions
│   │
│   ├── context/
│   │   └── ThemeContext.jsx        # Global theme state
│   │
│   ├── screens/
│   │   ├── OnboardingScreen.jsx    # First-time user flow
│   │   ├── AuthScreen.jsx          # Sign up / Login
│   │   ├── HomeScreen.jsx          # Media feed (like TikTok)
│   │   ├── CommunityScreen.jsx     # Leaderboards & map
│   │   ├── ProfileScreen.jsx       # User account & settings
│   │   ├── LiveGameScreen.jsx      # Active game play
│   │   ├── AdminScreen.jsx         # Game creation & management
│   │   ├── AdminMediaUploadScreen.jsx  # Photo upload
│   │   ├── EditProfileScreen.jsx   # Edit profile
│   │   ├── HowToPlayScreen.jsx     # Instructions
│   │   ├── PrivacyScreen.jsx       # Privacy policy
│   │   └── TermsScreen.jsx         # Terms of service
│   │
│   ├── components/
│   │   ├── GradientComponents.jsx  # Reusable gradient UI
│   │   ├── UnifiedMapView.jsx      # Cross-platform maps
│   │   └── WebResponsiveContainer.jsx
│   │
│   └── notificationService.js      # Push notification setup
│
├── assets/
│   ├── images/                     # Icons, splash screens
│   ├── animations/                 # Lottie files
│   └── sounds/                     # Audio files
│
├── ios/                            # iOS native code
├── android/                        # Android native code
├── dist/                           # Built web app
└── web/                            # Web-specific assets
```

---

## 4. Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.1.0 | UI library |
| **React Native** | 0.81.5 | Mobile framework |
| **Expo** | ~54.0.30 | Build tooling & services |
| **TypeScript** | ~5.9.2 | Type safety (minimal usage) |

### Navigation
| Package | Purpose |
|---------|---------|
| @react-navigation/native | Native navigation |
| @react-navigation/native-stack | Stack navigator |
| @react-navigation/bottom-tabs | Tab bar |
| expo-router | File-based routing (web) |

### Backend (Firebase)
| Service | Purpose |
|---------|---------|
| Firebase Auth | Email/password authentication |
| Cloud Firestore | Real-time database |
| Cloud Storage | Photo storage |
| **SDK Version** | ^11.1.0 |

### Maps & Location
| Package | Platform | Purpose |
|---------|----------|---------|
| react-native-maps | iOS/Android | Native maps |
| maplibre-gl | Web | Web maps |
| react-map-gl | Web | Map component wrapper |
| expo-location | All | GPS/Geolocation |

### UI & Styling
| Package | Purpose |
|---------|---------|
| expo-linear-gradient | Gradient backgrounds |
| @expo/vector-icons | Ionicons library |
| expo-image | Advanced image handling |
| lottie-react-native | Animations |

### Native Features
| Package | Purpose | Platform |
|---------|---------|----------|
| expo-sensors | Magnetometer (compass) | Native only |
| expo-haptics | Vibration feedback | Native only |
| expo-av | Audio/Video playback | Native only |
| expo-image-picker | Camera/photo library | Native only |
| expo-notifications | Push notifications | All |

### Persistence
| Package | Purpose |
|---------|---------|
| @react-native-async-storage/async-storage | Local storage (cross-platform) |

---

## 5. Core Features

### 1. Location-Based Treasure Hunts
**How it works**:
- Admin creates game with GPS coordinates and photo clues
- Players view clue photos and navigate to location
- Real-time distance calculation to treasure
- First X players to reach location within accuracy radius win
- Winner slots configurable (default: 3)

**Key Files**:
- `AdminScreen.jsx` - Game creation
- `LiveGameScreen.jsx` - Active gameplay
- `CommunityScreen.jsx` - Live game map

### 2. Virtual Tap Games
**How it works**:
- Admin creates virtual tap race game
- Players tap screen rapidly to reach target tap count
- First X players to reach target win
- No GPS required

**Key Files**:
- `AdminScreen.jsx` - Game creation
- `LiveGameScreen.jsx` - Tap gameplay

### 3. Real-Time Leaderboards
**Features**:
- Top earners by total winnings
- Recent winners display
- City-specific filtering
- Real-time Firestore updates

**Key File**: `CommunityScreen.jsx`

### 4. Media Feed
**Features**:
- Vertical scrolling video/image feed
- User-generated content
- Comment system
- Block/hide functionality
- Real-time updates

**Key File**: `HomeScreen.jsx`

### 5. User Profiles & Settings
**Features**:
- Profile editing
- Theme selection (8 themes)
- Notification settings
- Balance tracking
- Payout redemption ($25 minimum)

**Key File**: `ProfileScreen.jsx`

### 6. Push Notifications
**Features**:
- Game start notifications
- Winner announcements
- Custom messages from admin
- EAS Push Notification service

**Key File**: `notificationService.js`

### 7. Progressive Web App (PWA)
**Features**:
- Installable web app
- Offline capabilities
- Browser localStorage persistence
- Web-optimized map component

**Key Files**:
- `app/` directory (Expo Router)
- `UnifiedMapView.jsx` (cross-platform maps)

---

## 6. Screen-by-Screen Breakdown

### OnboardingScreen.jsx
**Purpose**: First-time user experience walkthrough
**File Size**: 22.5 KB
**Key Features**:
- Multi-step slides with Lottie animations
- Skip functionality
- Persisted completion with AsyncStorage key: `hasSeenOnboarding_v4`
- Beautiful gradient UI

**State Management**:
```javascript
const [currentStep, setCurrentStep] = useState(0)
```

**Persistence**:
```javascript
await AsyncStorage.setItem('hasSeenOnboarding_v4', 'true')
```

---

### AuthScreen.jsx
**Purpose**: User authentication (Sign up / Login)
**File Size**: 26.2 KB
**Key Features**:
- Tab-based UI (Login / Sign Up)
- Email/password authentication
- Profile photo upload (native & web)
- User data collection: firstName, lastName, phone, state, city, age
- EULA & SMS opt-in checkboxes
- Push notification registration

**Sign Up Flow**:
```javascript
// 1. Create Firebase Auth user
const userCredential = await createUserWithEmailAndPassword(auth, email, password)

// 2. Create Firestore user document
await setDoc(doc(db, 'users', userCredential.user.uid), {
  email,
  firstName,
  lastName,
  city,
  stateCode,
  age,
  phone,
  profileImageUrl,
  agreedToEULA: true,
  agreedToSMS: agreeToSMS,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
})

// 3. Register push notifications
const pushToken = await registerForPushNotificationsAsync()
await updateDoc(userRef, { pushToken, pushTokenUpdatedAt: serverTimestamp() })
```

**Web-Specific**: HTML5 File input for photo upload instead of expo-image-picker

---

### HomeScreen.jsx
**Purpose**: Social media feed (vertical scrolling content)
**File Size**: 22.4 KB
**Key Features**:
- Vertical card-based video/image feed
- Swipe navigation (FlatList)
- Comment modal overlay
- User blocking system
- Hidden video tracking
- Real-time Firestore listeners

**State Management**:
```javascript
const [videos, setVideos] = useState([])
const [currentIndex, setCurrentIndex] = useState(0)
const [showComments, setShowComments] = useState(false)
const [blockedUsers, setBlockedUsers] = useState([])
```

**Real-Time Updates**:
```javascript
useEffect(() => {
  const unsubscribe = onSnapshot(
    query(collection(db, 'media'), orderBy('createdAt', 'desc')),
    (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
    }
  )
  return () => unsubscribe()
}, [])
```

**Blocking System**:
- Blocked user IDs stored in AsyncStorage: `blockedHomeMediaUsers_v1`
- Videos from blocked users filtered from feed

---

### CommunityScreen.jsx
**Purpose**: Leaderboards, recent winners, live game map
**File Size**: 41.6 KB
**Key Features**:
- Top 5 leaderboard (by total earnings)
- Recent winners display (last 3)
- Active treasure drops on map
- City-specific game filtering
- Unified map component (UnifiedMapView)
- Tab navigation: Live Games, Leaderboard, Winners

**Tab Structure**:
```javascript
const [selectedTab, setSelectedTab] = useState('liveGames')
// Options: 'liveGames', 'leaderboard', 'winners'
```

**Leaderboard Query**:
```javascript
const leaderboardQuery = query(
  collection(db, 'users'),
  orderBy('totalEarnings', 'desc'),
  limit(10)
)
```

**Map Implementation**:
- Native: `react-native-maps` with Apple/Google Maps
- Web: MapLibre GL with CartoDB basemap
- Markers show live game locations
- Clickable markers navigate to LiveGameScreen

---

### LiveGameScreen.jsx
**Purpose**: Active game play screen
**File Size**: 39.9 KB
**Key Features**:
- **Location Games**: GPS tracking, distance calculation, compass
- **Virtual Games**: Tap counter, tap animation
- Photo carousel (auto-advancing clues)
- Proximity gradient (white → green as you approach)
- Winner announcement with confetti
- Haptic feedback
- Real-time attempt tracking

**State Management**:
```javascript
const [distance, setDistance] = useState(null)
const [currentLocation, setCurrentLocation] = useState(null)
const [heading, setHeading] = useState(null)
const [hasSubmitted, setHasSubmitted] = useState(false)
const [taps, setTaps] = useState(0)
const [photoIndex, setPhotoIndex] = useState(0)
```

**Distance Calculation** (Location Games):
```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
```

**Winner Detection**:
```javascript
// Location game: Check if within accuracy radius
if (distance <= game.accuracyRadius) {
  handleWinnerCheck()
}

// Virtual game: Check if reached target taps
if (taps >= game.targetTaps) {
  handleWinnerCheck()
}
```

**Winner Slot Management** (Transaction):
```javascript
await runTransaction(db, async (transaction) => {
  const gameDoc = await transaction.get(gameRef)
  const currentWinners = gameDoc.data().winners || []

  if (currentWinners.length < game.winnerSlots) {
    transaction.update(gameRef, {
      winners: arrayUnion({
        userId: user.uid,
        position: currentWinners.length + 1,
        completedAt: serverTimestamp(),
        distance: distance // or taps for virtual
      })
    })
  }
})
```

**Photo Carousel**:
- Auto-advances every 5 seconds
- Swipeable with gesture controls
- Pinch-to-zoom on native

**Compass Feature** (Native Only):
- Uses `expo-sensors` magnetometer
- Shows 7 seconds, hides 5 seconds (configurable per user)
- Arrow rotates based on device heading
- Points toward treasure location

---

### ProfileScreen.jsx
**Purpose**: User account management and settings
**File Size**: 26.6 KB
**Key Features**:
- User stats: balance, earnings, wins, friends
- Account balance display
- Payout redemption ($25 minimum)
- Theme switcher (8 themes)
- Notification settings toggle
- Location settings toggle
- Account deletion with confirmation

**Real-Time User Data**:
```javascript
useEffect(() => {
  if (!user) return
  const userRef = doc(db, 'users', user.uid)
  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      setUserData(docSnap.data())
    }
  })
  return () => unsubscribe()
}, [user])
```

**Payout Logic**:
```javascript
const handlePayout = async () => {
  if (userData.balance < 25) {
    Alert.alert('Insufficient Balance', 'You need at least $25 to request a payout')
    return
  }

  // Create payout request document
  await addDoc(collection(db, 'payoutRequests'), {
    userId: user.uid,
    amount: userData.balance,
    email: userData.paypalEmail || userData.email,
    requestedAt: serverTimestamp(),
    status: 'pending'
  })

  // Reset user balance
  await updateDoc(doc(db, 'users', user.uid), {
    balance: 0
  })
}
```

**Account Deletion**:
- Deletes Firestore user document
- Deletes Firebase Auth account
- Removes profile photo from Storage
- Navigates back to Auth screen

---

### AdminScreen.jsx
**Purpose**: Admin panel for game creation and management
**File Size**: 64.7 KB
**Key Features**:
- Password-protected access (`ADMIN_PASSWORD = '1234'`)
- Create location-based games
- Create virtual tap games
- Map-based location picker
- Multi-photo clue upload (5-10 photos)
- Game status management
- Winner slot configuration
- Game list with filtering
- Redemption tracking UI

**Game Types**:
1. **Location-Based**:
   - Set GPS coordinates
   - Upload 5-10 clue photos
   - Configure accuracy radius (default: 10m)
   - Set winner slots (default: 3)

2. **Virtual Tap**:
   - Set target tap count (default: 1000)
   - No GPS required
   - Set winner slots (default: 3)

**Location Selection Flow**:
```javascript
// 1. Render map (UnifiedMapView)
<UnifiedMapView
  region={mapRegion}
  onPress={(e) => setSelectedLocation(e.coordinate)}
>
  {selectedLocation && (
    <UnifiedMarker coordinate={selectedLocation} />
  )}
</UnifiedMapView>

// 2. Save location to game
await addDoc(collection(db, 'games'), {
  type: 'location',
  location: {
    latitude: selectedLocation.latitude,
    longitude: selectedLocation.longitude
  },
  // ... other fields
})
```

**Photo Upload Flow**:
```javascript
// Navigate to AdminMediaUploadScreen
navigation.navigate('AdminMediaUpload', {
  gameId: newGameDoc.id
})
```

**Game Status Lifecycle**:
```
pending → scheduled → live → completed
```

---

### AdminMediaUploadScreen.jsx
**Purpose**: Batch photo upload for game clues
**File Size**: 21.5 KB
**Key Features**:
- Multi-file photo picker
- Batch upload to Firebase Storage
- Upload progress tracking
- Cancel upload functionality

**Upload Flow**:
```javascript
// 1. Pick photos
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsMultipleSelection: true,
  quality: 0.8
})

// 2. Upload to Firebase Storage
for (const photo of photos) {
  const response = await fetch(photo.uri)
  const blob = await response.blob()

  const storageRef = ref(
    storage,
    `games/${gameId}/clue-${index}-${Date.now()}.jpg`
  )

  await uploadBytes(storageRef, blob)
  const downloadURL = await getDownloadURL(storageRef)

  // 3. Update game document
  await updateDoc(doc(db, 'games', gameId), {
    cluePhotos: arrayUnion(downloadURL)
  })
}
```

---

### EditProfileScreen.jsx
**Purpose**: Edit user profile information
**File Size**: 13.3 KB
**Key Features**:
- Update firstName, lastName, city
- Profile photo management
- Firestore profile updates

---

### HowToPlayScreen.jsx
**Purpose**: Game instructions and rules
**File Size**: 6.6 KB

---

### PrivacyScreen.jsx
**Purpose**: Privacy policy display
**File Size**: 7.1 KB

---

### TermsScreen.jsx
**Purpose**: Terms of service display
**File Size**: 5.8 KB

---

## 7. Key Components

### GradientComponents.jsx
**File Path**: `src/components/GradientComponents.jsx`
**Purpose**: Reusable gradient-based UI components

**Components**:

#### 1. GradientBackground
```javascript
<GradientBackground gradientType="background">
  {children}
</GradientBackground>
```
- Full-screen gradient overlay
- Props: `children`, `style`, `gradientType`
- Types: `background`, `primary`, `secondary`, `accent`

#### 2. GradientCard
```javascript
<GradientCard style={{ padding: 20 }}>
  {children}
</GradientCard>
```
- Card container with gradient
- Includes shadow effects for light themes

#### 3. GradientButton
```javascript
<GradientButton
  gradientType="accent"
  onPress={() => console.log('Pressed')}
>
  <Text>Click Me</Text>
</GradientButton>
```
- Button with gradient background
- Configurable gradient type

**Theme Integration**:
```javascript
const { theme } = useTheme()
<LinearGradient colors={theme.gradients.accent} />
```

---

### UnifiedMapView.jsx
**File Path**: `src/components/UnifiedMapView.jsx`
**Purpose**: Cross-platform map component

**Platform-Specific Implementation**:
```javascript
// Web
if (Platform.OS === 'web') {
  const MapGL = require('react-map-gl/dist/maplibre')
  ReactMapGL = MapGL.Map
  MapLibreMarker = MapGL.Marker
}

// Native
else {
  const MapModule = require('react-native-maps')
  NativeMapView = MapModule.default
  NativeMarker = MapModule.Marker
  NativeCircle = MapModule.Circle
  NativeCallout = MapModule.Callout
}
```

**Unified API**:
```javascript
<UnifiedMapView
  style={{ flex: 1 }}
  region={{
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }}
  onRegionChange={(region) => console.log(region)}
  onPress={(e) => console.log(e.coordinate)}
>
  <UnifiedMarker
    coordinate={{ latitude: 37.78825, longitude: -122.4324 }}
    title="Treasure Here"
  />

  <UnifiedCircle
    center={{ latitude: 37.78825, longitude: -122.4324 }}
    radius={10}
    fillColor="rgba(0,212,229,0.2)"
  />
</UnifiedMapView>
```

**Important Notes**:
- `react-native-maps` is excluded from web bundle via metro.config.js
- Web uses free MapLibre GL basemap (CartoDB positron)
- Native uses platform-native maps (Apple Maps on iOS, Google Maps on Android)

---

### WebResponsiveContainer.jsx
**File Path**: `src/components/WebResponsiveContainer.jsx`
**Purpose**: Web-specific responsive layout wrapper

---

## 8. Data Models & Firebase

### Firestore Collections

#### `games` Collection
**Document ID**: Auto-generated
**Schema**:
```javascript
{
  // Common Fields
  type: 'location' | 'virtual',
  name: string,
  prizeAmount: number,
  description: string | null,
  city: string | null,
  difficulty: 'easy' | 'medium' | 'hard',
  status: 'pending' | 'scheduled' | 'live' | 'completed' | 'inactive',
  scheduledTime: string | null,        // ISO datetime
  createdAt: Timestamp,
  updatedAt: Timestamp,
  launchedAt: Timestamp | null,
  completedAt: Timestamp | null,

  // Participant Tracking
  participants: string[],              // User IDs
  winners: [{
    userId: string,
    position: number,                  // 1, 2, 3, etc.
    completedAt: Timestamp,
    distance?: number,                 // Location games only
    taps?: number                      // Virtual games only
  }],
  attempts: [{
    userId: string,
    attemptedAt: Timestamp,
    distance?: number,
    taps?: number,
    location?: { latitude, longitude }
  }],

  // Location-Based Game Fields
  location?: {
    latitude: number,
    longitude: number
  },
  cluePhotos?: string[],               // Firebase Storage URLs
  winnerSlots?: number,                // Default: 3
  accuracyRadius?: number,             // Meters, default: 10

  // Virtual Game Fields
  virtualType?: 'tap',
  targetTaps?: number                  // Default: 1000
}
```

**Example Location Game**:
```json
{
  "type": "location",
  "name": "Downtown Treasure Hunt",
  "prizeAmount": 500,
  "description": "Find the hidden treasure!",
  "city": "San Francisco",
  "difficulty": "medium",
  "status": "live",
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "cluePhotos": [
    "https://storage.googleapis.com/.../clue-0.jpg",
    "https://storage.googleapis.com/.../clue-1.jpg"
  ],
  "winnerSlots": 3,
  "accuracyRadius": 10,
  "participants": ["user1", "user2"],
  "winners": [{
    "userId": "user1",
    "position": 1,
    "completedAt": "2024-12-24T10:15:00Z",
    "distance": 2.5
  }],
  "createdAt": "2024-12-24T08:00:00Z"
}
```

---

#### `users` Collection
**Document ID**: Firebase Auth UID
**Schema**:
```javascript
{
  email: string,
  phone: string | null,
  firstName: string,
  lastName: string,
  city: string | null,
  stateCode: string | null,           // e.g., "CA"
  age: string | null,
  profileImageUrl: string | null,
  paypalEmail: string | null,
  cashAppHandle: string | null,
  pushToken: string | null,
  pushTokenUpdatedAt: Timestamp | null,
  agreedToEULA: boolean,
  agreedToSMS: boolean,
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // Optional Stats (maintained by app)
  gamesPlayed?: number,
  gamesWon?: number,
  totalEarnings?: number,
  balance?: number
}
```

---

#### `media` Collection
**Document ID**: Auto-generated
**Schema**:
```javascript
{
  userId: string,
  userName: string,
  userProfileImage: string,
  mediaUrl: string,                   // Firebase Storage URL
  mediaType: 'video' | 'image',
  caption: string,
  likes: number,
  comments: [{
    userId: string,
    userName: string,
    text: string,
    createdAt: Timestamp
  }],
  createdAt: Timestamp
}
```

---

#### `payoutRequests` Collection
**Document ID**: Auto-generated
**Schema**:
```javascript
{
  userId: string,
  amount: number,
  email: string,                      // PayPal or user email
  requestedAt: Timestamp,
  status: 'pending' | 'completed' | 'cancelled',
  completedAt?: Timestamp
}
```

---

### Firebase Storage Structure
```
storage/
├── games/
│   └── {gameId}/
│       ├── clue-0-{timestamp}.jpg
│       ├── clue-1-{timestamp}.jpg
│       └── ...
└── users/
    └── {userId}/
        └── profile-image.jpg
```

---

### Common Firestore Queries

#### Get Live Games in City
```javascript
const liveGamesQuery = query(
  collection(db, 'games'),
  where('status', '==', 'live'),
  where('city', '==', userCity)
)

const unsubscribe = onSnapshot(liveGamesQuery, (snapshot) => {
  const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
})
```

#### Get Top 10 Leaderboard
```javascript
const leaderboardQuery = query(
  collection(db, 'users'),
  orderBy('totalEarnings', 'desc'),
  limit(10)
)

const snapshot = await getDocs(leaderboardQuery)
const leaderboard = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
```

#### Get User Profile (Real-Time)
```javascript
const userRef = doc(db, 'users', userId)
const unsubscribe = onSnapshot(userRef, (docSnap) => {
  if (docSnap.exists()) {
    setUserData(docSnap.data())
  }
})
```

#### Submit Game Attempt (Transaction)
```javascript
await runTransaction(db, async (transaction) => {
  const gameRef = doc(db, 'games', gameId)
  const gameDoc = await transaction.get(gameRef)
  const currentWinners = gameDoc.data().winners || []

  // Check if user already won
  const alreadyWon = currentWinners.some(w => w.userId === userId)
  if (alreadyWon) return

  // Check if winner slots available
  if (currentWinners.length < winnerSlots) {
    transaction.update(gameRef, {
      winners: arrayUnion({
        userId,
        position: currentWinners.length + 1,
        completedAt: serverTimestamp(),
        distance // or taps for virtual
      })
    })

    // Update user stats
    transaction.update(doc(db, 'users', userId), {
      gamesWon: increment(1),
      totalEarnings: increment(prizeAmount / winnerSlots),
      balance: increment(prizeAmount / winnerSlots)
    })
  }
})
```

---

## 9. Authentication & State Management

### Authentication Architecture

#### Firebase Auth Setup
**File**: `src/config/firebase.js`

```javascript
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth'
import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'

export function getFirebaseAuth() {
  if (Platform.OS === 'web') {
    // Web: Browser localStorage persistence
    auth = initializeAuth(app, {
      persistence: browserLocalPersistence
    })
  } else {
    // Native: AsyncStorage persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    })
  }
  return auth
}
```

#### Auth Flow in App.js
```javascript
const [user, setUser] = useState(null)
const [initializing, setInitializing] = useState(true)

useEffect(() => {
  const firebaseAuth = getFirebaseAuth()

  const unsubscribe = onAuthStateChanged(firebaseAuth, (nextUser) => {
    setUser(nextUser)
    setInitializing(false)
  })

  return () => unsubscribe()
}, [])

// Navigation
if (initializing) return <LoadingScreen />
if (!user) return <AuthScreen />
return <MainTabs />
```

---

### State Management Strategy

#### 1. Global State (React Context)

**ThemeContext** (`src/context/ThemeContext.jsx`):
```javascript
const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  const [currentTheme, setCurrentTheme] = useState('mintFresh')

  useEffect(() => {
    // Load theme from AsyncStorage
    AsyncStorage.getItem('@app_theme').then(theme => {
      if (theme) setCurrentTheme(theme)
    })
  }, [])

  const changeTheme = async (themeName) => {
    setCurrentTheme(themeName)
    await AsyncStorage.setItem('@app_theme', themeName)
  }

  const theme = themes[currentTheme]

  return (
    <ThemeContext.Provider value={{ theme, currentTheme, changeTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
```

**Usage**:
```javascript
import { useTheme } from '../context/ThemeContext'

function MyComponent() {
  const { theme, changeTheme } = useTheme()

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Hello</Text>
    </View>
  )
}
```

---

#### 2. Local State (useState)

Each screen manages its own state:
```javascript
function HomeScreen() {
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)

  // ... component logic
}
```

---

#### 3. Persistence (AsyncStorage)

**Common Keys**:
- `hasSeenOnboarding_v4` - Onboarding completion (boolean string)
- `@app_theme` - Selected theme (string)
- `blockedHomeMediaUsers_v1` - Blocked user IDs (JSON array)

**Usage**:
```javascript
// Save
await AsyncStorage.setItem('hasSeenOnboarding_v4', 'true')

// Load
const value = await AsyncStorage.getItem('hasSeenOnboarding_v4')
if (value === 'true') {
  // User has seen onboarding
}

// JSON data
await AsyncStorage.setItem('blockedHomeMediaUsers_v1', JSON.stringify(['user1', 'user2']))
const blockedUsers = JSON.parse(await AsyncStorage.getItem('blockedHomeMediaUsers_v1') || '[]')
```

---

#### 4. Real-Time Data (Firestore Listeners)

**Pattern**:
```javascript
useEffect(() => {
  const q = query(collection(db, 'games'), where('status', '==', 'live'))

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const games = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    setGames(games)
  })

  // Cleanup listener on unmount
  return () => unsubscribe()
}, [])
```

**Important**: Always return cleanup function to prevent memory leaks

---

### Theme System

#### 8 Available Themes
1. **mintFresh** (default) - Light mint/cyan gradient
2. **sunset** - Orange/purple dark gradient
3. **ocean** - Blue/teal dark gradient
4. **aurora** - Pink/peachy dark gradient
5. **neon** - Bright cyan/purple dark gradient
6. **cosmic** - Deep purple/magenta dark gradient
7. **forest** - Green gradient
8. (8th theme name not listed in search results)

#### Theme Structure
**File**: `src/config/theme.config.js`

```javascript
export const themes = {
  mintFresh: {
    colors: {
      background: '#E6F4FE',
      surface: '#FFFFFF',
      text: '#1A1A1A',
      textSecondary: '#666666',
      border: '#E0E0E0',
      // ...
    },
    gradients: {
      background: ['#E6F4FE', '#FFFFFF'],
      primary: ['#00D4E5', '#00B4C5'],
      secondary: ['#4A90E2', '#357ABD'],
      accent: ['#00D4E5', '#4A90E2'],
    },
    isDark: false
  },
  sunset: {
    colors: {
      background: '#1A1625',
      surface: '#2D2640',
      text: '#FFFFFF',
      textSecondary: 'rgba(255,255,255,0.7)',
      // ...
    },
    gradients: {
      background: ['#1A1625', '#2D2640'],
      primary: ['#FF6B6B', '#FF8E53'],
      secondary: ['#A855F7', '#6366F1'],
      accent: ['#FF6B6B', '#A855F7'],
    },
    isDark: true
  },
  // ... other themes
}
```

---

## 10. Navigation Architecture

### Stack Navigator (Root)
**File**: `App.js`

```javascript
<Stack.Navigator>
  {/* Conditional Screens */}
  {!hasSeenOnboarding ? (
    <Stack.Screen name="Onboarding" component={OnboardingScreen} />
  ) : !user ? (
    <Stack.Screen name="Auth" component={AuthScreen} />
  ) : (
    <>
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen name="LiveGame" component={LiveGameScreen} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="AdminMediaUpload" component={AdminMediaUploadScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="HowToPlay" component={HowToPlayScreen} />
      <Stack.Screen name="Terms" component={TermsScreen} />
      <Stack.Screen name="Privacy" component={PrivacyScreen} />
    </>
  )}
</Stack.Navigator>
```

### Tab Navigator (MainTabs)
```javascript
function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  )
}
```

### Navigation Methods

#### Navigate to Screen
```javascript
navigation.navigate('LiveGame', { gameId: 'abc123' })
```

#### Go Back
```javascript
navigation.goBack()
```

#### Replace Screen
```javascript
navigation.replace('MainTabs')
```

#### Reset Stack
```javascript
navigation.reset({
  index: 0,
  routes: [{ name: 'MainTabs' }]
})
```

#### Navigate to Tab
```javascript
navigation.navigate('MainTabs', {
  screen: 'Home'
})
```

---

## 11. Platform-Specific Considerations

### iOS vs Android vs Web

#### Feature Availability

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| **GPS/Location** | ✅ | ✅ | ✅ (browser permission) |
| **Push Notifications** | ✅ | ✅ | ✅ (limited) |
| **Camera** | ✅ | ✅ | ❌ (HTML5 input only) |
| **Haptics** | ✅ | ✅ | ❌ |
| **Compass** | ✅ | ✅ | ❌ |
| **Maps** | ✅ (Apple) | ✅ (Google) | ✅ (MapLibre GL) |
| **Audio/Video** | ✅ | ✅ | ❌ (native only) |
| **Offline Storage** | ✅ (AsyncStorage) | ✅ (AsyncStorage) | ✅ (localStorage) |

---

### Platform Detection

```javascript
import { Platform } from 'react-native'

if (Platform.OS === 'web') {
  // Web-specific code
} else if (Platform.OS === 'ios') {
  // iOS-specific code
} else if (Platform.OS === 'android') {
  // Android-specific code
}
```

---

### Conditional Imports

**Example** (`UnifiedMapView.jsx`):
```javascript
let NativeMapView, NativeMarker
let ReactMapGL, MapLibreMarker

if (Platform.OS === 'web') {
  const MapGL = require('react-map-gl/dist/maplibre')
  ReactMapGL = MapGL.Map
  MapLibreMarker = MapGL.Marker
} else {
  const MapModule = require('react-native-maps')
  NativeMapView = MapModule.default
  NativeMarker = MapModule.Marker
}
```

---

### Metro Bundler Configuration
**File**: `metro.config.js`

```javascript
// Exclude react-native-maps from web bundle
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'empty' }
  }
  return context.resolveRequest(context, moduleName, platform)
}
```

**Why**: react-native-maps is native-only and causes build errors on web. This configuration stubs it out for web builds.

---

### Web-Specific Considerations

#### File Uploads
Native uses `expo-image-picker`, web uses HTML5 File input:
```javascript
if (Platform.OS === 'web') {
  // Create HTML file input
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = (e) => {
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      setImage(event.target.result)
    }
    reader.readAsDataURL(file)
  }
  input.click()
} else {
  // Native image picker
  const result = await ImagePicker.launchImageLibraryAsync()
}
```

#### PWA Manifest
**File**: `app.json` (web section)
```json
{
  "web": {
    "output": "static",
    "bundler": "metro",
    "display": "standalone",
    "startUrl": "/",
    "themeColor": "#00D4E5",
    "backgroundColor": "#00D4E5",
    "name": "Treasure Island City Games",
    "shortName": "Treasure"
  }
}
```

---

## 12. Development Workflow

### Starting Development

```bash
# Start Expo dev server
npx expo start

# Platform options
w - Open in web browser
i - Open in iOS simulator
a - Open in Android emulator
r - Reload app
j - Open Expo Go app
```

---

### Common Development Tasks

#### Add a New Screen
1. Create new file in `src/screens/NewScreen.jsx`
2. Add to `App.js` Stack.Navigator:
   ```javascript
   <Stack.Screen name="NewScreen" component={NewScreen} />
   ```
3. Navigate from other screens:
   ```javascript
   navigation.navigate('NewScreen', { param: 'value' })
   ```

---

#### Add a New Firestore Collection
1. Create documents using `addDoc`:
   ```javascript
   import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

   await addDoc(collection(db, 'newCollection'), {
     field1: 'value1',
     field2: 'value2',
     createdAt: serverTimestamp()
   })
   ```

2. Query collection:
   ```javascript
   const q = query(collection(db, 'newCollection'), where('field1', '==', 'value1'))
   const snapshot = await getDocs(q)
   ```

---

#### Add a New Theme
1. Edit `src/config/theme.config.js`
2. Add new theme object:
   ```javascript
   export const themes = {
     // ... existing themes
     myNewTheme: {
       colors: { /* ... */ },
       gradients: { /* ... */ },
       isDark: true
     }
   }
   ```
3. Theme automatically available in ThemeContext

---

#### Debug Firebase Issues
```javascript
// Enable Firestore logging
import { enableIndexedDbPersistence } from 'firebase/firestore'

// Check if Firebase is initialized
const app = getFirebaseApp()
console.log('Firebase app:', app)

const auth = getFirebaseAuth()
console.log('Firebase auth:', auth)

const db = getFirestore(app)
console.log('Firestore:', db)
```

---

### Testing Locally

#### Test on Physical Device
1. Start dev server: `npx expo start`
2. Install Expo Go app on device
3. Scan QR code from terminal

#### Test Web PWA
1. Build: `npx expo export --platform web`
2. Serve: `npx serve dist`
3. Open: http://localhost:3000

#### Test iOS Simulator
```bash
# Start simulator
npx expo start
# Press 'i' in terminal
```

#### Test Android Emulator
```bash
# Start emulator
npx expo start
# Press 'a' in terminal
```

---

## 13. Build & Deployment

### Web Build (PWA)

#### Build for Production
```bash
# Export static web build
npx expo export --platform web

# Output directory: dist/
```

#### Deploy to Vercel (Current Setup)
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod --yes
```

**Environment Variables** (set in Vercel dashboard):
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

**Live URL**: https://treasure-island-city-games.vercel.app

---

### Native Builds (EAS)

#### iOS Production Build
```bash
eas build --platform ios --profile production
```

**Requirements**:
- Apple Developer account
- Bundle identifier: `com.kingkuz.hoodgames`
- Team ID: `F2B5QD97WH`

#### Android Production Build
```bash
eas build --platform android --profile production
```

**Requirements**:
- Google Play Console account
- Package name: `com.kingkuz.hoodgames`

---

### Deployment Checklist

- [ ] Update version in `app.json` (version, buildNumber, versionCode)
- [ ] Test all platforms (iOS, Android, Web)
- [ ] Verify Firebase credentials
- [ ] Check environment variables
- [ ] Test authentication flow
- [ ] Test location permissions
- [ ] Test push notifications
- [ ] Build and deploy
- [ ] Test deployed version

---

## 14. Common Tasks & Patterns

### Real-Time Data Updates

```javascript
useEffect(() => {
  const q = query(
    collection(db, 'games'),
    where('status', '==', 'live')
  )

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const games = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))
    setGames(games)
  })

  return () => unsubscribe()
}, [])
```

---

### File Upload to Firebase Storage

```javascript
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'

async function uploadImage(uri, path) {
  // Convert URI to blob
  const response = await fetch(uri)
  const blob = await response.blob()

  // Upload to Storage
  const storageRef = ref(storage, path)
  await uploadBytes(storageRef, blob)

  // Get download URL
  const downloadURL = await getDownloadURL(storageRef)
  return downloadURL
}

// Usage
const profileImageUrl = await uploadImage(
  imageUri,
  `users/${userId}/profile-image.jpg`
)
```

---

### Transaction-Based Updates

```javascript
import { runTransaction, doc } from 'firebase/firestore'

await runTransaction(db, async (transaction) => {
  const gameRef = doc(db, 'games', gameId)
  const gameDoc = await transaction.get(gameRef)

  if (!gameDoc.exists()) {
    throw new Error('Game does not exist')
  }

  const data = gameDoc.data()

  // Perform checks and updates atomically
  if (data.winners.length < data.winnerSlots) {
    transaction.update(gameRef, {
      winners: arrayUnion({
        userId,
        position: data.winners.length + 1,
        completedAt: serverTimestamp()
      })
    })
  }
})
```

---

### Distance Calculation (Haversine Formula)

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3 // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Distance in meters
}
```

---

### GPS Location Tracking

```javascript
import * as Location from 'expo-location'

async function startLocationTracking() {
  // Request permissions
  const { status } = await Location.requestForegroundPermissionsAsync()
  if (status !== 'granted') {
    Alert.alert('Permission denied', 'Location permission is required')
    return
  }

  // Get current location
  const location = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.High
  })

  console.log('Current location:', location.coords)

  // Watch location changes
  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 1000,
      distanceInterval: 1
    },
    (newLocation) => {
      console.log('Location updated:', newLocation.coords)
    }
  )

  // Cleanup
  return () => subscription.remove()
}
```

---

### Push Notification Registration

```javascript
import * as Notifications from 'expo-notifications'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'

async function registerPushNotifications(userId) {
  // Request permission
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') {
    console.log('Notification permission denied')
    return
  }

  // Get Expo push token
  const token = await Notifications.getExpoPushTokenAsync({
    projectId: 'c0491a95-bb5a-42d2-a435-3a938bb3634b'
  })

  // Save to Firestore
  await updateDoc(doc(db, 'users', userId), {
    pushToken: token.data,
    pushTokenUpdatedAt: serverTimestamp()
  })

  return token.data
}
```

---

## 15. Troubleshooting

### Common Issues

#### 1. Web Build Error: "Importing native-only module"
**Solution**: Check `metro.config.js` has proper `resolveRequest` configuration to stub native modules on web.

```javascript
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return { type: 'empty' }
  }
  return context.resolveRequest(context, moduleName, platform)
}
```

---

#### 2. Firebase Auth Not Persisting
**Solution**: Verify persistence is configured correctly in `firebase.js`:

```javascript
if (Platform.OS === 'web') {
  auth = initializeAuth(app, {
    persistence: browserLocalPersistence
  })
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  })
}
```

---

#### 3. Location Permission Denied
**iOS**: Check `app.json` has `NSLocationWhenInUseUsageDescription`
**Android**: Check `app.json` has `ACCESS_FINE_LOCATION` permission
**Web**: Browser will prompt user automatically

---

#### 4. Push Notifications Not Working
- Verify EAS project ID in `app.json`: `"projectId": "c0491a95-bb5a-42d2-a435-3a938bb3634b"`
- Check notification permissions granted
- Verify push token saved to Firestore
- Test with Expo Push Notification Tool: https://expo.dev/notifications

---

#### 5. Maps Not Rendering
**Native**: Verify Google Maps API key (Android) and Apple Maps entitlements (iOS)
**Web**: Check browser console for MapLibre GL errors, verify network access

---

#### 6. Firestore Permission Denied
- Check Firebase Console security rules
- Verify user is authenticated
- Check document path is correct

---

### Debug Commands

```bash
# Clear cache
npx expo start --clear

# Check bundle size
npx expo export --platform web --dump-assetmap

# iOS logs
npx react-native log-ios

# Android logs
npx react-native log-android

# Check Expo config
npx expo config
```

---

## Additional Resources

### Documentation
- **Firebase Data Model**: `/Users/radokuzor@pgatourhq.com/Documents/HoodGames/FIREBASE_DATA_MODEL.md`
- **Web Deployment**: `/Users/radokuzor@pgatourhq.com/Documents/HoodGames/WEB_DEPLOYMENT.md`
- **Testing Guide**: `/Users/radokuzor@pgatourhq.com/Documents/HoodGames/TESTING_GUIDE.md`

### External Links
- **Expo Docs**: https://docs.expo.dev
- **React Navigation**: https://reactnavigation.org
- **Firebase Docs**: https://firebase.google.com/docs
- **React Native Maps**: https://github.com/react-native-maps/react-native-maps
- **MapLibre GL**: https://maplibre.org

---

## Summary

HoodGames is a **sophisticated, cross-platform treasure hunt gaming application** built with:

✅ **React Native 0.81 + Expo 54**
✅ **Firebase backend** (Auth, Firestore, Storage)
✅ **Cross-platform maps** (react-native-maps + MapLibre GL)
✅ **Real-time features** (Firestore listeners, live leaderboards)
✅ **Beautiful gradient UI** with 8 themes
✅ **PWA support** with offline capabilities
✅ **Location-based gaming** with GPS tracking
✅ **Push notifications** via EAS

**For AI Assistants**: Start by understanding the navigation flow in `App.js`, then explore individual screens based on the feature you're working on. Always check platform-specific code paths when working with native features.

**Key Development Principles**:
- Use real-time Firestore listeners for live data
- Always return cleanup functions in useEffect
- Test on all platforms (iOS, Android, Web)
- Follow gradient-based UI patterns from theme config
- Use UnifiedMapView for cross-platform maps
- Handle platform-specific features gracefully

---

**End of Onboarding Documentation**
