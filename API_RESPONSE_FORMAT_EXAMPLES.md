# API Response Format Examples

Bu dokümantasyon, projede kullanılan standart API response formatlarını ve helper fonksiyonlarını açıklar.

## Response Types

### 1. Success Response (IApiResponse)
```typescript
interface IApiResponse<T = any> {
  success: boolean;
  status: ApiStatus;
  data: T;
  meta?: Record<string, any>;
}
```

### 2. Error Response (IApiErrorResponse)
```typescript
interface IApiErrorResponse {
  success: boolean;
  status: ApiStatus;
  error: {
    message: string;
    code: FAErrorCode;
    severity: ErrorSeverity;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
  meta?: Record<string, any>;
}
```

## Enums

### ApiStatus
```typescript
enum ApiStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}
```

### FAErrorCode
```typescript
enum FAErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT'
}
```

### ErrorSeverity
```typescript
enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}
```

## Automatic Response Wrapping

BaseApi artık otomatik olarak tüm response'ları standart `IApiResponse` formatına çevirir:

### Response Interceptor
```typescript
// Başarılı response'lar otomatik olarak wrap edilir
const result = await baseApi.get('/api/users');
// result.data artık IApiResponse<User[]> formatında

// Hata response'ları da otomatik olarak wrap edilir
try {
  await baseApi.post('/api/invalid');
} catch (error) {
  // error.response.data artık IApiErrorResponse formatında
}
```

### Özellikler
- **Otomatik Wrapping**: Tüm response'lar IApiResponse formatına çevrilir
- **Error Mapping**: HTTP status kodları FAErrorCode'lara map edilir
- **Severity Detection**: HTTP status kodlarına göre otomatik severity belirlenir
- **Request ID**: Her hata için unique request ID oluşturulur
- **Original Data**: Orijinal response bilgileri meta alanında saklanır

### HTTP Status Code Mapping
```typescript
400 → FAErrorCode.BAD_REQUEST (Medium)
401 → FAErrorCode.AUTHENTICATION_ERROR (Medium)
403 → FAErrorCode.AUTHORIZATION_ERROR (Medium)
404 → FAErrorCode.NOT_FOUND (Medium)
409 → FAErrorCode.CONFLICT (Medium)
429 → FAErrorCode.RATE_LIMIT_EXCEEDED (Medium)
503 → FAErrorCode.SERVICE_UNAVAILABLE (High)
5xx → FAErrorCode.INTERNAL_SERVER_ERROR (High)
```

## Helper Functions

### 1. createSuccessResponse
```typescript
const createSuccessResponse = <T>(
  data: T,
  meta?: Record<string, any>
): IApiResponse<T>
```

**Kullanım:**
```typescript
// Basit success response
res.json(createSuccessResponse({ id: 1, name: 'Test' }));

// Meta bilgisi ile
res.json(createSuccessResponse(
  { orders: [...] },
  { 
    message: 'Orders retrieved successfully',
    totalCount: 25,
    page: 1
  }
));
```

**Çıktı:**
```json
{
  "success": true,
  "status": "success",
  "data": { "id": 1, "name": "Test" },
  "meta": {
    "message": "Orders retrieved successfully",
    "totalCount": 25,
    "page": 1
  }
}
```

### 2. createErrorResponse
```typescript
const createErrorResponse = (
  message: string,
  code: FAErrorCode = FAErrorCode.INTERNAL_SERVER_ERROR,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  details?: any,
  requestId?: string,
  meta?: Record<string, any>
): IApiErrorResponse
```

**Kullanım:**
```typescript
// Basit error response
res.status(400).json(
  createErrorResponse(
    'Validation failed',
    FAErrorCode.VALIDATION_ERROR,
    ErrorSeverity.MEDIUM
  )
);

// Detaylı error response
res.status(500).json(
  createErrorResponse(
    'Database connection failed',
    FAErrorCode.INTERNAL_SERVER_ERROR,
    ErrorSeverity.HIGH,
    { dbError: 'Connection timeout' },
    'req-123456'
  )
);
```

**Çıktı:**
```json
{
  "success": false,
  "status": "error",
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "severity": "medium",
    "details": { "dbError": "Connection timeout" },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req-123456"
  }
}
```

### 3. createWarningResponse
```typescript
const createWarningResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): IApiResponse<T>
```

**Kullanım:**
```typescript
res.json(createWarningResponse(
  { orders: [...] },
  'Some orders may be delayed'
));
```

**Çıktı:**
```json
{
  "success": true,
  "status": "warning",
  "data": { "orders": [...] },
  "meta": {
    "warning": "Some orders may be delayed"
  }
}
```

### 4. createInfoResponse
```typescript
const createInfoResponse = <T>(
  data: T,
  message?: string,
  meta?: Record<string, any>
): IApiResponse<T>
```

**Kullanım:**
```typescript
res.json(createInfoResponse(
  { status: 'processing' },
  'Order is being processed'
));
```

## Endpoint Örnekleri

### Order Create Endpoint (Yeni Generic Yaklaşım)
```typescript
import { createErrorResponse, FAErrorCode, ErrorSeverity } from '../api';
import baseApi from '../api';

router.post('/create', asyncHandler(async (req: Request, res: Response) => {
  try {
    const payload = CreateOrderSchema.parse(req.body);
    
    // baseApi otomatik olarak IApiResponse<T> formatında response döndürür
    const result = await baseApi.post<any>('/v1/order', payload);
    
    // result.data artık IApiResponse formatında
    if (result.data.success) {
      res.status(201).json(result.data);
    } else {
      res.status(400).json(
        createErrorResponse(
          'Sipariş oluşturulamadı',
          FAErrorCode.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM
        )
      );
    }
  } catch (error: any) {
    console.error('Error creating order:', error);
    
    // Eğer axios error ise ve response varsa, o response'ı kullan
    if (error.response?.data) {
      res.status(error.response.status).json(error.response.data);
    } else {
      // Diğer durumlar için generic error response
      res.status(500).json(
        createErrorResponse(
          'Internal server error',
          FAErrorCode.INTERNAL_SERVER_ERROR,
          ErrorSeverity.HIGH,
          error.message
        )
      );
    }
  }
}));
```

### Geleneksel Yaklaşım (Local Data)
```typescript
import { createSuccessResponse, createErrorResponse, FAErrorCode, ErrorSeverity } from '../api';

router.post('/create-local', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { items, totalAmount } = req.body;
    
    // Validation
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json(
        createErrorResponse(
          'Items are required',
          FAErrorCode.VALIDATION_ERROR,
          ErrorSeverity.MEDIUM
        )
      );
    }
    
    // Local business logic
    const order = await createLocalOrder(req.body);
    
    // Success response
    res.status(201).json(
      createSuccessResponse(order, {
        message: 'Order created successfully'
      })
    );
    
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json(
      createErrorResponse(
        'Internal server error',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.HIGH,
        error
      )
    );
  }
}));
```

### Get Orders Endpoint
```typescript
router.get('/', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    
    const orders = await getOrders(Number(page), Number(limit));
    const totalCount = await getOrdersCount();
    
    res.json(
      createSuccessResponse(orders, {
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit))
        }
      })
    );
    
  } catch (error) {
    res.status(500).json(
      createErrorResponse(
        'Failed to retrieve orders',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.HIGH
      )
    );
  }
}));
```

### Not Found Endpoint
```typescript
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  try {
    const order = await getOrderById(req.params.id);
    
    if (!order) {
      return res.status(404).json(
        createErrorResponse(
          'Order not found',
          FAErrorCode.NOT_FOUND,
          ErrorSeverity.LOW
        )
      );
    }
    
    res.json(createSuccessResponse(order));
    
  } catch (error) {
    res.status(500).json(
      createErrorResponse(
        'Failed to retrieve order',
        FAErrorCode.INTERNAL_SERVER_ERROR,
        ErrorSeverity.HIGH
      )
    );
  }
}));
```

## Frontend'de Kullanım

### TypeScript ile (Yeni Generic Yaklaşım)
```typescript
import { IApiResponse, IApiErrorResponse } from '../shared/types';
import baseApi from '../api';

// API çağrısı - baseApi otomatik olarak response'ları wrap eder
const createOrder = async (orderData: any): Promise<Order> => {
  try {
    // baseApi otomatik olarak IApiResponse<Order> formatında döndürür
    const response = await baseApi.post<Order>('/hub/order/create', orderData);
    
    // response.data artık IApiResponse<Order> formatında
    if (response.data.success) {
      return response.data.data; // Gerçek order data'sı
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (error: any) {
    // Axios error'ları otomatik olarak IApiErrorResponse formatında
    if (error.response?.data?.error) {
      const errorResponse: IApiErrorResponse = error.response.data;
      throw new Error(errorResponse.error.message);
    }
    throw error;
  }
};

// Kullanım
try {
  const order = await createOrder(orderData);
  console.log('Order created:', order);
  showSuccessMessage('Sipariş başarıyla oluşturuldu');
} catch (error: any) {
  console.error('Order creation failed:', error.message);
  showErrorMessage(error.message);
}
```

### Alternatif Kullanım (Full Response)
```typescript
// Tam response objesini almak istiyorsanız
const createOrderWithMeta = async (orderData: any): Promise<IApiResponse<Order>> => {
  try {
    const response = await baseApi.post<Order>('/hub/order/create', orderData);
    return response.data; // IApiResponse<Order>
  } catch (error: any) {
    if (error.response?.data) {
      throw error.response.data; // IApiErrorResponse
    }
    throw error;
  }
};

// Kullanım
try {
  const result = await createOrderWithMeta(orderData);
  if (result.success) {
    console.log('Order created:', result.data);
    if (result.meta?.message) {
      showSuccessMessage(result.meta.message);
    }
  }
} catch (error: any) {
  if (error.error) {
    console.error('Order creation failed:', error.error.message);
    showErrorMessage(error.error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

### React Hook Örneği
```typescript
const useCreateOrder = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const createOrder = async (orderData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await baseApi.post<IApiResponse<Order>>('/order/create', orderData);
      
      if (response.data.success) {
        return response.data.data;
      } else {
        throw new Error('Unexpected response format');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'An error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  return { createOrder, loading, error };
};
```

## Best Practices

1. **Consistent Error Handling**: Her endpoint'te aynı error response formatını kullanın
2. **Appropriate HTTP Status Codes**: Doğru HTTP status kodları ile birlikte response gönderin
3. **Meaningful Error Messages**: Kullanıcı dostu ve açıklayıcı hata mesajları yazın
4. **Request ID**: Debugging için unique request ID'leri kullanın
5. **Meta Information**: Pagination, warnings gibi ek bilgileri meta alanında gönderin
6. **Error Severity**: Hata seviyelerini doğru şekilde belirleyin
7. **Timestamp**: Tüm error response'larda timestamp ekleyin

## Error Severity Guidelines

- **LOW**: Kullanıcı hatası, validation errors
- **MEDIUM**: Business logic errors, not found errors
- **HIGH**: Server errors, database errors
- **CRITICAL**: System failures, security breaches

## Offline Order Management Examples

### Online Order Creation (Success)
```typescript
// Request
POST /api/orders/create
{
  "dealerId": "dealer123",
  "brandId": "brand456",
  "items": [
    {
      "productId": "prod789",
      "name": "Hamburger",
      "quantity": 2,
      "unitPrice": 25.50,
      "totalPrice": 51.00
    }
  ],
  "totalAmount": 51.00,
  "subtotal": 51.00
}

// Response (HTTP 201)
{
  "success": true,
  "status": "success",
  "data": {
    "orderId": "api_order_67890",
    "message": "Sipariş başarıyla oluşturuldu",
    "estimatedTime": 15
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_abc123"
  }
}
```

### Offline Order Creation
```typescript
// Request (Same as above)
POST /api/orders/create

// Response when internet is not available (HTTP 202)
{
  "success": true,
  "status": "success",
  "data": {
    "orderId": "offline_order_1703123456789_abc123def",
    "isOffline": true,
    "message": "Sipariş offline olarak kaydedildi. İnternet bağlantısı geldiğinde otomatik olarak senkronize edilecek."
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_def456"
  }
}
```

### Offline Status Check
```typescript
// Request
GET /api/orders/offline/status

// Response
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
  "message": "Offline sipariş durumu başarıyla alındı",
  "meta": {
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_ghi789"
  }
}
```

### Manual Sync Success
```typescript
// Request
POST /api/orders/offline/sync

// Response
{
  "success": true,
  "status": "success",
  "data": {
    "synced": 4,
    "failed": 1,
    "total": 5
  },
  "message": "Senkronizasyon tamamlandı. 4 başarılı, 1 başarısız",
  "meta": {
    "timestamp": "2024-01-15T10:35:00.000Z",
    "requestId": "req_jkl012",
    "syncDuration": "2.3s"
  }
}
```

### Manual Sync Error (No Internet)
```typescript
// Request
POST /api/orders/offline/sync

// Response (HTTP 400)
{
  "success": false,
  "status": "error",
  "error": {
    "message": "İnternet bağlantısı yok, senkronizasyon yapılamaz",
    "code": "NETWORK_ERROR",
    "severity": "medium",
    "timestamp": "2024-01-15T10:40:00.000Z",
    "requestId": "req_mno345"
  },
  "meta": {
    "hasInternet": false,
    "lastInternetCheck": "2024-01-15T10:40:00.000Z"
  }
}
```

### Pending Orders List
```typescript
// Request
GET /api/orders/offline/pending

// Response
{
  "success": true,
  "status": "success",
  "data": {
    "orders": [
      {
        "id": "offline_order_1703123456789_abc123def",
        "payload": {
          "dealerId": "dealer123",
          "brandId": "brand456",
          "totalAmount": 51.00
        },
        "createdAt": "2024-01-15T10:00:00.000Z",
        "attempts": 2,
        "lastAttempt": "2024-01-15T10:15:00.000Z",
        "status": "pending",
        "error": null
      },
      {
        "id": "offline_order_1703123456790_def456ghi",
        "payload": {
          "dealerId": "dealer456",
          "brandId": "brand789",
          "totalAmount": 75.50
        },
        "createdAt": "2024-01-15T10:05:00.000Z",
        "attempts": 5,
        "lastAttempt": "2024-01-15T10:25:00.000Z",
        "status": "failed",
        "error": "API validation error: Invalid dealer ID"
      }
    ],
    "count": 2
  },
  "message": "Bekleyen siparişler başarıyla alındı",
  "meta": {
    "timestamp": "2024-01-15T10:45:00.000Z",
    "requestId": "req_pqr678"
  }
}
```

### Cleanup Synced Orders
```typescript
// Request
DELETE /api/orders/offline/cleanup

// Response
{
  "success": true,
  "status": "success",
  "data": {
    "cleanedCount": 12
  },
  "message": "12 senkronize edilmiş sipariş temizlendi",
  "meta": {
    "timestamp": "2024-01-15T10:50:00.000Z",
    "requestId": "req_stu901",
    "beforeCleanup": {
      "total": 25,
      "synced": 12,
      "pending": 8,
      "failed": 5
    },
    "afterCleanup": {
      "total": 13,
      "synced": 0,
      "pending": 8,
      "failed": 5
    }
  }
}
```

## Frontend Integration for Offline Orders

### React Hook Example
```typescript
const useOfflineOrders = () => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const getStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders/offline/status');
      const result = await response.json();
      
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Status check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const syncOrders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders/offline/sync', {
        method: 'POST'
      });
      const result = await response.json();
      
      if (result.success) {
        await getStatus(); // Refresh status
        return result.data;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Sync failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  const createOrder = async (orderData: any) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Check if order was saved offline
        if (result.data.isOffline) {
          console.log('Order saved offline:', result.data.orderId);
          await getStatus(); // Refresh status
        }
        return result.data;
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error('Order creation failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };
  
  return {
    stats,
    isLoading,
    getStatus,
    syncOrders,
    createOrder
  };
};
```

### UI Component Example
```jsx
const OfflineOrderStatus = () => {
  const { stats, isLoading, getStatus, syncOrders } = useOfflineOrders();
  
  useEffect(() => {
    getStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(getStatus, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const handleSync = async () => {
    try {
      const result = await syncOrders();
      alert(`Senkronizasyon tamamlandı: ${result.synced} başarılı, ${result.failed} başarısız`);
    } catch (error) {
      alert(`Senkronizasyon hatası: ${error.message}`);
    }
  };
  
  if (isLoading && !stats) {
    return <div>Yükleniyor...</div>;
  }
  
  return (
    <div className="offline-status-panel">
      <div className="status-header">
        <div className={`connection-status ${stats?.hasInternet ? 'online' : 'offline'}`}>
          {stats?.hasInternet ? '🟢 Online' : '🔴 Offline'}
        </div>
        <button onClick={getStatus} disabled={isLoading}>
          🔄 Yenile
        </button>
      </div>
      
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Bekleyen:</span>
          <span className="stat-value pending">{stats?.pending || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Senkronize:</span>
          <span className="stat-value synced">{stats?.synced || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Başarısız:</span>
          <span className="stat-value failed">{stats?.failed || 0}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Toplam:</span>
          <span className="stat-value total">{stats?.total || 0}</span>
        </div>
      </div>
      
      {stats?.pending > 0 && (
        <div className="pending-orders-alert">
          <span>📋 {stats.pending} sipariş senkronizasyon bekliyor</span>
          {stats?.hasInternet && (
            <button 
              onClick={handleSync} 
              disabled={isLoading}
              className="sync-button"
            >
              {isLoading ? 'Senkronize ediliyor...' : 'Manuel Senkronize Et'}
            </button>
          )}
        </div>
      )}
      
      <div className="last-check">
        Son kontrol: {stats?.lastCheck ? new Date(stats.lastCheck).toLocaleString('tr-TR') : 'Bilinmiyor'}
      </div>
    </div>
  );
};
```