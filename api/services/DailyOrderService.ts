import { QuickDBManager } from '../../src/main/database/QuickDBManager';

export interface DailyOrder {
  id: string;
  orderId: string;
  payload: any;
  createdAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
  isOffline: boolean;
  syncedAt?: Date;
}

export class DailyOrderService {
  private static instance: DailyOrderService;
  private dbManager: QuickDBManager;
  private db: any;

  private constructor() {
    this.dbManager = QuickDBManager.getInstance();
    this.db = this.dbManager.getDatabase();
  }

  public static getInstance(): DailyOrderService {
    if (!DailyOrderService.instance) {
      DailyOrderService.instance = new DailyOrderService();
    }
    return DailyOrderService.instance;
  }

  /**
   * Günlük tablo adını oluştur (daily_orders_DDMMYYYY formatında)
   */
  private getDailyTableName(date: Date = new Date()): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `daily_orders_${day}${month}${year}`;
  }

  /**
   * Günlük siparişi kaydet
   */
  async saveDailyOrder(orderId: string, payload: any, isOffline: boolean = false): Promise<{ success: boolean; id: string; tableName: string }> {
    try {
      const now = new Date();
      const tableName = this.getDailyTableName(now);
      const dailyOrderId = `${tableName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const dailyOrder: DailyOrder = {
        id: dailyOrderId,
        orderId,
        payload,
        createdAt: now,
        status: 'pending',
        isOffline
      };

      await this.db.set(`${tableName}.${dailyOrderId}`, dailyOrder);

      console.log(`Günlük sipariş kaydedildi: ${tableName} - ${dailyOrderId}`);

      return {
        success: true,
        id: dailyOrderId,
        tableName
      };
    } catch (error) {
      console.error('Günlük sipariş kaydetme hatası:', error);
      throw error;
    }
  }

  /**
   * Belirli bir günün siparişlerini getir
   */
  async getDailyOrders(date: Date = new Date()): Promise<DailyOrder[]> {
    try {
      const tableName = this.getDailyTableName(date);
      const orders = await this.db.get(tableName) || {};
      
      return Object.values(orders) as DailyOrder[];
    } catch (error) {
      console.error('Günlük siparişler alınamadı:', error);
      return [];
    }
  }

  /**
   * Sipariş durumunu güncelle
   */
  async updateOrderStatus(orderId: string, status: 'pending' | 'completed' | 'cancelled', date: Date = new Date()): Promise<boolean> {
    try {
      const tableName = this.getDailyTableName(date);
      const orders = await this.db.get(tableName) || {};
      
      // Sipariş ID'sine göre günlük siparişi bul
      const orderKey = Object.keys(orders).find(key => orders[key].orderId === orderId);
      
      if (orderKey) {
        await this.db.set(`${tableName}.${orderKey}.status`, status);
        if (status === 'completed') {
          await this.db.set(`${tableName}.${orderKey}.syncedAt`, new Date());
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Sipariş durumu güncellenemedi:', error);
      return false;
    }
  }

  /**
   * Günlük sipariş istatistikleri
   */
  async getDailyStats(date: Date = new Date()): Promise<{ total: number; pending: number; completed: number; cancelled: number; offline: number }> {
    try {
      const orders = await this.getDailyOrders(date);
      
      const stats = {
        total: orders.length,
        pending: orders.filter(o => o.status === 'pending').length,
        completed: orders.filter(o => o.status === 'completed').length,
        cancelled: orders.filter(o => o.status === 'cancelled').length,
        offline: orders.filter(o => o.isOffline).length
      };
      
      return stats;
    } catch (error) {
      console.error('Günlük istatistikler alınamadı:', error);
      return { total: 0, pending: 0, completed: 0, cancelled: 0, offline: 0 };
    }
  }

  /**
   * Belirli tarih aralığındaki tabloları listele
   */
  async getAvailableTables(startDate: Date, endDate: Date): Promise<string[]> {
    try {
      const tables: string[] = [];
      const currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const tableName = this.getDailyTableName(currentDate);
        const orders = await this.db.get(tableName);
        
        if (orders && Object.keys(orders).length > 0) {
          tables.push(tableName);
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      return tables;
    } catch (error) {
      console.error('Mevcut tablolar alınamadı:', error);
      return [];
    }
  }

  /**
   * Eski tabloları temizle (30 günden eski)
   */
  async cleanOldTables(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      let cleanedCount = 0;
      const allKeys = await this.db.all();
      
      for (const key of Object.keys(allKeys)) {
        if (key.startsWith('daily_orders_')) {
          // Tarih formatını parse et (daily_orders_DDMMYYYY)
          const dateStr = key.replace('daily_orders_', '');
          const day = parseInt(dateStr.substr(0, 2));
          const month = parseInt(dateStr.substr(2, 2)) - 1; // Month is 0-indexed
          const year = parseInt(dateStr.substr(4, 4));
          
          const tableDate = new Date(year, month, day);
          
          if (tableDate < cutoffDate) {
            await this.db.delete(key);
            cleanedCount++;
            console.log(`Eski tablo temizlendi: ${key}`);
          }
        }
      }
      
      return cleanedCount;
    } catch (error) {
      console.error('Eski tablolar temizlenemedi:', error);
      return 0;
    }
  }
}