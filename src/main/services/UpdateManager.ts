import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { EventEmitter } from 'events';

export interface UpdateStatus {
  available: boolean;
  version?: string;
  releaseDate?: string;
  downloadProgress?: number;
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
}

export class UpdateManager extends EventEmitter {
  private static instance: UpdateManager;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private currentStatus: UpdateStatus = {
    available: false,
    status: 'not-available'
  };
  private autoDownload: boolean = true;
  private autoInstall: boolean = false;

  private constructor() {
    super();
    this.setupAutoUpdater();
  }

  public static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager();
    }
    return UpdateManager.instance;
  }

  /**
   * AutoUpdater'ı yapılandırır
   */
  private setupAutoUpdater(): void {
    // AutoUpdater ayarları
    autoUpdater.autoDownload = this.autoDownload;
    autoUpdater.autoInstallOnAppQuit = this.autoInstall;
    
    // Geliştirme ortamında güncelleme sunucusunu devre dışı bırak
    if (process.env.NODE_ENV === 'development') {
      console.log('Development modunda güncelleme kontrolü sınırlı');
    }

    // Event listeners
    autoUpdater.on('checking-for-update', () => {
      console.log('Güncelleme kontrol ediliyor...');
      this.updateStatus({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('Güncelleme mevcut:', info.version);
      this.updateStatus({
        available: true,
        version: info.version,
        releaseDate: info.releaseDate,
        status: 'available'
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('Güncelleme mevcut değil:', info.version);
      this.updateStatus({
        available: false,
        version: info.version,
        status: 'not-available'
      });
    });

    autoUpdater.on('error', (error) => {
      console.error('Güncelleme hatası:', error);
      this.updateStatus({
        available: false,
        status: 'error',
        error: error.message
      });
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const progress = Math.round(progressObj.percent);
      console.log(`İndirme ilerlemesi: ${progress}%`);
      this.updateStatus({
        status: 'downloading',
        downloadProgress: progress
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('Güncelleme indirildi:', info.version);
      this.updateStatus({
        available: true,
        version: info.version,
        status: 'downloaded'
      });
      
      // Kullanıcıya bildirim göster
      this.showUpdateNotification(info);
    });
  }

  /**
   * Güncelleme durumunu günceller ve tüm pencereler için bildirir
   */
  private updateStatus(newStatus: Partial<UpdateStatus>): void {
    this.currentStatus = { ...this.currentStatus, ...newStatus };
    this.emit('status-changed', this.currentStatus);
    
    // Tüm pencereler için güncelleme durumunu bildir
    this.notifyAllWindows('update-status-changed', this.currentStatus);
  }

  /**
   * Güncelleme kontrolü yapar
   */
  public async checkForUpdates(): Promise<UpdateStatus> {
    try {
      console.log('Güncelleme kontrolü başlatılıyor...');
      await autoUpdater.checkForUpdatesAndNotify();
      return this.currentStatus;
    } catch (error) {
      console.error('Güncelleme kontrolü hatası:', error);
      this.updateStatus({
        available: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
      return this.currentStatus;
    }
  }

  /**
   * Güncellemeyi manuel olarak indirir
   */
  public async downloadUpdate(): Promise<void> {
    try {
      if (this.currentStatus.status !== 'available') {
        throw new Error('İndirilecek güncelleme yok');
      }

      await autoUpdater.downloadUpdate();
    } catch (error) {
      console.error('Güncelleme indirme hatası:', error);
      this.updateStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'İndirme hatası'
      });
      throw error;
    }
  }

  /**
   * Güncellemeyi yükler ve uygulamayı yeniden başlatır
   */
  public async installUpdate(): Promise<void> {
    try {
      if (this.currentStatus.status !== 'downloaded') {
        throw new Error('Yüklenecek güncelleme yok');
      }

      autoUpdater.quitAndInstall();
    } catch (error) {
      console.error('Güncelleme yükleme hatası:', error);
      this.updateStatus({
        status: 'error',
        error: error instanceof Error ? error.message : 'Yükleme hatası'
      });
      throw error;
    }
  }

  /**
   * Otomatik güncelleme kontrolünü başlatır
   */
  public startAutoUpdateCheck(intervalMinutes: number = 60): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }

    // İlk kontrolü hemen yap
    this.checkForUpdates();

    // Periyodik kontrol başlat
    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, intervalMinutes * 60 * 1000);

    console.log(`Otomatik güncelleme kontrolü başlatıldı (${intervalMinutes} dakika aralıklarla)`);
  }

  /**
   * Otomatik güncelleme kontrolünü durdurur
   */
  public stopAutoUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('Otomatik güncelleme kontrolü durduruldu');
    }
  }

  /**
   * Güncelleme bildirimini gösterir
   */
  private async showUpdateNotification(info: UpdateInfo): Promise<void> {
    const result = await dialog.showMessageBox({
      type: 'info',
      title: 'Güncelleme Hazır',
      message: `Yeni sürüm (${info.version}) indirildi ve yüklenmeye hazır.`,
      detail: 'Uygulamayı şimdi yeniden başlatmak istiyor musunuz?',
      buttons: ['Şimdi Yeniden Başlat', 'Daha Sonra'],
      defaultId: 0,
      cancelId: 1
    });

    if (result.response === 0) {
      this.installUpdate();
    }
  }

  /**
   * Tüm pencereler için bildirim gönderir
   */
  private notifyAllWindows(channel: string, data: any): void {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }

  /**
   * Mevcut güncelleme durumunu döndürür
   */
  public getStatus(): UpdateStatus {
    return { ...this.currentStatus };
  }

  /**
   * Otomatik indirme ayarını değiştirir
   */
  public setAutoDownload(enabled: boolean): void {
    this.autoDownload = enabled;
    autoUpdater.autoDownload = enabled;
  }

  /**
   * Otomatik yükleme ayarını değiştirir
   */
  public setAutoInstall(enabled: boolean): void {
    this.autoInstall = enabled;
    autoUpdater.autoInstallOnAppQuit = enabled;
  }

  /**
   * Cleanup işlemleri
   */
  public cleanup(): void {
    this.stopAutoUpdateCheck();
    this.removeAllListeners();
  }
}