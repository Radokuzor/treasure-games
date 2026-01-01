# Codex Vibe Coder Instructions - HoodGames App Integration

## CRITICAL RULE
DO NOT MODIFY ANY STYLING, COLORS, GRADIENTS, OR LAYOUTS IN THE PROVIDED FILES.
Your job is integration only.

---

## STEP 1: Install Dependencies

Run this command in the hoodgames root directory:

```bash
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/native-stack react-native-screens react-native-safe-area-context expo-linear-gradient expo-av react-native-maps @react-native-async-storage/async-storage
```

Then run:
```bash
npx expo install react-native-screens react-native-safe-area-context expo-linear-gradient expo-av react-native-maps
```

---

## STEP 2: Create Folder Structure

Create these folders in your hoodgames root directory:

```bash
mkdir src
mkdir src/components
mkdir src/screens
mkdir src/config
mkdir src/context
```

---

## STEP 3: Move Files to Correct Locations

Move files from `example app/` folder to these exact locations:

```
hoodgames/
├── App.js (REPLACE existing with example app/App.js)
├── src/
│   ├── config/
│   │   └── theme.config.js (from example app/theme.config.js)
│   ├── context/
│   │   └── ThemeContext.jsx (from example app/ThemeContext.jsx)
│   ├── components/
│   │   └── GradientComponents.jsx (from example app/GradientComponents.jsx)
│   └── screens/
│       ├── AuthScreen.jsx (from example app/AuthScreen.jsx)
│       ├── HomeScreen.jsx (from example app/HomeScreen.jsx)
│       ├── CommunityScreen.jsx (from example app/CommunityScreen.jsx)
│       ├── ProfileScreen.jsx (from example app/ProfileScreen.jsx)
│       ├── AdminScreen.jsx (from example app/AdminScreen.jsx)
│       └── LiveGameScreen.jsx (from example app/LiveGameScreen.jsx)
```

---

## STEP 4: Update Import Paths in App.js

Open the NEW App.js (that you just moved to root) and update ALL imports to:

```javascript
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AdminScreen from './src/screens/AdminScreen';
import LiveGameScreen from './src/screens/LiveGameScreen';
```

---

## STEP 5: Update Import Paths in All Screen Files

### In AuthScreen.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientButton } from '../components/GradientComponents';
```

### In HomeScreen.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
import { GradientBackground } from '../components/GradientComponents';
```

### In CommunityScreen.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
```

### In ProfileScreen.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
```

### In AdminScreen.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
import { GradientBackground, GradientCard } from '../components/GradientComponents';
```

### In LiveGameScreen.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
```

---

## STEP 6: Update Import Paths in Context and Components

### In ThemeContext.jsx:
```javascript
import { THEMES, DEFAULT_THEME } from '../config/theme.config';
```

### In GradientComponents.jsx:
```javascript
import { useTheme } from '../context/ThemeContext';
```

---

## STEP 7: Update app.json

Add these configurations to your existing app.json:

```json
{
  "expo": {
    "plugins": [
      "expo-av"
    ],
    "ios": {
      "infoPlist": {
        "NSLocationWhenInUseUsageDescription": "HoodGames uses your location to help you find treasure hunts nearby.",
        "NSCameraUsageDescription": "HoodGames uses the camera to upload profile pictures and videos."
      }
    },
    "android": {
      "permissions": [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA"
      ]
    }
  }
}
```

---

## STEP 8: Run the App

```bash
npm start
```

Then press `i` for iOS or `a` for Android.

---

## WHAT YOU SHOULD SEE

✅ App launches with gradient background
✅ Theme selector works on profile page
✅ Bottom navigation with 3 tabs
✅ All screens navigate properly
✅ No styling errors

---

## BACKEND INTEGRATION POINTS (FOR LATER)

### AuthScreen.jsx - Line 55
```javascript
const handleAuth = () => {
  // ADD FIREBASE AUTH HERE
};
```

### HomeScreen.jsx - Line 24
```javascript
const SAMPLE_VIDEOS = [
  // REPLACE WITH FIRESTORE QUERY
];
```

### CommunityScreen.jsx - Lines 16, 30, 50
```javascript
// REPLACE MOCK DATA WITH FIRESTORE QUERIES
```

### ProfileScreen.jsx - Line 46
```javascript
const stats = {
  // FETCH FROM FIRESTORE USER DOCUMENT
};
```

### AdminScreen.jsx - Line 25
```javascript
const handleCreateGame = () => {
  // ADD FIRESTORE GAME CREATION
};
```

### LiveGameScreen.jsx - Line 22
```javascript
// REPLACE WITH REAL GEOLOCATION
import * as Location from 'expo-location';
```

---

## SUMMARY

1. Install dependencies
2. Create src/ folder structure
3. Move files from example app/ to src/
4. Update ALL import paths exactly as shown above
5. Update app.json
6. Run npm start

DO NOT CHANGE ANY OTHER CODE. UI IS COMPLETE.
