# Android App — Setup & Build Guide

This guide covers building the Raven mobile app (Expo React Native) from source and publishing it to the Google Play Store.

---

## Prerequisites

| Tool | Version | Purpose |
|---|---|---|
| **Node.js** | 20.x LTS | Runtime |
| **npm** | 10+ | Package manager |
| **Java JDK** | 17 | Android build toolchain |
| **Android SDK** | API 34+ | Build tools, platform |
| **Android Studio** | Latest | SDK manager (or standalone SDK) |
| **Expo CLI** | Latest | `npx expo` (no global install needed) |

### Install Android SDK (if not using Android Studio)

```bash
# On Windows, SDK is typically at:
# C:\Users\<YourUser>\AppData\Local\Android\Sdk

# Ensure these environment variables are set:
set ANDROID_HOME=C:\Users\<YourUser>\AppData\Local\Android\Sdk
set PATH=%PATH%;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\build-tools\34.0.0
```

---

## Step 1: Install Dependencies

```bash
cd mobile
npm install
```

---

## Step 2: Configure API URL

Edit `mobile/src/constants/config.ts`:

```typescript
// Change this to YOUR production API URL
export const API_BASE_URL = 'https://api.yourdomain.com'

// Update these to match your brand
export const APP_NAME = 'Your App Name'
export const APP_VERSION = '1.0.0'
```

---

## Step 3: Update App Identity

Edit `mobile/app.json`:

```json
{
  "expo": {
    "name": "Your App Name",
    "slug": "your-app-slug",
    "version": "1.0.0",
    "android": {
      "package": "com.yourcompany.yourapp",
      "versionCode": 1,
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#0c1d3d"
      }
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp"
    }
  }
}
```

**Important fields to change:**
- `name` — App display name on device
- `slug` — Expo project slug (lowercase, hyphens)
- `version` — Semantic version shown to users
- `android.package` — Unique Java package name (e.g., `com.yourcompany.yourapp`)
- `android.versionCode` — Integer that must increment with every Play Store upload
- `ios.bundleIdentifier` — Must match your Apple Developer certificate

---

## Step 4: Configure Firebase (Push Notifications)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a project (or use existing)
3. Add an Android app with your package name (`com.yourcompany.yourapp`)
4. Download `google-services.json`
5. Place it at `mobile/google-services.json` (replacing the existing one)

> **Critical:** The `package_name` in `google-services.json` MUST match `android.package` in `app.json`.

---

## Step 5: Replace App Icons & Splash

| File | Size | Purpose |
|---|---|---|
| `mobile/assets/icon.png` | 1024×1024 | App icon |
| `mobile/assets/adaptive-icon.png` | 1024×1024 | Android adaptive icon foreground |
| `mobile/assets/splash-icon.png` | 1024×1024 | Splash screen icon |
| `mobile/assets/favicon.png` | 48×48 | Web favicon |

Use a tool like [Icon Kitchen](https://icon.kitchen/) or [Figma](https://figma.com) to generate proper icon assets.

---

## Step 6: Generate Native Android Project

```bash
cd mobile
npx expo prebuild --platform android --clean
```

This creates the `mobile/android/` directory with a full Gradle project.

---

## Step 7: Create Signing Keystore

```bash
keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -alias your-key-alias \
  -keystore android/app/release.keystore \
  -dname "CN=Your Name, OU=Your Company, O=Your Company, L=City, ST=State, C=US"
```

> **IMPORTANT:** Keep this keystore file safe. You need it for EVERY future update. If lost, you cannot update the app on Play Store.

Configure signing in `mobile/android/app/build.gradle`:

```gradle
android {
    signingConfigs {
        release {
            storeFile file('release.keystore')
            storePassword 'YOUR_STORE_PASSWORD'
            keyAlias 'your-key-alias'
            keyPassword 'YOUR_KEY_PASSWORD'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## Step 8: Build APK (for testing)

```bash
cd mobile/android
./gradlew assembleRelease
```

Output: `mobile/android/app/build/outputs/apk/release/app-release.apk`

Install on device:
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

---

## Step 9: Build AAB (for Play Store)

```bash
cd mobile/android
./gradlew bundleRelease
```

Output: `mobile/android/app/build/outputs/bundle/release/app-release.aab`

The AAB is what you upload to Google Play Console.

---

## Step 10: Upload to Google Play

1. Go to [Google Play Console](https://play.google.com/console)
2. **Create app** → fill in app name, language, app/game type
3. Go to **Release** → **Production** → **Create new release**
4. Upload the `.aab` file
5. Fill in release notes
6. Complete the **Store listing** (screenshots, description, etc.)
7. Complete the **Content rating** questionnaire
8. Complete the **Data safety** form (see [07-google-play-cheatsheet.md](07-google-play-cheatsheet.md))
9. Set **pricing** (Free or Paid)
10. Submit for review

---

## Updating the App

For each update:

1. Increment `version` in `app.json` (e.g., `1.0.0` → `1.1.0`)
2. Increment `android.versionCode` (e.g., `1` → `2`)
3. Run `npx expo prebuild --platform android --clean`
4. Build AAB: `cd android && ./gradlew bundleRelease`
5. Upload new AAB to Play Console → Production → New release

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `SDK location not found` | Set `ANDROID_HOME` env variable or create `local.properties` in `android/` |
| `Could not determine java version` | Install JDK 17 and set `JAVA_HOME` |
| Build fails with R8/ProGuard errors | Check `proguard-rules.pro` for missing keep rules |
| App crashes on launch | Check `adb logcat` for crash stack trace |
| Push notifications not working | Verify `google-services.json` package name matches `app.json` |
| `versionCode X already used` | Increment `android.versionCode` in `app.json` |
| Keystore password wrong | Double-check password — there's no recovery if wrong |

---

## iOS Build (Advanced)

Raven's mobile app is iOS-ready but requires:
- Apple Developer account ($99/year)
- Xcode on macOS
- `npx expo prebuild --platform ios`
- Apple certificates and provisioning profiles

See [Expo iOS deployment docs](https://docs.expo.dev/build/setup/) for full details.

---

*See [07-google-play-cheatsheet.md](07-google-play-cheatsheet.md) for Play Store form answers and data safety responses.*
