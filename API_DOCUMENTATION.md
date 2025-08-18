# Kiosk Yazılımı API Dokümantasyonu

Bu doküman, Kiosk yazılımının sunduğu RESTful API endpoint'lerini ve kullanımlarını açıklar. Tüm endpoint'ler `http://localhost:3001` adresi üzerinden çalışır.

---

## 1. Pavo Cihaz Yönetimi

**Temel URL:** `http://localhost:3001/api/pavo`

Pavo ödeme cihazlarının yönetimi, yapılandırılması ve bunlarla iletişim kurulması için gerekli endpoint'leri içerir.

### **GET** `/api/pavo/config`
Pavo cihazının mevcut yapılandırmasını alır.

**Örnek Cevap:**
```json
{
  "success": true,
  "data": {
    "deviceIp": "192.168.1.50",
    "port": 8080
  }
}
```

---

### **POST** `/api/pavo/config`
Pavo cihazının yapılandırmasını günceller.

**Örnek İstek Body:**
```json
{
  "deviceIp": "192.168.1.51",
  "port": 8080
}
```

---

### **POST** `/api/pavo/scan`
Ağı tarayarak Pavo cihazlarını arar.

**Örnek İstek Body:**
```json
{
  "startIp": "192.168.1.1",
  "endIp": "192.168.1.255"
}
```

---

### **POST** `/api/pavo/proxy`
Gelen istekleri Pavo cihazına yönlendirir.

**Örnek İstek Body:**
```json
{
  "method": "POST",
  "path": "/sale",
  "body": {
    "amount": 100,
    "currency": "TRY"
  }
}
```

---

### **GET** `/api/pavo/devices`
Kayıtlı tüm Pavo cihazlarını listeler.

---

### **POST** `/api/pavo/devices`
Yeni bir Pavo cihazı kaydeder.

**Örnek İstek Body:**
```json
{
  "ip": "192.168.1.52",
  "port": 8080,
  "label": "Kasa 2 Pavo"
}
```

---

### **PUT** `/api/pavo/devices/:id`
Belirtilen ID'ye sahip cihazın bilgilerini günceller.

**Örnek İstek Body:**
```json
{
  "label": "Kasa 2 Pavo (Yeni)"
}
```

---

### **DELETE** `/api/pavo/devices/:id`
Belirtilen ID'ye sahip cihazı siler.

---

## 2. Port Yönetimi

**Temel URL:** `http://localhost:3001/api/port`

Uygulamanın kullandığı ağ portlarının durumunu kontrol etmek, taramak ve yönetmek için kullanılır.

### **GET** `/api/port/status`
Uygulamanın o an kullandığı ana portun durumunu döndürür.

---

### **POST** `/api/port/check`
Belirtilen bir port numarasının kullanılabilir olup olmadığını kontrol eder.

**Örnek İstek Body:**
```json
{
  "port": 3000
}
```

---

### **POST** `/api/port/find`
Kullanılabilir (boşta olan) bir port bulur.

**Örnek İstek Body:**
```json
{
  "startPort": 8000
}
```

---

### **POST** `/api/port/scan`
Belirtilen bir port aralığını tarar.

**Örnek İstek Body:**
```json
{
  "startPort": 4000,
  "endPort": 5000
}
```

---

### **POST** `/api/port/resolve-conflict`
Mevcut port kullanımda ise, çakışmayı çözmek için yeni bir port bulur. Gerekli değildir.

---

### **POST** `/api/port/set`
Uygulamanın ana portunu manuel olarak ayarlar.

**Örnek İstek Body:**
```json
{
  "port": 3005
}
```

---

## 3. Yazıcı Yönetimi

**Temel URL:** `http://localhost:3001/api/printer`

Yazıcıları yönetmek, yazdırma işleri göndermek ve ayarları yapılandırmak için kullanılır.

### **GET** `/api/printer/settings`
Yazıcı modülünün genel ayarlarını getirir.

---

### **POST** `/api/printer/settings`
Yazıcı modülü ayarlarını günceller.

**Örnek İstek Body:**
```json
{
  "autoDiscover": true,
  "defaultPort": 9100
}
```

---

### **GET** `/api/printer/list`
Sisteme kayıtlı tüm yazıcıları listeler.

---

### **POST** `/api/printer/ip/add`
Yeni bir ağ yazıcısı ekler.

**Örnek İstek Body:**
```json
{
  "ip": "192.168.1.100",
  "port": 9100,
  "name": "Mutfak Yazıcısı"
}
```

---

### **POST** `/api/printer/set-active`
Belirtilen yazıcıyı varsayılan olarak ayarlar.

**Örnek İstek Body:**
```json
{
  "id": "printer-id-12345"
}
```

---

### **POST** `/api/printer/print-test`
Yazıcıya bir test sayfası gönderir.

**Örnek İstek Body:**
```json
{
  "id": "printer-id-12345"
}
```

---

### **POST** `/api/printer/print`
Genel bir yazdırma işi gönderir. Yazdırma içeriği, `elements` dizisi kullanılarak yapılandırılır. Bu endpoint iki şekilde kullanılabilir:

1.  **Kayıtlı Yazıcı ile:** Sisteme daha önce eklenmiş bir yazıcının `printerId`'si kullanılır.
2.  **Doğrudan IP ile:** Yazıcı sisteme kayıtlı olmasa bile, `ip` ve `port` bilgileri verilerek doğrudan çıktı alınabilir.

**Örnek İstek Body (Kayıtlı Yazıcı ile):**
```json
{
  "printerId": "ip:192.168.1.100:9100",
  "elements": [
    { "type": "header", "content": "SATIS FISI", "align": "center" },
    { "type": "line", "char": "=" },
    { "type": "text", "content": "Ürünler:" },
    {
      "type": "table",
      "columns": ["Ürün", "Adet", "Tutar"],
      "rows": [
        ["Kalem", "2", "15.00"],
        ["Defter", "1", "25.50"]
      ]
    },
    { "type": "line" },
    { "type": "text", "content": "Toplam: 40.50 TL", "bold": true, "align": "right" }
  ]
}
```

**Örnek İstek Body (Doğrudan IP ile):**
```json
{
  "ip": "192.168.1.101",
  "port": 9100,
  "elements": [
    { "type": "text", "content": "Bu bir doğrudan IP testidir.", "align": "center" },
    { "type": "cut" }
  ]
}
```

---

### **POST** `/api/printer/discover-ip`
Ağdaki yazıcıları otomatik olarak keşfeder.

**Örnek İstek Body:**
```json
{
  "base": "192.168.1",
  "start": 1,
  "end": 254
}
```
---

### **POST** `/api/printer/print/:printerName`
Önceden kaydedilmiş özel bir isme (`customName`) sahip yazıcıya yazdırma işi gönderir.

**Örnek İstek Body:**
```json
{
  "elements": [
    { "type": "text", "content": "Mutfak Siparişi:", "bold": true },
    { "type": "text", "content": "- 2x Adana Kebap" },
    { "type": "text", "content": "- 1x Salata" },
    { "type": "cut" }
  ]
}
```

---

## 4. Uygulama Güncelleme Yönetimi

**Temel URL:** `http://localhost:3001/api/update`

Uygulamanın kendini güncellemesiyle ilgili işlemleri yönetir.

### **GET** `/api/update/status`
Güncelleme yöneticisinin mevcut durumunu alır.

---

### **GET** `/api/update/info`
Uygulamanın sürümü ve güncelleme bilgilerini döndürür.

---

### **POST** `/api/update/check`
Yeni bir güncelleme olup olmadığını manuel olarak kontrol eder. (Body gerekmez)

---

### **POST** `/api/update/download`
Mevcut güncellemeyi indirir. (Body gerekmez)

---

### **POST** `/api/update/install`
İndirilmiş güncellemeyi kurar. (Body gerekmez)

---

### **POST** `/api/update/auto-check/start`
Otomatik güncelleme kontrolünü başlatır.

**Örnek İstek Body:**
```json
{
  "intervalMinutes": 60
}
```

---

### **POST** `/api/update/auto-check/stop`
Otomatik güncelleme kontrolünü durdurur. (Body gerekmez)

---

### **POST** `/api/update/settings`
Güncelleme ayarlarını yapılandırır.

**Örnek İstek Body:**
```json
{
  "autoDownload": true,
  "autoInstall": false
}