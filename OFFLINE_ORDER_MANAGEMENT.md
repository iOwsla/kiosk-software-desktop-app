# Offline Sipariş Yönetimi Sistemi

Bu dokümantasyon, kiosk uygulamasının offline/online sipariş yönetimi sistemini açıklar.

## Genel Bakış

Sistem, internet bağlantısının durumuna göre otomatik olarak çalışır:
- **Online Mod**: İnternet varsa siparişler direkt API'ye gönderilir
- **Offline Mod**: İnternet yoksa siparişler yerel veritabanına kaydedilir
- **Otomatik Senkronizasyon**: İnternet geldiğinde bekleyen siparişler otomatik olarak senkronize edilir

## Özellikler

### 🌐 Otomatik İnternet Kontrolü
- Her sipariş oluşturma isteğinde internet bağlantısı kontrol edilir
- Hızlı ve güvenilir internet kontrolü (Google DNS ve Google.com)
- Timeout mekanizması ile hızlı yanıt

### 💾 Offline Sipariş Kaydetme
- İnternet yoksa siparişler QuickDB'ye kaydedilir
- Benzersiz sipariş ID'leri oluşturulur
- Sipariş durumu takibi (pending, syncing, synced, failed)
- Deneme sayısı ve hata logları

### 🔄 Otomatik Senkronizasyon
- Her 30 saniyede bir internet kontrolü
- Bekleyen siparişlerin otomatik senkronizasyonu
- Maksimum 5 deneme hakkı
- Başarısız siparişler için hata logları

### 📊 Sipariş Durumu Takibi
- Offline sipariş istatistikleri
- Manuel senkronizasyon seçeneği
- Bekleyen siparişleri listeleme
- Senkronize edilmiş siparişleri temizleme

## API Endpoint'leri

### 1. Sipariş Oluşturma
```http
POST /api/orders/create
```

**Davranış:**
- İnternet varsa: Direkt API'ye gönderir (HTTP 201)
- İnternet yoksa: Offline kaydeder (HTTP 202)
- API hatası durumunda: Offline kaydeder (HTTP 202)

**Başarılı Online Yanıt:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "orderId": "api_order_123",
    "message": "Sipariş başarıyla oluşturuldu"
  }
}
```

**Offline Yanıt:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "orderId": "offline_order_1703123456789_abc123def",
    "isOffline": true,
    "message": "Sipariş offline olarak kaydedildi. İnternet bağlantısı geldiğinde otomatik olarak senkronize edilecek."
  }
}
```

### 2. Offline Durum Kontrolü
```http
GET /api/orders/offline/status
```

**Yanıt:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "pending": 5,
    "synced": 12,
    "failed": 1,
    "total": 18,
    "hasInternet": true,
    "lastCheck": "2024-01-15T10:30:00.000Z"
  },
  "message": "Offline sipariş durumu başarıyla alındı"
}
```

### 3. Manuel Senkronizasyon
```http
POST /api/orders/offline/sync
```

**Yanıt:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "synced": 4,
    "failed": 1,
    "total": 5
  },
  "message": "Senkronizasyon tamamlandı. 4 başarılı, 1 başarısız"
}
```

### 4. Bekleyen Siparişleri Listeleme
```http
GET /api/orders/offline/pending
```

**Yanıt:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "orders": [
      {
        "id": "offline_order_1703123456789_abc123def",
        "payload": { /* sipariş verisi */ },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "attempts": 2,
        "lastAttempt": "2024-01-15T10:15:00.000Z",
        "status": "pending",
        "error": null
      }
    ],
    "count": 1
  },
  "message": "Bekleyen siparişler başarıyla alındı"
}
```

### 5. Senkronize Edilmiş Siparişleri Temizleme
```http
DELETE /api/orders/offline/cleanup
```

**Yanıt:**
```json
{
  "success": true,
  "status": "success",
  "data": {
    "cleanedCount": 12
  },
  "message": "12 senkronize edilmiş sipariş temizlendi"
}
```

## Sipariş Durumları

| Durum | Açıklama |
|-------|----------|
| `pending` | Senkronizasyon bekliyor |
| `syncing` | Şu anda senkronize ediliyor |
| `synced` | Başarıyla senkronize edildi |
| `failed` | Senkronizasyon başarısız |

## Teknik Detaylar

### İnternet Kontrolü
```typescript
// Hızlı internet kontrolü
const hasInternet = await checkInternetConnection(5000);

// Alternatif hızlı kontrol
const hasInternet = await quickInternetCheck();
```

### Offline Sipariş Kaydetme
```typescript
const offlineResult = await offlineOrderService.saveOfflineOrder(payload);
console.log(offlineResult.orderId); // offline_order_1703123456789_abc123def
```

### Manuel Senkronizasyon
```typescript
const syncResult = await offlineOrderService.syncAllPendingOrders();
console.log(`${syncResult.synced} sipariş senkronize edildi`);
```

## Konfigürasyon

### Otomatik Senkronizasyon Aralığı
```typescript
// OfflineOrderService.ts içinde
setInterval(async () => {
  // Senkronizasyon kontrolü
}, 30000); // 30 saniye
```

### Maksimum Deneme Sayısı
```typescript
// Maksimum 5 deneme
if (order.attempts >= 5) {
  console.log('Maksimum deneme sayısına ulaşıldı');
}
```

### İnternet Kontrolü Timeout
```typescript
// 5 saniye timeout
const hasInternet = await checkInternetConnection(5000);
```

## Kullanım Senaryoları

### Senaryo 1: Normal Online Çalışma
1. Kullanıcı sipariş oluşturur
2. İnternet kontrolü yapılır (✅ Var)
3. Sipariş direkt API'ye gönderilir
4. Başarılı yanıt döndürülür

### Senaryo 2: İnternet Yok
1. Kullanıcı sipariş oluşturur
2. İnternet kontrolü yapılır (❌ Yok)
3. Sipariş offline kaydedilir
4. "Offline kaydedildi" mesajı döndürülür
5. İnternet geldiğinde otomatik senkronize edilir

### Senaryo 3: API Hatası
1. Kullanıcı sipariş oluşturur
2. İnternet kontrolü yapılır (✅ Var)
3. API'ye gönderilir ama hata alınır
4. Sipariş offline kaydedilir
5. "Offline kaydedildi" mesajı döndürülür

### Senaryo 4: İnternet Geri Geldi
1. Otomatik senkronizasyon çalışır (her 30 saniye)
2. İnternet kontrolü yapılır (✅ Var)
3. Bekleyen siparişler API'ye gönderilir
4. Başarılı siparişler 'synced' olarak işaretlenir

## Hata Yönetimi

### İnternet Kontrolü Hataları
- Timeout durumunda internet yok kabul edilir
- Alternatif endpoint'ler denenir
- Hata logları tutulur

### Senkronizasyon Hataları
- Maksimum 5 deneme hakkı
- Her başarısız denemede attempt sayısı artırılır
- Hata mesajları kaydedilir
- Başarısız siparişler 'failed' durumuna geçer

### Validation Hataları
- Zod schema ile doğrulama
- Detaylı hata mesajları
- HTTP 400 status kodu

## Performans Optimizasyonları

### İnternet Kontrolü
- Hızlı HEAD request kullanımı
- Kısa timeout süreleri
- Alternatif endpoint'ler

### Senkronizasyon
- Siparişler arasında 1 saniye bekleme
- Maksimum deneme sınırı
- Batch işleme yerine tek tek gönderim

### Veritabanı
- QuickDB ile hızlı yerel depolama
- Senkronize edilmiş siparişlerin otomatik temizlenmesi
- İndeksli arama

## Güvenlik

### Veri Bütünlüğü
- Sipariş verilerinin tam olarak saklanması
- Benzersiz ID oluşturma
- Timestamp bilgileri

### Hata Logları
- Hassas bilgilerin loglanmaması
- Hata detaylarının güvenli saklanması
- Debug bilgileri

## Monitoring ve Logging

### Otomatik Loglar
```
✅ İnternet bağlantısı mevcut, API'ye gönderiliyor...
❌ İnternet bağlantısı yok, offline kaydediliyor...
🔄 Manuel senkronizasyon başlatılıyor...
✅ Sipariş başarıyla senkronize edildi: offline_order_123
❌ Sipariş senkronizasyon hatası: offline_order_456
🧹 12 senkronize edilmiş sipariş temizlendi.
```

### İstatistikler
- Toplam offline sipariş sayısı
- Bekleyen sipariş sayısı
- Başarılı senkronizasyon oranı
- Ortalama senkronizasyon süresi

## Frontend Entegrasyonu

### React Hook Örneği
```typescript
const useOfflineOrders = () => {
  const [stats, setStats] = useState(null);
  
  const getStatus = async () => {
    const response = await fetch('/api/orders/offline/status');
    const data = await response.json();
    setStats(data.data);
  };
  
  const syncOrders = async () => {
    const response = await fetch('/api/orders/offline/sync', {
      method: 'POST'
    });
    return response.json();
  };
  
  return { stats, getStatus, syncOrders };
};
```

### UI Bileşeni Örneği
```jsx
const OfflineStatus = () => {
  const { stats, getStatus } = useOfflineOrders();
  
  return (
    <div className="offline-status">
      <div className={`status ${stats?.hasInternet ? 'online' : 'offline'}`}>
        {stats?.hasInternet ? '🟢 Online' : '🔴 Offline'}
      </div>
      
      {stats?.pending > 0 && (
        <div className="pending-orders">
          📋 {stats.pending} sipariş senkronizasyon bekliyor
        </div>
      )}
    </div>
  );
};
```

## Sonuç

Bu offline sipariş yönetimi sistemi:
- ✅ İnternet kesintilerinde kesintisiz çalışma
- ✅ Otomatik senkronizasyon
- ✅ Güvenilir veri saklama
- ✅ Detaylı durum takibi
- ✅ Manuel kontrol seçenekleri
- ✅ Performans optimizasyonları
- ✅ Kapsamlı hata yönetimi

sağlar ve kiosk uygulamasının her koşulda çalışmasını garanti eder.