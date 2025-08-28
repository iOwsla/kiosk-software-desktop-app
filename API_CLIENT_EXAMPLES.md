# API Client Kullanım Örnekleri

Bu dosya, yapılandırılmış `baseApi` client'ının nasıl kullanılacağını gösterir.

## Yapılandırma Özellikleri

### Base URL
```
http://localhost:8001/api
```

### Otomatik Authorization
- Her istekte lisans anahtarı otomatik olarak `Authorization: Bearer {licenseKey}` header'ı olarak eklenir
- Lisans anahtarı LicenseManager'dan dinamik olarak okunur
- Geçersiz lisans durumunda header eklenmez

### Hata Yönetimi
- 401 Unauthorized durumunda konsola hata mesajı yazdırılır
- Response interceptor ile merkezi hata yönetimi

## Kullanım Örnekleri

### 1. Temel GET İsteği

```typescript
import baseApi from './api/api';

// Kullanıcı bilgilerini getir
const getUserInfo = async () => {
  try {
    const response = await baseApi.get('/user/profile');
    console.log('Kullanıcı bilgileri:', response.data);
    return response.data;
  } catch (error) {
    console.error('Kullanıcı bilgileri alınamadı:', error);
    throw error;
  }
};
```

### 2. POST İsteği ile Veri Gönderme

```typescript
// Yeni sipariş oluştur
const createOrder = async (orderData: any) => {
  try {
    const response = await baseApi.post('/orders', orderData);
    console.log('Sipariş oluşturuldu:', response.data);
    return response.data;
  } catch (error) {
    console.error('Sipariş oluşturulamadı:', error);
    throw error;
  }
};

// Kullanım
const newOrder = {
  items: [
    { productId: 1, quantity: 2, price: 25.50 },
    { productId: 2, quantity: 1, price: 15.00 }
  ],
  customerInfo: {
    name: 'Ahmet Yılmaz',
    phone: '+90 555 123 4567'
  },
  totalAmount: 66.00
};

createOrder(newOrder);
```

### 3. PUT İsteği ile Güncelleme

```typescript
// Sipariş durumunu güncelle
const updateOrderStatus = async (orderId: string, status: string) => {
  try {
    const response = await baseApi.put(`/orders/${orderId}`, { status });
    console.log('Sipariş güncellendi:', response.data);
    return response.data;
  } catch (error) {
    console.error('Sipariş güncellenemedi:', error);
    throw error;
  }
};

// Kullanım
updateOrderStatus('ORD-2024-001', 'completed');
```

### 4. DELETE İsteği

```typescript
// Siparişi sil
const deleteOrder = async (orderId: string) => {
  try {
    const response = await baseApi.delete(`/orders/${orderId}`);
    console.log('Sipariş silindi:', response.data);
    return response.data;
  } catch (error) {
    console.error('Sipariş silinemedi:', error);
    throw error;
  }
};

// Kullanım
deleteOrder('ORD-2024-001');
```

### 5. Query Parameters ile GET İsteği

```typescript
// Filtrelenmiş siparişleri getir
const getFilteredOrders = async (filters: any) => {
  try {
    const response = await baseApi.get('/orders', {
      params: filters
    });
    console.log('Filtrelenmiş siparişler:', response.data);
    return response.data;
  } catch (error) {
    console.error('Siparişler getirilemedi:', error);
    throw error;
  }
};

// Kullanım
getFilteredOrders({
  status: 'pending',
  date: '2024-01-15',
  limit: 10
});
```

### 6. File Upload

```typescript
// Dosya yükleme
const uploadFile = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await baseApi.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    console.log('Dosya yüklendi:', response.data);
    return response.data;
  } catch (error) {
    console.error('Dosya yüklenemedi:', error);
    throw error;
  }
};
```

### 7. Custom Headers ile İstek

```typescript
// Özel header'lar ile istek
const getDataWithCustomHeaders = async () => {
  try {
    const response = await baseApi.get('/special-data', {
      headers: {
        'X-Custom-Header': 'custom-value',
        'X-Request-ID': Date.now().toString()
      }
    });
    
    console.log('Özel veri:', response.data);
    return response.data;
  } catch (error) {
    console.error('Özel veri alınamadı:', error);
    throw error;
  }
};
```

### 8. Timeout Ayarlı İstek

```typescript
// Özel timeout ile istek
const getDataWithTimeout = async () => {
  try {
    const response = await baseApi.get('/slow-endpoint', {
      timeout: 5000 // 5 saniye
    });
    
    console.log('Yavaş endpoint verisi:', response.data);
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      console.error('İstek zaman aşımına uğradı');
    } else {
      console.error('İstek başarısız:', error);
    }
    throw error;
  }
};
```

## React Component'inde Kullanım

```typescript
import React, { useState, useEffect } from 'react';
import baseApi from '../api/api';

interface Order {
  id: string;
  customerName: string;
  totalAmount: number;
  status: string;
}

const OrderList: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await baseApi.get('/orders');
        setOrders(response.data.data || []);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Siparişler yüklenemedi');
        console.error('Sipariş yükleme hatası:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await baseApi.put(`/orders/${orderId}`, { status: newStatus });
      
      // Local state'i güncelle
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId 
            ? { ...order, status: newStatus }
            : order
        )
      );
    } catch (err) {
      console.error('Durum güncellenemedi:', err);
      alert('Sipariş durumu güncellenemedi');
    }
  };

  if (loading) return <div>Yükleniyor...</div>;
  if (error) return <div>Hata: {error}</div>;

  return (
    <div>
      <h2>Siparişler</h2>
      {orders.map(order => (
        <div key={order.id} className="order-item">
          <h3>{order.customerName}</h3>
          <p>Tutar: {order.totalAmount} TL</p>
          <p>Durum: {order.status}</p>
          <button 
            onClick={() => handleStatusUpdate(order.id, 'completed')}
            disabled={order.status === 'completed'}
          >
            Tamamla
          </button>
        </div>
      ))}
    </div>
  );
};

export default OrderList;
```

## Hata Yönetimi

### Lisans Durumu Kontrolü

```typescript
// Lisans durumunu kontrol et
const checkLicenseAndMakeRequest = async () => {
  try {
    const response = await baseApi.get('/protected-endpoint');
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 401) {
      // Lisans geçersiz - kullanıcıyı lisans sayfasına yönlendir
      console.log('Lisans geçersiz, yönlendiriliyor...');
      window.location.href = '/license-input';
    } else {
      console.error('API hatası:', error);
    }
    throw error;
  }
};
```

### Network Hataları

```typescript
// Network hatalarını yönet
const handleNetworkErrors = async () => {
  try {
    const response = await baseApi.get('/data');
    return response.data;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      console.error('Sunucuya bağlanılamıyor');
      alert('Sunucu bağlantısı kurulamadı. Lütfen daha sonra tekrar deneyin.');
    } else if (error.code === 'ECONNABORTED') {
      console.error('İstek zaman aşımına uğradı');
      alert('İstek çok uzun sürdü. Lütfen tekrar deneyin.');
    } else {
      console.error('Bilinmeyen hata:', error);
      alert('Bir hata oluştu. Lütfen tekrar deneyin.');
    }
    throw error;
  }
};
```

## Notlar

- **Otomatik Authorization**: Lisans anahtarı her istekte otomatik olarak eklenir
- **Base URL**: Tüm istekler `http://localhost:8001/api` üzerinden yapılır
- **Timeout**: Varsayılan timeout 10 saniyedir
- **Hata Yönetimi**: 401 hataları otomatik olarak yakalanır ve loglanır
- **Content-Type**: Varsayılan olarak `application/json` kullanılır
- **License Manager**: Lisans durumu dinamik olarak kontrol edilir