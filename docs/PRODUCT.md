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

## Riskler ve ürün kararları

| Risk | Karar |
| --- | --- |
| Yanlış silme | Otomatik silme yok; seçimi kullanıcı yapar, iOS sistem onayı gerekir. |
| Sınırlı Photos izni | Yalnızca erişilen varlıklar sonuçlara dahil edilir; sınır görünür biçimde açıklanır. |
| iCloud optimize medya | Boyut ve önizleme eksik olabilir; belirsizlik kullanıcıya gösterilir. |
| Benzerlik hatası | Benzer/bulanık analiz P1'de deneysel başlar, kesin karar olarak gösterilmez. |
| Gizlilik algısı | Yerel çalışma, veri minimizasyonu ve açık izin dili temel ürün davranışıdır. |
