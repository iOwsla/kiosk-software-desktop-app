import { BrowserWindow } from 'electron';
import type { IPPrinterConfig, PrinterDevice, PrinterModuleSettings, PrinterProviderType, PrintElement, PrintJobRequest } from '../../../shared/types';

interface RegisteredIPPrinter extends IPPrinterConfig {
  id: string;
  online: boolean;
}

export class PrinterManager {
  private static instance: PrinterManager;
  private printers: Map<string, PrinterDevice> = new Map();
  private ipPrinters: Map<string, RegisteredIPPrinter> = new Map();
  private activePrinterId: string | null = null;
  private settings: PrinterModuleSettings = { ipEnabled: true, usbEnabled: false };

  private constructor() {}

  public static getInstance(): PrinterManager {
    if (!PrinterManager.instance) {
      PrinterManager.instance = new PrinterManager();
    }
    return PrinterManager.instance;
  }

  public getSettings(): PrinterModuleSettings {
    return { ...this.settings };
  }

  public setSettings(next: Partial<PrinterModuleSettings>): PrinterModuleSettings {
    this.settings = { ...this.settings, ...next };
    return this.getSettings();
  }

  public listPrinters(): PrinterDevice[] {
    return Array.from(this.printers.values());
  }

  public getActivePrinter(): PrinterDevice | null {
    if (!this.activePrinterId) return null;
    return this.printers.get(this.activePrinterId) || null;
  }

  public setActivePrinter(printerId: string): void {
    if (!this.printers.has(printerId)) {
      throw new Error('Seçilen yazıcı bulunamadı');
    }
    this.activePrinterId = printerId;
  }

  public addIPPrinter(config: IPPrinterConfig): PrinterDevice {
    if (!this.settings.ipEnabled) {
      throw new Error('IP yazıcı modu devre dışı');
    }
    const id = `ip:${config.ip}:${config.port}`;
    const device: PrinterDevice = {
      id,
      name: config.name || `IP Printer ${config.ip}:${config.port}`,
      provider: 'ip',
      online: true,
      details: { ip: config.ip, port: config.port }
    };
    this.printers.set(id, device);
    this.ipPrinters.set(id, { id, ...config, online: true });
    if (!this.activePrinterId) this.activePrinterId = id;
    return device;
  }

  public removePrinter(printerId: string): void {
    this.printers.delete(printerId);
    this.ipPrinters.delete(printerId);
    if (this.activePrinterId === printerId) this.activePrinterId = null;
  }

  public async printTest(printerId?: string): Promise<{ success: boolean }>{
    const target = printerId ? this.printers.get(printerId) : this.getActivePrinter();
    if (!target) throw new Error('Aktif veya hedef yazıcı yok');
    if (target.provider === 'ip') {
      // Basit bir “Hello” gönderme (RAW 9100) – gerçek dünyada ESC/POS encoder ile data üretin
      await this.rawIpPrint(target.details!.ip, target.details!.port, Buffer.from('Hello from Kiosk App\n'));
      return { success: true };
    }
    throw new Error('USB yazıcı desteği henüz etkin değil');
  }

  public async printJob(req: PrintJobRequest): Promise<{ success: boolean }>{
    const target = this.printers.get(req.printerId) || this.getActivePrinter();
    if (!target) throw new Error('Yazıcı bulunamadı');
    if (target.provider === 'ip') {
      const payload = this.encodeSimpleTextJob(req.elements);
      await this.rawIpPrint(target.details!.ip, target.details!.port, payload);
      return { success: true };
    }
    throw new Error('USB yazıcı desteği henüz etkin değil');
  }

  private encodeSimpleTextJob(elements: PrintElement[]): Buffer {
    const lines = elements
      .filter(e => e.type === 'text')
      .map(e => (e as any).content || '')
      .join('\n');
    return Buffer.from(lines + '\n');
  }

  private async rawIpPrint(host: string, port: number, data: Buffer): Promise<void> {
    const net = await import('net');
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(15000);
      socket.once('error', reject);
      socket.once('timeout', () => reject(new Error('Timeout')));
      socket.connect(port, host, () => {
        socket.write(data, (err?: Error | null) => {
          if (err) return reject(err);
          socket.end(() => resolve());
        });
      });
    });
  }
}

export const printerManager = PrinterManager.getInstance();


