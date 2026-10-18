# Phone Cleaner — App Store metadata draft

All character limits and wording must be rechecked in App Store Connect before submission. Public URLs and contact fields remain release blockers until their placeholders are replaced.

## Shared release information

- App name: `Phone Cleaner`
- Primary category: `Utilities`
- Secondary category candidate: `Photo & Video`
- Bundle ID: `com.slhttnunlu.phonecleaner`
- Copyright: `2026 Selahattin Ünlü`
- Support URL: `[PUBLIC_SUPPORT_URL]`
- Privacy policy URL: `[PUBLIC_PRIVACY_URL]`
- Marketing URL: optional; leave blank for the first release if unavailable
- Age rating expectation: `4+`, subject to the App Store questionnaire
- Advertising identifier: not used

## English (U.S.)

### Subtitle

`Private, honest photo cleanup`

### Promotional text

`No ads, no account, and no uploads. Review storage-heavy media on your iPhone and decide what to remove.`

### Keywords

`photo cleaner,storage,cleanup,screenshots,large videos,gallery,space,private`

### Description

Phone Cleaner gives you a simple, private way to review media that may be taking up space on your iPhone.

Scan your Photos library and review:

- Screenshots
- High-resolution photos
- Long videos
- Estimated recoverable space

Your photos and videos are reviewed on your device. Phone Cleaner does not require an account, upload your media to our servers, show ads, or delete anything automatically.

You stay in control: inspect items in full screen, select only what you no longer need, and confirm deletion through the iOS system dialog. iOS may keep deleted items in the Recently Deleted album before removing them permanently.

Storage values are estimates and may vary depending on iCloud and the state of your Photos library.

### What's New — 0.1.0

`Initial TestFlight release with on-device scanning, screenshots, high-resolution photo and long-video categories, full-screen preview, selection, and iOS-confirmed deletion.`

## Türkçe

### Alt başlık

`Özel ve dürüst galeri temizliği`

### Tanıtım metni

`Reklam, hesap ve yükleme yok. iPhone'unuzda alan kaplayan medyayı inceleyin; neyin silineceğine siz karar verin.`

### Anahtar kelimeler

`fotoğraf temizleme,depolama,ekran görüntüsü,büyük video,galeri,alan,gizlilik`

### Açıklama

Phone Cleaner, iPhone'unuzda alan kaplayabilecek medyaları incelemenin basit ve özel bir yolunu sunar.

Fotoğraflar arşivinizi tarayın ve şunları inceleyin:

- Ekran görüntüleri
- Yüksek çözünürlüklü fotoğraflar
- Uzun videolar
- Tahmini kazanılabilir alan

Fotoğraf ve videolarınız cihazınızda incelenir. Phone Cleaner hesap gerektirmez, medyanızı sunucularımıza yüklemez, reklam göstermez ve hiçbir şeyi otomatik olarak silmez.

Kontrol sizdedir: öğeleri tam ekran inceleyin, yalnızca artık ihtiyacınız olmayanları seçin ve silme işlemini iOS sistem penceresinden onaylayın. iOS, silinen öğeleri kalıcı olarak kaldırmadan önce Son Silinenler albümünde tutabilir.

Depolama değerleri tahminidir; iCloud ve Fotoğraflar arşivinizin durumuna göre değişebilir.

### Bu sürümdeki yenilikler — 0.1.0

`Cihaz içi tarama; ekran görüntüsü, yüksek çözünürlüklü fotoğraf ve uzun video kategorileri; tam ekran önizleme, seçim ve iOS onaylı silme özelliklerini içeren ilk TestFlight sürümü.`

## App Review notes

Phone Cleaner requires Photos access because its primary purpose is to review user-selected Photos-library assets and request deletion only after explicit user selection. All classification and size estimation in version 0.1.0 happens on the device. There is no account, backend upload, advertising, tracking, paywall, or automatic deletion in this build.

Suggested reviewer path:

1. Launch the app and allow full or limited Photos access.
2. Tap Scan and wait for the local scan to finish.
3. Open a non-empty category.
4. Tap an item to select it; press and hold a photo for full-screen preview.
5. Tap the delete action. The app first explains the request, then iOS presents its own system confirmation.

If the review device has no matching media, screenshots, photos of at least 12 MP, or videos of at least 60 seconds are needed to populate the corresponding categories.

## Screenshot plan

Use real, non-sensitive sample media and capture on a currently accepted iPhone display size:

1. Home — private, on-device scan promise
2. Scan animation — local processing
3. Results — three cleanup categories and estimated space
4. Review — visual selection grid
5. Preview — full-screen, user-controlled inspection
6. Success — Recently Deleted explanation

Do not show personal photos, names, notifications, device identifiers, or exaggerated storage claims.
