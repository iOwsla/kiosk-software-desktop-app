import { Request, Response } from 'express';
import { printerManager } from '../../src/main/services/PrinterManager';
import { PrintJobRequest, IPDiscoveryRange } from '../../shared/types';

class PrinterController {
  public listPrinters = async (req: Request, res: Response) => {
    try {
      const { scan } = req.query;
      let printers = printerManager.listPrinters();
 
      // Eğer scan=true parametresi varsa IP taraması yap
      if (scan === 'true') {
        const { base = '192.168.1', start = 1, end = 254, port = 9100 } = req.query;
        const range: IPDiscoveryRange = {
          base: base as string,
          start: parseInt(start as string),
          end: parseInt(end as string),
          port: parseInt(port as string)
        };
        
        console.log('API: IP tarama başlatılıyor:', range);
        
        const discoveredPrinters = await printerManager.discoverIPPrinters(range);
        console.log('API: Bulunan yazıcılar:', discoveredPrinters);
        
        // Mevcut liste ile birleştir (duplicate'ları önlemek için)
        const allPrinters = [...printers];
        discoveredPrinters.forEach(discovered => {
          if (!allPrinters.find(p => p.id === discovered.id)) {
            allPrinters.push(discovered);
          }
        });
        printers = allPrinters;
      }
      
      res.json({ success: true, data: printers });
    } catch (error) {
      console.error('API: Yazıcı listesi hatası:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Yazıcı listesi alınırken hata oluştu'
      });
    }
  };

  public printJob = async (req: Request, res: Response) => {
    try {
      const printRequest: PrintJobRequest = req.body;
      
      // Yazıcı seçimi validasyonu
      if (!printRequest.printerId && (!printRequest.ip || !printRequest.port)) {
        return res.status(400).json({
          success: false,
          error: 'Yazıcı ID veya IP/Port bilgisi gerekli'
        });
      }

      if (!printRequest.elements || !Array.isArray(printRequest.elements) || printRequest.elements.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Yazdırılacak içerik (elements) gerekli'
        });
      }

      const result = await printerManager.printJob(printRequest);
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Yazdırma hatası'
      });
    }
  };

  public printTest = async (req: Request, res: Response) => {
    try {
      const { printerId, ip, port } = req.body;
      
      // Yazıcı seçimi validasyonu
      if (!printerId && (!ip || !port)) {
        return res.status(400).json({
          success: false,
          error: 'Yazıcı ID veya IP/Port bilgisi gerekli'
        });
      }

      const result = await printerManager.printTest(printerId, ip, port);
       res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Test yazdırma hatası'
      });
    }
  };

  public printSample = async (req: Request, res: Response) => {
    try {
      const { type, printerId, ip, port } = req.body;
      
      if (!type || !['receipt', 'label', 'test'].includes(type)) {
        return res.status(400).json({
          success: false,
          error: 'Geçerli bir örnek tipi gerekli (receipt, label, test)'
        });
      }

      // Yazıcı seçimi validasyonu
      if (!printerId && (!ip || !port)) {
        return res.status(400).json({
          success: false,
          error: 'Yazıcı ID veya IP/Port bilgisi gerekli'
        });
      }

      const result = await printerManager.printSample(type, printerId, ip, port);
       res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Örnek yazdırma hatası'
      });
    }
  };
}

export const printerController = new PrinterController();


