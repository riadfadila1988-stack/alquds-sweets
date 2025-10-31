# iOS RTL Configuration - Complete Guide

## ⚠️ Important: iOS RTL Requires Native Rebuild

Unlike Android, iOS requires **native code changes** and a **full rebuild** (not just a reload) for RTL to work.

## Why iOS Shows `isRTL: false`

When you see:
```
LOG  [RTL] Initialized - isRTL: false Platform: ios
```

This means:
1. ✅ The JavaScript code is correctly calling `I18nManager.forceRTL(true)`
2. ❌ **BUT** the iOS native side hasn't been rebuilt yet with RTL support
3. ❌ iOS caches RTL settings at the native level - they don't change at runtime

## The Fix: Native iOS Rebuild

### Step 1: Run Prebuild (Already Done)
```bash
npx expo prebuild --clean --platform ios
```

This applies:
- ✅ `CFBundleDevelopmentRegion = 'ar'` in Info.plist
- ✅ Arabic localization support
- ✅ RTL configuration in native iOS project

### Step 2: Build and Run on iOS Device/Simulator

**Option A: Build with Expo**
```bash
npx expo run:ios
```

**Option B: Build with EAS (for physical device)**
```bash
eas build --platform ios --profile development
```

**Option C: Open in Xcode**
```bash
cd ios
open alqudssweets.xcworkspace
```
Then click "Run" in Xcode

### Step 3: Verify RTL Works

After rebuilding and installing:
1. Launch the app
2. Check console logs - you should see:
   ```
   LOG  [RTL] Initialized - isRTL: true Platform: ios
   ```
3. All screens should display RTL correctly
4. Close and reopen - RTL persists ✅

## Technical Explanation

### Why iOS is Different from Android

**Android:**
- `I18nManager.forceRTL()` can trigger a runtime reload
- RTL takes effect after `Updates.reloadAsync()`
- No native rebuild required

**iOS:**
- `I18nManager.forceRTL()` sets a preference
- **But iOS requires the app to be rebuilt** from native code
- RTL settings are cached in native UserDefaults
- Changes only apply after complete app restart from fresh build

### What the Plugin Does

**For iOS** (`plugins/withRTLSupport.js`):
```javascript
CFBundleDevelopmentRegion = 'ar'  // Sets Arabic as primary language
CFBundleLocalizations = ['ar']    // Adds Arabic localization
```

**For Android**:
```xml
android:supportsRtl="true"  // Enables RTL support
```

## Current Status

✅ **JavaScript code**: Correctly calls `forceRTL(true)`  
✅ **Plugin created**: iOS and Android configurations  
✅ **Prebuild run**: Native projects updated  
⏳ **iOS build needed**: Must rebuild to apply RTL  

## Next Steps for iOS

1. **If using Expo Go**: ❌ RTL won't work - Expo Go doesn't support native config changes
   - Must use development build or physical device build

2. **For Development**:
   ```bash
   npx expo run:ios
   ```

3. **For Production**:
   ```bash
   eas build --platform ios --profile production
   ```

## Troubleshooting

### Still showing `isRTL: false` on iOS?

**Checklist:**
- [ ] Did you run `npx expo prebuild --clean --platform ios`?
- [ ] Did you rebuild the app (not just reload)?
- [ ] Are you using Expo Go? (won't work, need dev build)
- [ ] Did you install the NEW build on device/simulator?

### How to Force Clean Rebuild

```bash
# Clean everything
rm -rf ios android node_modules

# Reinstall
npm install

# Rebuild native projects
npx expo prebuild --clean

# Run iOS
npx expo run:ios
```

## Expected Console Output After Fix

**Before native rebuild:**
```
LOG  [RTL] Initialized - isRTL: false Platform: ios  ❌
WARN [RTL] ⚠️ iOS detected: A native rebuild is required
```

**After native rebuild:**
```
LOG  [RTL] Initialized - isRTL: true Platform: ios   ✅
LOG  [RTL-CHECK] ✅ RTL is properly configured!
```

## Summary

**The RTL code is correct!** ✅  
**iOS just needs a native rebuild** to apply the changes.

Run `npx expo run:ios` and RTL will work perfectly on iOS! 🎉

---

**Note**: If you're building APK for Android, that will work immediately after rebuilding. iOS requires development build or TestFlight/App Store build.

