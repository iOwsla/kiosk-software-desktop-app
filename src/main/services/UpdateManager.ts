import { autoUpdater, UpdateInfo } from 'electron-updater';
import { BrowserWindow, dialog } from 'electron';
import { IPC_CHANNELS, UpdateNotification } from '../../../shared/types';
import { EventEmitter } from 'events';
import type { UpdateStatus } from '../../../shared/types';

export class UpdateManager extends EventEmitter {
  private static instance: UpdateManager;
  private updateCheckInterval: NodeJS.Timeout | null = null;
  private currentStatus: UpdateStatus = {
    available: false,
    status: 'not-available',
    downloading: false,
    downloaded: false,
    progress: 0,
    autoCheckEnabled: false
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
    // GitHub 406/Accept header sorunlarını önlemek için istek başlıklarını ayarla
    autoUpdater.requestHeaders = {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'User-Agent': `kiosk-app/${process.versions.electron}`
    };
    
    // Geliştirme ortamında güncelleme sunucusunu devre dışı bırak
    if (process.env.NODE_ENV === 'development') {
      console.log('Development modunda güncelleme kontrolü sınırlı');
    }

    // Event listeners
    autoUpdater.on('checking-for-update', () => {
      console.log('Güncelleme kontrol ediliyor...');
      this.updateStatus({ status: 'checking', lastChecked: new Date().toISOString(), downloading: false });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('Güncelleme mevcut:', info.version);
      const releaseNotes = typeof info.releaseNotes === 'string' ? info.releaseNotes : undefined;
      this.updateStatus({
        available: true,
        version: info.version,
        releaseDate: info.releaseDate,
        status: 'available',
        releaseNotes
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('Güncelleme mevcut değil:', info.version);
      this.updateStatus({
        available: false,
        version: info.version,
        status: 'not-available',
        downloading: false,
        downloaded: false,
        progress: 0
      });
    });

    autoUpdater.on('error', (error: Error) => {
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
        downloadProgress: progress,
        downloading: true,
        downloaded: false,
        progress
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('Güncelleme indirildi:', info.version);
      this.updateStatus({
        available: true,
        version: info.version,
        status: 'downloaded',
        downloading: false,
        downloaded: true,
        progress: 100
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

    // Tüm pencerelere tiplenmiş güncelleme bildirimi gönder
    const notification: UpdateNotification = {
      status: this.currentStatus.status,
      version: this.currentStatus.version,
      progress: this.currentStatus.progress ?? this.currentStatus.downloadProgress,
      error: this.currentStatus.error
    };
    this.notifyAllWindows(IPC_CHANNELS.NOTIFICATION_UPDATE_STATUS, notification);
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
    this.updateStatus({ autoCheckEnabled: true });
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
    this.updateStatus({ autoCheckEnabled: false });
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
  private notifyAllWindows(channel: string, data: unknown): void {
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