import React, { useState, useEffect } from 'react';
import { PortStatus, UpdateStatus } from '../../../shared/types';

interface StatusIndicatorProps {
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ className = '' }) => {
  const [portStatus, setPortStatus] = useState<PortStatus | null>(null);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

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

  const fetchUpdateStatus = React.useCallback(async () => {
    try {
      if (!window.electronAPI?.update) {
        console.warn('ElectronAPI not available - running in web mode');
        return;
      }
      const status = await window.electronAPI.update.getStatus();
      setUpdateStatus(status);
    } catch (error) {
      console.error('Güncelleme durumu alınamadı:', error);
    }
  }, []);

  useEffect(() => {
    // İlk yükleme
    fetchPortStatus();
    fetchUpdateStatus();

    // Port değişikliği listener'ı
    const handlePortChange = () => {
      fetchPortStatus();
    };

    // Güncelleme durumu listener'ı
    const handleUpdateChange = () => {
      fetchUpdateStatus();
    };

    if (window.electronAPI?.on) {
      window.electronAPI.on.portChanged(handlePortChange);
      window.electronAPI.on.updateStatus(handleUpdateChange);
    }

    // Periyodik güncelleme
    const interval = setInterval(() => {
      fetchPortStatus();
      fetchUpdateStatus();
    }, 30000); // 30 saniyede bir

    return () => {
      if (window.electronAPI?.off) {
        window.electronAPI.off.portChanged(handlePortChange);
        window.electronAPI.off.updateStatus(handleUpdateChange);
      }
      clearInterval(interval);
    };
  }, [fetchPortStatus, fetchUpdateStatus]);

  const getPortStatusColor = () => {
    if (!portStatus) return 'bg-gray-400';
    return portStatus.isAvailable ? 'bg-green-500' : 'bg-red-500';
  };

  const getUpdateStatusColor = () => {
    if (!updateStatus) return 'bg-gray-400';
    if (updateStatus.available) return 'bg-yellow-500';
    if (updateStatus.downloading) return 'bg-blue-500';
    if (updateStatus.downloaded) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getPortStatusText = () => {
    if (!portStatus) return 'Port durumu bilinmiyor';
    if (portStatus.isAvailable) {
      return `Port ${portStatus.port} aktif`;
    }
    return `Port ${portStatus.port} kullanılamıyor${portStatus.conflictsWith ? ` (${portStatus.conflictsWith} ile çakışma)` : ''}`;
  };

  const getUpdateStatusText = () => {
    if (!updateStatus) return 'Güncelleme durumu bilinmiyor';
    if (updateStatus.available) {
      return `Güncelleme mevcut: v${updateStatus.version || 'Bilinmiyor'}`;
    }
    if (updateStatus.downloading) {
      return `İndiriliyor... ${updateStatus.progress ? `${Math.round(updateStatus.progress)}%` : ''}`;
    }
    if (updateStatus.downloaded) {
      return 'Güncelleme hazır - Yeniden başlatma gerekiyor';
    }
    return 'Güncel sürüm';
  };

  return (
    <div className={`status-indicator ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center space-x-2 p-2 rounded-lg bg-white shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
        title="Sistem durumunu görüntüle"
      >
        {/* Port durumu göstergesi */}
        <div className="flex items-center space-x-1">
          <div className={`w-3 h-3 rounded-full ${getPortStatusColor()}`} />
          <span className="text-xs text-gray-600">Port</span>
        </div>

        {/* Güncelleme durumu göstergesi */}
        <div className="flex items-center space-x-1">
          <div className={`w-3 h-3 rounded-full ${getUpdateStatusColor()}`} />
          <span className="text-xs text-gray-600">Güncelleme</span>
        </div>

        {/* Genişletme ikonu */}
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Genişletilmiş durum bilgileri */}
      {isExpanded && (
        <div className="absolute top-full left-0 mt-2 p-3 bg-white rounded-lg shadow-lg border border-gray-200 min-w-64 z-10 fade-in">
          <div className="space-y-3">
            {/* Port durumu detayı */}
            <div className="flex items-start space-x-2">
              <div className={`w-3 h-3 rounded-full mt-1 ${getPortStatusColor()}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">Port Durumu</div>
                <div className="text-xs text-gray-600">{getPortStatusText()}</div>
                {portStatus?.lastChecked && (
                  <div className="text-xs text-gray-400">
                    Son kontrol: {new Date(portStatus.lastChecked).toLocaleTimeString('tr-TR')}
                  </div>
                )}
              </div>
            </div>

            {/* Güncelleme durumu detayı */}
            <div className="flex items-start space-x-2">
              <div className={`w-3 h-3 rounded-full mt-1 ${getUpdateStatusColor()}`} />
              <div>
                <div className="text-sm font-medium text-gray-900">Güncelleme Durumu</div>
                <div className="text-xs text-gray-600">{getUpdateStatusText()}</div>
                {updateStatus?.lastChecked && (
                  <div className="text-xs text-gray-400">
                    Son kontrol: {new Date(updateStatus.lastChecked).toLocaleTimeString('tr-TR')}
                  </div>
                )}
              </div>
            </div>

            {/* Hızlı eylemler */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex space-x-2">
                <button
                  onClick={async () => {
                    try {
                      await fetchPortStatus();
                    } catch (error) {
                      console.error('Port durumu yenilenemedi:', error);
                    }
                  }}
                  className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                >
                  Port Yenile
                </button>
                <button
                  onClick={async () => {
                    try {
                      await window.electronAPI?.update?.check?.();
                    } catch (error) {
                      console.error('Güncelleme kontrolü başarısız:', error);
                    }
                  }}
                  className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                >
                  Güncelleme Kontrol Et
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};