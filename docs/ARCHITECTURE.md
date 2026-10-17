# Phone Cleaner — Hedef mimari

## Bugünkü sınır

İlk sürüm tamamen cihaz üzerinde çalışır. Fotoğraf kütüphanesine erişim PhotoKit üzerinden sağlanır; sınıflandırma ve ilerideki görsel analiz Vision ile yerelde yapılır. Backend, hesap, ham medya yükleme veya üçüncü taraf AI API'si yoktur.

Bu sınır, gizlilik riskini ve operasyon maliyetini düşük tutar. Kullanıcının fotoğrafı, videosu, dosya adı, konumu veya Photos varlık kimliği uygulama loglarına ve analitik sistemine gönderilmez.

## Bileşenler

```text
SwiftUI uygulaması
  ├─ Features
  │   ├─ Onboarding / izin durumu
  │   ├─ Scan / kategori özeti
  │   ├─ Review / grup ve varlık inceleme
  │   └─ Cleanup / kullanıcı seçimi ve sonuç
  ├─ Photos domain
  │   ├─ PhotoLibraryClient (PhotoKit soyutlaması)
  │   ├─ AssetScanner
  │   └─ DeletionCoordinator
  ├─ Analysis domain
  │   ├─ CategoryClassifier
  │   ├─ DuplicateGrouper
  │   └─ SimilarityAnalyzer (P1, Vision)
  ├─ Local storage
  │   └─ tarama özeti, tercih ve sürümlü analiz önbelleği
  └─ Observability
      └─ içeriksiz hata ve performans olayları

PhotoKit / Vision / yerel depolama
```

Ekranlar doğrudan `PHAsset` sorgulamaz. `PhotoLibraryClient` izin, fetch, thumbnail isteği, değişiklik gözlemi ve silme API'sini tek bir arayüzde soyutlar. Bu sayede PhotoKit sınırları test doubles ile doğrulanabilir.

## Kritik akış

```text
İzin kontrolü → tarama görevi → kategori/özet modeli → kullanıcı incelemesi
→ kullanıcı seçimi → PhotoKit performChanges → sistem onayı → kütüphane değişikliği → sonuç yenileme
```

- Tarama görevleri `Task` ile iptal edilebilir olmalı; UI güncellemeleri ana aktörde yapılır.
- Büyük kütüphanede sayfalama/batch işleme kullanılır; tüm görseller aynı anda belleğe alınmaz.
- Thumbnail yükleme, talep anında ve önbellek sınırlarıyla yapılır.
- PhotoKit değişiklik gözlemi, tarama sonucunun geçersizleştiğini tespit eder; sonuç sessizce silinmez, yeniden tarama önerilir.
- Silme isteği yalnızca kullanıcının güncel olarak seçtiği varlık kimlikleriyle oluşturulur. Uygulama sistem onayını atlayamaz ve silmeyi "garanti" olarak sunmaz.

## Veri modeli ilkeleri

- Kalıcı olarak yalnızca kullanıcı tercihi, son tarama zamanı, agregasyonlar ve gerekliyse sürümlü yerel analiz önbelleği tutulur.
- Analiz önbelleği, `PHAsset` değiştiğinde veya uygulama/algoritma sürümü değiştiğinde geçersiz sayılır.
- `localIdentifier` mümkün olan en kısa süre tutulur; analitik, hata raporu veya export içine yazılmaz.
- Dosya boyutu PhotoKit/iCloud durumuna göre tahmini veya erişilemez olabilir. UI, toplam kazanımı "tahmini" olarak sunar ve belirsiz öğeleri ayrı belirtir.

## Satın alma ve Pro erişimi

- Dijital Pro erişimi yalnızca Apple In-App Purchase üzerinden, süresi dolmayan `non-consumable` ürün olarak satılır.
- Uygulama kart numarası, ödeme yöntemi veya fatura bilgisi toplamaz; ödeme arayüzü ve tahsilat Apple tarafından yönetilir.
- Ürün fiyatı uygulama içine sabit yazılmaz; App Store'un cihaz bölgesine göre döndürdüğü yerelleştirilmiş fiyat gösterilir.
- Pro hakkı yalnızca doğrulanmış App Store işlemiyle açılır. İptal, bekleyen işlem ve hata durumları başarılı satın alma gibi değerlendirilmez.
- Satın alımı geri yükleme kullanıcıya görünür bir aksiyon olarak sunulur ve uygulama yeniden kurulduğunda hak tekrar sorgulanır.
- İlk sürümde kendi ödeme backend'i kurulmaz. Basit hak kontrolü StoreKit işlemleriyle cihazda yapılır; sunucu doğrulaması veya App Store Server Notifications ancak ölçülmüş dolandırıcılık ya da destek ihtiyacı oluşursa ayrı ADR ile değerlendirilir.
- Native satın alma paketi Expo Go'da çalışmadığından entegrasyon development build, StoreKit sandbox ve TestFlight üzerinde doğrulanır.
- Ücretsiz temizlik limiti yapılandırılmadan önce ürün kararı kesinleştirilir; tahmini alanın kesin kota gibi kullanılmasından doğacak sınır durumları test edilir.

## Mühendislik kuralları

- View'lar tek sorumlulukla sınırlı olur; PhotoKit, Vision, depolama ve ödeme ayrıntıları ViewModel/servis katmanında kalır.
- Protokol tabanlı bağımlılık sınırları kullanılır; saf sınıflandırma ve gruplama kuralları birim test edilebilir olmalıdır.
- Hata türleri kontrollü bir sözlükten gelir; serbest hata mesajlarına medya metadatası eklenmez.
- Yeni paket eklemeden önce iOS uyumu, bakım durumu, gizlilik etkisi ve native API ile çözülememe gerekçesi değerlendirilir.
- Ağ veya backend ihtiyacı doğarsa önce ayrı ADR, veri envanteri, saklama/silme davranışı ve secret yönetimi hazırlanır. İstemciye secret eklenmez.

## Performans ve kabul hedefleri

Başlangıç hedefleri gerçek cihaz ölçümüyle doğrulanacaktır:

| Ölçüm | Başlangıç hedefi |
| --- | --- |
| Ana ekranın kullanılabilir olması | Soğuk açılıştan sonra 2 saniye altında |
| İlk kategori sonucunun görünmesi | 2.000 varlıkta 5 saniye altında |
| Tam MVP taraması | 10.000 varlıkta kullanıcıyı kilitlemeden, ilerleme göstergesiyle |
| Ana iş parçacığı | Uzun hesaplama veya thumbnail decode için bloklanmama |
| İptal | Kullanıcının iptalinden sonra görünür işin durması |

Bu sayılar hedef, garanti değildir. Cihaz modeli, iCloud durumu, kütüphane yapısı ve pil koşullarıyla birlikte ölçülerek güncellenir.
