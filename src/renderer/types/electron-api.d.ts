export interface ElectronAPI {
  license: {
    verify: (apiKey: string) => Promise<{ valid: boolean; message?: string }>;
    getStatus: () => Promise<{ valid: boolean; message?: string; expiresAt?: string }>;
    saveKey: (apiKey: string) => Promise<{ success: boolean }>;
    getKey: () => Promise<string | null>;
  };
  window: {
    showKiosk: () => void;
    showLicenseInput: () => void;
    showLicenseRenewal: () => void;
    showAdminPanel?: () => void;
  };
  app: {
    quit: () => void;
    minimize: () => void;
    maximize: () => void;
    openDevTools: () => void;
  };
  port: {
    getStatus: () => Promise<{ port: number; isAvailable: boolean; isInUse: boolean }>;
    check: (port: number) => Promise<{ port: number; isAvailable: boolean; isInUse: boolean }>;
    findAvailable: (startPort?: number) => Promise<number>;
    scanRange: (startPort: number, endPort: number) => Promise<any>;
    resolveConflict: () => Promise<any>;
    scanPorts: (options: { startIp: string; endIp: string; port: number; concurrency?: number; timeoutMs?: number; batchDelayMs?: number }) => Promise<{ ip: string; port: number; status: 'open' | 'closed' }[]>;
    setCurrent: (port: number) => Promise<{ success: boolean; port: number }>;
    startMonitoring: () => Promise<{ success: boolean }>;
    stopMonitoring: () => Promise<{ success: boolean }>;
  };
  update: {
    getStatus: () => Promise<any>;
    check: () => Promise<any>;
    download: () => Promise<{ success: boolean }>;
    install: () => Promise<{ success: boolean }>;
    startAutoCheck: (intervalMinutes?: number) => Promise<{ success: boolean; intervalMinutes: number }>;
    stopAutoCheck: () => Promise<{ success: boolean }>;
    setSettings: (settings: { autoDownload?: boolean; autoInstall?: boolean }) => Promise<{ success: boolean; settings: any }>;
    getInfo: () => Promise<any>;
  };
  printer: {
    getSettings: () => Promise<any>;
    setSettings: (settings: any) => Promise<any>;
    list: () => Promise<any[]>;
    addIP: (config: any) => Promise<any>;
    remove: (id: string) => Promise<void>;
    getActive: () => Promise<any>;
    setActive: (id: string) => Promise<void>;
    printTest: (id?: string) => Promise<void>;
    printJob: (job: any) => Promise<void>;
    discoverIP: (range: string) => Promise<any[]>;
  };
  database: {
    searchProducts: (query: string) => Promise<any[]>;
    getProductByBarcode: (barcode: string) => Promise<any | null>;
    saveTransaction: (transaction: any) => Promise<any>;
    searchCustomers: (query: string) => Promise<any[]>;
    getDashboardStats: () => Promise<{
      todayTransactions: number;
      todayRevenue: number;
      totalProducts: number;
      activeCustomers: number;
      pendingSync: number;
    }>;
  };
  sync: {
    getStatus: () => Promise<{
      isSyncing: boolean;
      isOnline: boolean;
      lastSync: Date | null;
      pendingItems: number;
    }>;
    syncNow: () => Promise<{
      success: boolean;
      syncedItems: number;
      failedItems: number;
      errors: string[];
      timestamp: Date;
    }>;
    getPendingCount: () => Promise<number>;
  };
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}