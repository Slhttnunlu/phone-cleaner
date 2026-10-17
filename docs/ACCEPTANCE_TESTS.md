# Phone Cleaner — Kabul testleri

Bu senaryolar, P0 uygulaması gerçek iPhone cihazda doğrulanmadan tamamlandı sayılmaz.

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
