# Phone Cleaner — Ürün tanımı

## Problem

iPhone kullanıcıları, fotoğraf kütüphanesindeki ekran görüntüleri, büyük videolar ve olası tekrarlar nedeniyle depolama alanının nerede kullanıldığını anlamakta zorlanır. iOS'un sistem araçları her kullanıcı için yeterli inceleme ve seçim deneyimi sunmayabilir.

## MVP hipotezi

Kullanıcıya yerel, anlaşılır ve güvenli bir kategori özeti sunulursa; kullanıcı en az bir kategoriyi inceleyip, seçtiği içerikleri sistem onayıyla silebilir ve depolama alanı kazanımını anlayabilir.

## Başarı metrikleri

- İzin isteyen kullanıcıların taramayı tamamlanma oranı
- Taramayı tamamlayan kullanıcıların en az bir kategori açma oranı
- İnceleme yapan kullanıcıların sistem silme onayı akışını başlatma oranı
- Başarılı silme sonrası yeniden tarama veya geri dönüş oranı
- Tarama hatası, iptal ve bellek baskısı oranı

Bu olaylara medya içeriği, dosya adı, konum, varlık kimliği veya seçim detayı eklenmez.

## Gelir modeli kararı

İlk ücretli sürüm abonelik kullanmaz. Phone Cleaner Pro, süresi dolmayan tek seferlik bir App Store satın alımı (`non-consumable`) olarak sunulur.

**Ücretsiz**

- Galeriyi tarama
- Sonuçları ve tahmini alanı görme
- Fotoğraf ve videoları inceleme
- Belirlenecek bir sınıra kadar temizlik yapma

**Phone Cleaner Pro**

- Sınırsız temizlik
- Gelecekte eklenecek kesin tekrarlar ve gelişmiş kategorilere erişim
- Tek seferlik satın alma ve Apple Account üzerinden satın alımı geri yükleme

Ücretsiz temizlik sınırı ürün ölçümleri ve gerçek kullanıcı denemeleri tamamlanmadan sabitlenmez. 1 GB, 3 GB veya öğe sayısı gibi seçenekler ayrı bir ürün kararı olarak değerlendirilecektir. Kullanıcı tarama ve inceleme yapmadan ödeme ekranına zorlanmaz; ücretli sınır, silme işleminden önce açık ve yanıltıcı olmayan bir dille gösterilir.

## Riskler ve ürün kararları

| Risk | Karar |
| --- | --- |
| Yanlış silme | Otomatik silme yok; seçimi kullanıcı yapar, iOS sistem onayı gerekir. |
| Sınırlı Photos izni | Yalnızca erişilen varlıklar sonuçlara dahil edilir; sınır görünür biçimde açıklanır. |
| iCloud optimize medya | Boyut ve önizleme eksik olabilir; belirsizlik kullanıcıya gösterilir. |
| Benzerlik hatası | Benzer/bulanık analiz P1'de deneysel başlar, kesin karar olarak gösterilmez. |
| Gizlilik algısı | Yerel çalışma, veri minimizasyonu ve açık izin dili temel ürün davranışıdır. |
| Agresif paywall | Tarama ve inceleme ücretsiz kalır; ücretli sınır silme öncesinde açıkça gösterilir. |
| Abonelik güveni | İlk sürümde abonelik yoktur; Pro erişimi tek seferlik satın alımdır. |
