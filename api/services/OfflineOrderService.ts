import { LicenseManager } from '@/main/services/LicenseManager';
import { QuickDBManager } from '../../src/main/database/QuickDBManager';
import baseApi from '../api';
import { checkInternetConnection } from '../utils/networkUtils';
import { DailyOrderService } from './DailyOrderService';

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
  private dbManager: QuickDBManager;
  private db: any;
  private dailyOrderService: DailyOrderService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  private constructor() {
    this.dbManager = QuickDBManager.getInstance();
    this.db = this.dbManager.getDatabase();
    this.dailyOrderService = DailyOrderService.getInstance();
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

      await this.db.set(`offline_orders.${orderId}`, offlineOrder);

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
   * Bekleyen offline siparişleri getir
   */
  async getPendingOrders(): Promise<OfflineOrder[]> {
    try {
      const offlineOrders = await this.db.get('offline_orders') || {};
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
      await this.db.set(`offline_orders.${order.id}.status`, 'syncing');
      await this.db.set(`offline_orders.${order.id}.lastAttempt`, new Date());
      await this.db.add(`offline_orders.${order.id}.attempts`, 1);

      const result = await baseApi.post<any>("/v1/order", order.payload, {
        headers: {
          ["x-device-id"]: order.payload.deviceId,
          Authorization: `Bearer ${getLicenseKey()}`
        }
      });

      console.log(result.data)

      if (result.data.success) {
        // Başarılı, siparişi synced olarak işaretle
        await this.db.set(`offline_orders.${order.id}.status`, 'synced');

        // Günlük tablodaki sipariş durumunu da güncelle
        try {
          await this.dailyOrderService.updateOrderStatus(order.id, 'completed');
        } catch (dailyError) {
          console.warn(`Günlük tablo durumu güncellenemedi: ${order.id}`, dailyError);
        }

        console.log(`Sipariş başarıyla senkronize edildi: ${order.id}`);
        return true;
      } else {
        // API hatası
        await this.db.set(`offline_orders.${order.id}.status`, 'failed');
        await this.db.set(`offline_orders.${order.id}.error`, 'API yanıt hatası');
        console.error(`Sipariş senkronizasyon hatası: ${order.id}`);
        return false;
      }
    } catch (error: any) {
      console.log(error);
      // Hata durumu
      await this.db.set(`offline_orders.${order.id}.status`, 'failed');
      await this.db.set(`offline_orders.${order.id}.error`, error.message);
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
      const offlineOrders = await this.db.get('offline_orders') || {};
      let cleaned = 0;

      for (const [orderId, order] of Object.entries(offlineOrders)) {
        if ((order as OfflineOrder).status === 'synced') {
          await this.db.delete(`offline_orders.${orderId}`);
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
      const offlineOrders = await this.db.get('offline_orders') || {};
      const orders = Object.values(offlineOrders) as OfflineOrder[];

      const stats = {
        pending: orders.filter(o => o.status === 'pending').length,
        synced: orders.filter(o => o.status === 'synced').length,
        failed: orders.filter(o => o.status === 'failed').length,
        total: orders.length
      };

      return stats;
    } catch (error) {
      console.error('Sipariş istatistikleri alınamadı:', error);
      return { pending: 0, synced: 0, failed: 0, total: 0 };
    }
  }
}