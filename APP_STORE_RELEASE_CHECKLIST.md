# App Store Release Checklist

This document outlines the required steps before pushing a new version to the App Store. Follow this checklist **in order** for every release.

---

## Pre-Release Checklist

### 1. Update Version Numbers

**File:** `app.json`

- [ ] Increment `expo.version` (semantic versioning: MAJOR.MINOR.PATCH)
  - MAJOR: Breaking changes or major new features
  - MINOR: New features, backward compatible
  - PATCH: Bug fixes, small improvements

- [ ] Increment `expo.ios.buildNumber` (must be unique for each App Store submission)

- [ ] Increment `expo.android.versionCode` (must be unique for each Play Store submission)

```json
{
  "expo": {
    "version": "1.0.7",           // ← Update this
    "ios": {
      "buildNumber": "12"         // ← Increment this
    },
    "android": {
      "versionCode": 12           // ← Increment this
    }
  }
}
```

---

### 2. Update Firebase Version Config

**Firestore Collection:** `config`  
**Document:** `appVersion`

After the app is approved and live on the store, update:

- [ ] `latestVersion` → Set to the new version number
- [ ] `minimumVersion` → Update ONLY if older versions have breaking bugs/security issues
- [ ] `optionalUpdateMessage` → Update if you want a custom message for this release
- [ ] `updatedAt` → Set to current timestamp
- [ ] `updatedBy` → Your admin user ID

**Example:**
```json
{
  "minimumVersion": "1.0.5",
  "latestVersion": "1.0.7",
  "optionalUpdateMessage": "New features: Battle Royale games and Winner Cards!",
  "forceUpdateMessage": "This version is no longer supported. Please update to continue playing!",
  "updatedAt": "2025-01-15T10:30:00Z",
  "updatedBy": "your-admin-uid"
}
```

**Important:** Only update `minimumVersion` when you need to force users off an old version (e.g., API changes, security fixes).

---

### 3. Code Quality Checks

- [ ] Run linter: `npm run lint` (fix any errors)
- [ ] Ensure no `console.log` statements in production code (or use a logger)
- [ ] Check for hardcoded test values (test user IDs, test prizes, etc.)
- [ ] Verify all API keys are using production values

---

### 4. Build the App

```bash
# For iOS App Store
eas build --platform ios --profile production

# For Android Play Store
eas build --platform android --profile production

# For both platforms
eas build --platform all --profile production
```

---

### 5. Test the Production Build

Before submitting, install and test the production build:

- [ ] Install on physical device via TestFlight (iOS) or internal testing (Android)
- [ ] Complete the testing checklist (see TESTING_GUIDE.md)
- [ ] Verify force update screen works (test with old version config)

---

### 6. Submit to App Store

```bash
# Submit iOS build to App Store Connect
eas submit --platform ios

# Submit Android build to Play Store
eas submit --platform android
```

---

### 7. Post-Submission Tasks

After the app is **approved and live**:

- [ ] Update Firebase `config/appVersion` document with new `latestVersion`
- [ ] Test that existing users see the optional update prompt
- [ ] Monitor crash reports and user feedback
- [ ] Update release notes in App Store Connect / Play Console

---

## Version Number Guidelines

| Change Type | Example | Version Bump |
|-------------|---------|--------------|
| Bug fixes | Fixed compass arrow | 1.0.6 → 1.0.7 |
| New feature | Added Winner Cards | 1.0.7 → 1.1.0 |
| Major redesign | Complete UI overhaul | 1.1.0 → 2.0.0 |
| Breaking API change | New auth system | 1.x.x → 2.0.0 |

---

## Force Update Decision Guide

**When to update `minimumVersion`:**
- Security vulnerability in older versions
- Backend API changes that break older clients
- Critical bug that causes data loss
- Legal/compliance requirements

**When NOT to update `minimumVersion`:**
- New features (use `latestVersion` instead)
- UI improvements
- Performance optimizations
- Non-critical bug fixes

---

## Quick Reference Commands

```bash
# Check current version
cat app.json | grep -A2 '"version"'

# Build for iOS
eas build --platform ios --profile production

# Build for Android  
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android

# Check build status
eas build:list
```

---

## Rollback Procedure

If a critical issue is found after release:

1. **Immediate:** Update Firebase `minimumVersion` to force users to previous stable version
2. **Fix:** Create hotfix branch and fix the issue
3. **Release:** Follow this checklist for emergency release
4. **Communicate:** Notify users via push notification if needed

---

## Files to Review Before Release

| File | What to Check |
|------|---------------|
| `app.json` | Version numbers |
| `src/config/firebase.js` | Production Firebase config |
| `eas.json` | Build profiles |
| `FIREBASE_DATA_MODEL.md` | Any schema changes documented |

---

## Contact

For release questions: admin@fourthwatchtech.com
