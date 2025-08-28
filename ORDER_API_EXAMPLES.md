# Order API Kullanım Örnekleri

Bu dosya, QuickDB kullanarak oluşturulan Order API endpoint'lerinin nasıl kullanılacağını gösterir.

## Temel URL
```
http://localhost:3001/api/order
```

## 1. Sipariş Oluşturma

**POST** `/api/order/create`

### Örnek İstek:
```json
{
  "orderId": "ORD-2024-001",
  "customerInfo": {
    "name": "Ahmet Yılmaz",
    "phone": "+90 555 123 4567",
    "email": "ahmet@example.com"
  },
  "items": [
    {
      "productId": "PRD-001",
      "name": "Hamburger",
      "quantity": 2,
      "price": 25.50,
      "total": 51.00
    },
    {
      "productId": "PRD-002",
      "name": "Kola",
      "quantity": 2,
      "price": 8.00,
      "total": 16.00
    }
  ],
  "totalAmount": 67.00
}
```

### Örnek Yanıt:
```json
{
  "success": true,
  "message": "Sipariş başarıyla oluşturuldu",
  "data": {
    "orderId": "ORD-2024-001",
    "customerInfo": {
      "name": "Ahmet Yılmaz",
      "phone": "+90 555 123 4567",
      "email": "ahmet@example.com"
    },
    "items": [...],
    "totalAmount": 67.00,
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 2. Sipariş Getirme

**GET** `/api/order/:orderId`

### Örnek İstek:
```
GET /api/order/ORD-2024-001
```

### Örnek Yanıt:
```json
{
  "success": true,
  "data": {
    "orderId": "ORD-2024-001",
    "customerInfo": {...},
    "items": [...],
    "totalAmount": 67.00,
    "status": "pending",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  }
}
```

## 3. Tüm Siparişleri Getirme

**GET** `/api/order/`

### Örnek Yanıt:
```json
{
  "success": true,
  "data": [
    {
      "orderId": "ORD-2024-001",
      "customerInfo": {...},
      "totalAmount": 67.00,
      "status": "pending"
    },
    {
      "orderId": "ORD-2024-002",
      "customerInfo": {...},
      "totalAmount": 45.50,
      "status": "completed"
    }
  ],
  "count": 2
}
```

## 4. Sipariş Güncelleme

**PUT** `/api/order/:orderId`

### Örnek İstek:
```json
{
  "status": "completed",
  "paymentMethod": "credit_card",
  "notes": "Sipariş tamamlandı"
}
```

### Örnek Yanıt:
```json
{
  "success": true,
  "message": "Sipariş başarıyla güncellendi",
  "data": {
    "orderId": "ORD-2024-001",
    "status": "completed",
    "paymentMethod": "credit_card",
    "notes": "Sipariş tamamlandı",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
}
```

## 5. Sipariş Silme

**DELETE** `/api/order/:orderId`

### Örnek İstek:
```
DELETE /api/order/ORD-2024-001
```

### Örnek Yanıt:
```json
{
  "success": true,
  "message": "Sipariş başarıyla silindi"
}
```

## QuickDB Kullanım Detayları

### Veri Yapısı
Siparişler QuickDB'de şu şekilde saklanır:
- **Key**: `order_{orderId}` formatında
- **Value**: Sipariş objesi (JSON)

### Örnek QuickDB Komutları
```javascript
// Sipariş kaydetme
await db.set('order_ORD-2024-001', orderData);

// Sipariş getirme
const order = await db.get('order_ORD-2024-001');

// Sipariş silme
await db.delete('order_ORD-2024-001');

// Tüm verileri getirme
const allData = await db.all();
```

### Hata Durumları

#### 404 - Sipariş Bulunamadı
```json
{
  "success": false,
  "message": "Sipariş bulunamadı"
}
```

#### 500 - Sunucu Hatası
```json
{
  "success": false,
  "message": "Sipariş oluşturulurken hata oluştu",
  "error": "Hata detayı"
}
```

## Test Etme

### Postman ile Test
1. Postman'de yeni bir collection oluşturun
2. Yukarıdaki endpoint'leri ekleyin
3. Örnek JSON verilerini kullanarak test edin

### cURL ile Test
```bash
# Sipariş oluşturma
curl -X POST http://localhost:3001/api/order/create \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORD-2024-001","customerInfo":{"name":"Test User"},"items":[],"totalAmount":50}'

# Sipariş getirme
curl http://localhost:3001/api/order/ORD-2024-001
```

## Notlar

- QuickDB dosya tabanlı bir veritabanıdır ve `kiosk-hub.db` dosyasında saklanır
- Tüm işlemler asenkron olarak gerçekleşir
- Hata durumları uygun HTTP status kodları ile döndürülür
- Sipariş ID'leri benzersiz olmalıdır
- Timestamp'ler ISO 8601 formatında saklanır