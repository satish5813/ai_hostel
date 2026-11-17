#!/usr/bin/env bash
# KL Dashboard for iPhone: run this ON THE MAC, inside the repo:   bash apps/leaders/build-ios.sh
# Needs: Xcode (signed in with the university's Apple Developer account), Flutter, CocoaPods.
# Optional:  TEAM_ID=XXXXXXXXXX bash apps/leaders/build-ios.sh   (the 10-character Team ID from developer.apple.com -> Membership)
#   without TEAM_ID it only checks that the app compiles for iPhone (no signing, nothing to install).
#   with TEAM_ID it makes build/ios/ipa/*.ipa, ready to upload to TestFlight (Transporter app or Xcode Organizer).
set -euo pipefail
BUNDLE_ID=${BUNDLE_ID:-in.kluniversity.kludashboard}     # iOS ids cannot contain "_"; register this id at developer.apple.com
API_BASE=${API_BASE:-https://residency.klfacultyhiring.com}
BUILD=${BUILD:-$(date +%y%m%d%H%M)}
cd "$(dirname "$0")"
[ "$(uname)" = Darwin ] || { echo "This must run on a Mac."; exit 1; }
for t in flutter xcodebuild pod; do command -v $t >/dev/null || { echo "Missing: $t (install Xcode, Flutter and CocoaPods first)"; exit 1; }; done

# the ios/ folder is made once on the Mac, then committed
[ -d ios ] || flutter create --platforms=ios --org in.kluniversity --project-name klu_dashboard .
PBX=ios/Runner.xcodeproj/project.pbxproj
sed -i '' -E "/RunnerTests/! s/PRODUCT_BUNDLE_IDENTIFIER = [^;]+;/PRODUCT_BUNDLE_IDENTIFIER = $BUNDLE_ID;/" "$PBX"
PL=ios/Runner/Info.plist; PB=/usr/libexec/PlistBuddy
$PB -c "Set :CFBundleDisplayName KL Dashboard" $PL 2>/dev/null || $PB -c "Add :CFBundleDisplayName string KL Dashboard" $PL
# only standard HTTPS is used, so no export-compliance question on every upload
$PB -c "Set :ITSAppUsesNonExemptEncryption false" $PL 2>/dev/null || $PB -c "Add :ITSAppUsesNonExemptEncryption bool false" $PL

flutter pub get
if [ -z "${TEAM_ID:-}" ]; then
  flutter build ios --release --no-codesign --dart-define=API_BASE=$API_BASE
  echo; echo "Compiles for iPhone. Run again with TEAM_ID=... to make the signed .ipa."; exit 0
fi
for f in ios/Flutter/Release.xcconfig ios/Flutter/Debug.xcconfig; do
  grep -q '^DEVELOPMENT_TEAM' $f && sed -i '' -E "s/^DEVELOPMENT_TEAM.*/DEVELOPMENT_TEAM=$TEAM_ID/" $f || echo "DEVELOPMENT_TEAM=$TEAM_ID" >> $f
done
flutter build ipa --release --dart-define=API_BASE=$API_BASE --build-name=1.0.0 --build-number=$BUILD
echo; ls -1 build/ios/ipa/*.ipa
echo "Upload this file with the Transporter app (or Xcode -> Organizer), then add testers in App Store Connect -> TestFlight."
