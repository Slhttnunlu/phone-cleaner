# Phone Cleaner — TestFlight ve App Store yayın akışı

## Yayın öncesi kararlar

- Bundle identifier: `com.slhttnunlu.phonecleaner`
- İlk sürüm: `0.1.0`, build: EAS remote auto-increment
- Dağıtım hedefi: iOS TestFlight, ardından App Store
- Backend yok; kullanıcı medyası sunucuya gönderilmez.
- İlk mağaza sürümünde abonelik/paywall yoksa App Privacy ve mağaza metinleri bu gerçeği yansıtmalıdır.

## Ön koşullar

1. Apple Developer hesabında App ID ve App Store Connect uygulama kaydı oluşturulur.
2. Bundle identifier, App Store Connect kaydıyla tam olarak eşleşir.
3. EAS hesabı Apple hesabına bağlanır; imzalama sertifikası/provisioning profile EAS tarafından oluşturulur veya güvenli biçimde içe aktarılır.
4. Gizlilik politikası için herkese açık HTTPS URL hazırlanır.
5. App Privacy yanıtları; uygulamanın medya içeriğini toplamadığını, Photos izninin yalnızca cihaz içi işlev için kullanıldığını doğru biçimde belirtir.

## Internal preview build

```bash
npx eas-cli@latest login
npx eas-cli@latest build --platform ios --profile preview
```

`preview` profili `distribution: internal` kullanır. Bu build kayıtlı cihazlarda hızlı doğrulama içindir; App Store Connect veya TestFlight'a gönderilmez.

## TestFlight / production build ve submit

```bash
npm run lint
npm test
npm run test:export:ios
npx eas-cli@latest build --platform ios --profile production
npx eas-cli@latest submit --platform ios --profile production
```

TestFlight için mağaza dağıtımına uygun `production` profili kullanılır. Build App Store Connect'e gönderildikten ve Apple tarafından işlendikten sonra önce internal tester grubuna atanır. İlk harici TestFlight grubu Beta App Review gerektirebilir.

Komutları çalıştırmadan önce [gerçek cihaz kabul formu](REAL_DEVICE_TEST.md) tamamlanmış olmalıdır. `eas.json` içindeki `autoIncrement`, production build numarasını EAS'te artırır; App Store Connect'e elle daha düşük bir build numarası gönderilmez.

## Hesap sahibiyle tamamlanacak alanlar

- Apple Developer üyeliği ve kimlik doğrulaması
- App Store Connect uygulama kaydı ve bundle ID doğrulaması
- Paid Apps sözleşmesi yalnızca Pro/IAP bu build'e alınacaksa
- Banka ve vergi bilgileri yalnızca ücretli ürün açılacaksa
- `[SUPPORT_EMAIL]`, `[PUBLIC_SUPPORT_URL]` ve `[PUBLIC_PRIVACY_URL]` placeholder'ları
- App Privacy anketinin gönderilecek binary ile son kez karşılaştırılması
- Yaş derecelendirmesi ve ülke/bölge seçimi
- Gerçek cihaz ekran görüntüleri
- Production build, upload ve internal TestFlight tester ataması

## İlk TestFlight kapsamı

İlk TestFlight build'i ödeme içermez. Amaç; izin, cihaz içi tarama, önizleme, seçim, iOS sistem onaylı silme, Son Silinenler açıklaması ve Türkçe/İngilizce metinleri doğrulamaktır. Phone Cleaner Pro ve ücretsiz limit, bu temel akış güvenilir hale geldikten sonra ayrı build'de eklenir.

## Geri alma

- İnceleme veya TestFlight sırasında kritik hata bulunursa yeni kullanıcıya dağıtımı durdurulur.
- Sorunlu build silinemez; TestFlight'ta testten kaldırılır ve düzeltme için daha yüksek build numarası oluşturulur.
- App Store'da yayınlandıysa sürüm satıştan kaldırılabilir; mevcut kullanıcılar için düzeltme sürümü çıkarılır.
- Backend olmadığı için uzaktan özellik kapatma yoktur. Kritik bir davranış hatasında yeni build zorunludur.

## Yayın kaydı

Her build için sürüm/build, değişiklik özeti, gerçek cihaz sonucu, bilinen riskler ve geri alma kararı sürüm notuna kaydedilir. Fotoğraf veya kullanıcı verisi bu kayda eklenmez.
