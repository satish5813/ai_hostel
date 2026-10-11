#!/bin/zsh
# Starts the student app on the iPhone simulator and the Android emulator, talking to the hostel API on this Mac
# (port 4100; start the API first). OFFLINE=1 runs the stand-alone demo build instead (sample data, no server).
#   scripts/run-mobile-demo.sh            both
#   scripts/run-mobile-demo.sh ios        iPhone only
#   scripts/run-mobile-demo.sh android    Android only
# REBUILD=1 builds the iPhone app again after a code change. The Android app is the APK in demo/.
set -e
if [[ -n $OFFLINE ]]; then DEFINE=--dart-define=OFFLINE=true; APK=KL-Hostels-Student-Demo.apk
else DEFINE=; APK=KL-Hostels-Student-Live-Emulator.apk
  curl -s -o /dev/null localhost:4100/api/auth/demo-accounts || { echo "The hostel API is not running on port 4100. Start it, or run with OFFLINE=1."; exit 1; }
fi
ROOT=${0:A:h:h}; WHAT=${1:-both}
SDK=$HOME/Library/Android/sdk; ADB=$SDK/platform-tools/adb
IOS_DEVICE="iPhone 17 Pro"; AVD=KL_Demo; APP_ID_IOS=in.kluniversity.kluHostels; APP_ID_AND=in.kluniversity.klu_hostels

if [[ $WHAT == both || $WHAT == ios ]]; then
  echo "iPhone: starting $IOS_DEVICE"
  xcrun simctl boot "$IOS_DEVICE" 2>/dev/null || true
  open -a Simulator
  xcrun simctl bootstatus "$IOS_DEVICE" -b >/dev/null
  if ! xcrun simctl get_app_container "$IOS_DEVICE" $APP_ID_IOS >/dev/null 2>&1 || [[ -n $REBUILD ]]; then
    # macOS adds file attributes on the Desktop that break code signing: build from a copy outside it
    COPY=${TMPDIR:-/tmp}/klu-mobile-build
    rsync -a --delete --exclude build --exclude .dart_tool --exclude ios/Pods --exclude ios/.symlinks "$ROOT/apps/mobile/" "$COPY/"
    (cd "$COPY" && xattr -cr . && flutter build ios --simulator --debug $DEFINE)
    xcrun simctl install "$IOS_DEVICE" "$COPY/build/ios/iphonesimulator/Runner.app"
  fi
  xcrun simctl launch "$IOS_DEVICE" $APP_ID_IOS >/dev/null && echo "iPhone: app opened"
fi

if [[ $WHAT == both || $WHAT == android ]]; then
  if ! $ADB devices | grep -q "emulator-.*device"; then
    echo "Android: starting the $AVD emulator (first start takes a few minutes)"
    rm -f $HOME/.android/avd/$AVD.avd/*.lock
    ($SDK/emulator/emulator -avd $AVD -no-snapshot -no-audio -no-boot-anim >/dev/null 2>&1 &)
    $ADB wait-for-device
    until [[ "$($ADB shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == 1 ]]; do sleep 3; done
  fi
  $ADB install -r "$ROOT/demo/$APK" >/dev/null
  $ADB shell monkey -p $APP_ID_AND -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 && echo "Android: app opened"
fi
