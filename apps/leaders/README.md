# KL Dashboard (leadership app)

A thin Flutter shell around the residency executive dashboard (`/exec` on https://residency.klfacultyhiring.com).

- **Sign in once per phone.** The app has its own sign-in screen; the username and password are kept in the phone's
  secure storage (Android Keystore through `flutter_secure_storage`). Each launch signs in again quietly (staff
  sessions last 12 hours), hands the session to the website and opens the dashboard. No OTP, no link.
- **Leadership only.** Logins without an executive role (`exec.controller.ts` EXECUTIVES) are turned away.
- **Signing out** on the dashboard also removes the saved details from the phone.
- Pages outside the residency site open in the phone's browser; the back button walks back through the dashboard.

Built by `.github/workflows/mobile-apk.yml` (job `dashboard`) and served at `/download/KL-Dashboard.apk`.
iOS needs an Apple Developer account and a macOS build (not set up yet).
