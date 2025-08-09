import { 
  getPrismaClient, 
  SyncQueue, 
  Transaction, 
  Product, 
  Customer,
  LocalCache 
} from './prisma';
import { logger } from '../../../api/utils/logger';
import { Prisma } from '@prisma/client';

export class PrismaManager {
  private static instance: PrismaManager;
  private prisma = getPrismaClient();

  private constructor() {
    logger.info('PrismaManager initialized');
  }

  public static getInstance(): PrismaManager {
    if (!PrismaManager.instance) {
      PrismaManager.instance = new PrismaManager();
    }
    return PrismaManager.instance;
  }

  // ============ Sync Queue Methods ============
  
  public async addToSyncQueue(
    operationType: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    payload: any
  ): Promise<SyncQueue> {
    try {
      return await this.prisma.syncQueue.create({
        data: {
          operationType,
          entityType,
          entityId,
          payload: JSON.stringify(payload),
          status: 'pending',
          retryCount: 0
        }
      });
    } catch (error) {
      logger.error('Failed to add to sync queue', { error });
      throw error;
    }
  }

  public async getPendingSyncItems(limit: number = 100): Promise<SyncQueue[]> {
    return await this.prisma.syncQueue.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: limit
    });
  }

  public async updateSyncStatus(
    id: number, 
    status: string, 
    errorMessage?: string
  ): Promise<void> {
    await this.prisma.syncQueue.update({
      where: { id },
      data: {
        status,
        errorMessage,
        syncedAt: status === 'completed' ? new Date() : undefined,
        retryCount: status === 'failed' ? { increment: 1 } : undefined
      }
    });
  }

  public async getPendingSyncCount(): Promise<number> {
    return await this.prisma.syncQueue.count({
      where: { status: 'pending' }
    });
  }

  // ============ Transaction Methods ============
  
  public async saveTransaction(data: {
    transactionId: string;
    transactionType: string;
    amount?: number;
    currency?: string;
    customerData?: any;
    items?: any[];
    paymentMethod?: string;
    status?: string;
    receiptData?: any;
  }): Promise<Transaction> {
    return await this.prisma.transaction.create({
      data: {
        transactionId: data.transactionId,
        transactionType: data.transactionType,
        amount: data.amount || 0,
        currency: data.currency || 'TRY',
        customerData: data.customerData ? JSON.stringify(data.customerData) : null,
        items: data.items ? JSON.stringify(data.items) : null,
        paymentMethod: data.paymentMethod,
        status: data.status || 'pending',
        receiptData: data.receiptData ? JSON.stringify(data.receiptData) : null
      }
    });
  }

  public async getUnsyncedTransactions(): Promise<Transaction[]> {
    return await this.prisma.transaction.findMany({
      where: { synced: false },
      orderBy: { createdAt: 'asc' }
    });
  }

  public async markTransactionSynced(id: number): Promise<void> {
    await this.prisma.transaction.update({
      where: { id },
      data: { synced: true }
    });
  }

  public async getTransactionsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<Transaction[]> {
    return await this.prisma.transaction.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // ============ Product Methods ============
  
  public async upsertProduct(data: {
    productId: string;
    barcode?: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
    stockQuantity?: number;
    imageUrl?: string;
    attributes?: any;
    isActive?: boolean;
  }): Promise<Product> {
    return await this.prisma.product.upsert({
      where: { productId: data.productId },
      create: {
        productId: data.productId,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price || 0,
        stockQuantity: data.stockQuantity || 0,
        imageUrl: data.imageUrl,
        attributes: data.attributes ? JSON.stringify(data.attributes) : null,
        isActive: data.isActive !== false,
        syncedAt: new Date()
      },
      update: {
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        category: data.category,
        price: data.price || 0,
        stockQuantity: data.stockQuantity || 0,
        imageUrl: data.imageUrl,
        attributes: data.attributes ? JSON.stringify(data.attributes) : null,
        isActive: data.isActive !== false,
        syncedAt: new Date()
      }
    });
  }

  public async getProductByBarcode(barcode: string): Promise<Product | null> {
    return await this.prisma.product.findFirst({
      where: {
        barcode,
        isActive: true
      }
    });
  }

  public async searchProducts(query: string): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: {
        AND: [
          { isActive: true },
          {
            OR: [
              { name: { contains: query } },
              { barcode: { contains: query } },
              { category: { contains: query } }
            ]
          }
        ]
      },
      take: 50
    });
  }

  public async getProductsByCategory(category: string): Promise<Product[]> {
    return await this.prisma.product.findMany({
      where: {
        category,
        isActive: true
      },
      orderBy: { name: 'asc' }
    });
  }

  public async updateProductStock(
    productId: string, 
    quantity: number
  ): Promise<Product> {
    return await this.prisma.product.update({
      where: { productId },
      data: {
        stockQuantity: quantity
      }
    });
  }

  // ============ Customer Methods ============
  
  public async upsertCustomer(data: {
    customerId: string;
    name?: string;
    phone?: string;
    email?: string;
    loyaltyCard?: string;
    points?: number;
    totalSpent?: number;
    visitCount?: number;
    preferences?: any;
  }): Promise<Customer> {
    return await this.prisma.customer.upsert({
      where: { customerId: data.customerId },
      create: {
        customerId: data.customerId,
        name: data.name,
        phone: data.phone,
        email: data.email,
        loyaltyCard: data.loyaltyCard,
        points: data.points || 0,
        totalSpent: data.totalSpent || 0,
        visitCount: data.visitCount || 0,
        preferences: data.preferences ? JSON.stringify(data.preferences) : null,
        syncedAt: new Date()
      },
      update: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        loyaltyCard: data.loyaltyCard,
        points: data.points || 0,
        totalSpent: data.totalSpent || 0,
        visitCount: data.visitCount || 0,
        preferences: data.preferences ? JSON.stringify(data.preferences) : null,
        lastVisit: new Date(),
        syncedAt: new Date()
      }
    });
  }

  public async getCustomerByPhone(phone: string): Promise<Customer | null> {
    return await this.prisma.customer.findFirst({
      where: { phone }
    });
  }

  public async getCustomerByLoyaltyCard(
    loyaltyCard: string
  ): Promise<Customer | null> {
    return await this.prisma.customer.findFirst({
      where: { loyaltyCard }
    });
  }

  public async updateCustomerPoints(
    customerId: string,
    points: number
  ): Promise<Customer> {
    return await this.prisma.customer.update({
      where: { customerId },
      data: {
        points: { increment: points }
      }
    });
  }

  public async searchCustomers(query: string): Promise<Customer[]> {
    return await this.prisma.customer.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { phone: { contains: query } },
          { email: { contains: query } },
          { loyaltyCard: { contains: query } }
        ]
      },
      take: 50
    });
  }

  // ============ Cache Methods ============
  
  public async setCache(
    key: string,
    value: any,
    type: string,
    expiresInMinutes?: number
  ): Promise<LocalCache> {
    const expiresAt = expiresInMinutes
      ? new Date(Date.now() + expiresInMinutes * 60000)
      : undefined;

    return await this.prisma.localCache.upsert({
      where: { cacheKey: key },
      create: {
        cacheKey: key,
        cacheValue: JSON.stringify(value),
        cacheType: type,
        expiresAt
      },
      update: {
        cacheValue: JSON.stringify(value),
        expiresAt,
        updatedAt: new Date()
      }
    });
  }

  public async getCache(key: string): Promise<any | null> {
    const cache = await this.prisma.localCache.findFirst({
      where: {
        cacheKey: key,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    if (!cache) return null;
    
    try {
      return JSON.parse(cache.cacheValue);
    } catch {
      return cache.cacheValue;
    }
  }

  public async clearExpiredCache(): Promise<number> {
    const result = await this.prisma.localCache.deleteMany({
      where: {
        expiresAt: {
          lte: new Date()
        }
      }
    });
    return result.count;
  }

  // ============ License Methods ============
  
  public async saveLicenseCache(
    apiKey: string,
    isValid: boolean,
    expiresAt?: Date
  ): Promise<void> {
    await this.prisma.licenseCache.upsert({
      where: { apiKey },
      create: {
        apiKey,
        isValid,
        expiresAt
      },
      update: {
        isValid,
        expiresAt,
        lastVerified: new Date()
      }
    });
  }

  public async getLicenseCache(apiKey: string) {
    return await this.prisma.licenseCache.findUnique({
      where: { apiKey }
    });
  }

  // ============ App Logs ============
  
  public async addLog(
    level: string,
    message: string,
    metadata?: any
  ): Promise<void> {
    await this.prisma.appLog.create({
      data: {
        level,
        message,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    });
  }

  public async getRecentLogs(limit: number = 100) {
    return await this.prisma.appLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  // ============ Statistics Methods ============
  
  public async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      todayTransactions,
      totalProducts,
      activeCustomers,
      pendingSync
    ] = await Promise.all([
      this.prisma.transaction.count({
        where: {
          createdAt: { gte: today }
        }
      }),
      this.prisma.product.count({
        where: { isActive: true }
      }),
      this.prisma.customer.count(),
      this.prisma.syncQueue.count({
        where: { status: 'pending' }
      })
    ]);

    const todayRevenue = await this.prisma.transaction.aggregate({
      where: {
        createdAt: { gte: today },
        status: 'completed'
      },
      _sum: {
        amount: true
      }
    });

    return {
      todayTransactions,
      todayRevenue: todayRevenue._sum.amount || 0,
      totalProducts,
      activeCustomers,
      pendingSync
    };
  }

  // ============ Cleanup Methods ============
  
  public async cleanOldLogs(daysToKeep: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.appLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate }
      }
    });

    return result.count;
  }

  public async vacuum(): Promise<void> {
    // SQLite specific vacuum command
    await this.prisma.$executeRawUnsafe('VACUUM');
  }
}