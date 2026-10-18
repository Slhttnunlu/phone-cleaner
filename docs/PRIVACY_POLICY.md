# Phone Cleaner — Privacy Policy Draft

**Effective date:** To be set before App Store submission  
**Developer:** Selahattin Ünlü  
**Support contact:** `[SUPPORT_EMAIL]`

This document is the approved privacy-policy content draft. Replace the support placeholder, set the effective date, obtain a public HTTPS URL, and perform a final App Store build audit before publishing it.

## English

Phone Cleaner helps users review and delete selected photos and videos from their Apple Photos library.

### Photos and videos

Phone Cleaner requests access to the Photos library only to scan the media available under the permission granted by the user, display cleanup categories and previews, estimate recoverable storage, and ask iOS to delete items explicitly selected by the user.

Photo and video content is processed on the device. Phone Cleaner does not upload the user's media, filenames, location metadata, Photos asset identifiers, or cleanup selections to a developer-operated server. The current version does not require an account and has no advertising or cross-app tracking SDK.

Deletion is never automatic. The user selects the items and iOS displays the system confirmation. Deleted items may remain in the Recently Deleted album according to Apple Photos behavior.

### Data storage and sharing

The current version does not operate a backend database and does not sell or share personal data. Local application state may be stored on the device as needed for the app to function and is removed according to iOS application-data behavior when the app is deleted.

### Payments

If Phone Cleaner Pro is introduced, purchases will be processed by Apple through the App Store. The developer will not receive or store the user's payment-card details. Apple's own privacy terms apply to Apple's payment processing.

### Children

Phone Cleaner is a general utility and is not designed to collect personal information from children.

### Changes and contact

This policy may be updated when the app's features or data practices change. Material changes will be reflected by updating the effective date. Privacy questions can be sent to `[SUPPORT_EMAIL]`.

## Türkçe

Phone Cleaner, kullanıcıların Apple Fotoğraflar arşivindeki seçili fotoğraf ve videoları incelemesine ve silmesine yardımcı olur.

### Fotoğraf ve videolar

Phone Cleaner; yalnızca kullanıcının verdiği izin kapsamında erişilebilen medyayı taramak, temizlik kategorilerini ve önizlemeleri göstermek, kazanılabilecek alanı tahmin etmek ve kullanıcının açıkça seçtiği öğelerin silinmesini iOS'tan istemek için Fotoğraflar erişimi talep eder.

Fotoğraf ve video içeriği cihazda işlenir. Phone Cleaner; kullanıcının medyasını, dosya adlarını, konum bilgisini, Fotoğraflar varlık kimliklerini veya temizlik seçimlerini geliştirici tarafından işletilen bir sunucuya yüklemez. Mevcut sürüm kullanıcı hesabı gerektirmez; reklam veya uygulamalar arası takip SDK'sı içermez.

Silme hiçbir zaman otomatik yapılmaz. Öğeleri kullanıcı seçer ve iOS sistem onayını gösterir. Silinen öğeler Apple Fotoğraflar davranışına göre Son Silinenler albümünde kalabilir.

### Veri saklama ve paylaşım

Mevcut sürüm bir backend veritabanı işletmez; kişisel verileri satmaz veya paylaşmaz. Uygulamanın çalışması için gereken yerel durum cihazda tutulabilir ve uygulama silindiğinde iOS'un uygulama verisi davranışına göre kaldırılır.

### Ödemeler

Phone Cleaner Pro kullanıma sunulursa satın alımlar Apple tarafından App Store üzerinden işlenir. Geliştirici kullanıcının ödeme kartı bilgilerini almaz veya saklamaz. Apple'ın ödeme işlemlerinde kendi gizlilik koşulları geçerlidir.

### Çocuklar

Phone Cleaner genel amaçlı bir yardımcı uygulamadır ve çocuklardan kişisel bilgi toplamak üzere tasarlanmamıştır.

### Değişiklikler ve iletişim

Uygulamanın özellikleri veya veri uygulamaları değiştiğinde bu politika güncellenebilir. Önemli değişiklikler yürürlük tarihi değiştirilerek gösterilir. Gizlilik soruları `[SUPPORT_EMAIL]` adresine gönderilebilir.

## App Store privacy declaration checklist

The expected answer for the current audited feature set is **Data Not Collected**, subject to a final dependency and production-build network audit. Re-evaluate the declaration before every release if analytics, crash reporting, support tooling, advertising, account features, remote configuration, or a purchase SDK is added.

- Tracking: no
- Third-party advertising: no
- Developer advertising/marketing data: no
- Media uploaded to developer infrastructure: no
- Account or contact information collected by the app: no
- Precise/coarse location collected by the app: no
- Analytics identifiers or content events: no in the current implementation

Photo-library access by itself is not described as developer collection here because media remains on the device; the final App Store Connect answers must still match the shipped binary and Apple's definitions at submission time.
