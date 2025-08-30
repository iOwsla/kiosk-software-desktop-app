import { useState, useEffect } from 'react';

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  status: string;
  extras?: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
}

interface Order {
  id: string;
  sequence: string;
  dealerId: string;
  brandId: string;
  deviceId?: string;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  customerPhone?: string;
  totalAmount: number;
  subtotal: number;
  extrasTotal: number;
  status: string;
  type: string;
  paymentType?: string;
  items: OrderItem[];
  createdAt: Date;
  isOffline?: boolean;
}

interface OrderStats {
  totalOrders: number;
  onlineOrders: number;
  offlineOrders: number;
  syncedOrders: number;
  pendingSyncOrders: number;
  failedOrders: number;
  totalRevenue: number;
  todayOrderCount: number;
}

interface PaymentMethodStats {
  type: 'cash' | 'credit_card' | 'meal_card' | 'account';
  name: string;
  amount: number;
  percentage: number;
}

interface UseOrderDataReturn {
  orders: Order[];
  stats: OrderStats;
  paymentMethods: PaymentMethodStats[];
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  createOrder: (orderData: Partial<Order>) => Promise<{ success: boolean; orderId?: string; message: string }>;
  syncOfflineOrders: () => Promise<{ synced: number; failed: number; total: number }>;
  getOfflineStatus: () => Promise<{ pending: number; synced: number; failed: number; total: number }>;
}

export const useOrderData = (): UseOrderDataReturn => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    onlineOrders: 0,
    offlineOrders: 0,
    syncedOrders: 0,
    pendingSyncOrders: 0,
    failedOrders: 0,
    totalRevenue: 0,
    todayOrderCount: 0
  });
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API Base URL - Electron ortamında localhost kullanılacak
  const API_BASE = 'http://localhost:3001/hub';

  // Fetch order statistics
  const fetchOrderStats = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/order/offline/status`);
      if (!response.ok) {
        throw new Error('Sipariş istatistikleri alınamadı');
      }
      const data = await response.json();
      
      if (data.success) {
        setStats({
          totalOrders: data.data.total,
          onlineOrders: data.data.synced,
          offlineOrders: data.data.pending + data.data.failed,
          syncedOrders: data.data.synced,
          pendingSyncOrders: data.data.pending,
          failedOrders: data.data.failed,
          totalRevenue: 0, // Bu değer calculatePaymentMethodStats'ta güncellenecek
           todayOrderCount: data.data.total
        });
      }
    } catch (err) {
      console.error('Sipariş istatistikleri hatası:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  };

  // Fetch all orders
  const fetchAllOrders = async (): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/order/offline/all`);
      if (!response.ok) {
        throw new Error('Tüm siparişler alınamadı');
      }
      const data = await response.json();
      
      console.log('All Orders API Response:', data); // Debug log
      
      if (data.success && data.data && data.data.orders) {
        const formattedOrders: Order[] = data.data.orders.map((order: any) => ({
           id: order.id,
           sequence: order.payload?.sequence || 'N/A',
           dealerId: order.payload?.dealerId,
           brandId: order.payload?.brandId,
           deviceId: order.payload?.deviceId,
           tableId: order.payload?.tableId,
           tableNumber: order.payload?.tableNumber,
           customerName: order.payload?.customerName,
           customerPhone: order.payload?.customerPhone,
           totalAmount: order.payload?.totalAmount || 0,
           subtotal: order.payload?.subtotal || 0,
           extrasTotal: order.payload?.extrasTotal || 0,
           status: order.status,
           type: order.payload?.type,
           paymentType: order.payload?.paymentType,
           items: order.payload?.items || [],
           createdAt: new Date(order.createdAt),
           isOffline: true
         }));
        
        console.log('Formatted Pending Orders:', formattedOrders); // Debug log
        setOrders(formattedOrders);
        
        // Calculate payment method statistics from all orders
        calculatePaymentMethodStats(formattedOrders);
      } else {
        console.log('No pending orders found or invalid response structure');
        setOrders([]);
      }
    } catch (err) {
      console.error('Bekleyen siparişler hatası:', err);
      setError(err instanceof Error ? err.message : 'Bilinmeyen hata');
    }
  };

  // Calculate payment method statistics
  const calculatePaymentMethodStats = (orderList: Order[]): void => {
    console.log('Calculating payment stats for orders:', orderList); // Debug log
    
    // Sadece tamamlanmış siparişleri dahil et (completed status olanlar)
    const validOrders = orderList.filter(order => {
      const status = order.status?.toLowerCase() || '';
      // Completed, synced veya pending durumundaki siparişleri dahil et
      // Cancelled, failed, iptal durumundakileri hariç tut
      return !['cancelled', 'canceled', 'iptal', 'failed'].includes(status);
    });
    
    console.log('Valid orders for calculation:', validOrders); // Debug log
    
    const paymentStats = {
      cash: { amount: 0, count: 0 },
      credit_card: { amount: 0, count: 0 },
      meal_card: { amount: 0, count: 0 },
      account: { amount: 0, count: 0 }
    };

    validOrders.forEach(order => {
      const amount = order.totalAmount || 0;
      const paymentType = order.paymentType?.toLowerCase();
      
      console.log(`Order ${order.id}: amount=${amount}, paymentType=${paymentType}, status=${order.status}`); // Debug log
      
      switch (paymentType) {
        case 'cash':
        case 'nakit':
          paymentStats.cash.amount += amount;
          paymentStats.cash.count += 1;
          break;
        case 'credit_card':
        case 'kredi':
        case 'kredi_karti':
          paymentStats.credit_card.amount += amount;
          paymentStats.credit_card.count += 1;
          break;
        case 'meal_card':
        case 'yemek':
        case 'yemek_karti':
          paymentStats.meal_card.amount += amount;
          paymentStats.meal_card.count += 1;
          break;
        case 'account':
        case 'cari':
        case 'cari_hesap':
          paymentStats.account.amount += amount;
          paymentStats.account.count += 1;
          break;
        default:
          // Bilinmeyen ödeme türü için nakit olarak say
          paymentStats.cash.amount += amount;
          paymentStats.cash.count += 1;
          break;
      }
    });
    
    console.log('Payment stats calculated:', paymentStats); // Debug log

    const totalAmount = Object.values(paymentStats).reduce((sum, stat) => sum + stat.amount, 0);
    
    console.log('Total amount calculated:', totalAmount); // Debug log

    const paymentMethodsData: PaymentMethodStats[] = [
      {
        type: 'cash',
        name: 'Nakit',
        amount: paymentStats.cash.amount,
        percentage: totalAmount > 0 ? (paymentStats.cash.amount / totalAmount) * 100 : 0
      },
      {
        type: 'credit_card',
        name: 'Kredi Kartı',
        amount: paymentStats.credit_card.amount,
        percentage: totalAmount > 0 ? (paymentStats.credit_card.amount / totalAmount) * 100 : 0
      },
      {
        type: 'meal_card',
        name: 'Yemek Kartı',
        amount: paymentStats.meal_card.amount,
        percentage: totalAmount > 0 ? (paymentStats.meal_card.amount / totalAmount) * 100 : 0
      },
      {
        type: 'account',
        name: 'Cari Hesap',
        amount: paymentStats.account.amount,
        percentage: totalAmount > 0 ? (paymentStats.account.amount / totalAmount) * 100 : 0
      }
    ];

    setPaymentMethods(paymentMethodsData);
    
    // Update total revenue in stats
    setStats(prev => ({
      ...prev,
      totalRevenue: totalAmount
    }));
  };

  // Refresh all data
  const refreshData = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await fetchOrderStats();
      await fetchAllOrders(); // Bu fonksiyon calculatePaymentMethodStats'ı çağırır ve totalRevenue'yu günceller
    } catch (err) {
      console.error('Veri yenileme hatası:', err);
      setError('Veriler yenilenemedi');
    } finally {
      setLoading(false);
    }
  };

  // Create new order
  const createOrder = async (orderData: Partial<Order>): Promise<{ success: boolean; orderId?: string; message: string }> => {
    try {
      const response = await fetch(`${API_BASE}/order/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data after successful order creation
        await refreshData();
        return {
          success: true,
          orderId: data.data.orderId,
          message: data.message || 'Sipariş başarıyla oluşturuldu'
        };
      } else {
        return {
          success: false,
          message: data.message || 'Sipariş oluşturulamadı'
        };
      }
    } catch (err) {
      console.error('Sipariş oluşturma hatası:', err);
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Sipariş oluşturulamadı'
      };
    }
  };

  // Sync offline orders
  const syncOfflineOrders = async (): Promise<{ synced: number; failed: number; total: number }> => {
    try {
      const response = await fetch(`${API_BASE}/order/offline/sync`, {
        method: 'POST'
      });

      const data = await response.json();
      
      if (data.success) {
        // Refresh data after sync
        await refreshData();
        return data.data;
      } else {
        throw new Error(data.message || 'Senkronizasyon başarısız');
      }
    } catch (err) {
      console.error('Senkronizasyon hatası:', err);
      throw err;
    }
  };

  // Get offline status
  const getOfflineStatus = async (): Promise<{ pending: number; synced: number; failed: number; total: number }> => {
    try {
      const response = await fetch(`${API_BASE}/order/offline/status`);
      const data = await response.json();
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.message || 'Offline durum alınamadı');
      }
    } catch (err) {
      console.error('Offline durum hatası:', err);
      throw err;
    }
  };

  // Initial data load
  useEffect(() => {
    refreshData();
  }, []);

  return {
    orders,
    stats,
    paymentMethods,
    loading,
    error,
    refreshData,
    createOrder,
    syncOfflineOrders,
    getOfflineStatus
  };
};

export default useOrderData;