import * as portfinder from 'portfinder';
import { BrowserWindow } from 'electron';

export interface PortStatus {
  port: number;
  isAvailable: boolean;
  isInUse: boolean;
}

export class PortManager {
  private static instance: PortManager;
  private currentPort: number = 3000;
  private portCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): PortManager {
    if (!PortManager.instance) {
      PortManager.instance = new PortManager();
    }
    return PortManager.instance;
  }

  /**
   * Belirtilen port'un kullanılabilir olup olmadığını kontrol eder
   */
  public async isPortAvailable(port: number): Promise<boolean> {
    try {
      const availablePort = await portfinder.getPortPromise({
        port: port,
        stopPort: port + 1
      });
      return availablePort === port;
    } catch (error) {
      console.error(`Port ${port} kontrolünde hata:`, error);
      return false;
    }
  }

  /**
   * Mevcut port'tan başlayarak kullanılabilir bir port bulur
   */
  public async findAvailablePort(startPort: number = 3000): Promise<number> {
    try {
      const port = await portfinder.getPortPromise({
        port: startPort,
        stopPort: startPort + 1000 // 1000 port aralığında ara
      });
      return port;
    } catch (error) {
      console.error('Kullanılabilir port bulunamadı:', error);
      throw new Error('Kullanılabilir port bulunamadı');
    }
  }

  /**
   * Port durumunu kontrol eder ve gerekirse yeni port bulur
   */
  public async checkAndResolvePortConflict(): Promise<{ port: number; changed: boolean }> {
    const isCurrentPortAvailable = await this.isPortAvailable(this.currentPort);
    
    if (isCurrentPortAvailable) {
      return { port: this.currentPort, changed: false };
    }

    // Mevcut port kullanımda, yeni port bul
    const newPort = await this.findAvailablePort(this.currentPort + 1);
    const oldPort = this.currentPort;
    this.currentPort = newPort;

    console.log(`Port çakışması çözüldü: ${oldPort} -> ${newPort}`);
    return { port: newPort, changed: true };
  }

  /**
   * Port durumunu sürekli izler
   */
  public startPortMonitoring(callback?: (status: PortStatus) => void): void {
    if (this.portCheckInterval) {
      clearInterval(this.portCheckInterval);
    }

    this.portCheckInterval = setInterval(async () => {
      try {
        const isAvailable = await this.isPortAvailable(this.currentPort);
        const status: PortStatus = {
          port: this.currentPort,
          isAvailable,
          isInUse: !isAvailable
        };

        if (callback) {
          callback(status);
        }

        // Port çakışması varsa otomatik çöz
        if (!isAvailable) {
          const result = await this.checkAndResolvePortConflict();
          if (result.changed) {
            // Tüm pencereler için port değişikliğini bildir
            this.notifyPortChange(result.port);
          }
        }
      } catch (error) {
        console.error('Port izleme hatası:', error);
      }
    }, 5000); // 5 saniyede bir kontrol et
  }

  /**
   * Port izlemeyi durdurur
   */
  public stopPortMonitoring(): void {
    if (this.portCheckInterval) {
      clearInterval(this.portCheckInterval);
      this.portCheckInterval = null;
    }
  }

  /**
   * Port değişikliğini tüm pencereler için bildirir
   */
  private notifyPortChange(newPort: number): void {
    const allWindows = BrowserWindow.getAllWindows();
    allWindows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('port-changed', {
          oldPort: this.currentPort,
          newPort: newPort,
          timestamp: new Date().toISOString()
        });
      }
    });
  }

  /**
   * Mevcut port'u döndürür
   */
  public getCurrentPort(): number {
    return this.currentPort;
  }

  /**
   * Port'u manuel olarak ayarlar
   */
  public setCurrentPort(port: number): void {
    this.currentPort = port;
  }

  /**
   * Port aralığında tarama yapar
   */
  public async scanPortRange(startPort: number, endPort: number): Promise<PortStatus[]> {
    const results: PortStatus[] = [];
    
    for (let port = startPort; port <= endPort; port++) {
      const isAvailable = await this.isPortAvailable(port);
      results.push({
        port,
        isAvailable,
        isInUse: !isAvailable
      });
    }

    return results;
  }

  /**
   * Cleanup işlemleri
   */
  public cleanup(): void {
    this.stopPortMonitoring();
  }
}