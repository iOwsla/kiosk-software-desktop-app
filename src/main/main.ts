import { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import { WindowManager } from './services/WindowManager';
import { UpdateManager } from './services/UpdateManager';
import { LicenseManager } from './services/LicenseManager';
import { logger } from '../../api/utils/logger';
import { APIServer } from '../../api/server';
import * as os from 'os';

// test

class KioskApp {
  private windowManager: WindowManager;
  private updateManager: UpdateManager;
  private licenseManager: LicenseManager;
  private apiServer: APIServer;
  private tray: Tray | null = null;
  private forceQuit: boolean = false;
  private isDev: boolean;
  private cpuUsage: number = 0;
  private memoryUsage: number = 0;

  constructor() {
    this.isDev = process.env.NODE_ENV === 'development';
    this.windowManager = new WindowManager(this.isDev);
    this.updateManager = UpdateManager.getInstance();
    this.licenseManager = new LicenseManager();
    this.apiServer = new APIServer(3001);
    
    this.setupApp();
    this.setupIPC();
    this.startSystemMonitoring();
  }

  private setupApp(): void {
    // App event handlers
    app.whenReady().then(() => {
      this.initialize();
    });

    app.on('window-all-closed', () => {
      // Don't quit when all windows are closed, keep running in tray
      // Only quit if explicitly requested or on macOS
      if (process.platform === 'darwin') {
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
      
      // Initialize system tray
      this.createSystemTray();
      
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

  private createSystemTray(): void {
    try {
      // Create tray icon using the existing logo.ico or logo.png
      const iconPath = this.isDev ? 'logo.png' : 'logo.ico';
      this.tray = new Tray(nativeImage.createFromPath(iconPath));
      
      const contextMenu = Menu.buildFromTemplate([
        {
          label: 'Show Application',
          click: () => {
            this.windowManager.showKioskWindow();
          }
        },
        {
          label: 'Hide Application',
          click: () => {
            this.windowManager.hideAllWindows();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Settings',
          click: () => {
            this.windowManager.showDealerSettingsWindow();
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit Application',
          click: () => {
            this.forceQuit = true;
            this.shutdown();
          }
        }
      ]);

      this.tray.setContextMenu(contextMenu);
      this.tray.setToolTip('Kiosk Application');
      
      // Double click to show/hide main window
      this.tray.on('double-click', () => {
        this.windowManager.showKioskWindow();
      });

      logger.info('System tray created successfully');
    } catch (error) {
      logger.error('Failed to create system tray', { error });
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

    ipcMain.handle('window:hide-kiosk', () => {
      try {
        this.windowManager.hideKioskWindow();
        return { success: true };
      } catch (error) {
        logger.error('IPC Hide kiosk window failed', { error });
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

    // System monitoring IPC handlers
    ipcMain.handle('system:getStats', () => {
      try {
        return {
          cpuUsage: this.cpuUsage,
          memoryUsage: this.memoryUsage
        };
      } catch (error) {
        logger.error('IPC Get system stats failed', { error });
        throw error;
      }
    });
  }

  private startSystemMonitoring(): void {
    // Initial measurement
    this.updateSystemStats();
    
    // Update system stats every 5 seconds
    setInterval(() => {
      this.updateSystemStats();
    }, 5000);
  }

  private getCPUUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startMeasure = process.cpuUsage();
      const startTime = process.hrtime();

      setTimeout(() => {
        const currentMeasure = process.cpuUsage(startMeasure);
        const currentTime = process.hrtime(startTime);
        
        const totalTime = currentTime[0] * 1000000 + currentTime[1] / 1000; // Convert to microseconds
        const totalUsage = currentMeasure.user + currentMeasure.system;
        
        const cpuPercent = Math.round((totalUsage / totalTime) * 100);
        resolve(Math.min(100, Math.max(0, cpuPercent))); // Clamp between 0-100
      }, 100);
    });
  }

  private getMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return Math.round((usedMemory / totalMemory) * 100);
  }

  private async updateSystemStats(): Promise<void> {
    try {
      this.cpuUsage = await this.getCPUUsage();
      this.memoryUsage = this.getMemoryUsage();
    } catch (error) {
      logger.error('Failed to update system stats', { error });
    }
  }

  private async shutdown(): Promise<void> {
    try {
      logger.info('Shutting down Kiosk Application');
      
      // Stop API Server
      await this.apiServer.stop();
      logger.info('API Server stopped');
      
      // Stop update manager
      this.updateManager.cleanup();
      
      // Clean up system tray
      if (this.tray) {
        this.tray.destroy();
        this.tray = null;
        logger.info('System tray cleaned up');
      }
      
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