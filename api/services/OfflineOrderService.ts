import { LicenseManager } from '@/main/services/LicenseManager';
import { QuickDBManager } from '../../src/main/database/QuickDBManager';
import baseApi from '../api';
import { checkInternetConnection } from '../utils/networkUtils';
import { QuickDB } from 'quick.db';

export interface OfflineOrder {
  id: string;
  payload: any;
  createdAt: Date;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  error?: string;
}
// LicenseManager instance'ını oluştur
const licenseManager = new LicenseManager();

// Lisans anahtarını al
const getLicenseKey = (): string | null => {
  const licenseStatus = licenseManager.getLicenseStatus();
  return licenseStatus.isValid ? licenseStatus.licenseKey || null : null;
};

export class OfflineOrderService {
  private static instance: OfflineOrderService;
  private db: any;
  public fullDay: string = new Date().toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\./g, '_'); // Format: DD_MM_YYYY

  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private orderNumberDb: QuickDB;

  private constructor() {
    this.db = new QuickDB({
      filePath: 'cloud_orders.db',
      table: 'orders',
    });
    this.orderNumberDb = new QuickDB({
      filePath: 'cloud_orders.db',
      table: 'order_numbers',
    });
    this.startSyncProcess();
  }

  public static getInstance(): OfflineOrderService {
    if (!OfflineOrderService.instance) {
      OfflineOrderService.instance = new OfflineOrderService();
    }
    return OfflineOrderService.instance;
  }

  /**
   * Offline sipariş kaydet
   */
  async saveOfflineOrder(payload: any): Promise<{ success: boolean; orderId: string; message: string }> {
    try {
      const orderId = `offline_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const offlineOrder: OfflineOrder = {
        id: orderId,
        payload,
        createdAt: new Date(),
        attempts: 0,
        status: 'pending'
      };

      await this.db.set(`offline_orders_${this.fullDay}.${orderId}`, offlineOrder);

      console.log(`Offline sipariş kaydedildi: ${orderId}`);

      return {
        success: true,
        orderId,
        message: 'Sipariş offline olarak kaydedildi. İnternet bağlantısı geldiğinde otomatik olarak senkronize edilecek.'
      };
    } catch (error: any) {
      console.error('Offline sipariş kaydetme hatası:', error);
      throw new Error(`Offline sipariş kaydedilemedi: ${error.message}`);
    }
  }

  /**
   * Tüm offline siparişleri getir
   */
  async getAllOrders(): Promise<OfflineOrder[]> {
    try {
      const offlineOrders = await this.db.get('offline_orders_' + this.fullDay) || {};
      return Object.values(offlineOrders) as OfflineOrder[];
    } catch (error: any) {
      console.error('Siparişler alınamadı:', error);
      return [];
    }
  }

  /**
   * Bekleyen offline siparişleri getir
   */
  async getPendingOrders(): Promise<OfflineOrder[]> {
    try {
      const offlineOrders = await this.db.get('offline_orders_' + this.fullDay) || {};
      return Object.values(offlineOrders).filter((order: any) =>
        order.status === 'pending' || order.status === 'failed'
      ) as OfflineOrder[];
    } catch (error: any) {
      console.error('Bekleyen siparişler alınamadı:', error);
      return [];
    }
  }

  /**
   * Tek bir siparişi senkronize et
   */
  async syncSingleOrder(order: OfflineOrder): Promise<boolean> {
    try {
      // Sipariş durumunu syncing olarak güncelle
      await this.db.set(`offline_orders_${this.fullDay}.${order.id}.status`, 'syncing');
      await this.db.set(`offline_orders_${this.fullDay}.${order.id}.lastAttempt`, new Date());
      await this.db.add(`offline_orders_${this.fullDay}.${order.id}.attempts`, 1);

      const result = await baseApi.post<any>("/v1/order", order.payload, {
        headers: {
          ["x-device-id"]: order.payload.deviceId,
          Authorization: `Bearer ${getLicenseKey()}`
        }
      });

      console.log(result.data)

      if (result.data.success) {
        // Başarılı, siparişi synced olarak işaretle
        await this.db.set(`offline_orders_${this.fullDay}.${order.id}.status`, 'synced');

        // Günlük tablodaki sipariş durumunu da güncelle
        try {
          await this.orderNumberDb.set(`orders.${order.id}.status`, 'completed');
        } catch (dailyError) {
          console.warn(`Günlük tablo durumu güncellenemedi: ${order.id}`, dailyError);
        }

        console.log(`Sipariş başarıyla senkronize edildi: ${order.id}`);
        return true;
      } else {
        // API hatası
        await this.db.set(`offline_orders_${this.fullDay}.${order.id}.status`, 'failed');
        await this.db.set(`offline_orders_${this.fullDay}.${order.id}.error`, 'API yanıt hatası');
        console.error(`Sipariş senkronizasyon hatası: ${order.id}`);
        return false;
      }
    } catch (error: any) {
      console.log(error);
      // Hata durumu
      await this.db.set(`offline_orders_${this.fullDay}.${order.id}.status`, 'failed');
      await this.db.set(`offline_orders_${this.fullDay}.${order.id}.error`, error.message);
      console.error(`Sipariş senkronizasyon hatası: ${order.id}`, error.message);
      return false;
    }
  }

  /**
   * Tüm bekleyen siparişleri senkronize et
   */
  async syncAllPendingOrders(): Promise<{ synced: number; failed: number; total: number }> {
    if (this.isSyncing) {
      console.log('Senkronizasyon zaten devam ediyor...');
      return { synced: 0, failed: 0, total: 0 };
    }

    this.isSyncing = true;

    try {
      const pendingOrders = await this.getPendingOrders();

      if (pendingOrders.length === 0) {
        console.log('Senkronize edilecek sipariş yok.');
        return { synced: 0, failed: 0, total: 0 };
      }

      console.log(`${pendingOrders.length} sipariş senkronize edilecek...`);

      let synced = 0;
      let failed = 0;

      for (const order of pendingOrders) {
        // Çok fazla deneme yapılmışsa atla (maksimum 5 deneme)
        if (order.attempts >= 5) {
          console.log(`Sipariş maksimum deneme sayısına ulaştı: ${order.id}`);
          failed++;
          continue;
        }

        const success = await this.syncSingleOrder(order);
        if (success) {
          synced++;
        } else {
          failed++;
        }

        // Siparişler arasında kısa bir bekleme
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`Senkronizasyon tamamlandı. Başarılı: ${synced}, Başarısız: ${failed}`);

      return { synced, failed, total: pendingOrders.length };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Otomatik senkronizasyon sürecini başlat
   */
  private startSyncProcess(): void {
    // Her 30 saniyede bir internet kontrolü yap ve senkronize et
    this.syncInterval = setInterval(async () => {
      try {
        const hasInternet = await checkInternetConnection(3000);

        if (hasInternet) {
          await this.syncAllPendingOrders();
        }
      } catch (error) {
        console.error('Otomatik senkronizasyon hatası:', error);
      }
    }, 30000); // 30 saniye

    console.log('Otomatik senkronizasyon süreci başlatıldı.');
  }

  /**
   * Senkronizasyon sürecini durdur
   */
  public stopSyncProcess(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Otomatik senkronizasyon süreci durduruldu.');
    }
  }

  /**
   * Senkronize edilmiş siparişleri temizle
   */
  async cleanSyncedOrders(): Promise<number> {
    try {
      const offlineOrders = await this.db.get('offline_orders_' + this.fullDay) || {};
      let cleaned = 0;

      for (const [orderId, order] of Object.entries(offlineOrders)) {
        if ((order as OfflineOrder).status === 'synced') {
          await this.db.delete(`offline_orders_${this.fullDay}.${orderId}`);
          cleaned++;
        }
      }

      console.log(`${cleaned} senkronize edilmiş sipariş temizlendi.`);
      return cleaned;
    } catch (error) {
      console.error('Senkronize edilmiş siparişler temizlenemedi:', error);
      return 0;
    }
  }

  /**
   * Offline sipariş istatistikleri
   */
  async getOrderStats(): Promise<{ pending: number; synced: number; failed: number; total: number }> {
    try {
      const offlineOrders = await this.db.get('offline_orders_' + this.fullDay) || {};
      const orders = Object.values(offlineOrders) as OfflineOrder[];

      const stats = {
        pending: orders.filter(o => o.status === 'pending').length,
        synced: orders.filter(o => o.status === 'synced').length,
        failed: orders.filter(o => o.status === 'failed').length,
        total: orders.length
      };

      return stats;
    } catch (error: any) {
      console.error('Sipariş istatistikleri alınamadı:', error);
      return { pending: 0, synced: 0, failed: 0, total: 0 };
    }
  }

  /**
   * Sipariş numarası üretir
   * @param brandId - Marka ID'si
   * @param dealerId - Bayi ID'si
   * @param prefix - Ön ek (varsayılan: 'K')
   * @returns Promise<string> - Üretilen sipariş numarası
   */
  async generateOrderNumber(brandId: string, dealerId: string, prefix: string = 'K'): Promise<string> {
    const now = new Date();
    const turkeyTime = new Date(now.getTime() + (3 * 60 * 60 * 1000));

    // Günlük kullanılan numaralar için key
    const today = turkeyTime.toISOString().split('T')[0];
    const usedNumbersKey = `ORDER_NUMBERS:${brandId}:${dealerId}:${today}:used`;

    // Maksimum deneme sayısı
    const maxAttempts = 50;
    let attempts = 0;
    let orderNumber = '';

    while (attempts < maxAttempts) {
      // Zaman bazlı rastgele sayı üretimi
      const hours = turkeyTime.getHours();
      const minutes = turkeyTime.getMinutes();
      const seconds = turkeyTime.getSeconds();
      const milliseconds = turkeyTime.getMilliseconds();

      // Rastgele seed oluştur
      const seed = milliseconds + (seconds * 1000) + (attempts * 137);

      // İlk rakam: 1-9 arası rastgele
      const digit1 = ((seed * 7 + hours) % 9) + 1;

      // İkinci rakam: 0-9 arası, zaman bazlı karmaşık hesaplama
      const complexCalc = (minutes * 13 + seconds * 17 + seed) % 100;
      const digit2 = Math.floor(complexCalc / 10);

      // Üçüncü rakam: 0-9 arası, XOR ve modülo kombinasyonu
      const xorValue = hours ^ minutes ^ seconds ^ (seed % 256);
      const digit3 = (xorValue + milliseconds) % 10;

      // Sipariş numarasını oluştur
      const candidateNumber = `${digit1}${digit2}${digit3}`;

      // Bu numara daha önce kullanılmış mı kontrol et
      const usedNumbers = await this.orderNumberDb.get(usedNumbersKey) || [];
      const isUsed = usedNumbers.includes(candidateNumber);

      if (!isUsed) {
        // Numarayı kullanılanlar listesine ekle
        usedNumbers.push(candidateNumber);
        await this.orderNumberDb.set(usedNumbersKey, usedNumbers);

        // TTL kontrolü için expiry key'i ayarla (gece yarısına kadar)
        const expiryKey = `${usedNumbersKey}:expiry`;
        const existingExpiry = await this.orderNumberDb.get(expiryKey);

        if (!existingExpiry) {
          const midnight = new Date(turkeyTime);
          midnight.setHours(24, 0, 0, 0);
          await this.orderNumberDb.set(expiryKey, midnight.getTime());

          // Temizleme işlemi için timeout ayarla
          const secondsUntilMidnight = Math.ceil((midnight.getTime() - now.getTime()) / 1000);
          setTimeout(async () => {
            await this.orderNumberDb.delete(usedNumbersKey);
            await this.orderNumberDb.delete(expiryKey);
          }, secondsUntilMidnight * 1000);
        }

        orderNumber = candidateNumber;
        break;
      }

      attempts++;
    }

    // Eğer benzersiz numara bulunamazsa, güvenli fallback
    if (!orderNumber) {
      const fallbackKey = `${usedNumbersKey}:fallback`;
      const fallbackCounter = (await this.orderNumberDb.get(fallbackKey) || 0) + 1;
      await this.orderNumberDb.set(fallbackKey, fallbackCounter);
      orderNumber = (100 + (fallbackCounter % 900)).toString();
    }

    return `${prefix}-${orderNumber}`;
  }
}