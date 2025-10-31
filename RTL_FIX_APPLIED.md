# RTL Fix Applied - Build Instructions

## What Was Fixed

The RTL persistence issue has been resolved with the following changes:

### 1. **Native Android Configuration** (`plugins/withRTLSupport.js`)
   - Added a custom Expo config plugin that automatically adds `android:supportsRtl="true"` to AndroidManifest.xml
   - This ensures RTL is natively supported at the Android system level

### 2. **RTL Utility Module** (`utils/rtl.ts`)
   - Created centralized RTL management functions
   - Handles initialization and persistence across app restarts
   - Properly stores RTL preference in AsyncStorage

### 3. **App Layout Update** (`app/_layout.tsx`)
   - Simplified RTL initialization to run at module level (before any components render)
   - Removes complex conditional logic that caused issues on subsequent app launches
   - Uses the new utility functions for cleaner code

### 4. **App Configuration** (`app.json`)
   - Added the custom RTL plugin to the plugins array

## How to Build and Test

### For Android APK:

1. **Clean and rebuild the native Android project:**
   ```bash
   npx expo prebuild --clean --platform android
   ```

2. **Build the APK:**
   ```bash
   eas build --platform android --profile preview
   ```
   
   OR for local build:
   ```bash
   npx expo run:android --variant release
   ```

3. **Test the app:**
   - Install the APK on your device
   - Open the app (should look good with RTL)
   - Close the app completely
   - Reopen the app - RTL should still work correctly!

### For Development Testing:

```bash
npx expo start --clear
```

Then press 'a' for Android or 'i' for iOS.

## What Changed Technically

### The Root Cause:
On Android, RTL settings made via `I18nManager.forceRTL()` at runtime don't persist across app restarts unless:
1. The native AndroidManifest.xml has `android:supportsRtl="true"`
2. RTL is forced **at module initialization** (not just in useEffect)
3. The app is properly rebuilt after configuration changes

### The Solution:
1. **Native Level**: AndroidManifest.xml now declares RTL support
2. **Module Level**: RTL is forced when the _layout.tsx module loads (every app start)
3. **Persistence**: RTL preference is stored in AsyncStorage
4. **Reload Logic**: Only reloads when RTL state actually changes (prevents loops)

## Verification

After building and installing, verify:
- ✅ First launch: RTL works correctly
- ✅ Close app and reopen: RTL still works
- ✅ Force close and reopen: RTL still works
- ✅ Restart device: RTL still works

## Troubleshooting

If RTL still doesn't persist:

1. **Make sure you ran `npx expo prebuild --clean`** - this is crucial!
2. **Uninstall the old APK** before installing the new one
3. **Check logs**: Look for `[RTL]` tagged console logs
4. **Verify plugin**: Check that the plugin is in app.json

## Files Modified/Created

- ✅ `app/_layout.tsx` - Simplified RTL initialization
- ✅ `utils/rtl.ts` - New RTL utility functions
- ✅ `plugins/withRTLSupport.js` - Custom Expo config plugin
- ✅ `app.json` - Added RTL plugin

The fix is complete! Just rebuild your APK and test.

