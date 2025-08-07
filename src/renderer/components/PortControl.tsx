import React, { useState, useEffect } from 'react';
import { PortStatus, PortScanResult } from '../../../shared/types';
import { AlertMessage } from './AlertMessage';
import { LoadingSpinner } from './LoadingSpinner';

interface PortControlProps {
  className?: string;
}

export const PortControl: React.FC<PortControlProps> = ({ className = '' }) => {
  const [portStatus, setPortStatus] = useState<PortStatus | null>(null);
  const [scanResults, setScanResults] = useState<PortStatus[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanRange, setScanRange] = useState({ start: 3000, end: 3010 });
  const [newPort, setNewPort] = useState('');

  const fetchPortStatus = React.useCallback(async () => {
    try {
      if (!window.electronAPI?.port) {
        console.warn('ElectronAPI not available - running in web mode');
        return;
      }
      const status = await window.electronAPI.port.getStatus();
      setPortStatus(status);
    } catch (error) {
      console.error('Port durumu alınamadı:', error);
    }
  }, []);

  useEffect(() => {
    fetchPortStatus();

    // Port değişikliklerini dinle
    const handlePortChange = () => {
      fetchPortStatus();
    };

    if (window.electronAPI?.on) {
      window.electronAPI.on.portChanged(handlePortChange);
    }

    return () => {
      if (window.electronAPI?.off) {
        window.electronAPI.off.portChanged(handlePortChange);
      }
    };
  }, [fetchPortStatus]);



  const handleCheckPort = async (port?: number) => {
    const portToCheck = port || (portStatus?.port || 3001);
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.port) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      const result = await window.electronAPI.port.check(portToCheck);
      if (result.isAvailable) {
        setSuccess(`Port ${portToCheck} kullanılabilir.`);
      } else {
        setError(`Port ${portToCheck} kullanılamıyor${result.conflictsWith ? ` (${result.conflictsWith} ile çakışma)` : ''}.`);
      }
      await fetchPortStatus();
    } catch (error) {
      setError('Port kontrolü başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFindAvailablePort = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.port) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      const result = await window.electronAPI.port.findAvailable();
      setSuccess(`Kullanılabilir port bulundu: ${result}`);
      setNewPort(result.toString());
    } catch (error) {
      setError('Kullanılabilir port bulunamadı: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleScanRange = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setScanResults([]);

    try {
      if (!window.electronAPI?.port) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      const scanResult = await window.electronAPI.port.scanRange(scanRange.start, scanRange.end);
      setScanResults(scanResult.results);
      setSuccess(`Port taraması tamamlandı. ${scanResult.availablePorts.length} kullanılabilir port bulundu.`);
    } catch (error) {
      setError('Port taraması başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveConflict = async () => {
    if (!portStatus?.port) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.port) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      const result = await window.electronAPI.port.resolveConflict();
      if (result.resolved) {
        setSuccess(`Port çakışması çözüldü. Yeni port: ${result.newPort}`);
      } else {
        setError('Port çakışması çözülemedi.');
      }
      await fetchPortStatus();
    } catch (error) {
      setError('Port çakışması çözme başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPort = async () => {
    const port = parseInt(newPort);
    if (isNaN(port) || port < 1 || port > 65535) {
      setError('Geçerli bir port numarası girin (1-65535).');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.port) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      await window.electronAPI.port.setCurrent(port);
      setSuccess(`Port ${port} olarak ayarlandı.`);
      setNewPort('');
      await fetchPortStatus();
    } catch (error) {
      setError('Port ayarlama başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!portStatus) return null;

    let badgeClass = 'px-2 py-1 text-xs rounded-full font-medium';
    let text = '';

    if (portStatus.isAvailable) {
      badgeClass += ' bg-green-100 text-green-800';
      text = 'Aktif';
    } else {
      badgeClass += ' bg-red-100 text-red-800';
      text = 'Çakışma';
    }

    return <span className={badgeClass}>{text}</span>;
  };

  return (
    <div className={`port-control ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Port Yönetimi</h3>
          {getStatusBadge()}
        </div>

        {error && (
          <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-4" />
        )}

        {success && (
          <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />
        )}

        {/* Mevcut port durumu */}
        {portStatus && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm text-gray-600">Mevcut Port</div>
                <div className="font-medium text-gray-900">{portStatus.port}</div>
              </div>
              <button
                onClick={() => handleCheckPort()}
                disabled={isLoading}
                className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                Kontrol Et
              </button>
            </div>
            
            {!portStatus.isAvailable && portStatus.conflictsWith && (
              <div className="text-xs text-red-600 mb-2">
                Çakışma: {portStatus.conflictsWith}
              </div>
            )}
            
            {portStatus.lastChecked && (
              <div className="text-xs text-gray-500">
                Son kontrol: {new Date(portStatus.lastChecked).toLocaleTimeString('tr-TR')}
              </div>
            )}
          </div>
        )}

        {/* Port çakışması çözme */}
        {portStatus && !portStatus.isAvailable && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-sm font-medium text-red-800 mb-2">
              Port Çakışması Tespit Edildi
            </div>
            <button
              onClick={handleResolveConflict}
              disabled={isLoading}
              className="btn-danger text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Çakışmayı Çöz'}
            </button>
          </div>
        )}

        {/* Yeni port ayarlama */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Yeni Port Ayarla
          </label>
          <div className="flex space-x-2">
            <input
              type="number"
              value={newPort}
              onChange={(e) => setNewPort(e.target.value)}
              placeholder="Port numarası (örn: 3001)"
              min="1"
              max="65535"
              className="input-field flex-1"
            />
            <button
              onClick={handleSetPort}
              disabled={isLoading || !newPort}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Ayarla'}
            </button>
          </div>
        </div>

        {/* Port tarama */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Port Tarama
          </label>
          <div className="flex space-x-2 mb-2">
            <input
              type="number"
              value={scanRange.start}
              onChange={(e) => setScanRange(prev => ({ ...prev, start: parseInt(e.target.value) || 3000 }))}
              placeholder="Başlangıç"
              min="1"
              max="65535"
              className="input-field w-24"
            />
            <span className="self-center text-gray-500">-</span>
            <input
              type="number"
              value={scanRange.end}
              onChange={(e) => setScanRange(prev => ({ ...prev, end: parseInt(e.target.value) || 3010 }))}
              placeholder="Bitiş"
              min="1"
              max="65535"
              className="input-field w-24"
            />
            <button
              onClick={handleFindAvailablePort}
              disabled={isLoading}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Kullanılabilir Bul'}
            </button>
            <button
              onClick={handleScanRange}
              disabled={isLoading}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : 'Tümünü Tara'}
            </button>
          </div>
        </div>

        {/* Tarama sonuçları */}
        {scanResults.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Tarama Sonuçları</h4>
            <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Port</th>
                    <th className="px-3 py-2 text-left">Durum</th>
                    <th className="px-3 py-2 text-left">Çakışma</th>
                    <th className="px-3 py-2 text-left">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {scanResults.map((result, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-3 py-2 font-medium">{result.port}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          result.isAvailable 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {result.isAvailable ? 'Kullanılabilir' : 'Kullanılamaz'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">
                        {result.conflictsWith || '-'}
                      </td>
                      <td className="px-3 py-2">
                        {result.isAvailable && (
                          <button
                            onClick={() => setNewPort(result.port.toString())}
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Seç
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};