import React, { useEffect, useState } from 'react';
import type { IPPrinterConfig, PrinterDevice, PrinterModuleSettings } from '../../../shared/types';

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
  const [discoverEnd, setDiscoverEnd] = useState(20);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

  return (
    <div className={`printer-control ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Yazıcı Yönetimi</h3>
          <button onClick={handleToggleIp} disabled={isLoading} className="btn-secondary">
            IP Modu: {settings.ipEnabled ? 'Açık' : 'Kapalı'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">IP Yazıcı Ekle</h4>
            <div className="flex space-x-2 mb-2">
              <input className="input-field" value={ip} onChange={e => setIp(e.target.value)} placeholder="192.168.1.100" />
              <input type="number" className="input-field w-24" value={port} onChange={e => setPort(parseInt(e.target.value) || 9100)} />
              <button onClick={handleAddIp} className="btn-primary" disabled={isLoading}>Ekle</button>
            </div>

            <h4 className="font-medium text-gray-800 mb-2">IP Keşfi</h4>
            <div className="flex space-x-2 mb-2">
              <input className="input-field w-32" value={discoverBase} onChange={e => setDiscoverBase(e.target.value)} placeholder="192.168.1" />
              <input type="number" className="input-field w-20" value={discoverStart} onChange={e => setDiscoverStart(parseInt(e.target.value) || 1)} />
              <input type="number" className="input-field w-20" value={discoverEnd} onChange={e => setDiscoverEnd(parseInt(e.target.value) || 20)} />
              <button onClick={handleDiscover} className="btn-secondary" disabled={isLoading}>Tara</button>
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-800 mb-2">Yazıcılar</h4>
            <div className="space-y-2">
              {printers.map(p => (
                <div key={p.id} className={`flex items-center justify-between p-2 border rounded ${p.id===active?.id?'bg-blue-50 border-blue-200':'border-gray-200'}`}>
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-600">{p.provider.toUpperCase()} • {p.online ? 'Online' : 'Offline'}</div>
                  </div>
                  <div className="space-x-2">
                    <button onClick={() => handleSetActive(p.id)} className="btn-secondary">Aktif Et</button>
                    <button onClick={() => handlePrintTest(p.id)} className="btn-secondary">Test Yazdır</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <div className="text-sm text-red-600">{error}</div>}
        {success && <div className="text-sm text-green-600">{success}</div>}
      </div>
    </div>
  );
};


