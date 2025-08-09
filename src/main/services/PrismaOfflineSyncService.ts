import { PrismaManager } from '../database/PrismaManager';
import { SyncQueue, Transaction } from '../database/prisma';
import axios, { AxiosInstance } from 'axios';
import { logger } from '../../../api/utils/logger';
import { app } from 'electron';

export interface SyncConfig {
  apiUrl: string;
  apiKey?: string;
  syncInterval?: number; // in minutes
  maxRetries?: number;
  batchSize?: number;
}

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
  timestamp: Date;
}

export class PrismaOfflineSyncService {
  private static instance: PrismaOfflineSyncService;
  private db: PrismaManager;
  private apiClient: AxiosInstance;
  private config: SyncConfig;
  private syncTimer: NodeJS.Timeout | null = null;
  private isSyncing: boolean = false;
  private isOnline: boolean = true;
  private syncListeners: Set<(result: SyncResult) => void> = new Set();

  private constructor(config: SyncConfig) {
    this.db = PrismaManager.getInstance();
    this.config = {
      syncInterval: 5,
      maxRetries: 3,
      batchSize: 100,
      ...config
    };

    // Setup API client
    this.apiClient = axios.create({
      baseURL: this.config.apiUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` })
      }
    });

    // Setup online/offline detection
    this.setupNetworkMonitoring();
  }

  public static getInstance(config?: SyncConfig): PrismaOfflineSyncService {
    if (!PrismaOfflineSyncService.instance) {
      if (!config) {
        throw new Error('Config is required for first initialization');
      }
      PrismaOfflineSyncService.instance = new PrismaOfflineSyncService(config);
    }
    return PrismaOfflineSyncService.instance;
  }

  private setupNetworkMonitoring(): void {
    // Monitor network status changes
    setInterval(async () => {
      const wasOnline = this.isOnline;
      this.isOnline = await this.checkOnlineStatus();

      // If we just came online, trigger sync
      if (!wasOnline && this.isOnline) {
        logger.info('Network connection restored, triggering sync');
        this.syncNow();
      }
    }, 10000); // Check every 10 seconds
  }

  private async checkOnlineStatus(): Promise<boolean> {
    try {
      // Try to ping the API server
      await this.apiClient.get('/health', { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  public startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // Initial sync
    this.syncNow();

    // Setup periodic sync
    this.syncTimer = setInterval(() => {
      this.syncNow();
    }, this.config.syncInterval! * 60 * 1000);

    logger.info(`Auto-sync started with ${this.config.syncInterval} minute interval`);
  }

  public stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
      logger.info('Auto-sync stopped');
    }
  }

  public async syncNow(): Promise<SyncResult> {
    if (this.isSyncing) {
      logger.warn('Sync already in progress, skipping');
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ['Sync already in progress'],
        timestamp: new Date()
      };
    }

    if (!this.isOnline) {
      logger.warn('System is offline, skipping sync');
      return {
        success: false,
        syncedItems: 0,
        failedItems: 0,
        errors: ['System is offline'],
        timestamp: new Date()
      };
    }

    this.isSyncing = true;
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      errors: [],
      timestamp: new Date()
    };

    try {
      logger.info('Starting sync process');

      // 1. Sync pending queue items
      const queueResult = await this.syncQueueItems();
      result.syncedItems += queueResult.synced;
      result.failedItems += queueResult.failed;
      result.errors.push(...queueResult.errors);

      // 2. Sync unsynced transactions
      const transactionResult = await this.syncTransactions();
      result.syncedItems += transactionResult.synced;
      result.failedItems += transactionResult.failed;
      result.errors.push(...transactionResult.errors);

      // 3. Pull updates from server
      await this.pullServerUpdates();

      // 4. Clean up old data
      await this.db.clearExpiredCache();
      await this.db.cleanOldLogs(30); // Keep 30 days of logs

      result.success = result.failedItems === 0;
      logger.info('Sync completed', result);

    } catch (error) {
      logger.error('Sync failed', { error });
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.isSyncing = false;
      this.notifySyncListeners(result);
    }

    return result;
  }

  private async syncQueueItems(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const result = { synced: 0, failed: 0, errors: [] as string[] };
    const items = await this.db.getPendingSyncItems(this.config.batchSize!);

    for (const item of items) {
      try {
        // Update status to syncing
        await this.db.updateSyncStatus(item.id, 'syncing');

        // Parse payload
        const payload = JSON.parse(item.payload);

        // Send to API based on operation type
        await this.sendSyncItem(item.operationType, item.entityType, item.entityId, payload);

        // Mark as completed
        await this.db.updateSyncStatus(item.id, 'completed');
        result.synced++;

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`Failed to sync item ${item.id}`, { error });
        
        // Check retry count
        if (item.retryCount < this.config.maxRetries!) {
          await this.db.updateSyncStatus(item.id, 'pending', errorMsg);
        } else {
          await this.db.updateSyncStatus(item.id, 'failed', errorMsg);
          result.failed++;
          result.errors.push(`Item ${item.id}: ${errorMsg}`);
        }
      }
    }

    return result;
  }

  private async sendSyncItem(
    operationType: string,
    entityType: string,
    entityId: string,
    payload: any
  ): Promise<void> {
    const endpoint = `/sync/${entityType}`;
    
    switch (operationType) {
      case 'create':
        await this.apiClient.post(endpoint, payload);
        break;
      case 'update':
        await this.apiClient.put(`${endpoint}/${entityId}`, payload);
        break;
      case 'delete':
        await this.apiClient.delete(`${endpoint}/${entityId}`);
        break;
      default:
        throw new Error(`Unknown operation type: ${operationType}`);
    }
  }

  private async syncTransactions(): Promise<{ synced: number; failed: number; errors: string[] }> {
    const result = { synced: 0, failed: 0, errors: [] as string[] };
    const transactions = await this.db.getUnsyncedTransactions();

    if (transactions.length === 0) return result;

    try {
      // Prepare transactions for batch send
      const transactionData = transactions.map(t => ({
        ...t,
        customerData: t.customerData ? JSON.parse(t.customerData) : null,
        items: t.items ? JSON.parse(t.items) : null,
        receiptData: t.receiptData ? JSON.parse(t.receiptData) : null,
        device_id: this.getDeviceId()
      }));

      // Batch send transactions
      const response = await this.apiClient.post('/sync/transactions', {
        transactions: transactionData
      });

      // Mark transactions as synced
      const syncedIds = response.data.synced_ids || [];
      for (const id of syncedIds) {
        await this.db.markTransactionSynced(id);
        result.synced++;
      }

    } catch (error) {
      logger.error('Failed to sync transactions', { error });
      result.failed = transactions.length;
      result.errors.push('Failed to sync transactions batch');
    }

    return result;
  }

  private async pullServerUpdates(): Promise<void> {
    try {
      // Get last sync timestamp
      const lastSync = await this.db.getCache('last_sync_timestamp') || new Date(0).toISOString();

      // Pull updates from server
      const response = await this.apiClient.get('/sync/updates', {
        params: {
          since: lastSync,
          device_id: this.getDeviceId()
        }
      });

      const updates = response.data;

      // Update products
      if (updates.products?.length > 0) {
        for (const product of updates.products) {
          await this.db.upsertProduct(product);
        }
        logger.info(`Updated ${updates.products.length} products`);
      }

      // Update customers
      if (updates.customers?.length > 0) {
        for (const customer of updates.customers) {
          await this.db.upsertCustomer(customer);
        }
        logger.info(`Updated ${updates.customers.length} customers`);
      }

      // Update last sync timestamp
      await this.db.setCache('last_sync_timestamp', new Date().toISOString(), 'system');

    } catch (error) {
      logger.error('Failed to pull server updates', { error });
      throw error;
    }
  }

  private async getDeviceId(): Promise<string> {
    let deviceId = await this.db.getCache('device_id');
    
    if (!deviceId) {
      // Generate a unique device ID
      deviceId = `kiosk_${app.getName()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      await this.db.setCache('device_id', deviceId, 'system');
    }
    
    return deviceId;
  }

  public addSyncListener(listener: (result: SyncResult) => void): void {
    this.syncListeners.add(listener);
  }

  public removeSyncListener(listener: (result: SyncResult) => void): void {
    this.syncListeners.delete(listener);
  }

  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        logger.error('Error in sync listener', { error });
      }
    });
  }

  public async getSyncStatus(): Promise<{
    isSyncing: boolean;
    isOnline: boolean;
    lastSync: Date | null;
    pendingItems: number;
  }> {
    const lastSyncStr = await this.db.getCache('last_sync_timestamp');
    const pendingItems = await this.db.getPendingSyncCount();

    return {
      isSyncing: this.isSyncing,
      isOnline: this.isOnline,
      lastSync: lastSyncStr ? new Date(lastSyncStr) : null,
      pendingItems
    };
  }

  public async addToQueue(
    operationType: 'create' | 'update' | 'delete',
    entityType: string,
    entityId: string,
    payload: any
  ): Promise<void> {
    await this.db.addToSyncQueue(operationType, entityType, entityId, payload);
  }

  public async getDashboardStats() {
    return await this.db.getDashboardStats();
  }

  public cleanup(): void {
    this.stopAutoSync();
    this.syncListeners.clear();
  }
}