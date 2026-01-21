# Firebase Data Model for HoodGames

## Overview
This document describes the complete Firebase Firestore data model for the HoodGames treasure hunt application.

---

## Firebase Services Required

1. **Firestore** - For storing game and user data
2. **Authentication** - For user sign-in and management
3. **Storage** - For storing game clue photos
4. **Cloud Messaging (FCM)** - For push notifications via Expo

### Firebase Storage Structure

Photos are organized by game ID:
```
storage/
  games/
    {gameId}/
      clue-0-{timestamp}.jpg
      clue-1-{timestamp}.jpg
      clue-2-{timestamp}.jpg
      ...
```

---

## Collections

### 0. `config` Collection

Stores app-wide configuration settings.

#### Document: `appVersion`

Controls app version requirements and force update behavior.

```typescript
{
  // Version Requirements
  minimumVersion: string,        // e.g., "1.0.5" - Users below this MUST update (force update)
  latestVersion: string,         // e.g., "1.1.0" - Latest available version (optional update prompt)
  
  // Custom Messages (optional)
  forceUpdateMessage: string | null,    // Custom message for forced updates
  optionalUpdateMessage: string | null, // Custom message for optional updates
  
  // Metadata
  updatedAt: Timestamp,
  updatedBy: string,             // Admin user ID who made the change
}
```

**Example Document:**
```json
{
  "minimumVersion": "1.0.5",
  "latestVersion": "1.1.0",
  "forceUpdateMessage": "This version is no longer supported. Please update to continue playing!",
  "optionalUpdateMessage": "A new version with exciting features is available!",
  "updatedAt": "2024-01-15T10:30:00Z",
  "updatedBy": "admin123"
}
```

**How It Works:**
- If user's app version < `minimumVersion`: Shows **unescapable** force update screen
- If user's app version < `latestVersion` but >= `minimumVersion`: Shows **skippable** update prompt
- If user's app version >= `latestVersion`: No update prompt shown

---

### 1. `games` Collection

Stores all game information including location-based and virtual games.

#### Document Structure

```typescript
{
  // Common Fields (all game types)
  type: 'location' | 'virtual',
  name: string,                    // Game name
  prizeAmount: number,              // Prize in dollars
  description: string | null,       // Game description
  city: string | null,              // Target city (required for location games)
  difficulty: 'easy' | 'medium' | 'hard',
  status: 'pending' | 'scheduled' | 'live' | 'completed' | 'inactive',
  scheduledTime: string | null,     // ISO datetime string
  createdAt: Timestamp,
  updatedAt: Timestamp,
  launchedAt: Timestamp | null,     // When game went live
  completedAt: Timestamp | null,    // When game was completed

  // Participant tracking
  participants: string[],           // Array of user IDs who joined
  winners: Array<{
    userId: string,
    position: number,               // 1st, 2nd, 3rd, etc.
    completedAt: Timestamp,
    distance?: number,              // For location games: distance from target in meters
    taps?: number,                  // For virtual games: number of taps
  }>,
  attempts: Array<{
    userId: string,
    attemptedAt: Timestamp,
    distance?: number,              // For location games
    taps?: number,                  // For virtual games
    location?: {                    // User's location at attempt
      latitude: number,
      longitude: number,
    }
  }>,

  // Location-Based Game Specific Fields
  location?: {
    latitude: number,               // Target location latitude
    longitude: number,              // Target location longitude
  },
  cluePhotos?: string[],            // Array of photo URLs (5-10 photos) displayed as slideshow
  winnerSlots?: number,             // Number of winners (default: 3)
  accuracyRadius?: number,          // Success radius in meters (default: 10)

  // Mini-Game Challenge (Optional - for location games)
  // When configured, players must complete this challenge upon arrival at the location
  miniGame?: {
    type: 'tap_count' | 'hold_duration' | 'rhythm_tap',
    config: {
      // For tap_count:
      targetTaps?: number,          // Number of taps required (default: 100)
      timeLimit?: number,           // Time limit in seconds (default: 30)
      
      // For hold_duration:
      holdDuration?: number,        // Duration to hold in milliseconds (default: 5000)
      
      // For rhythm_tap:
      bpm?: number,                 // Beats per minute (default: 120)
      requiredBeats?: number,       // Number of beats to hit (default: 10)
      toleranceMs?: number,         // Timing tolerance in ms (default: 150)
      requiredScore?: number,       // Required accuracy percentage (default: 70)
    }
  },

  // Virtual Game Specific Fields (New Battle Royale System)
  virtualGame?: {
    type: 'tap_count' | 'hold_duration' | 'rhythm_tap' | 'custom',
    config: {
      // For tap_count:
      targetTaps?: number,          // Target taps to complete (default: 100)
      timeLimit?: number,           // Time limit in seconds (default: 30)
      // For hold_duration:
      holdDuration?: number,        // Required hold time in ms (default: 5000)
      // For rhythm_tap:
      bpm?: number,                 // Beats per minute (default: 120)
      requiredBeats?: number,       // Number of beats (default: 10)
      toleranceMs?: number,         // Timing tolerance in ms (default: 150)
      requiredScore?: number,       // Required accuracy percentage (default: 70)
    },
    customGameUrl?: string,         // URL to custom HTML game (for 'custom' type)
    // Battle Royale Settings
    duration?: number,              // Competition duration in ms
    endsAt?: Timestamp,             // When competition ends (set when game goes live)
    prizeDistribution?: {           // Prize % for each position
      1: number,                    // 1st place % (default: 100)
      2: number,                    // 2nd place % (default: 60)
      3: number,                    // 3rd place % (default: 30)
    },
  },
  
  // Battle Royale Leaderboard
  leaderboard?: Array<{
    oderId: string,                 // User ID
    username: string,               // Display name
    score: number,                  // Best score (lower is better for tap_count, higher for others)
    oderdAt: Timestamp,             // When best score was achieved
    attempts: number,               // Total attempts by this user
  }>,
  
  // Battle Royale Winners (set when competition ends)
  battleRoyaleWinners?: Array<{
    oderId: string,
    username: string,
    position: number,               // 1, 2, or 3
    score: number,
    prizeAmount: number,            // Calculated prize amount
    prizePercent: number,           // Prize percentage
    claimDeadline: Timestamp,       // 30 minutes after competition ends
    claimed: boolean,
    notifiedAt: Timestamp,
  }>,

  // Legacy fields (for backwards compatibility)
  virtualType?: 'tap',              // Type of virtual game
  targetTaps?: number,              // For tap games: target number of taps (default: 1000)
}
```

#### Status Values

- **pending**: Game created but not launched. Admin can launch manually.
- **scheduled**: Game will launch automatically at `scheduledTime`.
- **live**: Game is currently active and players can participate.
- **completed**: Game has ended with winners declared.
- **inactive**: Game was cancelled or deactivated.

#### Example Location-Based Game Document

```json
{
  "type": "location",
  "name": "Downtown Treasure Hunt",
  "prizeAmount": 500,
  "description": "Find the hidden treasure in downtown!",
  "city": "San Francisco",
  "difficulty": "medium",
  "status": "live",
  "scheduledTime": null,
  "createdAt": "2024-12-24T10:00:00Z",
  "updatedAt": "2024-12-24T10:00:00Z",
  "launchedAt": "2024-12-24T10:00:00Z",
  "completedAt": null,
  "location": {
    "latitude": 37.7749,
    "longitude": -122.4194
  },
  "cluePhotos": [
    "https://storage.googleapis.com/hoodgames.appspot.com/games/abc123/clue-0.jpg",
    "https://storage.googleapis.com/hoodgames.appspot.com/games/abc123/clue-1.jpg",
    "https://storage.googleapis.com/hoodgames.appspot.com/games/abc123/clue-2.jpg",
    "https://storage.googleapis.com/hoodgames.appspot.com/games/abc123/clue-3.jpg",
    "https://storage.googleapis.com/hoodgames.appspot.com/games/abc123/clue-4.jpg"
  ],
  "winnerSlots": 3,
  "accuracyRadius": 10,
  "participants": ["user123", "user456"],
  "winners": [
    {
      "userId": "user123",
      "position": 1,
      "completedAt": "2024-12-24T10:15:00Z",
      "distance": 2.5
    }
  ],
  "attempts": [
    {
      "userId": "user456",
      "attemptedAt": "2024-12-24T10:10:00Z",
      "distance": 50.3,
      "location": {
        "latitude": 37.7750,
        "longitude": -122.4195
      }
    }
  ]
}
```

#### Example Virtual Game Document

```json
{
  "type": "virtual",
  "name": "Tap Race Championship",
  "prizeAmount": 300,
  "description": "First to 1000 taps wins!",
  "city": null,
  "difficulty": "easy",
  "status": "live",
  "scheduledTime": null,
  "createdAt": "2024-12-24T11:00:00Z",
  "updatedAt": "2024-12-24T11:00:00Z",
  "launchedAt": "2024-12-24T11:00:00Z",
  "completedAt": null,
  "virtualType": "tap",
  "targetTaps": 1000,
  "participants": ["user789", "user101"],
  "winners": [
    {
      "userId": "user789",
      "position": 1,
      "completedAt": "2024-12-24T11:05:00Z",
      "taps": 1000
    }
  ],
  "attempts": [
    {
      "userId": "user101",
      "attemptedAt": "2024-12-24T11:06:00Z",
      "taps": 1000
    }
  ]
}
```

---

### 2. `users` Collection

Stores user profile and authentication information.

#### Document Structure

```typescript
{
  email: string,
  phone: string | null,
  city: string | null,               // User's city for game notifications
  paypalEmail: string | null,
  cashAppHandle: string | null,
  pushToken: string | null,          // Expo push notification token
  pushTokenUpdatedAt: Timestamp | null,
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // User stats (optional, can be computed)
  gamesPlayed?: number,
  gamesWon?: number,
  totalEarnings?: number,
  
  // Daily win limit tracking
  totalWins?: number,                 // Total lifetime wins
  lastWinDate?: string,               // YYYY-MM-DD of last win
  lastWinGameName?: string,           // Name of last won game
  
  // Battle Royale pending winnings
  pendingWinnings?: number,           // Unclaimed prize amount
  lastBattleRoyaleWin?: {
    gameId: string,
    gameName: string,
    position: number,                 // 1, 2, or 3
    prizeAmount: number,
    claimDeadline: Timestamp,         // 30 min after competition ends
    claimed: boolean,
  },
}
```

#### Example User Document

```json
{
  "email": "player@example.com",
  "phone": "+1234567890",
  "city": "San Francisco",
  "paypalEmail": "player@paypal.com",
  "cashAppHandle": "$player",
  "pushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "pushTokenUpdatedAt": "2024-12-24T10:00:00Z",
  "createdAt": "2024-12-20T08:00:00Z",
  "updatedAt": "2024-12-24T10:00:00Z",
  "gamesPlayed": 5,
  "gamesWon": 2,
  "totalEarnings": 800
}
```

---

## Game Flow

### Location-Based Game

1. **Admin creates game** with status `pending` or `scheduled`
2. **Admin launches game** (or automatic launch if scheduled)
   - Status changes to `live`
   - Push notifications sent to all users in the target city
3. **Players receive notification** and open app
4. **Game screen takes over** with clues displayed
5. **Players navigate** to location using proximity gradient (white → green)
6. **Players submit attempt** when they think they're at the location
   - App checks distance from target using GPS
   - If within `accuracyRadius`, player wins!
   - Otherwise, attempt is recorded with distance
7. **Winners are tracked** up to `winnerSlots` limit
8. **Game completes** when all winner slots are filled
   - Status changes to `completed`
   - Winners displayed on leaderboard

### Virtual Game (Tap Race)

1. **Admin creates game** with type `virtual`
2. **Admin launches game**
   - Status changes to `live`
   - Push notifications sent (city-specific or all users)
3. **Players receive notification** and open app
4. **Game screen displays** tap counter
5. **Players tap frantically** to reach `targetTaps`
6. **First player to reach target** wins
   - Winner recorded with completion time
   - Other attempts recorded
7. **Game completes** automatically when winner is declared

---

## Queries

### Get Live Games in User's City
```javascript
const gamesQuery = query(
  collection(db, 'games'),
  where('status', '==', 'live'),
  where('city', '==', userCity)
);
```

### Get Pending Games (Admin)
```javascript
const gamesQuery = query(
  collection(db, 'games'),
  where('status', '==', 'pending'),
  orderBy('createdAt', 'desc')
);
```

### Get User's Game History
```javascript
const gamesQuery = query(
  collection(db, 'games'),
  where('participants', 'array-contains', userId)
);
```

### Get Top Players (Leaderboard)
```javascript
const usersQuery = query(
  collection(db, 'users'),
  orderBy('totalEarnings', 'desc'),
  limit(10)
);
```

---

## Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users can read their own data, admins can write
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Games are readable by all authenticated users
    // Only admins can create/update games
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;

      // Players can update participants and attempts
      allow update: if request.auth != null &&
        request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['participants', 'attempts', 'winners', 'updatedAt']);
    }
  }
}
```

---

## Mini-Game Challenges

### Overview

Mini-game challenges are optional features for location-based games. When configured, players must complete a mini-game challenge when they arrive at the treasure location (within the accuracy radius) before they can win.

### Benefits

- **No App Store Updates**: Mini-games are rendered via WebView using HTML files stored in Firebase Storage
- **Easy Configuration**: Admins can configure challenge type and difficulty per game
- **Dynamic Updates**: HTML files can be updated without app deployment

### Available Mini-Game Types

#### 1. Tap Count (`tap_count`)
Players must tap the screen a specified number of times within a time limit.

**Config Options:**
- `targetTaps`: Number of taps required (default: 100)
- `timeLimit`: Time limit in seconds (default: 30)

#### 2. Hold Duration (`hold_duration`)
Players must hold a button for a specified duration without releasing.

**Config Options:**
- `holdDuration`: Duration to hold in milliseconds (default: 5000 = 5 seconds)

#### 3. Rhythm Tap (`rhythm_tap`)
Players must tap in sync with a beat pattern.

**Config Options:**
- `bpm`: Beats per minute (default: 120)
- `requiredBeats`: Number of beats to hit (default: 10)
- `toleranceMs`: Timing tolerance in milliseconds (default: 150)
- `requiredScore`: Required accuracy percentage to win (default: 70)

### Firebase Storage Structure for Mini-Games

```
storage/
  mini-games/
    tap_count.html      # Tap X times game
    hold_duration.html  # Hold for X seconds game
    rhythm_tap.html     # Tap on beat game
```

### Adding New Mini-Game Types

To add a new mini-game type:

1. Create a new HTML file with the game logic
2. Upload to Firebase Storage under `mini-games/`
3. Update `MiniGameWebView.jsx` to handle the new type
4. Update `AdminScreen.jsx` to add configuration UI
5. Update `LiveGameScreen.jsx` to pass correct config

---

## Photo Clue Implementation

### Admin Side (✅ Complete)
- Admins can select 5-10 photos from their camera roll
- Photos are uploaded to Firebase Storage when game is created
- Each photo is stored in a unique path: `games/{gameId}/clue-{index}-{timestamp}.jpg`
- Download URLs are stored in the `cluePhotos` array field

### Player Side (TODO)
- Photos should be displayed as an auto-advancing slideshow
- Each photo shows for 3-5 seconds before transitioning to the next
- Players can swipe to manually navigate between photos
- Photos should fill the screen with proper aspect ratio handling

---

## Next Implementation Steps

1. **LiveGameScreen.jsx** - Create the game play screen
   - Location-based: Show photo slideshow, gradient feedback, proximity tracking
   - Virtual: Show tap counter and progress
   - Implement photo slideshow with auto-advance and manual navigation

2. **Game Participant Tracking** - Update games collection when users join

3. **Winner Calculation** - Logic to determine and record winners

4. **Leaderboard** - Display top players and game history

5. **Notification Handling** - Handle incoming game notifications and auto-navigate to game screen

---

## Firebase Storage Security Rules (Recommended)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Game photos - admins can write, anyone authenticated can read
    match /games/{gameId}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```
