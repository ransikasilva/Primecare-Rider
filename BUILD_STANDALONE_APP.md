# Building Standalone PrimeCare Rider App

This guide will help you build a production-ready standalone app that supports **real push notifications** even when the app is closed.

## 🎯 Why You Need a Standalone Build

- **Expo Go limitations**: Push notifications don't work when app is closed
- **Production deployment**: Submit to Google Play Store and Apple App Store
- **Full native features**: Access all device capabilities without restrictions

---

## 📋 Prerequisites

### For Android (FREE)
- ✅ Expo account (free)
- ✅ Android phone or emulator
- ✅ Google account (for Play Store later - optional)

### For iOS ($99/year)
- ⚠️ Apple Developer Account ($99/year)
- ⚠️ Mac computer (required)
- ⚠️ iPhone or iOS simulator

---

## 🚀 Method 1: EAS Build (Recommended - Easiest)

### Step 1: Install EAS CLI

```bash
npm install -g eas-cli
```

### Step 2: Login to Expo

```bash
cd /Users/ransika/Documents/HospitalDashboard/rider-app
eas login
```

**Options:**
- **New user?** Choose "Sign up" and create account with email
- **Existing user?** Enter your credentials
- **Browser login:** Use `eas login --sso` for browser-based login

### Step 3: Configure EAS Build

```bash
eas build:configure
```

This creates `eas.json` with build profiles:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "distribution": "store"
    }
  }
}
```

### Step 4: Build Android APK (For Testing)

```bash
eas build --platform android --profile preview
```

**What happens:**
1. ☁️ Uploads your code to Expo's servers
2. 🔨 Builds APK in the cloud (takes 5-15 minutes)
3. 📥 Provides download link when done
4. 📱 Install APK on your Android phone

**Download & Install:**
- Click the download link when build completes
- Transfer APK to your phone
- Enable "Install from Unknown Sources" in Android settings
- Install the APK

### Step 5: Build iOS IPA (Requires Apple Developer Account)

```bash
eas build --platform ios --profile preview
```

**Requirements:**
- Apple Developer account ($99/year)
- Will prompt for Apple credentials
- Registers app bundle ID automatically

---

## 🔧 Method 2: Development Build (Best for Testing)

Development builds include developer tools and faster refresh, perfect for testing push notifications:

### Android Development Build

```bash
eas build --platform android --profile development
```

### iOS Development Build

```bash
eas build --platform ios --profile development
```

**After installing the dev build:**

```bash
npx expo start --dev-client
```

This connects your development build to Metro bundler for live updates!

---

## 📱 Method 3: Local Build (Advanced)

If you don't want to use Expo's cloud service, you can build locally.

### Android Local Build

**Requirements:**
- Android Studio installed
- Android SDK configured
- Java Development Kit (JDK)

**Steps:**

```bash
# Install expo-dev-client
npx expo install expo-dev-client

# Prebuild native folders
npx expo prebuild --platform android

# Build with Gradle
cd android
./gradlew assembleRelease

# APK will be in: android/app/build/outputs/apk/release/app-release.apk
```

### iOS Local Build (Mac only)

**Requirements:**
- Xcode installed
- Apple Developer account
- CocoaPods

**Steps:**

```bash
# Prebuild native folders
npx expo prebuild --platform ios

# Install CocoaPods
cd ios
pod install

# Open in Xcode
open PrimeCareRider.xcworkspace

# Build in Xcode: Product > Archive
```

---

## 🧪 Testing Push Notifications

### After installing standalone build:

1. **Open the app** on your physical device
2. **Login as rider**
3. **Check backend logs** for push token:

```bash
cd /Users/ransika/Documents/HospitalDashboard/PrimeCare-API
psql -U admin -d primecare_prod -c "SELECT rider_name, expo_push_token FROM riders WHERE expo_push_token IS NOT NULL;"
```

4. **Send test notification** using your test endpoint:

```bash
curl -X GET "http://your-server-ip:8000/api/test/send-notification?token=YOUR_EXPO_PUSH_TOKEN"
```

5. **Close the app completely** (swipe away from recent apps)
6. **Wait for notification** - should appear even with app closed!

---

## 📦 Publishing to App Stores

### Google Play Store (Android)

```bash
# Build production AAB
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

**Requirements:**
- Google Play Developer account ($25 one-time fee)
- App privacy policy
- Screenshots and app description

### Apple App Store (iOS)

```bash
# Build production IPA
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

**Requirements:**
- Apple Developer account ($99/year)
- App privacy policy
- Screenshots and app description
- App review approval (1-3 days)

---

## 🔑 Important Configuration

### Update app.json for Production

```json
{
  "expo": {
    "name": "PrimeCare Rider",
    "slug": "primecare-rider-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "bundleIdentifier": "com.primecare.rider",
      "buildNumber": "1",
      "supportsTablet": true
    },
    "android": {
      "package": "com.primecare.rider",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#ffffff"
      },
      "permissions": [
        "ACCESS_FINE_LOCATION",
        "ACCESS_COARSE_LOCATION",
        "ACCESS_BACKGROUND_LOCATION",
        "POST_NOTIFICATIONS"
      ]
    },
    "extra": {
      "eas": {
        "projectId": "YOUR_PROJECT_ID_HERE"
      }
    }
  }
}
```

The `projectId` will be automatically added when you run `eas build:configure`.

---

## 🎯 Quick Start (TL;DR)

**For Android APK (Fastest):**

```bash
# 1. Install EAS CLI
npm install -g eas-cli

# 2. Login to Expo
cd /Users/ransika/Documents/HospitalDashboard/rider-app
eas login

# 3. Configure build
eas build:configure

# 4. Build APK
eas build --platform android --profile preview

# 5. Download and install APK on your phone
# Link will be provided when build completes (5-15 min)
```

---

## 💰 Cost Summary

| Service | Cost | Notes |
|---------|------|-------|
| Expo Account | **FREE** | Unlimited development |
| EAS Build | **FREE** | Limited builds/month (usually enough) |
| Google Play Developer | **$25 one-time** | To publish on Play Store |
| Apple Developer | **$99/year** | To publish on App Store |

**For testing:** Everything is FREE! ✅

---

## 📞 Support

If you encounter issues:

1. **Check EAS build logs:** `eas build:list`
2. **View build details:** Click on build in Expo dashboard
3. **Expo forums:** https://forums.expo.dev
4. **Documentation:** https://docs.expo.dev/build/introduction/

---

## ✅ Verification Checklist

After building and installing:

- [ ] App installs successfully
- [ ] Login works
- [ ] GPS tracking works
- [ ] Push notification permission requested
- [ ] Push token saved to database
- [ ] Test notification received (app open)
- [ ] Test notification received (app closed)
- [ ] Test notification received (app killed)
- [ ] QR scanner works
- [ ] All features functional

---

**You're ready to build! Start with the Android APK preview build - it's the easiest way to test everything.** 🚀
