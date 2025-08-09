import React, { useEffect, useState } from 'react';
import { Save, Link2, Send, RefreshCcw, Globe, Hash, Server, ShieldCheck, ShieldAlert, Search, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react';

interface ScanResult { devices: string[]; totalScanned: number }
interface PavoConfigDto { ipAddress: string; port: number; serialNumber?: string; fingerPrint?: string; lastTransactionSequence?: number; isPaired?: boolean }
type Protocol = 'http' | 'https';
interface DeviceItem { id: string; name?: string; ipAddress: string; port: number; serialNumber?: string; fingerPrint?: string; isPaired: boolean; lastTransactionSequence: number }

export const PavoControl: React.FC = () => {
  const PROTOCOL: Protocol = 'https';
  const [deviceList, setDeviceList] = useState<DeviceItem[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [ipAddress, setIp] = useState('192.168.1.218');
  const [port, setPort] = useState(4567);
  const [serialNumber, setSN] = useState('PAV200000203');
  const [fingerPrint, setFP] = useState('Modpos');
  const [lastSeq, setLastSeq] = useState<number | undefined>(undefined);
  const [isPaired, setIsPaired] = useState<boolean | undefined>(undefined);
  const canPair = (serialNumber?.trim()?.length ?? 0) > 0 && (fingerPrint?.trim()?.length ?? 0) > 0;

  const [discoverBase, setBase] = useState('192.168.1');
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(50);
  const [devices, setDevices] = useState<string[]>([]);
  const [scanPort, setScanPort] = useState(4567);
  const [scanTimeout, setScanTimeout] = useState(300);

  const [endpoint, setEndpoint] = useState('Pairing');
  const [method, setMethod] = useState<'GET' | 'POST'>('POST');
  const [metaText, setMetaText] = useState<string>('{}');
  const [respText, setRespText] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      // Cihaz listesi
      const dl = await fetch('http://localhost:3001/api/pavo/devices');
      const dlj = await dl.json();
      const list = (dlj?.data || []) as DeviceItem[];
      setDeviceList(list);
      if (!activeDeviceId && list.length > 0) {
        const first = list[0];
        setActiveDeviceId(first.id);
        setIp(first.ipAddress); setPort(first.port);
        setSN(first.serialNumber || ''); setFP(first.fingerPrint || '');
        setLastSeq(first.lastTransactionSequence); setIsPaired(first.isPaired);
      }

      const r = await fetch('http://localhost:3001/api/pavo/config');
      const j = await r.json();
      const d = j?.data as PavoConfigDto;
      if (d) {
        setIp(d.ipAddress); setPort(d.port);
        setSN(d.serialNumber || ''); setFP(d.fingerPrint || '');
        setLastSeq(d.lastTransactionSequence); setIsPaired(d.isPaired);
      }
    } catch { /* empty */ }
  };

  useEffect(() => { loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveConfig = async () => {
    setLoading(true); setMsg(null);
    try {
      await fetch('http://localhost:3001/api/pavo/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: activeDeviceId || undefined, ipAddress, port, serialNumber, fingerPrint }) });
      await loadConfig();
      setMsg('Ayarlar kaydedildi');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const addDevice = async () => {
    setLoading(true); setMsg(null);
    try {
      const res = await fetch('http://localhost:3001/api/pavo/devices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: serialNumber || ipAddress, ipAddress, port, serialNumber, fingerPrint }) });
      const j = await res.json();
      const created = j?.data as DeviceItem;
      setDeviceList(prev => [created, ...prev]);
      setActiveDeviceId(created.id);
      setMsg('Cihaz eklendi');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const saveDevice = async () => {
    if (!activeDeviceId) return addDevice();
    setLoading(true); setMsg(null);
    try {
      const res = await fetch(`http://localhost:3001/api/pavo/devices/${activeDeviceId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: serialNumber || ipAddress, ipAddress, port, serialNumber, fingerPrint }) });
      const j = await res.json();
      const updated = j?.data as DeviceItem;
      setDeviceList(prev => prev.map(d => d.id === updated.id ? updated : d));
      setMsg('Cihaz güncellendi');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const removeDevice = async (id: string) => {
    setLoading(true); setMsg(null);
    try {
      await fetch(`http://localhost:3001/api/pavo/devices/${id}`, { method: 'DELETE' });
      setDeviceList(prev => prev.filter(d => d.id !== id));
      if (activeDeviceId === id) {
        setActiveDeviceId(null);
        setSN(''); setFP('');
      }
      setMsg('Cihaz silindi');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const scan = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('http://localhost:3001/api/pavo/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base: discoverBase, start, end, port: scanPort, timeoutMs: scanTimeout }) });
      const json = await r.json();
      const res = json.data as ScanResult;
      setDevices(res.devices || []);
      setMsg(`${res.devices?.length || 0} cihaz bulundu / taranan ${res.totalScanned}`);
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const quickSet = (type: 'abort' | 'saleResult' | 'cancelResult' | 'payment') => {
    if (type === 'abort') { setEndpoint('AbortCurrentPayment'); setMethod('POST'); setMetaText('{}'); }
    if (type === 'saleResult') { setEndpoint('GetSaleResult'); setMethod('POST'); setMetaText('{}'); }
    if (type === 'cancelResult') { setEndpoint('GetCancellationResult'); setMethod('POST'); setMetaText('{}'); }
    if (type === 'payment') { setEndpoint('CompleteSale'); setMethod('POST'); setMetaText('{"Amount": 100}'); }
  };

  const sendProxy = async () => {
    setLoading(true); setMsg(null); setRespText('');
    try {
      const parsed = metaText.trim() ? JSON.parse(metaText) : {};
      const payload = { deviceId: activeDeviceId || undefined, protocol: PROTOCOL, method, endPoint: endpoint, meta: parsed };
      const r = await fetch('http://localhost:3001/api/pavo/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = await r.text();
      try { setRespText(JSON.stringify(JSON.parse(text), null, 2)); }
      catch { setRespText(text); }
      await loadConfig();
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const pair = async () => {
    if (!canPair) { setMsg('Lütfen SerialNumber ve Fingerprint alanlarını doldurun'); return; }
    setLoading(true); setMsg(null); setRespText('');
    try {
      // Önce konfigürasyonu kaydedelim ki TransactionHandle doğru değerleri kullansın
      await fetch('http://localhost:3001/api/pavo/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: activeDeviceId || undefined, ipAddress, port, serialNumber, fingerPrint })
      });

      const payload = { deviceId: activeDeviceId || undefined, protocol: PROTOCOL, method: 'POST', endPoint: 'Pairing', meta: { SerialNumber: serialNumber, Fingerprint: fingerPrint } };
      const r = await fetch('http://localhost:3001/api/pavo/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const text = await r.text();
      let parsed: { success?: boolean } | null = null;
      try { parsed = JSON.parse(text); setRespText(JSON.stringify(parsed, null, 2)); }
      catch { setRespText(text); }
      await loadConfig();
      setMsg(parsed?.success ? 'Pairing başarılı' : 'Pairing başarısız');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Pavo Yönetimi</h3>
          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${isPaired ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {isPaired ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
              {isPaired ? 'Eşleşti' : 'Eşleşmedi'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700">
              <Hash size={14} /> Son Sıra No: {lastSeq ?? '-'}
            </span>
          </div>
        </div>
        <button className="btn-secondary inline-flex items-center gap-2" onClick={loadConfig} disabled={loading} title="Yenile">
          <RefreshCcw size={16} /> Yenile
        </button>
      </div>

      {/* Devices & Config */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Devices Card */}
        <div className="rounded-lg border border-gray-200 p-4 space-y-3 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-gray-900">Cihazlar</div>
            <button className="btn-secondary inline-flex items-center gap-1" onClick={addDevice} disabled={loading}><Plus size={16} /> Ekle</button>
          </div>
          <div className="border rounded-md divide-y max-h-64 overflow-auto">
            {deviceList.length === 0 ? (
              <div className="p-3 text-sm text-gray-500">Kayıtlı cihaz yok</div>
            ) : deviceList.map(d => (
              <div key={d.id} className={`p-3 cursor-pointer hover:bg-gray-50 ${activeDeviceId === d.id ? 'bg-gray-50' : ''}`} onClick={() => { setActiveDeviceId(d.id); setIp(d.ipAddress); setPort(d.port); setSN(d.serialNumber || ''); setFP(d.fingerPrint || ''); setLastSeq(d.lastTransactionSequence); setIsPaired(d.isPaired); }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {d.isPaired ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Circle size={14} className="text-gray-400" />}
                      <div className="truncate font-medium text-sm">{d.name || d.serialNumber || d.ipAddress}</div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 truncate">{d.ipAddress}:{d.port} • Seq {d.lastTransactionSequence}</div>
                  </div>
                  <button className="text-rose-600 hover:text-rose-700" title="Sil" onClick={(e) => { e.stopPropagation(); removeDevice(d.id); }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Config Card */}
        <div className="rounded-lg border border-gray-200 p-4 space-y-3 lg:col-span-2">
          <div className="text-sm font-medium text-gray-900 mb-1">Cihaz Ayarları ve Pairing</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-sm">
              <div className="flex items-center gap-1 text-gray-600 mb-1"><Globe size={14} /> IP Adresi</div>
              <input className="input-field w-full" value={ipAddress} onChange={e => setIp(e.target.value)} placeholder="192.168.1.10" />
            </label>
            <label className="text-sm">
              <div className="flex items-center gap-1 text-gray-600 mb-1"><Server size={14} /> Port</div>
              <input className="input-field w-full" type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 4567)} placeholder="4567" />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="flex items-center gap-1 text-gray-600 mb-1"><Hash size={14} /> SerialNumber</div>
              <input className="input-field w-full" value={serialNumber} onChange={e => setSN(e.target.value)} placeholder="Seri Numarası" />
            </label>
            <label className="text-sm sm:col-span-2">
              <div className="flex items-center gap-1 text-gray-600 mb-1"><ShieldCheck size={14} /> Fingerprint</div>
              <input className="input-field w-full" value={fingerPrint} onChange={e => setFP(e.target.value)} placeholder="Fingerprint" />
            </label>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button className="btn-secondary inline-flex items-center gap-2" onClick={saveDevice} disabled={loading}><Save size={16} /> Cihazı Kaydet</button>
            <button className="btn-primary inline-flex items-center gap-2" onClick={saveConfig} disabled={loading}><Save size={16} /> API Ayarını Kaydet</button>
            <button className={`btn-secondary inline-flex items-center gap-2 ${!canPair ? 'opacity-50 cursor-not-allowed' : ''}`} onClick={pair} disabled={loading || !canPair}>
              <Link2 size={16} /> {loading ? 'Pairing...' : 'Pairing'}
            </button>
          </div>
          {(!serialNumber || !fingerPrint) && (
            <div className="text-xs text-rose-600">SerialNumber ve Fingerprint zorunludur</div>
          )}
        </div>
      </div>

      {/* Scan Card */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="text-sm font-medium text-gray-900 mb-1">Ağ Taraması</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <input className="input-field" value={discoverBase} onChange={e => setBase(e.target.value)} placeholder="192.168.1" />
          <input className="input-field" type="number" value={start} onChange={e => setStart(parseInt(e.target.value) || 1)} placeholder="Başlangıç" />
          <input className="input-field" type="number" value={end} onChange={e => setEnd(parseInt(e.target.value) || 50)} placeholder="Bitiş" />
          <input className="input-field" type="number" value={scanPort} onChange={e => setScanPort(parseInt(e.target.value) || 4567)} placeholder="Port" />
          <div className="flex gap-2">
            <input className="input-field" type="number" value={scanTimeout} onChange={e => setScanTimeout(parseInt(e.target.value) || 300)} placeholder="Timeout(ms)" />
            <button className="btn-secondary whitespace-nowrap inline-flex items-center gap-2" onClick={scan} disabled={loading}>
              <Search size={16} /> Tara
            </button>
          </div>
        </div>
        <div className="border rounded-md p-2 max-h-48 overflow-auto text-sm divide-y">
          {devices.length === 0 ? (
            <div className="text-gray-500">Sonuç yok</div>
          ) : devices.map(d => (
            <div key={d} className="py-1 flex items-center justify-between">
              <div className="flex items-center gap-2"><Server size={14} className="text-gray-500" /> {d}:{scanPort}</div>
              <button className="text-xs text-gray-600 hover:text-gray-900" onClick={() => { setIp(d); setPort(scanPort); }}>Seç</button>
            </div>
          ))}
        </div>
      </div>

      {/* Request Builder */}
      <div className="rounded-lg border border-gray-200 p-4 space-y-3">
        <div className="text-sm font-medium text-gray-900 mb-1">İstek Oluşturucu</div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 items-center">
          <select className="input-field" value={endpoint} onChange={e => setEndpoint(e.target.value)}>
            <option>Pairing</option>
            <option>CompleteSale</option>
            <option>AbortCurrentPayment</option>
            <option>GetSaleResult</option>
            <option>GetCancellationResult</option>
          </select>
          <select className="input-field w-32" value={method} onChange={e => setMethod(e.target.value as 'GET' | 'POST')}>
            <option>POST</option>
            <option>GET</option>
          </select>
          <div className="flex flex-wrap gap-2">
            <button className="btn-secondary" onClick={() => quickSet('payment')}>Sale örneği</button>
            <button className="btn-secondary" onClick={() => quickSet('abort')}>Abort</button>
            <button className="btn-secondary" onClick={() => quickSet('saleResult')}>SaleResult</button>
            <button className="btn-secondary" onClick={() => quickSet('cancelResult')}>CancelResult</button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <textarea className="input-field min-h-[140px] font-mono" value={metaText} onChange={e => setMetaText(e.target.value)} placeholder="Meta JSON" />
          <textarea className="input-field min-h-[140px] font-mono" value={respText} readOnly placeholder="Yanıt" />
        </div>
        <div>
          <button className="btn-primary inline-flex items-center gap-2" onClick={sendProxy} disabled={loading}><Send size={16} /> İstek Gönder</button>
        </div>
      </div>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
};



