# Phone Cleaner — Kabul testleri

Bu senaryolar, P0 uygulaması gerçek iPhone cihazda doğrulanmadan tamamlandı sayılmaz.

## Otomatik regresyon durumu — 19 Ekim 2026

Toplam 23 Jest testi aşağıdaki uygulama davranışlarını doğrular:

- İlk izin isteği, reddedilmiş izinde iOS Ayarlar yönlendirmesi ve sınırlı kütüphane seçicisi
- Başarılı, boş, hatalı ve kullanıcı tarafından iptal edilen tarama durumları
- Screenshots, büyük fotoğraf ve uzun video sınıflandırma eşikleri ile tahmini alan hesabı
- Yerel fotoğraf/video thumbnail üretimi, thumbnail önbelleği ve iCloud varlığını indirmeden tanıma
- Tam ekran fotoğraf önizleme, önceki/sonraki gezinme ve açık önizlemede isteğe bağlı iCloud indirme
- Tekil seçim, tümünü seçme, seçimi kaldırma ve seçili alanın hesaplanması
- Uygulama silme onayı, tamamlanmayan native silmede seçimi koruma, hata ve başarı sonucu
- Kalıcı dil ve koyu görünüm tercihleri

Otomatik kontroller `npm test`, `npm run lint` ve `npm run test:export:ios` komutlarıyla çalıştırılır. Native Photos izin/silme pencereleri taklit edilmez; aşağıdaki gerçek cihaz senaryoları ayrıca tamamlanır.

## Kalan gerçek cihaz kapısı

- iOS sistem silme penceresinde **Vazgeç** seçildiğinde başarı gösterilmediğini doğrula.
- Sınırlı Photos erişiminde seçimi değiştirip yeniden taramayı doğrula.
- iCloud optimize edilmiş medya için ilk ve sonraki önizleme sürelerini doğrula.
- Boş kütüphane ve büyük kütüphane taramasını gerçek cihazda doğrula.
- VoiceOver, büyük dinamik metin ve kontrast kontrolünü tamamla.

## İzin ve başlangıç

- Fotoğraf izni ilk kez istendiğinde kullanıcıya yerel çalışma ve neden erişim gerektiği açıklanır.
- İzin reddedildiğinde tarama başlamaz; Ayarlar'a yönlendirme ve tekrar deneme yolu görünür.
- Sınırlı erişimde sonuçların yalnızca seçili medya ile sınırlı olduğu belirtilir.
- Boş veya erişilebilir öğesi olmayan kütüphane için anlaşılır boş durum gösterilir.

## Tarama ve inceleme

- Screenshots, büyük video ve büyük fotoğraf kategorileri yanlış etiket olmadan görünür.
- Uzun taramada ilerleme veya yükleniyor durumu gösterilir; kullanıcı taramayı iptal edebilir.
- 10.000+ varlıklı test kütüphanesinde arayüz yanıt vermeye devam eder.
- iCloud optimize edilmiş veya kaynak boyutu okunamayan varlıklar hata oluşturmadan belirsiz/tahmini durumla görünür.
- Tarama sonrasında kütüphane değişirse kullanıcıya sonuçların güncel olmayabileceği ve yeniden tarama seçeneği sunulur.

## Seçim ve silme

- Hiç seçim yokken cleanup eylemi başlatılamaz.
- Tahmini geri kazanım yalnızca seçili ve boyutu hesaplanabilen varlıklarla tutarlı gösterilir.
- Kullanıcı seçim ekranından her öğeyi inceleyip seçimi değiştirebilir.
- Silme isteği PhotoKit sistem onayını gösterir; uygulama bu onayı taklit etmez veya atlamaz.
- Kullanıcı sistem onayını iptal ederse seçim veya sonuç yanlışlıkla başarılı gösterilmez.
- Başarılı işlemden sonra sonuç yenilenir; başarısız işlemde neden ve güvenli tekrar deneme yolu gösterilir.

## Erişilebilirlik ve gizlilik

- VoiceOver ile kategori, seçim durumu, tahmini alan ve silme eylemi anlaşılır erişilebilir etiketlere sahiptir.
- Dinamik metin en büyük boyutta ana akışı bozmadan kullanılabilir.
- Etkileşimli öğeler yeterli kontrast ve dokunma alanına sahiptir.
- Test logları ve analitik olaylar fotoğraf/video, dosya adı, konum, `localIdentifier` veya küçük resim içermez.
