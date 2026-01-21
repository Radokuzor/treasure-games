# Web/PWA Deployment Guide

Your Grab The Cash app now has full PWA (Progressive Web App) support! 🎉

## What Was Done

### 1. **Web Dependencies Installed**
- `react-dom` and `react-native-web` for React Native web support
- `@lottiefiles/dotlottie-react` for Lottie animations on web
- `maplibre-gl` and `react-map-gl` for unified mapping on web and native

### 2. **Unified Map Implementation**
Created `UnifiedMapView` component that works seamlessly across platforms:
- **Native**: Uses `react-native-maps` with full native performance
- **Web**: Uses `MapLibre GL` with `react-map-gl` for interactive web maps
- Unified API for markers, callouts, and circles across platforms
- Map interactions (tap/click) work consistently on both platforms

### 3. **Location Tracking**
- `expo-location` works on both web and native
- **Web**: Uses browser Geolocation API (requires HTTPS)
- **Native**: Uses native GPS hardware
- No Platform checks blocking location functionality

### 4. **Image Upload Support**
Implemented web file uploads with HTML5 File API:
- **AuthScreen.jsx**: Profile photo upload works on web with file input
- **AdminScreen.jsx**: Game clue photo upload works on web with multi-file selection
- Both screens convert files to blobs for Firebase Storage upload
- Seamless experience across platforms

### 5. **PWA Configuration**
- Web manifest created with app metadata
- HTML template with PWA meta tags
- Configured in `app.json` with theme colors and display settings

## What Works on Web

✅ **Fully Functional:**
- User authentication (sign up/login)
- Profile management with profile photo upload
- Leaderboards with user reporting system
- Recent winners view
- Home feed (videos/photos)
- Firebase integration
- Theme switching
- All UI components
- **Maps**: MapLibre GL maps work on both web and native
- **Location tracking**: Browser Geolocation API via expo-location
- **Image upload**: HTML5 File API for web, native ImagePicker for mobile
- **Admin panel**: Full game creation with map-based location selection

⚠️ **Limited on Web:**
- **Push notifications**: Not supported on web (SMS notifications work)
- **Haptic feedback**: Disabled silently on web

## Deployment Options

### Option 1: Netlify (Recommended)
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
cd dist
netlify deploy --prod
```

### Option 2: Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
cd dist
vercel --prod

Option 1: Vercel (Current Setup - Easiest)
You're already set up with Vercel! Just run:

vercel --prod --yes
Your PWA will be live at your Vercel deployment URL
Option 2: Preview Deployment (for testing before production)

vercel
This creates a preview URL for testing without affecting your production site.
Option 3: Local Testing
Test the PWA locally before deploying:

# Build the web version
npx expo export --platform web

# Serve it locally
cd dist
npx serve
Then open the URL in your browser (usually http://localhost:3000)
```

### Option 3: Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Initialize
firebase init hosting

# Deploy
firebase deploy --only hosting
```

### Option 4: GitHub Pages
1. Push the `dist` folder contents to a `gh-pages` branch
2. Enable GitHub Pages in repository settings
3. Your site will be at: `https://[username].github.io/[repo]`

## Local Testing

To test the web build locally:

```bash
# Build for web
npx expo export --platform web

# Serve the dist folder
npx serve dist

# Or use any static file server
cd dist && python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

## Custom Domain

After deploying to any platform:
1. Add your custom domain in the platform's dashboard
2. Update DNS records (usually a CNAME or A record)
3. Enable SSL/HTTPS (usually automatic)

## Environment Variables

Make sure to set these environment variables in your hosting platform:
- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`

(Most platforms read from `.env` files automatically during build)

## PWA Installation

Users can install your web app as a PWA:
- **Desktop**: Look for install icon in browser address bar
- **Android**: "Add to Home Screen" in browser menu
- **iOS**: "Add to Home Screen" from Safari share menu

## Updating the Web App

To update after making changes:

```bash
# 1. Make your code changes
# 2. Rebuild for web
npx expo export --platform web

# 3. Redeploy (example for Netlify)
cd dist && netlify deploy --prod
```

## Important Notes

1. **HTTPS Required**: Location tracking on web requires HTTPS. All major hosting platforms (Netlify, Vercel, Firebase) provide SSL/HTTPS automatically.

2. **Full Feature Parity**: The web version now has feature parity with mobile apps:
   - Play location-based games and Battle Royale
   - View interactive maps with live game locations
   - Upload profile photos and game clues
   - Track your location in real-time during games
   - Create and manage games (admin panel)
   - Browse leaderboards and report inappropriate usernames
   - View account balance and transaction history

3. **SMS Notifications**: Since push notifications don't work on web, SMS opt-in is crucial for game announcements

4. **Progressive Enhancement**: Features gracefully degrade if browser capabilities are limited (e.g., older browsers without Geolocation API)

## Troubleshooting

**Build Errors:**
- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear Expo cache: `npx expo start --clear`

**Missing Features:**
- Native features (maps, location) are intentionally disabled on web
- Users should be directed to mobile app for full experience

**Performance:**
- First load may be slower due to 3.4MB bundle
- Consider code splitting in future optimizations

## Next Steps

1. Deploy to your preferred platform
2. Test all functionality in production
3. Set up custom domain
4. Add analytics (Google Analytics, etc.)
5. Consider adding web-specific features:
   - Desktop-optimized layouts
   - Keyboard shortcuts
   - Web-specific navigation

---

Your PWA is ready to deploy! 🚀
