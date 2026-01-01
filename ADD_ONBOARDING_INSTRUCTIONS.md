# HoodGames Onboarding Flow

## What Was Added
- `src/screens/OnboardingScreen.jsx`: 7-slide onboarding that collects profile info and requests photo/location/notification permissions.
- `App.js`: shows onboarding **only on first launch** using `AsyncStorage` key `hasSeenOnboarding`.

## How It Works
- On app startup, `App.js` reads `AsyncStorage.getItem('hasSeenOnboarding_v3')`.
  - If not `true`, the app starts on the `Onboarding` screen.
  - If `true`, the app starts on `Auth` (or `MainTabs` if already signed in).
- Onboarding completion is set in `src/screens/OnboardingScreen.jsx` by:
  - `AsyncStorage.setItem('hasSeenOnboarding_v3', 'true')`
  - then `navigation.replace('Auth')`

## Test The Flow
1. Start the dev server: `npm start`
2. Install/run on a device/simulator as you normally do.
3. First launch should open onboarding.
4. Finish onboarding (last step triggers signup handler) → you should land on the `Auth` screen.
5. Kill the app and relaunch → onboarding should NOT appear again.

## Re-Show Onboarding (Reset)
- Add a temporary debug button, or run this in a screen/dev menu:
  - `AsyncStorage.removeItem('hasSeenOnboarding_v3')`
- Then fully close and reopen the app.
