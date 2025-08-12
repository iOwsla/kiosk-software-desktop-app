import type { IPPrinterConfig, PrinterDevice, PrinterModuleSettings, PrintElement, PrintJobRequest, IPDiscoveryRange, PrinterProfile, NamedPrintRequest, PrinterNameUpdateRequest } from '../../../shared/types';

interface RegisteredIPPrinter extends IPPrinterConfig {
  id: string;
  online: boolean;
}

export class PrinterManager {
  private static instance: PrinterManager;
  private printers: Map<string, PrinterDevice> = new Map();
  private ipPrinters: Map<string, RegisteredIPPrinter> = new Map();
  private printerProfiles: Map<string, PrinterProfile> = new Map(); // customName -> profile
  private activePrinterId: string | null = null;
  private settings: PrinterModuleSettings = { ipEnabled: true, usbEnabled: false };

  private constructor() { }

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

  public async discoverIPPrinters(range: IPDiscoveryRange): Promise<PrinterDevice[]> {
    if (!this.settings.ipEnabled) {
      throw new Error('IP yazıcı modu devre dışı');
    }
    const port = range.port ?? 9100;
    const hosts: string[] = [];
    for (let i = range.start; i <= range.end; i++) hosts.push(`${range.base}.${i}`);

    const net = await import('net');
    const tryHost = (host: string) => new Promise<PrinterDevice | null>((resolve) => {
      const socket = new net.Socket();
      let resolved = false;
      const done = (result: PrinterDevice | null) => {
        if (!resolved) {
          resolved = true;
          socket.destroy();
          resolve(result);
        }
      };
      socket.setTimeout(1500);
      socket.once('error', () => done(null));
      socket.once('timeout', () => done(null));
      socket.connect(port, host, () => {
        const id = `ip:${host}:${port}`;
        const device: PrinterDevice = { id, name: `IP Printer ${host}:${port}`, provider: 'ip', online: true, details: { ip: host, port } };
        done(device);
      });
    });

    const results = await Promise.all(hosts.map(h => tryHost(h)));
    const found = results.filter((d): d is PrinterDevice => !!d);
    // kaydet ve döndür
    for (const d of found) this.printers.set(d.id, d);
    return found;
  }

  public removePrinter(printerId: string): void {
    // İlgili profilleri de sil
    for (const [customName, profile] of this.printerProfiles.entries()) {
      if (profile.printerId === printerId) {
        this.printerProfiles.delete(customName);
      }
    }
    this.printers.delete(printerId);
    this.ipPrinters.delete(printerId);
    if (this.activePrinterId === printerId) this.activePrinterId = null;
  }

  // Named Printer Management
  public setPrinterCustomName(request: PrinterNameUpdateRequest): PrinterProfile {
    const printer = this.printers.get(request.printerId);
    if (!printer) throw new Error('Yazıcı bulunamadı');

    // Mevcut profil varsa güncelle, yoksa yeni oluştur
    const existingProfile = Array.from(this.printerProfiles.values())
      .find(p => p.printerId === request.printerId);

    const now = new Date();
    const profile: PrinterProfile = {
      id: existingProfile?.id || `profile_${Date.now()}`,
      printerId: request.printerId,
      customName: request.customName.toLowerCase(),
      description: request.description,
      isActive: true,
      createdAt: existingProfile?.createdAt || now,
      updatedAt: now
    };

    // Eski profili sil (isim değişirse)
    if (existingProfile && existingProfile.customName !== profile.customName) {
      this.printerProfiles.delete(existingProfile.customName);
    }

    this.printerProfiles.set(profile.customName, profile);

    // Printer nesnesini güncelle
    printer.customName = profile.customName;
    this.printers.set(request.printerId, printer);

    return profile;
  }

  public removePrinterCustomName(customName: string): boolean {
    const profile = this.printerProfiles.get(customName.toLowerCase());
    if (!profile) return false;

    // Printer nesnesinden custom name'i kaldır
    const printer = this.printers.get(profile.printerId);
    if (printer) {
      delete printer.customName;
      this.printers.set(profile.printerId, printer);
    }

    this.printerProfiles.delete(customName.toLowerCase());
    return true;
  }

  public getPrinterProfiles(): PrinterProfile[] {
    return Array.from(this.printerProfiles.values())
      .filter(p => p.isActive)
      .sort((a, b) => a.customName.localeCompare(b.customName));
  }

  public getPrinterByCustomName(customName: string): PrinterDevice | null {
    const profile = this.printerProfiles.get(customName.toLowerCase());
    if (!profile || !profile.isActive) return null;

    return this.printers.get(profile.printerId) || null;
  }

  public async printByCustomName(request: NamedPrintRequest): Promise<{ success: boolean }> {
    const printer = this.getPrinterByCustomName(request.printerName);
    if (!printer) {
      throw new Error(`'${request.printerName}' isimli yazıcı bulunamadı`);
    }

    return await this.printJob({
      printerId: printer.id,
      elements: request.elements
    });
  }

  public async printTest(printerId?: string): Promise<{ success: boolean }> {
    const target = printerId ? this.printers.get(printerId) : this.getActivePrinter();
    if (!target) throw new Error('Aktif veya hedef yazıcı yok');
    if (target.provider === 'ip') {
      // Basit bir “Hello” gönderme (RAW 9100) – gerçek dünyada ESC/POS encoder ile data üretin
      await this.rawIpPrint(target.details!.ip, target.details!.port, Buffer.from('Hello from Kiosk App\n'));
      return { success: true };
    }
    throw new Error('USB yazıcı desteği henüz etkin değil');
  }

  public async printJob(req: PrintJobRequest): Promise<{ success: boolean }> {
    const target = this.printers.get(req.printerId) || this.getActivePrinter();
    if (!target) throw new Error('Yazıcı bulunamadı');
    if (target.provider === 'ip') {
      const encoder = await this.createEncoder();
      encoder.initialize();
      encoder.codepage('cp857');
      for (const el of req.elements) {
        await this.applyElement(encoder, el);
      }
      // Cut elementi yoksa otomatik kesim ekle
      const hasCutElement = req.elements.some(el => el.type === 'cut');
      if (!hasCutElement) {
        encoder.newline(6);
        encoder.cut('full');
      }
      const payload = encoder.encode();
      await this.rawIpPrint(target.details!.ip, target.details!.port, Buffer.from(payload));
      return { success: true };
    }
    throw new Error('USB yazıcı desteği henüz etkin değil');
  }

  public async printSample(type: 'receipt' | 'label' | 'test', printerId?: string): Promise<{ success: boolean }> {
    const target = printerId ? this.printers.get(printerId) : this.getActivePrinter();
    if (!target) throw new Error('Yazıcı bulunamadı');

    const elements = this.generateSampleElements(type);
    const request: PrintJobRequest = { printerId: target.id, elements };
    return await this.printJob(request);
  }

  private generateSampleElements(type: 'receipt' | 'label' | 'test'): PrintElement[] {
    const currentDate = new Date().toLocaleString('tr-TR');

    switch (type) {
      case 'receipt':
        return [
          { type: 'header', content: 'ÖRNEK FİŞ', align: 'center' },
          { type: 'line', char: '=', length: 32, align: 'center' },
          { type: 'newline' },
          { type: 'text', content: 'İşletme Adı: Test Market', bold: true },
          { type: 'text', content: 'Adres: Test Mahallesi No:123' },
          { type: 'text', content: 'Tel: 0212 123 45 67' },
          { type: 'newline' },
          { type: 'line', char: '-', length: 32 },
          { type: 'text', content: `Tarih: ${currentDate}` },
          { type: 'text', content: 'Fiş No: #2024001' },
          { type: 'newline' },
          {
            type: 'table', columns: ['Ürün', 'Adet', 'Fiyat'], rows: [
              ['Ekmek', '2', '5.00 TL'],
              ['Süt', '1', '8.50 TL'],
              ['Yumurta', '1', '15.00 TL']
            ]
          },
          { type: 'line', char: '-', length: 32 },
          { type: 'text', content: 'Toplam: 28.50 TL', bold: true, align: 'right' },
          { type: 'text', content: 'KDV: 2.56 TL', align: 'right' },
          { type: 'newline' },
          { type: 'text', content: 'Teşekkür ederiz!', align: 'center' },
          { type: 'qrcode', data: 'https://test-market.com/fis/2024001', align: 'center' },
          { type: 'newline', count: 2 },
          { type: 'cut' }
        ];

      case 'label':
        return [
          { type: 'text', content: 'ÜRÜN ETİKETİ', bold: true, align: 'center' },
          { type: 'line', char: '=', length: 24 },
          { type: 'newline' },
          { type: 'text', content: 'Ürün: Test Ürünü', bold: true },
          { type: 'text', content: 'Kod: TU-001' },
          { type: 'text', content: 'Fiyat: 25.90 TL', bold: true },
          { type: 'text', content: `Tarih: ${currentDate.split(' ')[0]}` },
          { type: 'newline' },
          { type: 'barcode', data: 'TU001789456123', symbology: 'code128', align: 'center', showText: true },
          { type: 'newline' },
          { type: 'text', content: 'www.test-market.com', align: 'center' },
          { type: 'newline', count: 2 },
          { type: 'cut' }
        ];

      case 'test':
      default:
        return [
          { type: 'header', content: 'YAZICI TEST SAYFASI', align: 'center' },
          { type: 'line', char: '=', length: 32, align: 'center' },
          { type: 'newline' },
          { type: 'text', content: 'Bu bir test çıktısıdır.', align: 'center' },
          { type: 'text', content: `Yazdırma Zamanı: ${currentDate}` },
          { type: 'newline' },
          { type: 'text', content: 'Yazı Tipleri:', bold: true },
          { type: 'text', content: 'Normal yazı' },
          { type: 'text', content: 'Kalın yazı', bold: true },
          { type: 'text', content: 'Altı çizgili yazı', underline: true },
          { type: 'newline' },
          { type: 'text', content: 'Hizalama Testleri:', bold: true },
          { type: 'text', content: 'Sol hizalı', align: 'left' },
          { type: 'text', content: 'Orta hizalı', align: 'center' },
          { type: 'text', content: 'Sağ hizalı', align: 'right' },
          { type: 'newline' },
          { type: 'line', char: '-', length: 32 },
          { type: 'text', content: 'QR Kod Testi:', bold: true },
          { type: 'qrcode', data: 'Yazıcı test başarılı!', align: 'center' },
          { type: 'newline' },
          { type: 'text', content: 'Barkod Testi:', bold: true },
          { type: 'barcode', data: '123456789', symbology: 'code128', align: 'center', showText: true },
          { type: 'newline', count: 3 },
          { type: 'cut' }
        ];
    }
  }

  private encodeSimpleTextJob(elements: PrintElement[]): Buffer {
    const lines = elements
      .filter((e): e is Extract<PrintElement, { type: 'text' }> => e.type === 'text')
      .map(e => e.content || '')
      .join('\n');
    return Buffer.from(lines + '\n');
  }

  private async createEncoder(): Promise<any> {
    const Encoder = (await import('@point-of-sale/receipt-printer-encoder')).default as any;
    return new Encoder({ language: 'esc-pos', columns: 48 });
  }

  private async applyElement(encoder: any, element: PrintElement): Promise<void> {
    switch (element.type) {
      case 'text':
        encoder.align(element.align || 'left');
        if (element.bold) encoder.bold(true);
        if (element.underline) encoder.underline(true);
        encoder.text(element.content || '');
        encoder.newline();
        if (element.bold) encoder.bold(false);
        if (element.underline) encoder.underline(false);
        break;
      case 'header':
        encoder.align(element.align || 'center');
        encoder.bold(true);
        encoder.size(2, 2);
        encoder.text(element.content || '');
        encoder.newline();
        encoder.bold(false);
        encoder.size(1, 1);
        break;
      case 'line':
        encoder.align(element.align || 'center');
        encoder.text((element.char || '=').repeat(element.length || 32));
        encoder.newline();
        break;
      case 'newline':
        encoder.newline(element.count || 1);
        break;
      case 'cut':
        encoder.newline(6);
        encoder.cut('full');
        break;
      case 'barcode':
        encoder.align(element.align || 'center');
        encoder.barcode(element.data, element.symbology || 'code128', { height: element.height || 60, width: element.width || 2, text: element.showText !== false });
        encoder.newline();
        break;
      case 'qrcode':
        encoder.align(element.align || 'center');
        encoder.qrcode(element.data, { model: element.model || 2, size: element.size || 6, errorlevel: element.errorlevel || 'm' });
        encoder.newline();
        break;
      case 'table':
        encoder.table(element.columns, element.rows);
        break;
      case 'image':
        // Basit base64 png işleme
        try {
          const processed = await this.processBase64Image(element.imageData);
          encoder.align(element.align || 'center');
          encoder.image(processed.pixels, 576, processed.height, element.algorithm || 'threshold', element.threshold || 128);
          encoder.newline();
        } catch {
          encoder.text('[Resim işleme hatası]');
          encoder.newline();
        }
        break;
    }
  }

  private async processBase64Image(base64Data: string): Promise<{ pixels: any; height: number }> {
    const getPixels = (await import('get-pixels')).default as any;
    const buffer = Buffer.from(base64Data.replace(/^data:image\/[a-z]+;base64,/, ''), 'base64');
    return new Promise((resolve, reject) => {
      getPixels(buffer, 'image/png', (err: Error | null, pixels: any) => {
        if (err) return reject(err);
        const originalWidth = pixels.shape[0];
        const originalHeight = pixels.shape[1];
        const PRINTER_WIDTH = 576;
        const scale = PRINTER_WIDTH / originalWidth;
        let height = Math.floor(originalHeight * scale);
        height = Math.max(8, Math.floor(height / 8) * 8);
        resolve({ pixels, height });
      });
    });
  }

  private async rawIpPrint(host: string, port: number, data: Buffer): Promise<void> {
    const net = await import('net');
    await new Promise<void>((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(15000);
      socket.once('error', reject);
      socket.once('timeout', () => reject(new Error('Timeout')));
      socket.connect(port, host, () => {
        socket.write(data as any, (err?: Error | null) => {
          if (err) return reject(err);
          socket.end(() => resolve());
        });
      });
    });
  }
}

export const printerManager = PrinterManager.getInstance();