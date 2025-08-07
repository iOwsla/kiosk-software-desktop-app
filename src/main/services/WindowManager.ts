import { BrowserWindow, screen } from 'electron';
import * as path from 'path';
import { logger } from '../../../api/utils/logger';

export class WindowManager {
  private kioskWindow: BrowserWindow | null = null;
  private licenseInputWindow: BrowserWindow | null = null;
  private licenseRenewalWindow: BrowserWindow | null = null;
  private isDev: boolean;

  constructor(isDev: boolean = false) {
    this.isDev = isDev;
  }

  public showKioskWindow(): void {
    if (this.kioskWindow) {
      this.kioskWindow.show();
      this.kioskWindow.focus();
      return;
    }

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    this.kioskWindow = new BrowserWindow({
      width,
      height,
      fullscreen: !this.isDev,
      kiosk: !this.isDev,
      frame: this.isDev,
      resizable: this.isDev,
      alwaysOnTop: !this.isDev,
      skipTaskbar: !this.isDev,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
        webSecurity: true,
        allowRunningInsecureContent: false
      },
      show: false
    });

    // Security: Prevent navigation
    this.kioskWindow.webContents.on('will-navigate', (event, url) => {
      if (url !== this.kioskWindow?.webContents.getURL()) {
        event.preventDefault();
        logger.warn('Blocked navigation attempt', { url });
      }
    });

    // Load the kiosk page
    const indexPath = this.isDev 
      ? 'http://localhost:3000/#/kiosk'
      : `file://${path.join(__dirname, '../index.html#/kiosk')}`;
    
    this.kioskWindow.loadURL(indexPath);

    this.kioskWindow.once('ready-to-show', () => {
      this.kioskWindow?.show();
      this.kioskWindow?.focus();
      
      // Hide other windows
      this.hideLicenseInputWindow();
      this.hideLicenseRenewalWindow();
      
      logger.info('Kiosk window shown');
    });

    this.kioskWindow.on('closed', () => {
      this.kioskWindow = null;
    });

    // Prevent closing in production
    if (!this.isDev) {
      this.kioskWindow.on('close', (event) => {
        event.preventDefault();
        logger.warn('Attempted to close kiosk window in production mode');
      });
    }
  }

  public showLicenseInputWindow(): void {
    if (this.licenseInputWindow) {
      this.licenseInputWindow.show();
      this.licenseInputWindow.focus();
      return;
    }

    this.licenseInputWindow = new BrowserWindow({
      width: 500,
      height: 400,
      center: true,
      resizable: false,
      frame: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
        webSecurity: true
      },
      show: false
    });

    // Load the license input page
    const indexPath = this.isDev 
      ? 'http://localhost:3000/#/license-input'
      : `file://${path.join(__dirname, '../index.html#/license-input')}`;
    
    this.licenseInputWindow.loadURL(indexPath);

    this.licenseInputWindow.once('ready-to-show', () => {
      this.licenseInputWindow?.show();
      this.licenseInputWindow?.focus();
      
      // Hide other windows
      this.hideKioskWindow();
      this.hideLicenseRenewalWindow();
      
      logger.info('License input window shown');
    });

    this.licenseInputWindow.on('closed', () => {
      this.licenseInputWindow = null;
    });
  }

  public showLicenseRenewalWindow(): void {
    if (this.licenseRenewalWindow) {
      this.licenseRenewalWindow.show();
      this.licenseRenewalWindow.focus();
      return;
    }

    this.licenseRenewalWindow = new BrowserWindow({
      width: 600,
      height: 500,
      center: true,
      resizable: false,
      frame: true,
      alwaysOnTop: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
        webSecurity: true
      },
      show: false
    });

    // Load the license renewal page
    const indexPath = this.isDev 
      ? 'http://localhost:3000/#/license-renewal'
      : `file://${path.join(__dirname, '../index.html#/license-renewal')}`;
    
    this.licenseRenewalWindow.loadURL(indexPath);

    this.licenseRenewalWindow.once('ready-to-show', () => {
      this.licenseRenewalWindow?.show();
      this.licenseRenewalWindow?.focus();
      
      // Hide other windows
      this.hideKioskWindow();
      this.hideLicenseInputWindow();
      
      logger.info('License renewal window shown');
    });

    this.licenseRenewalWindow.on('closed', () => {
      this.licenseRenewalWindow = null;
    });
  }

  public hideKioskWindow(): void {
    if (this.kioskWindow) {
      this.kioskWindow.hide();
    }
  }

  public hideLicenseInputWindow(): void {
    if (this.licenseInputWindow) {
      this.licenseInputWindow.hide();
    }
  }

  public hideLicenseRenewalWindow(): void {
    if (this.licenseRenewalWindow) {
      this.licenseRenewalWindow.hide();
    }
  }

  public closeAllWindows(): void {
    if (this.kioskWindow) {
      this.kioskWindow.destroy();
      this.kioskWindow = null;
    }
    
    if (this.licenseInputWindow) {
      this.licenseInputWindow.destroy();
      this.licenseInputWindow = null;
    }
    
    if (this.licenseRenewalWindow) {
      this.licenseRenewalWindow.destroy();
      this.licenseRenewalWindow = null;
    }
    
    logger.info('All windows closed');
  }

  public getCurrentWindow(): BrowserWindow | null {
    if (this.kioskWindow && this.kioskWindow.isVisible()) {
      return this.kioskWindow;
    }
    
    if (this.licenseInputWindow && this.licenseInputWindow.isVisible()) {
      return this.licenseInputWindow;
    }
    
    if (this.licenseRenewalWindow && this.licenseRenewalWindow.isVisible()) {
      return this.licenseRenewalWindow;
    }
    
    return null;
  }
}