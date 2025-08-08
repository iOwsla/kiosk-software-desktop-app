import { Request, Response } from 'express';
import { UpdateManager } from '../../src/main/services/UpdateManager';
import type { UpdateStatus } from '../../shared/types';
import { logger } from '../utils/logger';

export class UpdateController {
  private updateManager: UpdateManager;

  constructor() {
    this.updateManager = UpdateManager.getInstance();
  }

  /**
   * GET /api/update/status - Mevcut güncelleme durumunu döndürür
   */
  public async getUpdateStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.updateManager.getStatus();
      
      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Güncelleme durumu alınırken hata:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Güncelleme durumu alınamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/update/check - Güncelleme kontrolü yapar
   */
  public async checkForUpdates(req: Request, res: Response): Promise<void> {
    try {
      const status = await this.updateManager.checkForUpdates();
      
      res.json({
        success: true,
        data: status,
        message: status.available ? 'Güncelleme mevcut' : 'Güncelleme yok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Güncelleme kontrolü hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Güncelleme kontrolü yapılamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/update/download - Güncellemeyi indirir
   */
  public async downloadUpdate(req: Request, res: Response): Promise<void> {
    try {
      await this.updateManager.downloadUpdate();
      
      res.json({
        success: true,
        message: 'Güncelleme indirme başlatıldı',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Güncelleme indirme hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Güncelleme indirilemedi',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/update/install - Güncellemeyi yükler ve uygulamayı yeniden başlatır
   */
  public async installUpdate(req: Request, res: Response): Promise<void> {
    try {
      // Yanıtı önce gönder çünkü uygulama yeniden başlayacak
      res.json({
        success: true,
        message: 'Güncelleme yükleniyor ve uygulama yeniden başlatılıyor',
        timestamp: new Date().toISOString()
      });

      // Kısa bir gecikme sonrası güncellemeyi yükle
      setTimeout(async () => {
        try {
          await this.updateManager.installUpdate();
        } catch (error) {
          logger.error('Güncelleme yükleme hatası:', error as Record<string, any>);
        }
      }, 1000);
    } catch (error) {
      logger.error('Güncelleme yükleme hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Güncelleme yüklenemedi',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/update/auto-check/start - Otomatik güncelleme kontrolünü başlatır
   */
  public async startAutoUpdateCheck(req: Request, res: Response): Promise<void> {
    try {
      const { intervalMinutes = 60 } = req.body;
      
      if (typeof intervalMinutes !== 'number' || intervalMinutes < 1 || intervalMinutes > 1440) {
        res.status(400).json({
          success: false,
          error: 'Geçerli bir interval değeri gerekli (1-1440 dakika)'
        });
        return;
      }

      this.updateManager.startAutoUpdateCheck(intervalMinutes);
      
      res.json({
        success: true,
        message: 'Otomatik güncelleme kontrolü başlatıldı',
        data: {
          intervalMinutes,
          nextCheck: new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString()
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Otomatik güncelleme kontrolü başlatma hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Otomatik güncelleme kontrolü başlatılamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/update/auto-check/stop - Otomatik güncelleme kontrolünü durdurur
   */
  public async stopAutoUpdateCheck(req: Request, res: Response): Promise<void> {
    try {
      this.updateManager.stopAutoUpdateCheck();
      
      res.json({
        success: true,
        message: 'Otomatik güncelleme kontrolü durduruldu',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Otomatik güncelleme kontrolü durdurma hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Otomatik güncelleme kontrolü durdurulamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/update/settings - Güncelleme ayarlarını değiştirir
   */
  public async updateSettings(req: Request, res: Response): Promise<void> {
    try {
      const { autoDownload, autoInstall } = req.body;
      
      if (typeof autoDownload === 'boolean') {
        this.updateManager.setAutoDownload(autoDownload);
      }
      
      if (typeof autoInstall === 'boolean') {
        this.updateManager.setAutoInstall(autoInstall);
      }
      
      res.json({
        success: true,
        message: 'Güncelleme ayarları güncellendi',
        data: {
          autoDownload: typeof autoDownload === 'boolean' ? autoDownload : undefined,
          autoInstall: typeof autoInstall === 'boolean' ? autoInstall : undefined
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Güncelleme ayarları değiştirme hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Güncelleme ayarları değiştirilemedi',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * GET /api/update/info - Uygulama ve güncelleme bilgilerini döndürür
   */
  public async getUpdateInfo(req: Request, res: Response): Promise<void> {
    try {
      const status = this.updateManager.getStatus();
      const packageJson = require('../../package.json');
      
      res.json({
        success: true,
        data: {
          currentVersion: packageJson.version,
          appName: packageJson.name,
          updateStatus: status,
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Güncelleme bilgileri alınırken hata:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Güncelleme bilgileri alınamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }
}