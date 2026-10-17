# Phone Cleaner — Gerçek iPhone test kaydı

Bu form, Expo Go hızlı denemesi ile TestFlight build kabulünün yerini tutmaz. Her testte cihaz modeli, iOS sürümü, uygulama sürümü/build numarası ve sonuç kaydedilir. Fotoğraf, dosya adı, konum veya `localIdentifier` yazılmaz.

## Test ortamı

| Alan | Değer |
| --- | --- |
| Tarih | |
| Test eden | |
| Cihaz modeli | |
| iOS sürümü | |
| Uygulama sürümü / build | |
| Dağıtım | Expo Go / TestFlight |
| Kütüphane şekli | boş / normal / 10.000+ varlık / iCloud optimize |

## Zorunlu senaryolar

| Senaryo | Beklenen sonuç | Sonuç |
| --- | --- | --- |
| İlk açılış | Yerel işleme açıklaması ve Photos izni görünür. | |
| İzin reddi | Tarama başlamaz; açıklayıcı tekrar deneme/Ayarlar yolu görünür. | |
| Sınırlı erişim | Yalnızca seçili varlıklar gösterilir; sınır kullanıcıya açıklanır. | |
| Tam erişim | Screenshots, yüksek çözünürlüklü fotoğraf ve uzun video kategorileri taranır. | |
| Boş kütüphane | Hata/çökme olmadan boş kategori durumu görünür. | |
| Normal kütüphane | Grid önizlemeleri açılır; tekil/toplu seçim güncellenir. | |
| Sistem silme onayı | Seçimden sonra iOS onayı görünür; uygulama onayı atlamaz. | |
| Sistem silme iptali | Başarılı işlem mesajı gösterilmez; seçim korunur. | |
| Başarılı silme | Kategoriler güncellenir, yanlış başarı/alan değeri gösterilmez. | |
| iCloud optimize medya | Hata olmadan sonuç görünür; alanın tahmini olduğu belirtilir. | |
| Uzun tarama | Arayüz yanıt verir; kullanıcı uygulamadan çıkıp geri döndüğünde çökme olmaz. | |
| Erişilebilirlik | VoiceOver, dinamik metin ve dokunma alanları ana akışta kullanılabilir. | |

## Bilinen Expo Go sınırı

Expo Go sürümü dosyanın gerçek byte boyutunu sağlamaz. Bu nedenle bu sürüm, genişlik/yükseklik ve video süresinden türetilen tahmini alan gösterir. Test sırasında iOS Ayarlar depolama ekranı ile karşılaştırma yapılabilir; fark, uygulama hatası olarak değil "tahmin" sınırı olarak kaydedilir.

## Kabul kararı

- [ ] Tüm zorunlu senaryolar geçti.
- [ ] Kritiklik seviyesi yüksek açık hata yok.
- [ ] TestFlight build için uygun.
- [ ] Yeniden test gerekli; açık maddeler aşağıda listelendi.

### Açık maddeler

| Açıklama | Öncelik | Sahip | Durum |
| --- | --- | --- | --- |
| | | | |
