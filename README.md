# kiosk-software-desktop-app

## Otomatik Güncelleme Notları

GitHub üzerinden güncelleme için şu koşulları sağlayın:

- GitHub Releases'ta "Latest" olarak işaretlenen bir Production Release olmalı.
- Release'e Windows için üretilen kurulum dosyası ve `latest.yml` dosyası yüklenmiş olmalı (workflow bunu otomatik yapar).
- `package.json > build.publish` sahibi ve repo adı doğru olmalı: owner `iOwsla`, repo `kiosk-software-desktop-app`.
- Uygulamayı installer'dan kurup production modda çalıştırın.

Sorun giderme:

- 406/Unable to find latest version hatası: Genelde repo/owner adı veya Latest release eksikliği ya da `latest` endpoint'e erişimde Accept header sorunudur. Bu projede Accept ve User-Agent başlığı ayarlanmıştır.