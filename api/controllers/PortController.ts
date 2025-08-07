import { Request, Response } from 'express';
import { PortManager, PortStatus } from '../../src/main/services/PortManager';
import { logger } from '../utils/logger';

export class PortController {
  private portManager: PortManager;

  constructor() {
    this.portManager = PortManager.getInstance();
  }

  /**
   * GET /api/port/status - Mevcut port durumunu döndürür
   */
  public async getPortStatus(req: Request, res: Response): Promise<void> {
    try {
      const currentPort = this.portManager.getCurrentPort();
      const isAvailable = await this.portManager.isPortAvailable(currentPort);
      
      const status: PortStatus = {
        port: currentPort,
        isAvailable,
        isInUse: !isAvailable
      };

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Port durumu alınırken hata:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Port durumu alınamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/port/check - Belirtilen port'un durumunu kontrol eder
   */
  public async checkPort(req: Request, res: Response): Promise<void> {
    try {
      const { port } = req.body;
      
      if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
        res.status(400).json({
          success: false,
          error: 'Geçerli bir port numarası gerekli (1-65535)'
        });
        return;
      }

      const isAvailable = await this.portManager.isPortAvailable(port);
      
      const status: PortStatus = {
        port,
        isAvailable,
        isInUse: !isAvailable
      };

      res.json({
        success: true,
        data: status,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Port kontrolü hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Port kontrolü yapılamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/port/find - Kullanılabilir port bulur
   */
  public async findAvailablePort(req: Request, res: Response): Promise<void> {
    try {
      const { startPort = 3000 } = req.body;
      
      if (typeof startPort !== 'number' || startPort < 1 || startPort > 65535) {
        res.status(400).json({
          success: false,
          error: 'Geçerli bir başlangıç port numarası gerekli (1-65535)'
        });
        return;
      }

      const availablePort = await this.portManager.findAvailablePort(startPort);
      
      res.json({
        success: true,
        data: {
          port: availablePort,
          startPort,
          found: true
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Kullanılabilir port bulunamadı:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Kullanılabilir port bulunamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/port/scan - Port aralığını tarar
   */
  public async scanPortRange(req: Request, res: Response): Promise<void> {
    try {
      const { startPort, endPort } = req.body;
      
      if (!startPort || !endPort || typeof startPort !== 'number' || typeof endPort !== 'number') {
        res.status(400).json({
          success: false,
          error: 'Başlangıç ve bitiş port numaraları gerekli'
        });
        return;
      }

      if (startPort < 1 || endPort > 65535 || startPort > endPort) {
        res.status(400).json({
          success: false,
          error: 'Geçerli port aralığı gerekli (1-65535, başlangıç <= bitiş)'
        });
        return;
      }

      if (endPort - startPort > 100) {
        res.status(400).json({
          success: false,
          error: 'Port aralığı çok büyük (maksimum 100 port)'
        });
        return;
      }

      const scanResults = await this.portManager.scanPortRange(startPort, endPort);
      
      res.json({
        success: true,
        data: {
          startPort,
          endPort,
          results: scanResults,
          totalScanned: scanResults.length,
          availablePorts: scanResults.filter(r => r.isAvailable).map(r => r.port),
          usedPorts: scanResults.filter(r => r.isInUse).map(r => r.port)
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Port tarama hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Port tarama yapılamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/port/resolve-conflict - Port çakışmasını çözer
   */
  public async resolvePortConflict(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.portManager.checkAndResolvePortConflict();
      
      res.json({
        success: true,
        data: result,
        message: result.changed ? 'Port çakışması çözüldü' : 'Port çakışması yok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Port çakışması çözme hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Port çakışması çözülemedi',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }

  /**
   * POST /api/port/set - Mevcut port'u ayarlar
   */
  public async setCurrentPort(req: Request, res: Response): Promise<void> {
    try {
      const { port } = req.body;
      
      if (!port || typeof port !== 'number' || port < 1 || port > 65535) {
        res.status(400).json({
          success: false,
          error: 'Geçerli bir port numarası gerekli (1-65535)'
        });
        return;
      }

      const isAvailable = await this.portManager.isPortAvailable(port);
      
      if (!isAvailable) {
        res.status(409).json({
          success: false,
          error: 'Belirtilen port kullanımda',
          data: { port, isAvailable: false }
        });
        return;
      }

      this.portManager.setCurrentPort(port);
      
      res.json({
        success: true,
        data: {
          port,
          previousPort: this.portManager.getCurrentPort(),
          isAvailable: true
        },
        message: 'Port başarıyla ayarlandı',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Port ayarlama hatası:', error as Record<string, any>);
      res.status(500).json({
        success: false,
        error: 'Port ayarlanamadı',
        details: error instanceof Error ? error.message : 'Bilinmeyen hata'
      });
    }
  }
}