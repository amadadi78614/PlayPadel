# Padel Doubles 3D – Android app

The game is a single web page (`www/index.html`) wrapped in a native Android app with Capacitor 6.
App ID `com.nomz.padeldoubles`, landscape only, full screen, screen stays on, vibration enabled. Works offline: the 3D library is bundled.

## Build an installable APK (about 20 minutes the first time)

1. Install **Node.js 18+** and **Android Studio** (it installs the Android SDK and Java for you).
2. Unzip this folder, open a terminal in it and run:
   ```
   npm install
   npx cap sync android
   npx cap open android
   ```
3. Android Studio opens the `android` project. Wait for "Gradle sync" to finish.
4. To test on a phone: turn on **Developer options → USB debugging** on the phone, plug it in, then press the green **Run ▶** button.
5. To make an APK to share: **Build → Build Bundle(s) / APK(s) → Build APK(s)**. The file lands in
   `android/app/build/outputs/apk/debug/app-debug.apk`. Send it to a phone and open it to install
   (allow "install unknown apps" when asked).

## Play Store release

1. **Build → Generate Signed Bundle / APK → Android App Bundle**, create a keystore and keep it safe (you need the same one for every update).
2. Upload the `.aab` in the Google Play Console (one-off $25 developer fee), add screenshots, a description and a privacy policy.
3. Bump `versionCode` and `versionName` in `android/app/build.gradle` for every new release.

## Updating the game

Replace `www/index.html` with the new version (keep `<script src="three.min.js"></script>` instead of the CDN link), then run `npx cap sync android` and rebuild.

## Differences from the version in Claude

- Career progress saves on the phone only (no account sync).
- The friends leaderboard shows only you; a shared board needs a small online backend (for example Supabase) — ask Claude to add it.
- Fonts fall back to the phone's system font when offline.
