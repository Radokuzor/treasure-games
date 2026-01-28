# Auto-Launch Scheduled Games

## Overview

The app automatically launches scheduled games when their scheduled time arrives using **client-side polling**. This means games will auto-launch as long as at least one user has the app open.

## How It Works

### 1. Creating a Scheduled Game
- Admin creates a game and sets a `scheduledTime` using the date/time picker
- Game is saved with `status: 'scheduled'`
- Game appears in the "Upcoming Games" tab

### 2. Auto-Launch Mechanism
- **Location**: `src/screens/CommunityScreen.jsx`
- **Frequency**: Checks every 30 seconds
- **Trigger**: When `scheduledTime <= currentTime`
- **Action**: Updates game status from `'scheduled'` to `'live'`

### 3. What Happens When a Game Launches
```javascript
{
  status: 'live',                    // Changed from 'scheduled'
  launchedAt: serverTimestamp(),     // Launch timestamp
  startsAt: serverTimestamp(),       // Game start time recorded
  updatedAt: serverTimestamp(),      // Last update time
  'virtualGame.endsAt': Date         // End time (for virtual games)
}
```

For virtual games, the `endsAt` is calculated as:
```javascript
endsAt = now + game.virtualGame.duration
```

### 4. User Experience
- Game automatically moves from "Upcoming Games" to "Live Games" tab
- All users see the game become available in real-time
- No manual intervention needed

## Technical Details

### Polling Logic
```javascript
// Runs every 30 seconds
upcomingGames.forEach(async (game) => {
  const scheduledDate = new Date(game.scheduledTime.seconds * 1000);
  
  if (scheduledDate <= now) {
    // Prepare update data
    const updateData = {
      status: 'live',
      launchedAt: serverTimestamp(),
      startsAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // For virtual games, calculate end time
    if (game.type === 'virtual' && game.virtualGame?.duration) {
      const endsAt = new Date(Date.now() + game.virtualGame.duration);
      updateData['virtualGame.endsAt'] = endsAt;
    }
    
    // Launch the game
    await updateDoc(gameRef, updateData);
  }
});
```

### Requirements
- ✅ At least one user must have the app open
- ✅ User must be on any screen (doesn't have to be Community screen)
- ✅ Works on all platforms (iOS, Android, Web)
- ✅ No additional Firebase costs
- ✅ No Firebase Blaze plan required

### Limitations
- ⚠️ Games won't launch if no users have the app open
- ⚠️ Up to 30-second delay after scheduled time
- ⚠️ Requires active user session

## Monitoring

### Check if Auto-Launch is Working
Look for these console logs:
```
🚀 Auto-launching scheduled game: [Game Name] ([Game ID])
✅ Successfully launched game: [Game Name]
```

### Troubleshooting

**Game didn't launch:**
1. Check if anyone had the app open at scheduled time
2. Verify `scheduledTime` is in the correct format
3. Check console for error messages
4. Ensure Firebase permissions allow game updates

**Manual Launch:**
If auto-launch fails, admin can manually launch from Admin screen by:
1. Finding the scheduled game
2. Changing status to 'live' manually

## Future Enhancements

### Option 1: Firebase Cloud Functions (Recommended for Production)
- Runs on Firebase servers
- Guaranteed launch even if no users online
- Requires Firebase Blaze plan (~$0/month for this use case)

### Option 2: Background Tasks
- Use Expo Background Fetch
- Runs even when app is closed
- Limited to iOS/Android (not web)

### Option 3: Push Notifications
- Send notification to admins when game should launch
- Admin can launch with one tap
- Hybrid approach

## Cost Comparison

| Method | Cost | Reliability | Setup Complexity |
|--------|------|-------------|------------------|
| Client Polling (Current) | $0 | Medium | Low |
| Cloud Functions | ~$0 | High | Medium |
| Background Tasks | $0 | Medium-High | High |
| Push Notifications | $0 | Low | Low |

## Configuration

### Adjust Polling Frequency
In `CommunityScreen.jsx`, change the interval:
```javascript
// Check every 30 seconds (current)
const interval = setInterval(checkScheduledGames, 30000);

// Check every 1 minute (less frequent)
const interval = setInterval(checkScheduledGames, 60000);

// Check every 10 seconds (more frequent)
const interval = setInterval(checkScheduledGames, 10000);
```

### Change Timezone
Scheduled times are stored in UTC. Display formatting uses user's local timezone automatically.

## Testing

### Test Auto-Launch
1. Create a game scheduled for 2 minutes from now
2. Keep app open on Community screen
3. Wait for scheduled time
4. Game should automatically appear in "Live Games" tab

### Console Monitoring
Watch for these logs:
- `📅 CommunityScreen: Received X upcoming games`
- `🚀 Auto-launching scheduled game: ...`
- `✅ Successfully launched game: ...`
