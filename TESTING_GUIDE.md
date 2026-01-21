# HoodGames - Complete Testing Guide

## Overview
This guide covers end-to-end testing of the Grab The Cash application with the newly implemented features.

---

## What's Been Implemented

### ✅ LiveGameScreen (Complete)
- **Photo Carousel**: Auto-advancing slideshow (4 seconds per photo) with manual swipe
- **Proximity Gradient**: White → green background based on distance to location
- **Distance Tracking**: Real-time GPS tracking showing "X miles away"
- **Odds Meter**: Dynamic calculation showing "X% chance of winning"
- **Full-Screen Photos**: Tap any photo to view full-screen with zoom capability
- **Winner Detection**: Automatic winner celebration with confetti and sounds
- **Leaderboard**: Top 10 players display after game completion
- **Auto-Join**: Users automatically join games when they open the screen
- **X Button**: Exit button appears only after game completes

### ✅ CommunityScreen Updates (Complete)
- **Live Games Map**: Real-time display of all live games
- **Interactive Markers**: Tap game markers on map to join
- **Live Games List**: Card-based list of active games below map
- **Live Indicators**: Pulsing red badges showing game is active
- **Game Stats**: Participant count and winner progress displayed

### ✅ Admin Panel (Previously Completed)
- Photo upload system (5-10 photos per game)
- Firebase Storage integration
- Real-time game list with status filtering
- Launch functionality with notifications

---

## Testing Workflow

### Prerequisites
1. Firebase project configured with:
   - ✅ Firestore enabled
   - ✅ Firebase Storage enabled
   - ✅ Authentication enabled
   - ✅ Cloud Messaging (FCM) configured
2. Expo development environment set up
3. Physical device or simulator with:
   - Location permissions granted
   - Camera roll access granted
   - Notification permissions granted

---

## Step-by-Step Testing

### 1. Admin Game Creation Flow

**Test**: Create a new location-based game with photos

1. **Start the app**:
   ```bash
   npm start
   ```

2. **Sign in as admin**:
   - Use your admin credentials
   - Navigate to Admin panel (from Profile screen)

3. **Create a location-based game**:
   - Select "Location Based" game type
   - Fill in game details:
     - Name: "Test Cash Hunt"
     - Prize Amount: 500
     - City: Your current city
     - Difficulty: Medium

4. **Add photos**:
   - Tap "Add Photos" button
   - Select 5-10 photos from camera roll
   - Verify photos appear in grid with preview
   - Remove and re-add photos if needed

5. **Set location**:
   - Tap on map to set target location
   - Note: Set a location you can physically reach for testing
   - Or set a nearby location (within walking distance)

6. **Configure settings**:
   - Winner Slots: 3
   - Accuracy Radius: 10 meters

7. **Create game**:
   - Tap "Create Game" button
   - Watch "Uploading photos..." progress
   - Wait for success message
   - Verify game appears in "Pending" list

**Expected Results**:
- ✅ Photos upload to Firebase Storage
- ✅ Game document created in Firestore with `cluePhotos` array
- ✅ Game appears in admin's pending games list
- ✅ Form resets after creation

---

### 2. Game Launch Flow

**Test**: Launch the game and send notifications

1. **In Admin panel**:
   - Find your newly created game in the list
   - Tap the "Launch" button (rocket icon)
   - Confirm the launch

2. **Verify**:
   - Game status changes to "live"
   - Game appears with green "LIVE" badge
   - Notification sent to all users in the target city

**Expected Results**:
- ✅ Game status updates to "live" in real-time
- ✅ Users receive push notifications
- ✅ Game immediately available for play

---

### 3. Community Tab - Live Games Map

**Test**: View live games on the map

1. **Navigate to Community tab**:
   - Tap "Community" in bottom navigation

2. **Select "Map" tab**:
   - See "🗺️ Live Games" header
   - Observe live game count badge (e.g., "1 Live")

3. **View map markers**:
   - Red pulsing markers = live games
   - Green markers = completed games
   - Blue/purple markers = past drops (mock data)

4. **Interact with live game marker**:
   - Tap on a red live game marker
   - See callout with game details:
     - Game name
     - Prize amount and city
     - Winner progress (e.g., "0 / 3 Winners")
     - "Tap to join!" message
   - Tap marker again to join game

5. **Scroll down to see Active Games list**:
   - View cards for each live game
   - See participant count and winner progress
   - Tap any card to join that game

**Expected Results**:
- ✅ Live games appear on map in real-time
- ✅ Marker tap navigates to LiveGameScreen
- ✅ Game cards display accurate real-time data
- ✅ Map centers on first live game location

---

### 4. LiveGameScreen - Playing the Game

**Test**: Complete gameplay experience

#### 4A. Initial Load
1. **Enter game**:
   - Tap live game from Community map or card
   - Watch loading screen briefly

2. **Observe screen layout**:
   - Photo carousel at top (400px height)
   - Game info below: name, prize amount
   - Distance display: "X miles away"
   - Odds meter with progress bar
   - Submit button at bottom
   - Winners count

**Expected Results**:
- ✅ User auto-joins game (added to `participants` array)
- ✅ Photos load and display correctly
- ✅ GPS tracking starts automatically

#### 4B. Photo Carousel
1. **Watch auto-advance**:
   - Photos change every 4 seconds automatically
   - Smooth scroll animation
   - Photo indicators update (dots at bottom)

2. **Manual navigation**:
   - Swipe left/right to change photos manually
   - Indicators update immediately

3. **Full-screen view**:
   - Tap any photo
   - Photo takes over entire screen
   - Pinch to zoom (native Image behavior)
   - Tap X button (top-right) to exit

**Expected Results**:
- ✅ Auto-advance works smoothly
- ✅ Manual swipe interrupts auto-advance temporarily
- ✅ Full-screen modal displays correctly
- ✅ Zoom gestures work

#### 4C. Proximity Tracking
1. **Initial state (far from location)**:
   - Background: White or light color
   - Distance: "X miles away"
   - Odds: Low percentage (e.g., "5% chance of winning")

2. **Move closer** (or test by updating game location):
   - Background gradually shifts to green
   - Distance decreases: "2.3 miles away" → "0.5 miles away"
   - Odds increase: "5%" → "25%" → "70%"

3. **Very close** (within 100 meters):
   - Background very green
   - Distance: "0.1 miles away" or less
   - Odds: 90%+
   - Submit button changes color to bright green

4. **At location** (within accuracy radius):
   - Background fully green
   - Distance: "50 feet away" or similar
   - Odds: 95-100%
   - Submit button glowing green

**Expected Results**:
- ✅ Gradient interpolation smooth (RGB blending)
- ✅ Distance updates every 2-5 seconds
- ✅ Odds calculation makes sense
- ✅ Haversine formula accurate

#### 4D. Submitting Attempts
1. **Submit while far away**:
   - Tap "📍 Submit Attempt" button
   - Haptic feedback occurs
   - Attempt recorded in Firebase
   - Check Firestore: `attempts` array has new entry

2. **Submit when close (not within radius)**:
   - Same as above
   - You're not marked as winner
   - Distance recorded

3. **Submit when at location** (within accuracy radius):
   - Tap "🎯 Claim Your Spot!" button
   - Immediate haptic feedback
   - Winner celebration triggers!

**Expected Results**:
- ✅ All attempts logged with location and distance
- ✅ Winner detection works correctly
- ✅ Can't become winner if slots full

#### 4E. Winner Celebration
When you become a winner:

1. **Visual effects**:
   - Confetti cannon fires from top
   - 200 pieces of confetti fall
   - Title scales up with animation

2. **Audio**:
   - Celebration sound plays
   - (Note: Make sure volume is on!)

3. **Haptic feedback**:
   - Success haptic pattern

4. **UI changes**:
   - Winner badge appears: "🎉 You Won!"
   - Position shown (1st, 2nd, or 3rd)
   - Submit button disabled

**Expected Results**:
- ✅ Confetti animation runs for 5 seconds
- ✅ Sound plays successfully
- ✅ Badge displays correct position
- ✅ Can't submit more attempts after winning

#### 4F. Game Completion & Leaderboard
After all winner slots filled:

1. **Game status changes**:
   - Backend marks game as "completed"
   - 2-second delay

2. **Leaderboard appears**:
   - "🏆 Game Complete!" header
   - Winners section:
     - 🥇 1st place
     - 🥈 2nd place
     - 🥉 3rd place
   - Top 10 Attempts section:
     - Non-winners ranked by distance
     - Closest players shown
   - Your row highlighted in green

3. **Exit button appears**:
   - X button in top-right corner (white circle)
   - Only visible after game completes
   - Tap to return to Community screen

**Expected Results**:
- ✅ Leaderboard data accurate
- ✅ Your position highlighted
- ✅ Exit button functional
- ✅ Graceful return to previous screen

---

## Edge Cases to Test

### GPS & Location
- [ ] **No location permission**: Handle gracefully with warning
- [ ] **GPS disabled**: Show message to enable location
- [ ] **Poor GPS signal**: App should still function, show last known location
- [ ] **Airplane mode**: Test behavior when offline

### Photos
- [ ] **No photos in game**: Graceful handling (shouldn't crash)
- [ ] **Single photo**: Carousel still works, no auto-advance
- [ ] **Large photos**: Upload and display without crashes
- [ ] **Slow network**: Photos load progressively

### Game State
- [ ] **Join game mid-play**: User can join after others started
- [ ] **All slots filled**: New players see "No slots remaining"
- [ ] **Game ends while playing**: Leaderboard appears immediately
- [ ] **Multiple attempts**: User can submit multiple times
- [ ] **Duplicate winner**: System prevents same user winning twice

### Concurrent Users
- [ ] **Multiple users**: 3+ people playing same game
- [ ] **Race condition**: Two users reaching location simultaneously
- [ ] **Real-time updates**: All users see winner count update

---

## Firebase Verification

### Check Firestore Documents

**Game Document** (`games/{gameId}`):
```javascript
{
  type: "location",
  name: "Test Cash Hunt",
  prizeAmount: 500,
  status: "live",  // changes to "completed"
  location: {
    latitude: 37.7749,
    longitude: -122.4194
  },
  cluePhotos: [
    "https://storage.googleapis.com/.../clue-0-1234567890.jpg",
    "https://storage.googleapis.com/.../clue-1-1234567891.jpg",
    // ... more photo URLs
  ],
  participants: ["user123", "user456"],  // grows as users join
  winners: [
    {
      userId: "user123",
      position: 1,
      completedAt: Timestamp,
      distance: 2.5
    }
  ],
  attempts: [
    {
      userId: "user456",
      attemptedAt: Timestamp,
      distance: 50.3,
      location: { latitude, longitude }
    }
  ],
  winnerSlots: 3,
  accuracyRadius: 10
}
```

### Check Firebase Storage

Navigate to: **Storage** > **games** > **{gameId}** >
- `clue-0-{timestamp}.jpg`
- `clue-1-{timestamp}.jpg`
- etc.

Verify:
- [ ] Photos uploaded successfully
- [ ] Files accessible via URLs
- [ ] Correct folder structure

---

## Common Issues & Solutions

### Issue: Photos not uploading
**Solution**:
- Check Firebase Storage is enabled
- Verify storage security rules allow writes
- Check camera roll permissions granted

### Issue: Location not updating
**Solution**:
- Verify location permissions granted
- Check device GPS is enabled
- Try on physical device (simulators can be unreliable)

### Issue: Confetti not showing
**Solution**:
- Verify `react-native-confetti` installed correctly
- Check ref is properly assigned
- Test on physical device (better performance)

### Issue: Sound not playing
**Solution**:
- Verify `expo-av` installed
- Check device volume is up
- Ensure celebration.mp3 file exists (placeholder currently)
- Test on physical device

### Issue: Winner not detected
**Solution**:
- Verify distance calculation is correct
- Check `accuracyRadius` value (default 10 meters)
- Confirm `winners` array not full
- Check Firebase permissions allow writes

### Issue: App crashes on game load
**Solution**:
- Check game document exists in Firestore
- Verify all required fields present
- Check console for error messages
- Ensure Firebase SDK initialized

---

## Performance Metrics

### Expected Performance:
- **Photo carousel**: 60 FPS, smooth scrolling
- **GPS updates**: Every 2-5 seconds
- **Proximity calculation**: < 10ms
- **Firebase writes**: < 500ms
- **Photo upload**: 1-3 seconds per photo
- **Initial load**: < 2 seconds

### Monitor For:
- Memory leaks (check via React DevTools)
- Battery drain (GPS can be intensive)
- Network usage (photos are largest factor)
- Frame drops during animations

---

## Testing Checklist

### Admin Features
- [ ] Create location-based game
- [ ] Upload 5-10 photos successfully
- [ ] Set location on map
- [ ] Configure game settings
- [ ] Launch game
- [ ] View real-time game list updates

### Community Features
- [ ] View live games on map
- [ ] Tap map markers to join games
- [ ] See live game cards
- [ ] Navigate from map to game

### LiveGame Features
- [ ] Photos display and auto-advance
- [ ] Manual photo swipe works
- [ ] Full-screen photo viewer
- [ ] GPS tracking active
- [ ] Distance updates in real-time
- [ ] Proximity gradient changes
- [ ] Odds meter updates
- [ ] Submit attempt button works
- [ ] Winner detection accurate
- [ ] Celebration plays (confetti, sound, haptic)
- [ ] Leaderboard displays correctly
- [ ] Exit button appears after completion

### Edge Cases
- [ ] No location permission
- [ ] Poor GPS signal
- [ ] Game already full
- [ ] Multiple concurrent users
- [ ] Network interruption
- [ ] App backgrounded during game

---

## Next Steps After Testing

1. **Fix any bugs** found during testing
2. **Optimize performance** if needed
3. **Add real celebration sound** (replace placeholder)
4. **Implement push notifications** fully
5. **Add user profiles** to leaderboard
6. **Create game history** feature
7. **Add payment integration** for prizes
8. **Implement chat/social** features

---

## Success Criteria

The testing is successful when:
- ✅ Admin can create and launch games without errors
- ✅ Players can view live games on map
- ✅ GPS tracking works accurately
- ✅ Photos display correctly in carousel
- ✅ Proximity gradient changes smoothly
- ✅ Winner detection is accurate
- ✅ Celebrations trigger properly
- ✅ Leaderboard shows correct data
- ✅ No crashes or major bugs
- ✅ Performance is smooth (60 FPS)

---

## Support

If you encounter issues:
1. Check console logs for error messages
2. Verify Firebase configuration
3. Test on physical device (not just simulator)
4. Review this testing guide for solutions
5. Check FIREBASE_DATA_MODEL.md for data structure
6. Review PHOTO_CLUES_IMPLEMENTATION.md for photo features

---

**Happy Testing! 🎮🏆**
