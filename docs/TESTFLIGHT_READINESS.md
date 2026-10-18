# Phone Cleaner — TestFlight readiness

Last automated review: 18 October 2026

## Ready in the repository

- Expo SDK 57 iOS-only application configuration
- Production and internal-preview EAS profiles
- Bundle identifier `com.slhttnunlu.phonecleaner`
- On-device paginated Photos scan with a visible cancel action
- Screenshots, 12 MP+ photos, and 60-second+ video categories
- Full-screen photo preview, explicit selection, app confirmation, and iOS system-confirmed deletion
- Recently Deleted explanation after successful deletion
- Full, limited, and denied permission UI paths
- Empty-result, scan-error, cancelled-scan, and changed-library messages
- Turkish and English application copy and localized iOS permission descriptions
- Home/Settings bottom navigation with a device-persisted language preference
- Scroll-safe Home and Settings layouts, privacy/access summaries, and post-scan total estimate
- 3.4-second launch animation and cyclic previous/next navigation in full-screen photo preview
- Extensible language picker and a standard version-information settings row
- No account, backend, advertising, tracking, or payment code in the first TestFlight build
- Draft privacy policy, store metadata, App Review notes, and screenshot plan
- GitHub Actions quality workflow

## Automated evidence

Run from the repository root:

```bash
npm run lint
npm test
npx expo-doctor
npm run test:export:ios
```

Result recorded on 18 October 2026:

- ESLint: passed
- Jest: 2 suites, 9 tests passed
- Expo Doctor: 17/18 checks passed; the remaining warning is the untracked, locally generated `ios/` folder described below
- iOS JavaScript export: passed
- Native iOS Simulator build with AsyncStorage: passed
- Expo public config resolution: passed

These checks validate JavaScript behavior and Expo configuration. They do not replace a signed native build or physical-device acceptance test.

### Dependency audit note

`npm audit --omit=dev` currently reports advisories through Expo/Metro/Jest build-tool dependency chains. The proposed automatic `--force` resolution would downgrade Expo to an incompatible major version, so it must not be applied. Recheck after Expo SDK patch updates and before the App Store production build; update only through an Expo-compatible dependency set.

## Owner/device blockers before upload

1. Enroll the final individual Apple Developer account.
2. Choose the final Expo workflow before EAS Build: remove/archive the generated `ios/` folder for managed CNG, or deliberately commit and maintain native configuration. The current untracked folder prevents Expo Doctor from confirming that `app.json` fields will sync.
3. Confirm the final bundle identifier before creating the App Store Connect record; changing ownership or identifiers later adds migration work.
4. Create the App Store Connect app and configure EAS credentials under that same owner.
5. Replace `[SUPPORT_EMAIL]`, `[PUBLIC_SUPPORT_URL]`, and `[PUBLIC_PRIVACY_URL]`; publish the privacy policy over HTTPS.
6. Complete the App Privacy and age-rating questionnaires against the actual production binary.
7. Capture non-sensitive App Store screenshots.
8. Complete every row in `REAL_DEVICE_TEST.md`, including full/limited/denied permission, cancellation, empty library, iCloud media, deletion cancellation, VoiceOver, and larger libraries.
9. Run a `production` EAS build, upload it to App Store Connect, and assign it to an internal TestFlight group.

## Explicitly deferred beyond the first TestFlight

- Phone Cleaner Pro and StoreKit purchase flow
- Free cleanup quota and paywall
- Exact duplicates and explainable similar-photo grouping
- Reliable native file-byte measurement and storage-target cleanup
- Production analytics or crash reporting; any addition requires a new privacy audit

The first TestFlight build intentionally validates the safety and reliability of the core cleanup flow before monetization is introduced.
