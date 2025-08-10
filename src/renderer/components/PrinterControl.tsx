import React, { useEffect, useState } from 'react';
import type { IPPrinterConfig, PrinterDevice, PrinterModuleSettings, PrintElement } from '../../../shared/types';

interface PrinterControlProps {
  className?: string;
}

export const PrinterControl: React.FC<PrinterControlProps> = ({ className = '' }) => {
  const [settings, setSettings] = useState<PrinterModuleSettings>({ ipEnabled: true, usbEnabled: false });
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [active, setActive] = useState<PrinterDevice | null>(null);
  const [ip, setIp] = useState('192.168.1.100');
  const [port, setPort] = useState(9100);
  const [discoverBase, setDiscoverBase] = useState('192.168.1');
  const [discoverStart, setDiscoverStart] = useState(1);
  const [discoverEnd, setDiscoverEnd] = useState(254);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'printers' | 'discovery' | 'samples' | 'images'>('printers');
  const [sampleType, setSampleType] = useState<'receipt' | 'label' | 'test'>('receipt');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [base64Input, setBase64Input] = useState<string>('');
  const [inputMethod, setInputMethod] = useState<'file' | 'base64'>('file');
  const [editingPrinterId, setEditingPrinterId] = useState<string | null>(null);
  const [newCustomName, setNewCustomName] = useState<string>('');
  const [newDescription, setNewDescription] = useState<string>('');

  const refresh = async () => {
    if (!window.electronAPI?.printer) return;
    const s = await window.electronAPI.printer.getSettings();
    setSettings(s);
    const list = await window.electronAPI.printer.list();
    setPrinters(list);
    const a = await window.electronAPI.printer.getActive();
    setActive(a);
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleToggleIp = async () => {
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      await window.electronAPI.printer.setSettings({ ipEnabled: !settings.ipEnabled });
      await refresh();
      setSuccess('IP yazıcı modu güncellendi');
    } catch (e) { setError((e as Error).message); } finally { setIsLoading(false); }
  };

  const handleAddIp = async () => {
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const cfg: IPPrinterConfig = { ip, port, name: `IP ${ip}:${port}` };
      const dev = await window.electronAPI.printer.addIP(cfg);
      await window.electronAPI.printer.setActive(dev.id);
      await refresh();
      setSuccess('IP yazıcı eklendi ve aktif edildi');
    } catch (e) { setError((e as Error).message); } finally { setIsLoading(false); }
  };

  const handleDiscover = async () => {
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const discovered = await window.electronAPI.printer.discoverIp({ base: discoverBase, start: discoverStart, end: discoverEnd, port });
      if (discovered?.length) {
        setSuccess(`${discovered.length} yazıcı bulundu`);
        await refresh();
      } else {
        setSuccess('Yazıcı bulunamadı');
      }
    } catch (e) { setError((e as Error).message); } finally { setIsLoading(false); }
  };

  const handleSetActive = async (id: string) => {
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      await window.electronAPI.printer.setActive(id);
      await refresh();
      setSuccess('Aktif yazıcı güncellendi');
    } catch (e) { setError((e as Error).message); } finally { setIsLoading(false); }
  };

  const handlePrintTest = async (id?: string) => {
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      await window.electronAPI.printer.printTest(id);
      setSuccess('Test çıktısı gönderildi');
    } catch (e) { setError((e as Error).message); } finally { setIsLoading(false); }
  };

  const generateSampleLogo = (): string => {
    // Basit bir logo için SVG -> base64 dönüşümü
    const svg = `
      <svg width="200" height="100" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="100" fill="#3B82F6" rx="10"/>
        <text x="100" y="35" font-family="Arial, sans-serif" font-size="20" font-weight="bold" text-anchor="middle" fill="white">
          KIOSK
        </text>
        <text x="100" y="60" font-family="Arial, sans-serif" font-size="16" text-anchor="middle" fill="#E5E7EB">
          SOFTWARE
        </text>
        <text x="100" y="80" font-family="Arial, sans-serif" font-size="12" text-anchor="middle" fill="#9CA3AF">
          Test Logo
        </text>
      </svg>
    `;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  };

  const generateSampleElements = (type: 'receipt' | 'label' | 'test'): PrintElement[] => {
    const currentDate = new Date().toLocaleString('tr-TR');
    
    switch (type) {
      case 'receipt': {
        const logo = generateSampleLogo();
        return [
          { type: 'image', imageData: logo, align: 'center', algorithm: 'threshold', threshold: 128 },
          { type: 'newline' },
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
          { type: 'table', columns: ['Ürün', 'Adet', 'Fiyat'], rows: [
            ['Ekmek', '2', '5.00 TL'],
            ['Süt', '1', '8.50 TL'],
            ['Yumurta', '1', '15.00 TL']
          ]},
          { type: 'line', char: '-', length: 32 },
          { type: 'text', content: 'Toplam: 28.50 TL', bold: true, align: 'right' },
          { type: 'text', content: 'KDV: 2.56 TL', align: 'right' },
          { type: 'newline' },
          { type: 'text', content: 'Teşekkür ederiz!', align: 'center' },
          { type: 'qrcode', data: 'https://test-market.com/fis/2024001', align: 'center' },
          { type: 'cut' }
        ];
      }
      
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
          { type: 'cut' }
        ];
    }
  };

  const handlePrintSample = async (type: 'receipt' | 'label' | 'test') => {
    if (!active) {
      setError('Önce bir yazıcı seçin');
      return;
    }
    
    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const elements = generateSampleElements(type);
      await window.electronAPI.printer.printJob({ printerId: active.id, elements });
      setSuccess(`${type === 'receipt' ? 'Örnek fiş' : type === 'label' ? 'Etiket' : 'Test'} yazdırıldı`);
    } catch (e) { 
      setError((e as Error).message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Lütfen bir resim dosyası seçin');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Resim dosyası 5MB\'dan küçük olmalıdır');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64String = e.target?.result as string;
      setSelectedImage(base64String);
      setImagePreview(base64String);
      setError(null);
    };
    reader.onerror = () => {
      setError('Resim yüklenirken hata oluştu');
    };
    reader.readAsDataURL(file);
  };

  const handleBase64Input = (value: string) => {
    setBase64Input(value);
    
    if (!value.trim()) {
      setSelectedImage(null);
      setImagePreview(null);
      setError(null);
      return;
    }

    try {
      // Base64 validation ve format düzeltme
      let base64String = value.trim();
      
      // Data URI format kontrol
      if (!base64String.startsWith('data:')) {
        // Sadece base64 string ise data URI formatına çevir
        if (base64String.match(/^[A-Za-z0-9+/=]+$/)) {
          base64String = `data:image/png;base64,${base64String}`;
        } else {
          setError('Geçersiz base64 formatı');
          return;
        }
      }

      // Base64 decode test
      const base64Data = base64String.split(',')[1];
      if (base64Data) {
        atob(base64Data); // Base64 geçerliliği test
        setSelectedImage(base64String);
        setImagePreview(base64String);
        setError(null);
      } else {
        setError('Base64 data bulunamadı');
      }
    } catch (e) {
      setError('Geçersiz base64 string');
      setSelectedImage(null);
      setImagePreview(null);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setBase64Input('');
    setError(null);
  };

  const handleEditPrinterName = (printerId: string, currentName?: string) => {
    setEditingPrinterId(printerId);
    setNewCustomName(currentName || '');
    setNewDescription('');
  };

  const handleSavePrinterName = async () => {
    if (!editingPrinterId || !newCustomName.trim()) {
      setError('Yazıcı adı boş olamaz');
      return;
    }

    setIsLoading(true); setError(null); setSuccess(null);
    try {
      // TODO: API call to save printer name
      // await window.electronAPI.printer.setPrinterName({
      //   printerId: editingPrinterId,
      //   customName: newCustomName.trim(),
      //   description: newDescription.trim()
      // });
      
      setSuccess(`Yazıcı adı '${newCustomName}' olarak güncellendi`);
      setEditingPrinterId(null);
      setNewCustomName('');
      setNewDescription('');
      await refresh();
    } catch (e) { 
      setError((e as Error).message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleCancelEdit = () => {
    setEditingPrinterId(null);
    setNewCustomName('');
    setNewDescription('');
  };

  const handlePrintImage = async () => {
    if (!active) {
      setError('Önce bir yazıcı seçin');
      return;
    }

    if (!selectedImage) {
      setError('Önce bir resim seçin');
      return;
    }

    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const elements: PrintElement[] = [
        { type: 'header', content: 'RESİM ÇIKTISI', align: 'center' },
        { type: 'line', char: '=', length: 32, align: 'center' },
        { type: 'newline' },
        { type: 'image', imageData: selectedImage, align: 'center', algorithm: 'threshold', threshold: 128 },
        { type: 'newline' },
        { type: 'text', content: `Yazdırma: ${new Date().toLocaleString('tr-TR')}`, align: 'center' },
        { type: 'cut' }
      ];

      await window.electronAPI.printer.printJob({ printerId: active.id, elements });
      setSuccess('Resim yazdırıldı');
    } catch (e) { 
      setError((e as Error).message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handlePrintSampleLogo = async () => {
    if (!active) {
      setError('Önce bir yazıcı seçin');
      return;
    }

    setIsLoading(true); setError(null); setSuccess(null);
    try {
      const logoBase64 = generateSampleLogo();
      const elements: PrintElement[] = [
        { type: 'header', content: 'LOGO ÇIKTISI', align: 'center' },
        { type: 'line', char: '=', length: 32, align: 'center' },
        { type: 'newline' },
        { type: 'text', content: 'Örnek Logo:', bold: true, align: 'center' },
        { type: 'image', imageData: logoBase64, align: 'center', algorithm: 'threshold', threshold: 128 },
        { type: 'newline' },
        { type: 'text', content: 'Bu örnek bir logo çıktısıdır', align: 'center' },
        { type: 'text', content: `Tarih: ${new Date().toLocaleString('tr-TR')}`, align: 'center' },
        { type: 'cut' }
      ];

      await window.electronAPI.printer.printJob({ printerId: active.id, elements });
      setSuccess('Örnek logo yazdırıldı');
    } catch (e) { 
      setError((e as Error).message); 
    } finally { 
      setIsLoading(false); 
    }
  };

  return (
    <div className={`printer-control ${className}`}>
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold">Yazıcı Yönetimi</h3>
                <p className="text-blue-100 text-sm">Yazıcı ayarları ve test çıktıları</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right text-sm">
                <div className="font-medium">IP Modu</div>
                <div className="text-blue-100">{settings.ipEnabled ? 'Aktif' : 'Pasif'}</div>
              </div>
              <button 
                onClick={handleToggleIp} 
                disabled={isLoading} 
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
              >
                <div className={`w-2 h-2 rounded-full ${settings.ipEnabled ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <span>{settings.ipEnabled ? 'Kapat' : 'Aç'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 bg-gray-50">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'printers', name: 'Yazıcılar', icon: '🖨️' },
              { id: 'discovery', name: 'Keşif', icon: '🔍' },
              { id: 'samples', name: 'Örnek Çıktılar', icon: '📄' },
              { id: 'images', name: 'Resim Çıktıları', icon: '🖼️' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'printers' | 'discovery' | 'samples' | 'images')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'printers' && (
            <div className="space-y-6">
              {/* Active Printer Card */}
              {active && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                      <div>
                        <h4 className="font-semibold text-green-900">Aktif Yazıcı</h4>
                        <p className="text-green-700">{active.name}</p>
                        <p className="text-sm text-green-600">{active.provider.toUpperCase()} • {active.online ? 'Çevrimiçi' : 'Çevrimdışı'}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handlePrintTest(active.id)} 
                      disabled={isLoading}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                    >
                      <span>🧪</span>
                      <span>Test Yazdır</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Printers List */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>📋</span>
                  <span>Mevcut Yazıcılar ({printers.length})</span>
                </h4>
                <div className="grid gap-3">
                  {printers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">🖨️</div>
                      <p>Henüz yazıcı eklenmemiş</p>
                      <p className="text-sm">Keşif sekmesinden yazıcı arayabilirsiniz</p>
                    </div>
                  ) : (
                    printers.map(p => (
                      <div key={p.id} className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${
                        p.id === active?.id 
                          ? 'bg-blue-50 border-blue-300 shadow-sm' 
                          : 'bg-white border-gray-200 hover:border-gray-300'
                      }`}>
                        {editingPrinterId === p.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-600">
                              <span className={`w-3 h-3 rounded-full ${p.online ? 'bg-green-500' : 'bg-red-500'}`}></span>
                              <span>{p.name}</span>
                            </div>
                            <div className="space-y-2">
                              <input
                                type="text"
                                placeholder="Yazıcı adı (örn: mutfak, kasiyer)"
                                value={newCustomName}
                                onChange={(e) => setNewCustomName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <input
                                type="text"
                                placeholder="Açıklama (opsiyonel)"
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={handleSavePrinterName}
                                disabled={isLoading || !newCustomName.trim()}
                                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
                              >
                                <span>✓</span>
                                <span>Kaydet</span>
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="bg-gray-500 hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
                              >
                                <span>✕</span>
                                <span>İptal</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-3 h-3 rounded-full ${p.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900">{p.name}</span>
                                  {p.customName && (
                                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                                      {p.customName}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 flex items-center space-x-2">
                                  <span className="bg-gray-100 px-2 py-1 rounded text-xs font-medium">{p.provider.toUpperCase()}</span>
                                  <span>•</span>
                                  <span className={p.online ? 'text-green-600' : 'text-red-600'}>
                                    {p.online ? 'Çevrimiçi' : 'Çevrimdışı'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button 
                                onClick={() => handleEditPrinterName(p.id, p.customName)}
                                disabled={isLoading}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-1"
                              >
                                <span>✏️</span>
                                <span>Ad Ver</span>
                              </button>
                              <button 
                                onClick={() => handleSetActive(p.id)} 
                                disabled={isLoading || p.id === active?.id}
                                className={`px-3 py-2 rounded-lg font-medium transition-colors duration-200 ${
                                  p.id === active?.id
                                    ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                                }`}
                              >
                                {p.id === active?.id ? 'Aktif' : 'Aktif Et'}
                              </button>
                              <button 
                                onClick={() => handlePrintTest(p.id)} 
                                disabled={isLoading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors duration-200"
                              >
                                Test
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'discovery' && (
            <div className="space-y-6">
              {/* Manual IP Addition */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>➕</span>
                  <span>Manuel IP Yazıcı Ekleme</span>
                </h4>
                <div className="flex space-x-3">
                  <input 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    value={ip} 
                    onChange={e => setIp(e.target.value)} 
                    placeholder="192.168.1.100" 
                  />
                  <input 
                    type="number" 
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    value={port} 
                    onChange={e => setPort(parseInt(e.target.value) || 9100)} 
                  />
                  <button 
                    onClick={handleAddIp} 
                    disabled={isLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>➕</span>
                    <span>Ekle</span>
                  </button>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  IP adresi ve port (varsayılan: 9100) girerek yazıcı ekleyebilirsiniz
                </p>
              </div>

              {/* Network Discovery */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>🔍</span>
                  <span>Ağ Yazıcı Keşfi</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Ağ Tabanı</label>
                    <input 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={discoverBase} 
                      onChange={e => setDiscoverBase(e.target.value)} 
                      placeholder="192.168.1" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Başlangıç</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={discoverStart} 
                      onChange={e => setDiscoverStart(parseInt(e.target.value) || 1)} 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bitiş</label>
                    <input 
                      type="number" 
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={discoverEnd} 
                      onChange={e => setDiscoverEnd(parseInt(e.target.value) || 254)} 
                    />
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={handleDiscover} 
                      disabled={isLoading}
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <span>🔍</span>
                      <span>Tara</span>
                    </button>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm text-blue-800">
                    <strong>Tarama Aralığı:</strong> {discoverBase}.{discoverStart} - {discoverBase}.{discoverEnd} (Port: {port})
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Bu işlem ağdaki yazıcıları otomatik olarak bulur ve ekler
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'samples' && (
            <div className="space-y-6">
              {!active && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-600">⚠️</span>
                    <p className="text-amber-800 font-medium">Önce bir yazıcı seçin</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-1">Örnek çıktı alabilmek için aktif bir yazıcınız olmalı</p>
                </div>
              )}

              {/* Sample Type Selector */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>📋</span>
                  <span>Örnek Çıktı Türü Seçin</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'test', name: 'Test Sayfası', desc: 'Yazıcı test çıktısı', icon: '🧪' },
                    { id: 'receipt', name: 'Örnek Fiş', desc: 'Market fiş formatı', icon: '🧾' },
                    { id: 'label', name: 'Ürün Etiketi', desc: 'Barkodlu etiket', icon: '🏷️' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setSampleType(type.id as 'receipt' | 'label' | 'test')}
                      className={`p-4 border-2 rounded-lg transition-all duration-200 text-left ${
                        sampleType === type.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="text-2xl mb-2">{type.icon}</div>
                      <div className="font-medium text-gray-900">{type.name}</div>
                      <div className="text-sm text-gray-500">{type.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Print Button */}
                <div className="flex justify-center">
                  <button
                    onClick={() => handlePrintSample(sampleType)}
                    disabled={isLoading || !active}
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center space-x-3 shadow-lg hover:shadow-xl"
                  >
                    <span className="text-xl">🖨️</span>
                    <span>
                      {sampleType === 'test' ? 'Test Sayfası' : 
                       sampleType === 'receipt' ? 'Örnek Fiş' : 'Ürün Etiketi'} Yazdır
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-6">
              {!active && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-amber-600">⚠️</span>
                    <p className="text-amber-800 font-medium">Önce bir yazıcı seçin</p>
                  </div>
                  <p className="text-amber-700 text-sm mt-1">Resim yazdırabilmek için aktif bir yazıcınız olmalı</p>
                </div>
              )}

              {/* Image Upload Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>📁</span>
                  <span>Resim Yükle ve Yazdır</span>
                </h4>

                {/* Input Method Selector */}
                <div className="mb-6">
                  <div className="flex space-x-4 p-1 bg-gray-100 rounded-lg">
                    <button
                      onClick={() => {
                        setInputMethod('file');
                        clearImage();
                      }}
                      className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
                        inputMethod === 'file'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <span>📁</span>
                      <span>Dosya Yükle</span>
                    </button>
                    <button
                      onClick={() => {
                        setInputMethod('base64');
                        clearImage();
                      }}
                      className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors duration-200 flex items-center justify-center space-x-2 ${
                        inputMethod === 'base64'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <span>🔤</span>
                      <span>Base64 String</span>
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Input Area */}
                  <div>
                    {inputMethod === 'file' ? (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors duration-200">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <div className="text-4xl mb-4">📷</div>
                          <p className="text-gray-600 font-medium mb-2">Resim seçmek için tıklayın</p>
                          <p className="text-sm text-gray-500">PNG, JPG, GIF (Max: 5MB)</p>
                        </label>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Base64 String Girin:
                        </label>
                        <textarea
                          value={base64Input}
                          onChange={(e) => handleBase64Input(e.target.value)}
                          placeholder="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA... veya sadece base64 string"
                          className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-xs font-mono"
                        />
                        <div className="text-xs text-gray-500">
                          <p>• Data URI formatı: data:image/png;base64,...</p>
                          <p>• Veya sadece base64 string (otomatik PNG olarak işlenir)</p>
                        </div>
                      </div>
                    )}
                    
                    {selectedImage && (
                      <div className="mt-4 space-y-2">
                        <button
                          onClick={handlePrintImage}
                          disabled={isLoading || !active}
                          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <span>🖨️</span>
                          <span>Resmi Yazdır</span>
                        </button>
                        <button
                          onClick={clearImage}
                          className="w-full bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center space-x-2"
                        >
                          <span>🗑️</span>
                          <span>Temizle</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Preview Area */}
                  <div>
                    <h5 className="font-medium text-gray-800 mb-3">Önizleme</h5>
                    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 min-h-[200px] flex items-center justify-center">
                      {imagePreview ? (
                        <div className="max-w-full max-h-64 overflow-hidden">
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain rounded"
                          />
                        </div>
                      ) : (
                        <div className="text-center text-gray-400">
                          <div className="text-3xl mb-2">🖼️</div>
                          <p>Resim önizlemesi burada görünecek</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Sample Logo Section */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>🏷️</span>
                  <span>Örnek Logo Çıktısı</span>
                </h4>
                
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-sm">LOGO</span>
                    </div>
                    <div>
                      <h5 className="font-semibold text-gray-900">Kiosk Software Logo</h5>
                      <p className="text-sm text-gray-600">SVG formatında örnek logo</p>
                      <p className="text-xs text-gray-500 mt-1">200x100 piksel, mavi tema</p>
                    </div>
                  </div>
                  <button
                    onClick={handlePrintSampleLogo}
                    disabled={isLoading || !active}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2"
                  >
                    <span>🖨️</span>
                    <span>Logo Yazdır</span>
                  </button>
                </div>
              </div>

              {/* Print Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <span>⚙️</span>
                  <span>Resim Yazdırma Ayarları</span>
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">Desteklenen Formatlar</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>PNG - Şeffaf arka plan destekli</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>JPG/JPEG - Yüksek kalite</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span>GIF - Animasyon desteksiz</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h5 className="font-medium text-gray-800 mb-2">Yazdırma Özellikleri</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Genişlik: 576 piksel (termal)</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Algoritma: Threshold</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <span>Eşik değeri: 128</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* API Documentation */}
              {printers.some(p => p.customName) && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
                  <h4 className="font-semibold text-green-900 mb-4 flex items-center space-x-2">
                    <span>🚀</span>
                    <span>API Kullanımı</span>
                  </h4>
                  <div className="space-y-3">
                    <p className="text-green-800 text-sm">
                      İsimlendirilmiş yazıcılarınızı HTTP istekleriyle kullanabilirsiniz:
                    </p>
                    <div className="bg-white border border-green-200 rounded-lg p-4">
                      <div className="space-y-2 text-sm font-mono">
                        {printers.filter(p => p.customName).map(p => (
                          <div key={p.id} className="flex items-center justify-between">
                            <span className="text-gray-600">POST</span>
                            <span className="text-blue-600">/hub/print/{p.customName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-green-700">
                      <p>• Body: PrintElement[] array</p>
                      <p>• Content-Type: application/json</p>
                      <p>• Örnek: curl -X POST http://localhost:3001/hub/print/mutfak -d &apos;[{`{`}&quot;type&quot;:&quot;text&quot;,&quot;content&quot;:&quot;Test&quot;{`}`}]&apos;</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {(error || success) && (
          <div className="px-6 pb-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-2">
                <span className="text-red-500">❌</span>
                <span className="text-red-800">{error}</span>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-2">
                <span className="text-green-500">✅</span>
                <span className="text-green-800">{success}</span>
              </div>
            )}
          </div>
        )}

        {/* Loading Overlay */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-6 flex items-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <span className="text-gray-700 font-medium">İşlem yapılıyor...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


