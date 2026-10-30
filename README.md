# Sandhya Sankalpa (Android)

Daily Sandhyavandanam sankalpa and timing calculator. Kannada, Telugu, Tamil, Hindi and English (Tamil uses Sauramana solar months by default);
light and dark themes; live Panchanga (Lahiri drik, Chandramana amanta);
devotional drone on open; reminders at the start of each Sandhya window;
monthly calendar (Tamil solar dates or Telugu/Kannada lunar tithis) with Amavasya, Purnima,
Ekadashi, Pradosham and Sankranti; Rahu kalam, Yamagandam, Gulika, Moon rashi and Chandrashtama.

The app is a single WebView screen showing `app/src/main/assets/index.html`, with a
small native bridge for features a web page cannot do well on Android.

| Feature | How it works in the app |
|---|---|
| Music on open | WebView allows media without a tap, so the drone starts immediately |
| Reminders | Alarms for the next 30 days of Pratah, Madhyahnika and Sayam window starts; restored after reboot; refreshed every time the app is opened |
| Add to calendar | Opens your phone's calendar app with the event and sankalpa pre-filled |
| Locate | Uses Android location (city-level, coarse) |
| Copy / Share | Android clipboard and share sheet |
| Offline | All styling is bundled; only Google Fonts need internet (system Kannada/Devanagari fonts are used otherwise) |

No third-party libraries are used; only the Android platform APIs.

## Option A: build on the MacBook (Android Studio)

1. Unzip the project and open the `SandhyaSankalpa` folder in Android Studio
   (File > Open). Let Gradle sync finish; it downloads Gradle 8.14.3 and the
   Android Gradle Plugin on first run. If Studio offers to upgrade AGP, you may
   accept or decline; either works.
2. Build > Build App Bundle(s) / APK(s) > Build APK(s).
3. Click "locate" in the notification. The file is
   `app/build/outputs/apk/debug/app-debug.apk`.
4. Copy it to the phone (Quick Share, USB or Drive) and tap it to install. Allow
   "Install unknown apps" for the app you open it from when prompted.

Or connect the phone with USB debugging on and press Run.

## Option B: build without a computer (GitHub Actions)

1. Create a private repository on GitHub and upload the contents of this folder
   (including the hidden `.github` folder).
2. Open the repository's Actions tab; the "Build APK" workflow runs on every push
   (or press "Run workflow").
3. When it finishes (about 3 minutes), open
   github.com/AKH1193/sandhya-sankalpa/releases/latest in Chrome on the phone,
   tap `SandhyaSankalpa.apk`, then open the download to install. Every push
   replaces this release with the new build.

## First launch on the phone

* Allow notifications when asked (needed for reminders).
* Tap Locate and allow location if you are not in Bengaluru, or pick a city.
* Samsung: Settings > Apps > Sandhya Sankalpa > Battery > Unrestricted, so
  One UI does not delay the reminders.

## Updating the page

The page is the same file as the web version, with the Tailwind styles compiled
in so it works offline. After editing `assets/index.html`, rebuild and reinstall.
Updates install over the previous version and keep your settings.
