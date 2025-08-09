import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { APIServer } from '../../api/server';
import { IPC_CHANNELS, PRINTER_IPC } from '../../shared/types';
import { LicenseManager } from './services/LicenseManager';
import { WindowManager } from './services/WindowManager';
import { PortManager } from './services/PortManager';
import { UpdateManager } from './services/UpdateManager';
import { printerManager } from './services/PrinterManager';
import { logger } from '../../api/utils/logger';
import { initializeDatabase, disconnectDatabase } from './database/prisma';
import { PrismaOfflineSyncService } from './services/PrismaOfflineSyncService';
import { PrismaManager } from './database/PrismaManager';

// test

class KioskApp {
  private apiServer: APIServer;
  private licenseManager: LicenseManager;
  private windowManager: WindowManager;
  private portManager: PortManager;
  private updateManager: UpdateManager;
  private printerManager = printerManager;
  private syncService: PrismaOfflineSyncService | null = null;
  private prismaManager: PrismaManager | null = null;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.apiServer = new APIServer(3001);
    this.licenseManager = new LicenseManager();
    this.windowManager = new WindowManager(this.isDev);
    this.portManager = PortManager.getInstance();
    this.updateManager = UpdateManager.getInstance();

    this.setupApp();
    this.setupIPC();
  }

  private setupApp(): void {
    // App event handlers
    app.whenReady().then(() => {
      this.initialize();
    });

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        this.shutdown();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.initialize();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.setWindowOpenHandler(({ url }) => {
        logger.warn('Blocked new window creation', { url });
        return { action: 'deny' };
      });
    });
  }

  private async initialize(): Promise<void> {
    try {
      logger.info('Initializing Kiosk Application');

      // Initialize Prisma database
      await initializeDatabase();
      this.prismaManager = PrismaManager.getInstance();
      logger.info('Database initialized');

      // Initialize offline sync service
      const syncConfig = {
        apiUrl: process.env.API_URL || 'http://localhost:3001',
        apiKey: process.env.API_KEY,
        syncInterval: parseInt(process.env.SYNC_INTERVAL || '5'),
        maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
        batchSize: parseInt(process.env.BATCH_SIZE || '100')
      };
      this.syncService = PrismaOfflineSyncService.getInstance(syncConfig);
      this.syncService.startAutoSync();
      logger.info('Offline sync service initialized');

      // Start port monitoring
      this.portManager.startPortMonitoring();
      
      // Start auto update checking (every 60 minutes)
      this.updateManager.startAutoUpdateCheck(60);

      // Start API server
      try {
        await this.apiServer.start();
        logger.info('API Server started successfully on port 3001');
      } catch (apiError) {
        logger.error('Failed to start API server', { apiError });
        // Continue without API server in development
        if (!this.isDev) {
          throw apiError;
        }
      }

      // Remove menu in production
      if (!this.isDev) {
        Menu.setApplicationMenu(null);
      }

      // Check license status and show appropriate window
      const hasValidLicense = await this.licenseManager.checkInitialLicense();
      
      if (hasValidLicense) {
        this.windowManager.showKioskWindow();
        // Start background license verification
        this.licenseManager.startBackgroundVerification();
      } else {
        this.windowManager.showLicenseInputWindow();
      }

      logger.info('Kiosk Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', { error });
      app.quit();
    }
  }

  private setupIPC(): void {
    // License verification
    ipcMain.handle(IPC_CHANNELS.LICENSE_VERIFY, async (event, apiKey: string) => {
      try {
        const result = await this.licenseManager.verifyLicense(apiKey);
        if (result.valid) {
          // Switch to kiosk window on successful verification
          this.windowManager.showKioskWindow();
          this.licenseManager.startBackgroundVerification();
        }
        return result;
      } catch (error) {
        logger.error('IPC License verification failed', { error });
        return { valid: false, message: 'Verification failed' };
      }
    });

    // Get license status
    ipcMain.handle(IPC_CHANNELS.LICENSE_STATUS, async () => {
      try {
        return await this.licenseManager.getLicenseStatus();
      } catch (error) {
        logger.error('IPC License status check failed', { error });
        return { valid: false, message: 'Status check failed' };
      }
    });

    // Save API key
    ipcMain.handle(IPC_CHANNELS.LICENSE_SAVE_KEY, async (event, apiKey: string) => {
      try {
        await this.licenseManager.saveApiKey(apiKey);
        return { success: true };
      } catch (error) {
        logger.error('IPC Save API key failed', { error });
        return { success: false, message: 'Failed to save API key' };
      }
    });

    // Get saved API key
    ipcMain.handle(IPC_CHANNELS.LICENSE_GET_KEY, async () => {
      try {
        return await this.licenseManager.getSavedApiKey();
      } catch (error) {
        logger.error('IPC Get API key failed', { error });
        return null;
      }
    });

    // Window controls
    ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_KIOSK, () => {
      this.windowManager.showKioskWindow();
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_LICENSE_INPUT, () => {
      this.windowManager.showLicenseInputWindow();
    });

    ipcMain.handle(IPC_CHANNELS.WINDOW_SHOW_LICENSE_RENEWAL, () => {
      this.windowManager.showLicenseRenewalWindow();
    });

    // App controls
    ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
      this.shutdown();
    });
    // Printer IPC
    ipcMain.handle(PRINTER_IPC.GET_SETTINGS, () => this.printerManager.getSettings());
    ipcMain.handle(PRINTER_IPC.SET_SETTINGS, (_e, next) => this.printerManager.setSettings(next));
    ipcMain.handle(PRINTER_IPC.LIST, () => this.printerManager.listPrinters());
    ipcMain.handle(PRINTER_IPC.ADD_IP, (_e, cfg) => this.printerManager.addIPPrinter(cfg));
    ipcMain.handle(PRINTER_IPC.REMOVE, (_e, id) => this.printerManager.removePrinter(id));
    ipcMain.handle(PRINTER_IPC.GET_ACTIVE, () => this.printerManager.getActivePrinter());
    ipcMain.handle(PRINTER_IPC.SET_ACTIVE, (_e, id) => this.printerManager.setActivePrinter(id));
    ipcMain.handle(PRINTER_IPC.PRINT_TEST, (_e, id?) => this.printerManager.printTest(id));
    ipcMain.handle(PRINTER_IPC.PRINT_JOB, (_e, job) => this.printerManager.printJob(job));
    ipcMain.handle(PRINTER_IPC.DISCOVER_IP, (_e, range) => this.printerManager.discoverIPPrinters(range));

    ipcMain.handle(IPC_CHANNELS.APP_MINIMIZE, () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        focusedWindow.minimize();
      }
    });

    ipcMain.handle(IPC_CHANNELS.APP_MAXIMIZE, () => {
      const focusedWindow = BrowserWindow.getFocusedWindow();
      if (focusedWindow) {
        if (focusedWindow.isMaximized()) {
          focusedWindow.unmaximize();
        } else {
          focusedWindow.maximize();
        }
      }
    });

    ipcMain.handle(IPC_CHANNELS.APP_OPEN_DEVTOOLS, () => {
      const win = BrowserWindow.getFocusedWindow() || this.windowManager.getCurrentWindow();
      if (win) {
        win.webContents.openDevTools({ mode: 'detach' });
      }
    });

    // Port management IPC handlers
    ipcMain.handle(IPC_CHANNELS.PORT_GET_STATUS, async () => {
      try {
        const currentPort = this.portManager.getCurrentPort();
        const isAvailable = await this.portManager.isPortAvailable(currentPort);
        return {
          port: currentPort,
          isAvailable,
          isInUse: !isAvailable
        };
      } catch (error) {
        logger.error('IPC Port status check failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_CHECK, async (event, port: number) => {
      try {
        const isAvailable = await this.portManager.isPortAvailable(port);
        return {
          port,
          isAvailable,
          isInUse: !isAvailable
        };
      } catch (error) {
        logger.error('IPC Port check failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_FIND_AVAILABLE, async (event, startPort: number = 3000) => {
      try {
        const availablePort = await this.portManager.findAvailablePort(startPort);
        return availablePort;
      } catch (error) {
        logger.error('IPC Find available port failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_SCAN_RANGE, async (event, startPort: number, endPort: number) => {
      try {
        const results = await this.portManager.scanPortRange(startPort, endPort);
        return {
          startPort,
          endPort,
          results,
          totalScanned: results.length,
          availablePorts: results.filter(r => r.isAvailable).map(r => r.port),
          usedPorts: results.filter(r => r.isInUse).map(r => r.port)
        };
      } catch (error) {
        logger.error('IPC Port scan failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_RESOLVE_CONFLICT, async () => {
      try {
        return await this.portManager.checkAndResolvePortConflict();
      } catch (error) {
        logger.error('IPC Port conflict resolution failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_SET_CURRENT, async (event, port: number) => {
      try {
        const isAvailable = await this.portManager.isPortAvailable(port);
        if (!isAvailable) {
          throw new Error('Port is not available');
        }
        this.portManager.setCurrentPort(port);
        return { success: true, port };
      } catch (error) {
        logger.error('IPC Set current port failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_START_MONITORING, () => {
      try {
        this.portManager.startPortMonitoring();
        return { success: true };
      } catch (error) {
        logger.error('IPC Start port monitoring failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.PORT_STOP_MONITORING, () => {
      try {
        this.portManager.stopPortMonitoring();
        return { success: true };
      } catch (error) {
        logger.error('IPC Stop port monitoring failed', { error });
        throw error;
      }
    });

    // Update management IPC handlers
    ipcMain.handle(IPC_CHANNELS.UPDATE_GET_STATUS, () => {
      try {
        return this.updateManager.getStatus();
      } catch (error) {
        logger.error('IPC Get update status failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async () => {
      try {
        return await this.updateManager.checkForUpdates();
      } catch (error) {
        logger.error('IPC Check for updates failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async () => {
      try {
        await this.updateManager.downloadUpdate();
        return { success: true };
      } catch (error) {
        logger.error('IPC Download update failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, async () => {
      try {
        await this.updateManager.installUpdate();
        return { success: true };
      } catch (error) {
        logger.error('IPC Install update failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_START_AUTO_CHECK, (event, intervalMinutes: number = 60) => {
      try {
        this.updateManager.startAutoUpdateCheck(intervalMinutes);
        return { success: true, intervalMinutes };
      } catch (error) {
        logger.error('IPC Start auto update check failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_STOP_AUTO_CHECK, () => {
      try {
        this.updateManager.stopAutoUpdateCheck();
        return { success: true };
      } catch (error) {
        logger.error('IPC Stop auto update check failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_SET_SETTINGS, (event, settings: { autoDownload?: boolean; autoInstall?: boolean }) => {
      try {
        if (typeof settings.autoDownload === 'boolean') {
          this.updateManager.setAutoDownload(settings.autoDownload);
        }
        if (typeof settings.autoInstall === 'boolean') {
          this.updateManager.setAutoInstall(settings.autoInstall);
        }
        return { success: true, settings };
      } catch (error) {
        logger.error('IPC Set update settings failed', { error });
        throw error;
      }
    });

    ipcMain.handle(IPC_CHANNELS.UPDATE_GET_INFO, () => {
      try {
        const status = this.updateManager.getStatus();

        return {
          currentVersion: app.getVersion(),
          appName: app.getName(),
          updateStatus: status,
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        };
      } catch (error) {
        logger.error('IPC Get update info failed', { error });
        throw error;
      }
    });

    // Database IPC handlers
    ipcMain.handle('database:searchProducts', async (event, query: string) => {
      try {
        return await this.prismaManager?.searchProducts(query);
      } catch (error) {
        logger.error('IPC Search products failed', { error });
        throw error;
      }
    });

    ipcMain.handle('database:getProductByBarcode', async (event, barcode: string) => {
      try {
        return await this.prismaManager?.getProductByBarcode(barcode);
      } catch (error) {
        logger.error('IPC Get product by barcode failed', { error });
        throw error;
      }
    });

    ipcMain.handle('database:saveTransaction', async (event, transaction: any) => {
      try {
        return await this.prismaManager?.saveTransaction(transaction);
      } catch (error) {
        logger.error('IPC Save transaction failed', { error });
        throw error;
      }
    });

    ipcMain.handle('database:searchCustomers', async (event, query: string) => {
      try {
        return await this.prismaManager?.searchCustomers(query);
      } catch (error) {
        logger.error('IPC Search customers failed', { error });
        throw error;
      }
    });

    ipcMain.handle('database:getDashboardStats', async () => {
      try {
        return await this.prismaManager?.getDashboardStats();
      } catch (error) {
        logger.error('IPC Get dashboard stats failed', { error });
        throw error;
      }
    });

    // Sync IPC handlers
    ipcMain.handle('sync:getStatus', async () => {
      try {
        return await this.syncService?.getSyncStatus();
      } catch (error) {
        logger.error('IPC Get sync status failed', { error });
        throw error;
      }
    });

    ipcMain.handle('sync:syncNow', async () => {
      try {
        return await this.syncService?.syncNow();
      } catch (error) {
        logger.error('IPC Sync now failed', { error });
        throw error;
      }
    });

    ipcMain.handle('sync:getPendingCount', async () => {
      try {
        return await this.prismaManager?.getPendingSyncCount();
      } catch (error) {
        logger.error('IPC Get pending sync count failed', { error });
        throw error;
      }
    });
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Kiosk Application');
      
      // Stop background verification
      this.licenseManager.stopBackgroundVerification();
      
      // Stop sync service
      if (this.syncService) {
        this.syncService.cleanup();
      }
      
      // Stop port monitoring
      this.portManager.cleanup();
      
      // Stop update manager
      this.updateManager.cleanup();
      
      // Stop API server
      await this.apiServer.stop();
      
      // Disconnect database
      await disconnectDatabase();
      
      // Close all windows
      this.windowManager.closeAllWindows();
      
      app.quit();
    } catch (error) {
      logger.error('Error during shutdown', { error });
      app.quit();
    }
  }
}

// Initialize the application
new KioskApp();