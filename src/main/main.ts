import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { WindowManager } from './services/WindowManager';
import { UpdateManager } from './services/UpdateManager';
import { LicenseManager } from './services/LicenseManager';
import { logger } from '../../api/utils/logger';
import { APIServer } from '../../api/server';

// test

class KioskApp {
  private windowManager: WindowManager;
  private updateManager: UpdateManager;
  private licenseManager: LicenseManager;
  private apiServer: APIServer;
  private isDev: boolean;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.windowManager = new WindowManager(this.isDev);
    this.updateManager = UpdateManager.getInstance();
    this.licenseManager = new LicenseManager();
    this.apiServer = new APIServer(3001);
    
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
      
      // Start API Server
      await this.apiServer.start();
      logger.info('✅ API Server started successfully on http://localhost:3001/api');
      console.log('🚀 API Server is running on port 3001 - http://localhost:3001/api');
      
      // Start auto update checking (every 60 minutes)
      this.updateManager.startAutoUpdateCheck(60);

      // Remove menu in production
      if (!this.isDev) {
        Menu.setApplicationMenu(null);
      }

      // Show main kiosk window
      this.windowManager.showKioskWindow();

      logger.info('Kiosk Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application', { error });
      app.quit();
    }
  }

  private setupIPC(): void {
    // App version
    ipcMain.handle('app:getVersion', () => {
      return app.getVersion();
    });

    // License management IPC handlers
    ipcMain.handle('license:validate', async (_, licenseKey: string) => {
      try {
        // Use axios-based API verification
        return await this.licenseManager.verifyLicenseViaAPI(licenseKey);
      } catch (error) {
        logger.error('IPC License validation failed', { error });
        throw error;
      }
    });

    ipcMain.handle('license:getStatus', () => {
      try {
        return this.licenseManager.getLicenseStatus();
      } catch (error) {
        logger.error('IPC Get license status failed', { error });
        throw error;
      }
    });

    ipcMain.handle('license:save', async (_, licenseKey: string) => {
      try {
        return await this.licenseManager.saveLicense(licenseKey);
      } catch (error) {
        logger.error('IPC Save license failed', { error });
        throw error;
      }
    });

    // Window controls
    ipcMain.handle('window:show-custom', () => {
      try {
        this.windowManager.showCustomWindow();
        return { success: true };
      } catch (error) {
        logger.error('IPC Show custom window failed', { error });
        throw error;
      }
    });

    ipcMain.handle('window:hide-custom', () => {
      try {
        this.windowManager.hideCustomWindow();
        return { success: true };
      } catch (error) {
        logger.error('IPC Hide custom window failed', { error });
        throw error;
      }
    });

    ipcMain.handle('window:show-dealer-settings', () => {
      try {
        this.windowManager.showDealerSettingsWindow();
        return { success: true };
      } catch (error) {
        logger.error('IPC Show dealer settings window failed', { error });
        throw error;
      }
    });

    ipcMain.handle('window:hide-dealer-settings', () => {
      try {
        this.windowManager.hideDealerSettingsWindow();
        return { success: true };
      } catch (error) {
        logger.error('IPC Hide dealer settings window failed', { error });
        throw error;
      }
    });

    // App controls
    ipcMain.handle(IPC_CHANNELS.APP_QUIT, () => {
      this.shutdown();
    });

    // Update management IPC handlers
    ipcMain.handle('update:check', async () => {
      try {
        return await this.updateManager.checkForUpdates();
      } catch (error) {
        logger.error('IPC Update check failed', { error });
        throw error;
      }
    });

    ipcMain.handle('update:download', async () => {
      try {
        return await this.updateManager.downloadUpdate();
      } catch (error) {
        logger.error('IPC Update download failed', { error });
        throw error;
      }
    });

    ipcMain.handle('update:install', async () => {
      try {
        return await this.updateManager.installUpdate();
      } catch (error) {
        logger.error('IPC Update install failed', { error });
        throw error;
      }
    });

    ipcMain.handle('update:startAutoCheck', async (_, intervalMinutes: number) => {
      try {
        this.updateManager.startAutoUpdateCheck(intervalMinutes);
        return { success: true };
      } catch (error) {
        logger.error('IPC Start auto check failed', { error });
        throw error;
      }
    });

    ipcMain.handle('update:stopAutoCheck', async () => {
      try {
        this.updateManager.stopAutoUpdateCheck();
        return { success: true };
      } catch (error) {
        logger.error('IPC Stop auto check failed', { error });
        throw error;
      }
    });





    // Update management IPC handlers
    ipcMain.handle('update:getStatus', () => {
      try {
        return this.updateManager.getStatus();
      } catch (error) {
        logger.error('IPC Get update status failed', { error });
        throw error;
      }
    });

    ipcMain.handle('update:getInfo', () => {
      try {
        const status = this.updateManager.getStatus();
        return {
          currentVersion: app.getVersion(),
          appName: app.getName(),
          updateStatus: status
        };
      } catch (error) {
        logger.error('IPC Get update info failed', { error });
        throw error;
      }
    });


  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Kiosk Application');
      
      // Stop API Server
      await this.apiServer.stop();
      logger.info('API Server stopped');
      
      // Stop update manager
      this.updateManager.cleanup();
      
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