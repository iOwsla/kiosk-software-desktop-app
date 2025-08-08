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
      fullscreen: false,
      kiosk: false,
      frame: true,
      resizable: true,
      alwaysOnTop: false,
      skipTaskbar: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
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
    if (this.isDev) {
      this.kioskWindow.loadURL('http://localhost:3000/#/kiosk');
    } else {
      this.kioskWindow.loadFile(path.join(__dirname, 'index.html'), { hash: 'kiosk' });
    }

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

    // Allow normal close/minimize/maximize behavior in production
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
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      show: false
    });

    // Load the license input page
    if (this.isDev) {
      this.licenseInputWindow.loadURL('http://localhost:3000/#/license-input');
    } else {
      this.licenseInputWindow.loadFile(path.join(__dirname, 'index.html'), { hash: 'license-input' });
    }

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
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      show: false
    });

    // Load the license renewal page
    if (this.isDev) {
      this.licenseRenewalWindow.loadURL('http://localhost:3000/#/license-renewal');
    } else {
      this.licenseRenewalWindow.loadFile(path.join(__dirname, 'index.html'), { hash: 'license-renewal' });
    }

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