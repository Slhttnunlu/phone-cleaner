# Phone Cleaner

PhotoKit ve Vision ile çalışan, iPhone fotoğraf kütüphanesindeki alan tüketen içerikleri cihaz üzerinde anlamlandırmaya yardımcı native iOS uygulaması.

## Çalıştırma

```bash
npm install
npm run start -- --clear
npx expo run:ios --device --configuration Release
```

Ardından Expo Go ile QR kodu okutun. Bu ilk Expo sürümünde gerçek dosya boyutu yerine çözünürlük ve süreye dayalı **tahmini** alan kullanılır; bu nedenle iPhone'da gerçek kütüphaneyle doğrulanmalıdır.

Expo SDK 57 için Node `22.13+` LTS önerilir. Mevcut Node 23 sürümüyle paketleme yapılabildi, ancak Expo/React Native tarafından desteklenen LTS sürümü değildir.

## Ürün vaadi

Kullanıcı, hangi içeriklerin gereksiz alan kapladığını görür; önerileri inceler, son seçimi kendisi yapar ve silme işlemini iOS sistem onayıyla tamamlar. Uygulama hiçbir fotoğrafı, videoyu veya kullanıcı kütüphanesi verisini varsayılan olarak cihaz dışına göndermez.

İlk hedef kitle, fotoğraf arşivi büyümüş ve depolama alanı açmak isteyen iPhone kullanıcılarıdır.

## MVP kapsamı

- Fotoğraf kütüphanesi erişim izni ve erişilebilen varlıkların taranması
- Ekran görüntülerini, büyük videoları ve belirli boyutun üzerindeki fotoğrafları listeleme
- Kesin tekrar (duplicate) adaylarını güvenli biçimde gruplama
- Kullanıcının seçtiği öğeler için yaklaşık geri kazanılacak alanı gösterme
- Önizleme, tekil/toplu seçim ve PhotoKit üzerinden sistem onaylı silme
- Tarama tarihi, izin reddi, boş kütüphane ve hata durumları

MVP, "bulanık fotoğraf" veya görsel benzerlik sonuçlarını kesin silme önerisi olarak sunmaz. Bu yetenekler, ölçüm ve gerçek cihaz doğrulamasından sonra ayrı bir fazda açılır.

## Kapsam dışı

- Android desteği
- Kullanıcı hesabı, bulut yedekleme veya galeri içeriğinin sunucuya yüklenmesi
- Otomatik silme
- Dosyalar uygulamasındaki belgeleri veya başka uygulamaların verisini tarama
- Paywall, abonelik veya reklam SDK'sı entegrasyonu

## Kullanıcı akışı

```text
İlk açılış
  → değer önerisi ve gizlilik açıklaması
  → Fotoğraf erişim izni
  → yerel tarama
  → kategori özeti ve tahmini kazanım
  → kategori / grup inceleme
  → kullanıcı seçimi
  → iOS silme onayı
  → sonuç ve yeniden tarama
```

Sınırlı fotoğraf erişiminde yalnızca kullanıcının seçtiği varlıklar gösterilir; uygulama bunu açıkça belirtir ve erişimi genişletme yolunu sunar. Erişim reddedilirse kullanıcı ayarlara yönlendirilir, fakat uygulama tarama yapılmış gibi davranmaz.

## Teknik yaklaşım

- SwiftUI, Swift Concurrency ve iOS 17+ hedefi
- Kütüphane okuma/yazma için PhotoKit (`PHPhotoLibrary`, `PHFetchResult`, `PHAsset`)
- Ekran görüntüsü ve medya türü tespiti için PhotoKit metadata'sı
- Görsel benzerlik/bulanıklık için sonraki fazda Vision; ağır analizler arka planda ve iptal edilebilir çalışır
- Tarama özeti ve kullanıcı tercihleri için cihaz içi kalıcı depolama; ham medya veya fotoğraf içerikleri saklanmaz
- Ağ erişimi olmadan çalışacak şekilde tasarım

Ayrıntılı bileşen sınırları ve performans kararları [mimari dokümanında](docs/ARCHITECTURE.md), kabul edilen ticari yön ve farklılaşma kararları [ürün stratejisinde](docs/PRODUCT_STRATEGY.md), iş sırası ise [TASK.md](TASK.md) içinde bulunur.

## Geliştirme ilkeleri

- Önce küçük ve doğrulanabilir bir yerel MVP çıkarılır; backend ancak açık bir kullanıcı değeri ve veri sözleşmesi olduğunda değerlendirilir.
- Silme geri döndürülemez bir kullanıcı eylemi gibi ele alınır: uygulama seçimi görünür kılar, sistem onayı olmadan hiçbir işlem yapmaz.
- Uygulama, iOS'un tahmini dosya boyutu veya erişim sınırları nedeniyle kesin olmayan verileri "tahmini" olarak etiketler.
- Görsel içerik, dosya adı, konum bilgisi ve kişisel veriler loglara veya analitik olaylara yazılmaz.
- Her yeni tarama kategorisi için izin, boş durum, hata, uzun kütüphane ve iptal senaryoları tasarlanır.

## Başlangıç proje yapısı

```text
PhoneCleaner/
  App/
  Features/
    Onboarding/
    Scan/
    Review/
    Cleanup/
    Settings/
  Core/
    Photos/
    Analysis/
    Storage/
    Analytics/
  Shared/
    UI/
    Models/
    Utilities/
  Tests/
  UITests/
```

Bu klasör şu an ürün ve teknik başlangıç dokümantasyonudur; Xcode projesi, bağımlılıklar ve App Store yapılandırması henüz oluşturulmamıştır.

## Doğrulama

Kod eklendiğinde en az şu kontroller yapılır:

1. Birim testleri: sınıflandırma, grup oluşturma, tahmini alan hesaplama ve hata dönüşümleri.
2. UI testleri: izin, tarama özeti, inceleme ve silme-onayı öncesi akış.
3. Gerçek cihaz testleri: tam/sınırlı/reddedilmiş izin; boş ve büyük kütüphane; iCloud'da olan varlık; tarama iptali; silme sonrası sonuç.
4. Xcode derleme ve testleri, desteklenen en düşük iOS sürümünde çalıştırılır.

Detaylı kabul senaryoları [docs/ACCEPTANCE_TESTS.md](docs/ACCEPTANCE_TESTS.md) içindedir.

Gerçek cihaz test kaydı [docs/REAL_DEVICE_TEST.md](docs/REAL_DEVICE_TEST.md), güncel TestFlight hazırlık özeti [docs/TESTFLIGHT_READINESS.md](docs/TESTFLIGHT_READINESS.md), yayın adımları [docs/RELEASE_OPERATIONS.md](docs/RELEASE_OPERATIONS.md), mağaza metinleri [docs/APP_STORE_METADATA.md](docs/APP_STORE_METADATA.md) ve gizlilik politikası taslağı [docs/PRIVACY_POLICY.md](docs/PRIVACY_POLICY.md) içindedir.
