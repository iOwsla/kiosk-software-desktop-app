import React, { useEffect, useState } from 'react';

interface ScanResult { devices: string[]; totalScanned: number }
interface PavoConfigDto { ipAddress: string; port: number; serialNumber?: string; fingerPrint?: string; lastTransactionSequence?: number; isPaired?: boolean }

export const PavoControl: React.FC = () => {
  const [ipAddress, setIp] = useState('192.168.1.10');
  const [port, setPort] = useState(4567);
  const [serialNumber, setSN] = useState('');
  const [fingerPrint, setFP] = useState('');
  const [lastSeq, setLastSeq] = useState<number | undefined>(undefined);
  const [isPaired, setIsPaired] = useState<boolean | undefined>(undefined);

  const [discoverBase, setBase] = useState('192.168.1');
  const [start, setStart] = useState(1);
  const [end, setEnd] = useState(50);
  const [devices, setDevices] = useState<string[]>([]);

  const [endpoint, setEndpoint] = useState('Pairing');
  const [method, setMethod] = useState<'GET' | 'POST'>('POST');
  const [metaText, setMetaText] = useState<string>('{}');
  const [respText, setRespText] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      const r = await fetch('/api/pavo/config');
      const j = await r.json();
      const d = j?.data as PavoConfigDto;
      if (d) {
        setIp(d.ipAddress); setPort(d.port);
        setSN(d.serialNumber || ''); setFP(d.fingerPrint || '');
        setLastSeq(d.lastTransactionSequence); setIsPaired(d.isPaired);
      }
    } catch { /* empty */ }
  };

  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async () => {
    setLoading(true); setMsg(null);
    try {
      await fetch('/api/pavo/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ipAddress, port, serialNumber, fingerPrint }) });
      await loadConfig();
      setMsg('Ayarlar kaydedildi');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const scan = async () => {
    setLoading(true); setMsg(null);
    try {
      const r = await fetch('/api/pavo/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ base: discoverBase, start, end }) });
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
    if (type === 'payment') { setEndpoint('Sale'); setMethod('POST'); setMetaText('{"Amount": 100}'); }
  };

  const sendProxy = async () => {
    setLoading(true); setMsg(null); setRespText('');
    try {
      const parsed = metaText.trim() ? JSON.parse(metaText) : {};
      const payload = { protocol: 'http', method, endPoint: endpoint, meta: parsed };
      const r = await fetch('/api/pavo/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      setRespText(JSON.stringify(j, null, 2));
      await loadConfig();
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  const pair = async () => {
    setLoading(true); setMsg(null); setRespText('');
    try {
      const payload = { protocol: 'http', method: 'POST', endPoint: 'Pairing', meta: { SerialNumber: serialNumber, Fingerprint: fingerPrint } };
      const r = await fetch('/api/pavo/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const j = await r.json();
      setRespText(JSON.stringify(j, null, 2));
      await loadConfig();
      setMsg(j.success ? 'Pairing başarılı' : 'Pairing başarısız');
    } catch (e) { setMsg((e as Error).message); } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Pavo Yönetimi</h3>
      <div className="text-xs text-gray-600">Durum: {isPaired ? 'Eşleşti' : 'Eşleşmedi'} • Son Sıra No: {lastSeq ?? '-'}</div>

      {/* Config & Pairing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="space-y-2">
            <div className="flex space-x-2">
              <input className="input-field" value={ipAddress} onChange={e => setIp(e.target.value)} placeholder="IP" />
              <input className="input-field w-28" type="number" value={port} onChange={e => setPort(parseInt(e.target.value) || 4567)} placeholder="4567" />
            </div>
            <input className="input-field" value={serialNumber} onChange={e => setSN(e.target.value)} placeholder="SerialNumber" />
            <input className="input-field" value={fingerPrint} onChange={e => setFP(e.target.value)} placeholder="Fingerprint" />
            <div className="space-x-2">
              <button className="btn-primary" onClick={saveConfig} disabled={loading}>Kaydet</button>
              <button className="btn-secondary" onClick={pair} disabled={loading}>Pairing</button>
            </div>
          </div>
        </div>
        <div>
          <div className="flex space-x-2 mb-2">
            <input className="input-field w-32" value={discoverBase} onChange={e => setBase(e.target.value)} placeholder="192.168.1" />
            <input className="input-field w-20" type="number" value={start} onChange={e => setStart(parseInt(e.target.value) || 1)} />
            <input className="input-field w-20" type="number" value={end} onChange={e => setEnd(parseInt(e.target.value) || 50)} />
            <button className="btn-secondary" onClick={scan} disabled={loading}>Tara</button>
          </div>
          <div className="border rounded p-2 max-h-48 overflow-auto text-sm">
            {devices.length === 0 ? <div>Sonuç yok</div> : devices.map(d => (
              <div key={d} className="py-1">✓ {d}:4567</div>
            ))}
          </div>
        </div>
      </div>

      {/* Request Builder */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center">
          <select className="input-field" value={endpoint} onChange={e => setEndpoint(e.target.value)}>
            <option>Pairing</option>
            <option>Sale</option>
            <option>AbortCurrentPayment</option>
            <option>GetSaleResult</option>
            <option>GetCancellationResult</option>
          </select>
          <select className="input-field w-32" value={method} onChange={e => setMethod(e.target.value as 'GET' | 'POST')}>
            <option>POST</option>
            <option>GET</option>
          </select>
          <div className="flex space-x-2">
            <button className="btn-secondary" onClick={() => quickSet('payment')}>Sale örneği</button>
            <button className="btn-secondary" onClick={() => quickSet('abort')}>Abort</button>
            <button className="btn-secondary" onClick={() => quickSet('saleResult')}>SaleResult</button>
            <button className="btn-secondary" onClick={() => quickSet('cancelResult')}>CancelResult</button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <textarea className="input-field min-h-[120px] font-mono" value={metaText} onChange={e => setMetaText(e.target.value)} placeholder="Meta JSON" />
          <textarea className="input-field min-h-[120px] font-mono" value={respText} readOnly placeholder="Yanıt" />
        </div>
        <div>
          <button className="btn-primary" onClick={sendProxy} disabled={loading}>İstek Gönder</button>
        </div>
      </div>

      {msg && <div className="text-sm text-gray-700">{msg}</div>}
    </div>
  );
};


