# Phone Cleaner — Ürün görevleri

Bu dosya ürün ve mühendislik işlerinin kaynak planıdır. Büyük bir işe başlamadan önce ilgili madde alt görevlere ayrılır; durum yalnızca kod ve doğrulama tamamlandığında güncellenir.

## Mevcut durum — 19 Ekim 2026

### Kodlanmış ve otomatik doğrulanmış

- [x] Expo iOS uygulama kabuğu, uygulama kimliği ve Photos izin metinleri
- [x] Tam/reddedilmiş/sınırlı Photos izni için temel ekranlar ve sınırlı erişim seçimini düzenleme yolu
- [x] Screenshots, 12 MP+ fotoğraflar ve 60 sn+ videolar için yerel tarama kategorileri
- [x] Taramada tam ekran animasyon; sonuç görünmeden önce en az 3,5 saniye bekleme
- [x] Kategori inceleme, görsel grid, tekli/toplu seçim ve tahmini alan hesabı
- [x] Kullanıcının seçimi sonrası `deleteAssetsAsync` ile iOS sistem onaylı silme isteği
- [x] Lint, 23 birim/UI testi, Expo Doctor ve iOS Expo export paketi
- [x] EAS preview/production yapılandırması ile gerçek cihaz ve TestFlight yayın kontrol listeleri
- [x] Expo Go ile gerçek iPhone smoke testi: iki ekran görüntüsü seçildi, iOS sistem silme onayı verildi ve başarı sonucu görüldü
- [x] Türkçe/İngilizce uygulama metinleri ve yerelleştirilmiş iOS Photos izin açıklamaları
- [x] Kullanıcının uzun taramayı iptal edebilmesi ve güvenli iptal sonucu
- [x] Reklamsız/takipsiz ilk build için gizlilik politikası ve App Store metadata taslakları
- [x] GitHub Actions üzerinde lint, test ve iOS JavaScript export kalite kapısı
- [x] Ana Sayfa/Ayarlar alt navigasyonu, Ayarlar içinde kalıcı dil seçimi ve izin/gizlilik özeti
- [x] Ana ekran güven mesajı, tarama sonrası toplam öğe/alan özeti ve küçük ekranlar için kaydırılabilir yerleşim
- [x] 3,4 saniyelik açılış animasyonu, tam ekran önizlemede döngüsel sağ/sol gezinme
- [x] Gelecekte yeni diller eklenebilecek liste tabanlı dil seçici ve ayrı sürüm ayarı satırı

### Gerçek cihaz veya yayın erişimi gerektiren doğrulamalar

- [ ] iPhone'da tam/sınırlı/reddedilmiş izin, boş/iCloud kütüphane ve silme iptalinin tüm kabul senaryoları
- [ ] Gerçek iCloud kütüphanesinde boyut tahmini, uzun tarama ve uygulama performansı
- [ ] VoiceOver/dinamik metin/kontrast denetimi
- [ ] Apple Developer/EAS hesabı ile TestFlight build, App Store Connect kaydı ve mağaza varlıkları

> Not: Aşağıdaki P0/P1 görevleri, ilgili kabul kriterleri gerçek cihazda veya yayın ortamında tamamlanmadan işaretlenmez.

## P0 — Ürün ve güvenlik temeli

- [ ] Hedef kullanıcı, ana problem, MVP sınırı ve başarı metriklerini `docs/PRODUCT.md` içinde kesinleştir.
- [ ] Uygulama adı, bundle identifier, iOS deployment target ve desteklenen cihazları belirle.
- [ ] Gizlilik politikası için herkese açık HTTPS adresi ve destek e-postasını kesinleştir; App Privacy beyanını gönderilecek binary ile doğrula.
- [x] İçeriksiz analitik olay sözleşmesini tanımla; fotoğraf, video, dosya adı, konum ve varlık kimliğini yasakla.
- [x] ESLint, Jest ve iOS export kontrollerini GitHub Actions kalite kapısına bağla.

## P0 — Yerel tarama MVP'si

- [ ] SwiftUI uygulama kabuğu, onboarding, ana özet ekranı ve ayarları oluştur.
- [ ] Photo Library için tam, sınırlı, reddedilmiş ve değişmiş izin durumlarını yönet.
- [x] Fotoğraf ve video varlıklarını sayfalı ve kullanıcı tarafından iptal edilebilir biçimde tara.
- [ ] Screenshots kategorisini PhotoKit metadata'sı ile listele.
- [ ] Büyük videoları süre, piksel boyutu ve erişilebilen kaynak boyutuna göre sırala; boyut güvenilir değilse kullanıcıya açıkla.
- [ ] Büyük fotoğrafları güvenli bir eşik ve tahmini alan bilgisiyle listele.
- [ ] Aynı içerik için kesin tekrar adaylarını tanımla; yanlış pozitif riskini belgeleyip gerçek cihaz testleriyle doğrula.
- [ ] Kategori, öğe ve grup bazında önizleme; seçim ve seçimin yaklaşık alan etkisini ekle.
- [ ] Kullanıcının seçtiği varlıklar için PhotoKit silme isteği oluştur; sistem onayı, iptal, hata ve başarı sonucunu yönet.
- [ ] Tarama başlangıcı/bitişi, izin durumu, boş sonuç, değişmiş kütüphane ve iptal durumları kodlandı; iCloud ve bellek baskısı dahil gerçek cihazda doğrula.

## P0 — Kalite ve kabul

- [ ] Saf sınıflandırma, sıralama, alan toplama ve grup kuralları için birim testleri yaz.
- [x] İzin → tarama → inceleme → seçim → uygulama onayı → silme sonucu akışını UI testleriyle kapsa; iOS sistem penceresinin kendisi gerçek cihaz testinde doğrulanır.
- [ ] Gerçek iPhone'da tam/sınırlı/reddedilmiş izin, boş kütüphane, 10.000+ varlık, iCloud optimize edilmiş medya ve silme sonrası yenileme testlerini tamamla.
- [ ] VoiceOver, dinamik metin, kontrast, odak sırası ve minimum dokunma alanları için erişilebilirlik denetimi yap.
- [ ] Tarama süresi, bellek, enerji ve ana iş parçacığı kullanımını ölç; kabul sınırlarını `docs/ARCHITECTURE.md` içinde kaydet.

## P1 — Akıllı öneriler

- [ ] Vision feature print ile benzer fotoğraf adayları için deney tasarla; cihaz, kütüphane boyutu ve doğruluk ölçümünü belirle.
- [ ] Bulanıklık/kalite puanı için açıklanabilir bir yerel heuristik veya Vision yaklaşımı seç; yanıltıcı öneri riskini test et.
- [ ] Her benzer grup için varsayılan korunan öğeyi ve kullanıcının bunu değiştirebilmesini tasarla.
- [ ] Analiz önbelleğinin sürümleme, iptal, kütüphane değişikliği ve disk sınırını uygula.
- [ ] Gerçek kullanıcı doğrulaması olmadan benzer/bulanık kategorilerini varsayılan açık yapma.

## P1 — Gelir modeli ve yayın hazırlığı

- [x] Ücretsiz tarama/inceleme ve tek seferlik Phone Cleaner Pro modelini ürün ve mimari dokümanlarında tanımla.
- [x] Reklamsız, takipsiz, aboneliksiz ve cihazda çalışan ürün konumlandırmasını `docs/PRODUCT_STRATEGY.md` içinde kaydet.
- [x] Türkçe ve İngilizce güven mesajlarını izin ekranı, ana akış ve App Store metinlerine uygula.
- [ ] Hedeflenen alan (hızlı/1 GB/3 GB/en fazla) akışını güvenilir dosya boyutu ölçümüyle prototiple.
- [ ] Ücretsiz temizlik limitini (alan veya öğe sayısı), fiyat hipotezini ve paywall gösterim anını kullanıcı denemeleriyle kesinleştir.
- [ ] App Store Connect'te `non-consumable` Pro ürününü ve Paid Apps sözleşme/banka/vergi gereksinimlerini hazırla.
- [ ] Native IAP paketiyle ürün sorgulama, satın alma, hak kontrolü ve satın alımı geri yükleme akışını uygula.
- [ ] İptal, bekleyen işlem, çevrimdışı kullanım, yeniden kurulum ve iade senaryolarını StoreKit sandbox/TestFlight üzerinde doğrula.
- [ ] İkon, ekran görüntüleri, App Store açıklaması, destek sayfası ve yaş derecelendirmesini hazırla.
- [ ] TestFlight dağıtımı, sürüm notu, hata takibi ve geri alma prosedürünü tanımla.

TestFlight hazırlık durumu ve hesap/cihaz gerektiren son blokajlar [docs/TESTFLIGHT_READINESS.md](docs/TESTFLIGHT_READINESS.md) içinde tutulur.

## Production'a çıkış kriterleri

- [ ] P0 kapsamı tamamlandı; CI build ve testleri yeşil.
- [ ] Tüm silme işlemleri yalnızca kullanıcının görünür seçimi ve iOS sistem onayıyla gerçekleşiyor.
- [ ] Tam, sınırlı ve reddedilmiş Fotoğraflar izni gerçek cihazlarda doğrulandı.
- [ ] Büyük/iCloud kütüphanelerinde uygulama çökmüyor, kullanıcı iptal edebiliyor ve sonuçlar anlaşılır.
- [ ] Gizlilik politikası, App Privacy beyanı, destek kanalı ve crash reporting hazır.
- [ ] Paywall varsa satın alma, geri yükleme ve abonelik yönetimi App Review yönergelerine uygun doğrulandı.
