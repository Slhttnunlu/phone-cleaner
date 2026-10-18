# Phone Cleaner — Ticari ürün stratejisi

Bu belge, 18 Ekim 2026 tarihinde yapılan pazar değerlendirmesi sonrasında kabul edilen ürün yönünü kaydeder. Buradaki fiyatlar, limitler ve dönüşüm oranları doğrulanması gereken hipotezlerdir; gizlilik, güven ve ödeme yaklaşımı ise ürün kararıdır.

## Ticari değerlendirme

Phone Cleaner'ın gelir üretme potansiyeli vardır; ancak kategori kalabalıktır ve mevcut MVP tek başına güçlü bir teknik savunma hattı oluşturmaz. İlk gerçekçi hedef, ürünü kârlı olabilecek bağımsız bir iOS uygulaması olarak doğrulamaktır. Büyüme; kod miktarından çok güven, App Store görünürlüğü, mağaza sayfası dönüşümü ve kullanıcıların ilk temizlikte aldığı değere bağlıdır.

AppMagic'in daha geniş **Antivirus & Cleaner** kategorisi için yayımladığı yaklaşık 949 milyon indirme ve 345,8 milyon dolar uygulama içi gelir verisi, talebin güçlü olduğuna dair yön gösterir; bu kategori yalnızca fotoğraf temizleyicilerinden oluşmadığı için Phone Cleaner'ın doğrudan pazar büyüklüğü kabul edilmez.

Cleaner Guru ve Swipewipe gibi ürünlerin yüksek değerlendirme sayıları talebi doğrularken; reklam, takip ve sık tekrarlanan abonelik modeli kullanıcı güveni açısından fırsat yaratır. Clever Cleaner'ın reklamsız seçeneği ise yalnızca “reklam yok” söyleminin benzersiz bir fark olmadığını gösterir.

## Kabul edilen konumlandırma

> iPhone'un için dürüst ve özel temizlik uygulaması. Ne sileceğine yalnızca sen karar verirsin.

Bu vaat aşağıdaki güven paketiyle desteklenir:

- Reklam yok.
- Abonelik yok; Pro süresi dolmayan tek seferlik satın alımdır.
- Kullanıcı hesabı yok.
- Fotoğraf ve video sunucuya yüklenmez; analiz cihazda yapılır.
- Kullanıcı onayı olmadan otomatik silme yoktur.
- Silme öncesinde açık seçim, büyük önizleme ve mümkün olduğunda karşılaştırma sunulur.
- iOS sistem onayı ve Son Silinenler albümünün davranışı kullanıcıya açıklanır.

Reklamsızlık tek başına ürünün ayırt edici özelliği değildir. **Reklamsız + takipsiz + aboneliksiz + cihazda çalışan + kullanıcı kontrollü** bütünlüğü ana farktır.

## Temel kullanıcı sonucu

Ürün yalnızca kategori listelemek yerine kullanıcıya somut bir sonuç sunmalıdır:

> Beş dakikada hedeflediğin kadar alan aç.

Planlanan yönlendirmeli akış:

```text
Hızlı temizlik / 1 GB / 3 GB / En fazla alan
  → ekran görüntüleri
  → büyük videolar
  → benzer çekimler
  → kesin tekrarlar
  → hedefe ilerleme ve kazanılan alan
```

Alan hedefleri kesin ürün limitleri değildir. Expo sürümündeki dosya boyutları tahmini olduğundan, bu deneyim güvenilir boyut ölçümü gerçek cihazda doğrulandıktan sonra açılır. Ücretsiz kota için öğe sayısı kullanmak daha öngörülebilir bir alternatif olarak test edilir.

## Fark yaratacak kullanıcı deneyimi

1. **Önce değer, sonra ödeme:** Kullanıcı izin verir, tarar, sonuçları görür ve içerikleri inceler. Paywall açılışta veya taramadan önce gösterilmez.
2. **Güvenli inceleme:** Tam ekran önizleme, seçim özeti, tahmini kazanım ve geri alınabilirlik bilgisi silmeden önce görünürdür.
3. **Açıklanabilir öneri:** Benzer fotoğraflarda “daha net”, “daha yüksek çözünürlüklü”, “aynı dakikada çekilmiş” gibi gerekçeler gösterilir. “AI seçti” tek başına gerekçe değildir.
4. **Önerilen korunan öğe:** Benzer grupta en iyi aday önerilebilir; kullanıcı bu seçimi değiştirmeden hiçbir öğe silinmez.
5. **Kısa oturum:** Sonsuz bir araç paneli yerine kullanıcıyı hedefe götüren, durdurulabilir ve sürdürülebilir temizlik adımları kullanılır.
6. **Dürüst sonuç:** Kesin olmayan dosya boyutu, benzerlik veya kalite değerlendirmesi açıkça “tahmini” olarak etiketlenir.
7. **Yerel ve erişilebilir deneyim:** İlk yayın için Türkçe ve İngilizce; VoiceOver, dinamik metin, kontrast ve yeterli dokunma alanları desteklenir.

## Reklam kararı

Uygulamaya reklam SDK'sı eklenmez. Temizlik uygulamalarının kullanım sıklığı sınırlı olduğu için reklam geliri görece düşük kalabilir; buna karşılık reklam ve takip SDK'ları fotoğraf erişimi isteyen bir üründe güveni zayıflatır, gizlilik beyanını karmaşıklaştırır ve uygulamayı ağırlaştırabilir.

Bu karar ileride yalnızca yeni bir ürün değerlendirmesiyle değiştirilebilir; varsayılan gelir modeli reklam değil, Phone Cleaner Pro'dur.

## Gelir modeli hipotezi

### Ücretsiz

- Galerinin tamamını tarama
- Sonuçları ve tahmini kazanımı görme
- Fotoğraf ve videoları tam ekran inceleme
- Sınırlı miktarda ilk temizlik

### Phone Cleaner Pro

- Sınırsız temizlik
- Gelişmiş benzer fotoğraf grupları
- Gelecekteki gelişmiş kategoriler
- Tek seferlik App Store satın alımı
- Apple Account üzerinden satın alımı geri yükleme

İlk test edilecek fiyat aralığı ABD mağazasında **7,99–14,99 USD**, başlangıç hipotezi **9,99 USD**'dir. Uygulama yerelleştirilmiş fiyatı StoreKit'ten alır; değer gerçek kullanıcı denemeleri ve mağaza dönüşümü görülmeden kesinleştirilmez.

Ücretsiz limit için iki aday test edilir:

- İlk başarılı temizlikte 25–50 öğe
- Güvenilir dosya boyutu ölçümü sağlanırsa yaklaşık 500 MB–1 GB

3 GB ücretsiz limit, değer algısı ve dönüşüm verisi görülmeden varsayılan yapılmaz. Ücretli sınır, kullanıcı seçim yaptıktan sonra fakat iOS silme onayından önce açıkça gösterilir.

## Gelir senaryosu

9,99 USD fiyat ve uygun Apple programında yüzde 15 komisyon varsayımıyla, vergi, iade ve kullanıcı edinme maliyeti hariç örnek senaryo:

| İndirme | Satın alma oranı | Yaklaşık net gelir |
| ---: | ---: | ---: |
| 10.000 | %2 | 1.698 USD |
| 10.000 | %5 | 4.246 USD |
| 100.000 | %2 | 16.983 USD |
| 100.000 | %5 | 42.458 USD |

Bu bir tahmin veya gelir garantisi değildir. Amaç, dönüşüm oranının dağıtım ve ürün ekonomisi üzerindeki etkisini görünür kılmaktır.

## Bilinçli olarak yapılmayacaklar

- Haftalık veya agresif abonelik modeli
- Açılışta ya da taramadan önce paywall
- Kullanıcının görmediği veya onaylamadığı otomatik silme
- “RAM temizleme” veya “iPhone'u hızlandırma” gibi yanıltıcı vaatler
- İlk sürümde kişiler, e-posta, takvim veya şarj animasyonu gibi odağı dağıtan araçlar
- Açıklanamayan otomatik “AI temizliği”
- Gereksiz bildirim ve takip SDK'ları

Apple Photos kesin tekrarları zaten algılayıp birleştirebildiği için ürün yalnızca duplicate temizliği üzerine konumlandırılmaz. Değer; ekran görüntülerini, büyük medyayı ve ileride açıklanabilir benzer grupları tek, güvenli ve hedef odaklı akışta birleştirmektir.

## Doğrulama planı

1. Mevcut izin, tarama, önizleme, seçim ve silme akışını gerçek cihaz senaryolarında güvenilir hale getir.
2. Türkçe ve İngilizce ürün metinlerini; güven ve gizlilik anlatısını tamamla.
3. Reklamsız ve takipsiz davranışı App Privacy beyanı ve gizlilik politikasıyla doğrula.
4. Tek seferlik Pro, satın alımı geri yükleme ve ücretsiz limit varyantını StoreKit sandbox/TestFlight'ta test et.
5. 500–1.000 kullanıcı/indirme ölçeğinde tarama tamamlama, ilk temizlik ve ücretliye dönüşüm verisi topla.
6. Sonuçlara göre hedeflenen alan akışını ve açıklanabilir benzer fotoğraf gruplarını önceliklendir.

İlk ürün doğrulamasında izlenecek temel huni:

```text
Mağaza görüntüleme
  → indirme
  → fotoğraf izni
  → tarama tamamlama
  → kategori inceleme
  → ilk başarılı temizlik
  → Pro ekranı
  → satın alma
```

Analitik olayları medya, dosya adı, konum, Photos varlık kimliği veya kullanıcı içeriği içermez.

## Araştırma kaynakları

- [AppMagic — Mobile Market Landscape 2026](https://appmagic.rocks/files/view/upload/Reports/EN_MobileMarkeLandscape2026.pdf)
- [Cleaner Guru — App Store](https://apps.apple.com/us/app/cleaner-guru-clean-up-storage/id1476380919)
- [Swipewipe — App Store](https://apps.apple.com/us/app/swipewipe-photo-cleaner/id1583884012)
- [Clever Cleaner — App Store](https://apps.apple.com/us/app/clever-cleaner-ai-cleanup-app/id1666645584)
- [Apple Support — Find and delete duplicate photos and videos](https://support.apple.com/en-in/104967)

Kaynaklardaki değerlendirme sayıları, fiyatlar ve mağaza konumları zamanla değişebilir; yeni fiyatlandırma veya yayın kararı öncesinde tekrar kontrol edilir.
