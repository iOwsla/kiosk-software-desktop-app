import React, { useState, useEffect } from 'react';
import { UpdateStatus, UpdateInfo } from '../../../shared/types';
import { AlertMessage } from './AlertMessage';
import { LoadingSpinner } from './LoadingSpinner';

interface UpdateControlProps {
  className?: string;
}

export const UpdateControl: React.FC<UpdateControlProps> = ({ className = '' }) => {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus | null>(null);
  const [updateInfo] = useState<UpdateInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



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
    fetchUpdateStatus();

    // Güncelleme durumu değişikliklerini dinle
    const handleUpdateStatus = () => {
      fetchUpdateStatus();
    };

    if (window.electronAPI?.on) {
      window.electronAPI.on.updateStatus(handleUpdateStatus);
    }

    return () => {
      if (window.electronAPI?.off) {
        window.electronAPI.off.updateStatus(handleUpdateStatus);
      }
    };
  }, [fetchUpdateStatus]);



  const handleCheckForUpdates = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.update) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      await window.electronAPI.update.check();
      setSuccess('Güncelleme kontrolü başlatıldı.');
    } catch (error) {
      setError('Güncelleme kontrolü başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.update) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      await window.electronAPI.update.download();
      setSuccess('Güncelleme indirme başlatıldı.');
    } catch (error) {
      setError('Güncelleme indirme başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInstallUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.update) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      await window.electronAPI.update.install();
      setSuccess('Güncelleme yükleme başlatıldı. Uygulama yeniden başlatılacak.');
    } catch (error) {
      setError('Güncelleme yükleme başarısız: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoUpdate = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (!window.electronAPI?.update) {
        setError('ElectronAPI mevcut değil - web modunda çalışıyor');
        return;
      }
      if (updateStatus?.autoCheckEnabled) {
        await window.electronAPI.update.stopAutoCheck();
        setSuccess('Otomatik güncelleme kontrolü durduruldu.');
      } else {
        await window.electronAPI.update.startAutoCheck();
        setSuccess('Otomatik güncelleme kontrolü başlatıldı.');
      }
    } catch (error) {
      setError('Otomatik güncelleme ayarı değiştirilemedi: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    if (!updateStatus) return null;

    let badgeClass = 'px-2 py-1 text-xs rounded-full font-medium';
    let text = '';

    if (updateStatus.available) {
      badgeClass += ' bg-yellow-100 text-yellow-800';
      text = 'Güncelleme Mevcut';
    } else if (updateStatus.downloading) {
      badgeClass += ' bg-blue-100 text-blue-800';
      text = 'İndiriliyor';
    } else if (updateStatus.downloaded) {
      badgeClass += ' bg-orange-100 text-orange-800';
      text = 'Yüklemeye Hazır';
    } else {
      badgeClass += ' bg-green-100 text-green-800';
      text = 'Güncel';
    }

    return <span className={badgeClass}>{text}</span>;
  };

  return (
    <div className={`update-control ${className}`}>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Güncelleme Kontrolü</h3>
          {getStatusBadge()}
        </div>

        {error && (
          <AlertMessage type="error" message={error} onClose={() => setError(null)} className="mb-4" />
        )}

        {success && (
          <AlertMessage type="success" message={success} onClose={() => setSuccess(null)} className="mb-4" />
        )}

        {/* Mevcut sürüm bilgisi */}
        {updateInfo && (
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Mevcut Sürüm</div>
            <div className="font-medium text-gray-900">{updateInfo.currentVersion}</div>
            {updateInfo.releaseDate && (
              <div className="text-xs text-gray-500 mt-1">
                Yayın Tarihi: {new Date(updateInfo.releaseDate).toLocaleDateString('tr-TR')}
              </div>
            )}
          </div>
        )}

        {/* Güncelleme durumu */}
        {updateStatus && (
          <div className="mb-4">
            {updateStatus.available && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-3">
                <div className="text-sm font-medium text-yellow-800 mb-1">
                  Yeni Sürüm Mevcut: v{updateStatus.version}
                </div>
                {updateStatus.releaseNotes && (
                  <div className="text-xs text-yellow-700">
                    {updateStatus.releaseNotes}
                  </div>
                )}
              </div>
            )}

            {updateStatus.downloading && updateStatus.progress !== undefined && (
              <div className="mb-3">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>İndiriliyor...</span>
                  <span>{Math.round(updateStatus.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateStatus.progress}%` }}
                  />
                </div>
              </div>
            )}

            {updateStatus.downloaded && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-3">
                <div className="text-sm font-medium text-orange-800">
                  Güncelleme indirildi ve yüklemeye hazır.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Kontrol butonları */}
        <div className="space-y-3">
          <div className="flex space-x-3">
            <button
              onClick={handleCheckForUpdates}
              disabled={isLoading || (updateStatus?.downloading || false)}
              className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <LoadingSpinner /> : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              <span>Güncelleme Kontrol Et</span>
            </button>

            {updateStatus?.available && !updateStatus.downloading && !updateStatus.downloaded && (
              <button
                onClick={handleDownloadUpdate}
                disabled={isLoading}
                className="btn-secondary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <LoadingSpinner /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
                <span>İndir</span>
              </button>
            )}

            {updateStatus?.downloaded && (
              <button
                onClick={handleInstallUpdate}
                disabled={isLoading}
                className="btn-success flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <LoadingSpinner /> : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
                <span>Yükle ve Yeniden Başlat</span>
              </button>
            )}
          </div>

          {/* Otomatik güncelleme ayarı */}
          <div className="pt-3 border-t border-gray-200">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={updateStatus?.autoCheckEnabled || false}
                onChange={handleToggleAutoUpdate}
                disabled={isLoading}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm text-gray-700">
                Otomatik güncelleme kontrolü
              </span>
            </label>
            <div className="text-xs text-gray-500 mt-1 ml-7">
              Etkinleştirildiğinde, uygulama düzenli olarak güncellemeleri kontrol eder.
            </div>
          </div>
        </div>

        {/* Son kontrol zamanı */}
        {updateStatus?.lastChecked && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-500">
              Son kontrol: {new Date(updateStatus.lastChecked).toLocaleString('tr-TR')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};