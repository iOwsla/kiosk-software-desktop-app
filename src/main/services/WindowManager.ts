import { BrowserWindow, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from '../../../api/utils/logger';

export class WindowManager {
  private kioskWindow: BrowserWindow | null = null;
  private customWindow: BrowserWindow | null = null;
  private dealerSettingsWindow: BrowserWindow | null = null;
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

    this.kioskWindow = new BrowserWindow({
      width: 600,
      height: 400,
      center: true,
      fullscreen: false,
      kiosk: false,
      frame: true,
      resizable: false,
      alwaysOnTop: false,
      skipTaskbar: false,
      icon: path.join(__dirname, '..', '..', 'renderer', 'gaf digi.svg'),
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

    // Load the home page
    if (this.isDev) {
      this.kioskWindow.loadURL('http://localhost:3000/');
    } else {
      // In production, files might be in resources/app/dist
      let indexPath = path.join(__dirname, 'index.html');

      // If not found in __dirname, try app.getAppPath()
      if (!fs.existsSync(indexPath)) {
        indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      }

      logger.info('Loading index.html from', { path: indexPath, dirname: __dirname, appPath: app.getAppPath() });
      this.kioskWindow.loadFile(indexPath);
    }

    this.kioskWindow.once('ready-to-show', () => {
      this.kioskWindow?.show();
      this.kioskWindow?.focus();

      logger.info('Kiosk window shown');
    });

    this.kioskWindow.on('closed', () => {
      this.kioskWindow = null;
    });

    // Allow normal close/minimize/maximize behavior in production
  }

  public hideKioskWindow(): void {
    if (this.kioskWindow) {
      this.kioskWindow.hide();
    }
  }


  public showCustomWindow(): void {
    if (this.customWindow) {
      this.customWindow.show();
      this.customWindow.focus();
      return;
    }

    this.customWindow = new BrowserWindow({
      width: 440,
      height: 650,
      center: true,
      resizable: false,
      frame: true,
      alwaysOnTop: false,
      title: 'Günlük Veriler',
      icon: path.join(__dirname, '..', '..', 'renderer', 'gaf digi.svg'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      show: false
    });

    // Load the custom page
    if (this.isDev) {
      this.customWindow.loadURL('http://localhost:3000/custom-page');
    } else {
      let indexPath = path.join(__dirname, 'index.html');

      if (!fs.existsSync(indexPath)) {
        indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      }

      logger.info('Loading custom page from', { path: indexPath });
      this.customWindow.loadFile(indexPath);
      // React Router ile yönlendirme için
      this.customWindow.webContents.once('did-finish-load', () => {
        this.customWindow?.webContents.executeJavaScript(`
          window.history.pushState({}, '', '/custom-page');
          window.dispatchEvent(new PopStateEvent('popstate'));
        `);
      });
    }

    this.customWindow.once('ready-to-show', () => {
      this.customWindow?.show();
      this.customWindow?.focus();

      logger.info('Custom window shown');
    });

    this.customWindow.on('closed', () => {
      this.customWindow = null;
    });
  }

  public hideCustomWindow(): void {
    if (this.customWindow) {
      this.customWindow.hide();
    }
  }

  public showDealerSettingsWindow(): void {
    if (this.dealerSettingsWindow) {
      this.dealerSettingsWindow.show();
      this.dealerSettingsWindow.focus();
      return;
    }

    this.dealerSettingsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      center: true,
      resizable: false,
      frame: true,
      alwaysOnTop: false,
      title: 'Bayi Ayarları',
      icon: path.join(__dirname, '..', '..', 'renderer', 'gaf digi.svg'),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
        webSecurity: true
      },
      show: false
    });

    // Load the dealer settings page
    if (this.isDev) {
      this.dealerSettingsWindow.loadURL('http://localhost:3000/dealer-settings');
    } else {
      let indexPath = path.join(__dirname, 'index.html');

      if (!fs.existsSync(indexPath)) {
        indexPath = path.join(app.getAppPath(), 'dist', 'index.html');
      }

      logger.info('Loading dealer settings page from', { path: indexPath });
      this.dealerSettingsWindow.loadFile(indexPath);
      // React Router ile yönlendirme için
      this.dealerSettingsWindow.webContents.once('did-finish-load', () => {
        this.dealerSettingsWindow?.webContents.executeJavaScript(`
          window.history.pushState({}, '', '/dealer-settings');
          window.dispatchEvent(new PopStateEvent('popstate'));
        `);
      });
    }

    this.dealerSettingsWindow.once('ready-to-show', () => {
      this.dealerSettingsWindow?.show();
      this.dealerSettingsWindow?.focus();

      logger.info('Dealer settings window shown');
    });

    this.dealerSettingsWindow.on('closed', () => {
      this.dealerSettingsWindow = null;
    });
  }

  public hideDealerSettingsWindow(): void {
    if (this.dealerSettingsWindow) {
      this.dealerSettingsWindow.hide();
    }
  }

  public closeAllWindows(): void {
    if (this.kioskWindow) {
      this.kioskWindow.destroy();
      this.kioskWindow = null;
    }

    if (this.customWindow) {
      this.customWindow.destroy();
      this.customWindow = null;
    }

    if (this.dealerSettingsWindow) {
      this.dealerSettingsWindow.destroy();
      this.dealerSettingsWindow = null;
    }

    logger.info('All windows closed');
  }

  public getCurrentWindow(): BrowserWindow | null {
    if (this.kioskWindow && this.kioskWindow.isVisible()) {
      return this.kioskWindow;
    }

    if (this.customWindow && this.customWindow.isVisible()) {
      return this.customWindow;
    }

    if (this.dealerSettingsWindow && this.dealerSettingsWindow.isVisible()) {
      return this.dealerSettingsWindow;
    }

    return null;
  }
}