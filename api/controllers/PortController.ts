import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import * as net from 'net';

export class PortController {
  constructor() {}

  /**
   * Belirtilen IP'de port'un açık olup olmadığını kontrol eder
   */
  private async checkPortOnIP(ip: string, port: number, timeout: number = 3000): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      
      socket.setTimeout(timeout);
      
      socket.on('connect', () => {
        socket.destroy();
        resolve(true); // Port açık
      });
      
      socket.on('timeout', () => {
        socket.destroy();
        resolve(false); // Port kapalı
      });
      
      socket.on('error', () => {
        socket.destroy();
        resolve(false); // Port kapalı
      });
      
      socket.connect(port, ip);
    });
  }

  /**
   * IP aralığı oluşturur
   */
  private generateIPRange(startIP: string, endIP: string): string[] {
    const ips: string[] = [];
    const startParts = startIP.split('.').map(Number);
    const endParts = endIP.split('.').map(Number);
    
    // Basit IP aralığı oluşturma (aynı subnet içinde)
    if (startParts[0] === endParts[0] && startParts[1] === endParts[1] && startParts[2] === endParts[2]) {
      for (let i = startParts[3]; i <= endParts[3]; i++) {
        ips.push(`${startParts[0]}.${startParts[1]}.${startParts[2]}.${i}`);
      }
    }
    
    return ips;
  }
  /**
   * POST /api/port/scan - IP aralığında port tarama
   */
  public async scanPortRange(req: Request, res: Response): Promise<void> {
    try {
      const { startIP, endIP, ports } = req.body;
      
      if (!startIP || !endIP || !ports) {
        res.status(400).json({
          success: false,
          error: 'Başlangıç IP, bitiş IP ve port listesi gerekli'
        });
        return;
      }

      if (!Array.isArray(ports) || ports.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Geçerli port listesi gerekli'
        });
        return;
      }

      // IP aralığını oluştur
      const ipRange = this.generateIPRange(startIP, endIP);
      
      if (ipRange.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Geçerli IP aralığı oluşturulamadı'
        });
        return;
      }

      if (ipRange.length > 50) {
        res.status(400).json({
          success: false,
          error: 'IP aralığı çok büyük (maksimum 50 IP)'
        });
        return;
      }

      if (ports.length > 20) {
        res.status(400).json({
          success: false,
          error: 'Port listesi çok büyük (maksimum 20 port)'
        });
        return;
      }

      const scanResults = [];
      
      // Her IP için her portu tara
      for (const ip of ipRange) {
        for (const port of ports) {
          if (typeof port !== 'number' || port < 1 || port > 65535) {
            continue;
          }
          
          const isOpen = await this.checkPortOnIP(ip, port);
          scanResults.push({
            ip,
            port,
            isOpen,
            status: isOpen ? 'open' : 'closed'
          });
        }
      }
      
      const openPorts = scanResults.filter(r => r.isOpen);
      const closedPorts = scanResults.filter(r => !r.isOpen);
      
      res.json({
        success: true,
        data: {
          startIP,
          endIP,
          scannedPorts: ports,
          results: scanResults,
          summary: {
            totalScanned: scanResults.length,
            openPorts: openPorts.length,
            closedPorts: closedPorts.length,
            openPortsList: openPorts,
            scannedIPs: ipRange.length
          }
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
}