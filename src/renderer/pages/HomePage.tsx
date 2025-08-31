import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Shield, Check, X, RefreshCw, Download, Key, AlertTriangle, Sparkles, Moon, Settings, Calendar, Clock, BarChart3, FileText, Power } from 'lucide-react';
import gafYaziLogo from '../logotext.svg';
import { LoadingSpinner } from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const [version, setVersion] = useState<string>('');
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(false);
  const [licenseExpiresAt, setLicenseExpiresAt] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    version?: string;
    releaseDate?: string;
    size?: string;
    notes?: string[];
  } | null>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showLicenseInput, setShowLicenseInput] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState('');
  const [systemStats, setSystemStats] = useState({ cpuUsage: 0, memoryUsage: 0 });

  // Yeni pencere açma fonksiyonu
  const openNewWindow = async () => {
    try {
      await (window as any).electronAPI?.window?.showCustom();
    } catch (error) {
      console.error('Yeni pencere açılamadı:', error);
    }
  };

  // Otomatik pencere açma
  useEffect(() => {
    const autoOpenWindow = async () => {
      // 2 saniye bekleyip otomatik olarak yeni pencere aç
      setTimeout(() => {
        openNewWindow();
      }, 2000);
    };

    autoOpenWindow();
  }, []);

  // Güncelleme kontrol fonksiyonları
  const checkForUpdates = async () => {
    if (!window.electronAPI || !window.electronAPI.invoke) {
      console.error('ElectronAPI mevcut değil');
      return;
    }
    setIsCheckingUpdate(true);
    try {
      await window.electronAPI.invoke('update:check');
    } catch (error) {
      console.error('Güncelleme kontrol hatası:', error);
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const startDownload = async () => {
    if (!window.electronAPI || !window.electronAPI.invoke) {
      console.error('ElectronAPI mevcut değil');
      return;
    }
    setIsDownloading(true);
    setDownloadProgress(0);
    try {
      await window.electronAPI.invoke('update:download');
    } catch (error) {
      console.error('Güncelleme indirme hatası:', error);
      setIsDownloading(false);
    }
  };

  const handleUpdateDownloaded = async (): Promise<void> => {
    const confirmInstall = window.confirm('Güncelleme indirildi. Şimdi yüklemek istiyor musunuz? Uygulama yeniden başlatılacak.');
    if (confirmInstall && window.electronAPI && window.electronAPI.invoke) {
      await window.electronAPI.invoke('update:install');
    }
  };

  // Kalan süreyi hesaplayan fonksiyon
  const calculateTimeRemaining = (expiresAt: string): string => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) {
      return 'Süresi dolmuş';
    }
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} gün ${hours} saat`;
    } else if (hours > 0) {
      return `${hours} saat ${minutes} dakika`;
    } else {
      return `${minutes} dakika`;
    }
  };

  // Lisans kontrol fonksiyonları
  const checkLicenseStatus = async () => {
    // Önce IPC ile kaydedilmiş lisans anahtarını al
    let savedLicenseKey = null;
    if (window.electronAPI && window.electronAPI.invoke) {
      try {
        const status = await window.electronAPI.invoke('license:getStatus');
        if (status.licenseKey) {
          savedLicenseKey = status.licenseKey;
        }
      } catch (error) {
        console.warn('IPC ile lisans anahtarı alınamadı:', error);
      }
    }

    // Eğer kaydedilmiş lisans anahtarı varsa HTTP API ile doğrula
    if (savedLicenseKey) {
      setIsCheckingLicense(true);
      setLicenseError(null);
      try {
        const response = await fetch('http://localhost:8001/api/license/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ apiKey: savedLicenseKey })
        });
        
        const result = await response.json();
        
        if (result.status) {
           setIsLicenseValid(true);
           setLicenseExpiresAt(result.expiresAt);
           if (result.expiresAt) {
             setTimeRemaining(calculateTimeRemaining(result.expiresAt));
           }
         } else {
           setIsLicenseValid(false);
           setLicenseExpiresAt(null);
           setTimeRemaining('');
           setShowLicenseInput(true);
           setLicenseError(result.message || 'Lisans geçersiz');
         }
      } catch (error) {
        console.error('HTTP API ile lisans kontrolü başarısız:', error);
        setIsLicenseValid(false);
        setLicenseError('Lisans durumu kontrol edilemedi');
        setShowLicenseInput(true);
      } finally {
        setIsCheckingLicense(false);
      }
    } else {
      // Kaydedilmiş lisans anahtarı yoksa
      setIsLicenseValid(false);
      setShowLicenseInput(true);
      setLicenseError('Lisans anahtarı gerekli');
    }
  };

  const validateLicense = async () => {
    if (!licenseKey.trim()) {
      setLicenseError('Lütfen lisans anahtarını girin');
      return;
    }

    setIsCheckingLicense(true);
    setLicenseError(null);
    try {
      // HTTP API kullanarak lisans doğrulama
      const response = await fetch('http://localhost:8001/api/license/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: licenseKey.trim() })
      });
      
      const result = await response.json();
      
      if (result.status) {
          // IPC ile lisansı kaydet
          if (window.electronAPI && window.electronAPI.invoke) {
            await window.electronAPI.invoke('license:save', licenseKey.trim());
          }
          setIsLicenseValid(true);
          setLicenseExpiresAt(result.expiresAt);
          if (result.expiresAt) {
            setTimeRemaining(calculateTimeRemaining(result.expiresAt));
          }
          setShowLicenseInput(false);
          setLicenseKey('');
        } else {
          setLicenseError(result.message || 'Geçersiz lisans anahtarı');
        }
    } catch (error) {
      console.error('Lisans doğrulama hatası:', error);
      setLicenseError('Lisans doğrulama sırasında hata oluştu');
      setIsLicenseValid(false);
    } finally {
      setIsCheckingLicense(false);
    }
  };

  const handleLicenseKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(e.target.value);
    setLicenseError(null);
  };

  // System stats update function
  const updateSystemStats = async () => {
    if (window.electronAPI && window.electronAPI.invoke) {
      try {
        const stats = await window.electronAPI.invoke('system:getStats');
        setSystemStats(stats);
      } catch (error) {
        console.error('Failed to get system stats:', error);
      }
    }
  };

  useEffect(() => {
    // Version bilgisini al
    if (window.electronAPI && window.electronAPI.getAppVersion) {
      window.electronAPI.getAppVersion().then((appVersion) => {
        setVersion(appVersion);
      }).catch((error) => {
        console.error('Version bilgisi alınamadı:', error);
        setVersion('1.0.9');
      });
    } else {
      console.warn('ElectronAPI mevcut değil, varsayılan version kullanılıyor');
      setVersion('1.0.9');
    }

    // Lisans durumunu kontrol et
    checkLicenseStatus();

    // System stats'ı al ve periyodik olarak güncelle
    updateSystemStats();
    const statsInterval = setInterval(updateSystemStats, 5000); // Her 5 saniyede bir güncelle

    // Güncelleme durumunu dinle
    interface UpdateNotification {
      status: string;
      progress?: number;
      version?: string;
      error?: string;
    }
    
    const handleUpdateStatus = (notification: UpdateNotification) => {
      if (notification.status === 'downloading' && notification.progress) {
        setIsDownloading(true);
        setDownloadProgress(notification.progress);
      } else if (notification.status === 'downloaded') {
        setDownloadProgress(100);
        setIsDownloading(false);
        handleUpdateDownloaded();
      } else if (notification.status === 'available') {
        setUpdateAvailable(true);
        if (notification.version) {
          setUpdateInfo(prev => ({
            ...prev,
            version: notification.version,
            size: '~50 MB',
            notes: prev?.notes || []
          }));
        }
      } else if (notification.status === 'error') {
        console.error('Güncelleme hatası:', notification.error);
        setIsDownloading(false);
        setDownloadProgress(0);
      }
    };

    // Event listener'ı ekle
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on.updateStatus(handleUpdateStatus);
    }

    // İlk güncelleme kontrolü (5 saniye gecikmeyle)
    const initialCheckTimer = setTimeout(() => {
      if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke('update:check').catch(console.error);
      }
    }, 5000);

    // Otomatik güncelleme kontrolünü başlat (60 dakikada bir)
    if (window.electronAPI && window.electronAPI.invoke) {
      window.electronAPI.invoke('update:startAutoCheck', 60).catch(console.error);
    }

    // Cleanup
    return () => {
      clearTimeout(initialCheckTimer);
      clearInterval(statsInterval);
      if (window.electronAPI && window.electronAPI.off) {
        window.electronAPI.off.updateStatus(handleUpdateStatus);
      }
      if (window.electronAPI && window.electronAPI.invoke) {
        window.electronAPI.invoke('update:stopAutoCheck').catch(console.error);
      }
    };
  }, []);

  // Zamanlayıcı için ayrı useEffect
  useEffect(() => {
    if (!licenseExpiresAt) return;

    // İlk hesaplama
    setTimeRemaining(calculateTimeRemaining(licenseExpiresAt));

    // Her dakika güncelle
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(licenseExpiresAt));
    }, 60000);

    return () => clearInterval(timer);
  }, [licenseExpiresAt]);

  return (
    <div className="w-[600px] h-[400px] mx-auto my-auto flex flex-col overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Custom Title Bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-b border-slate-600/30 backdrop-blur-sm" style={{WebkitAppRegion: 'drag'} as React.CSSProperties}>
        <div className="flex items-center space-x-3">
          <div className="bg-white/10 rounded-lg p-2 backdrop-blur-sm">
            <img 
              src={gafYaziLogo} 
              alt="GAF Logo" 
              className="h-8 w-auto" 
              style={{
                imageRendering: 'crisp-edges',
                WebkitImageRendering: 'crisp-edges',
                filter: 'brightness(0) invert(1) drop-shadow(0 0 8px rgba(255,255,255,0.3))'
              } as React.CSSProperties}
            />
          </div>
          <span className="text-white font-semibold text-sm">Kiosk Hub Panel</span>
        </div>
        <div className="flex items-center space-x-1" style={{WebkitAppRegion: 'no-drag'} as React.CSSProperties}>
          <button 
            onClick={checkForUpdates}
            className="p-1.5 hover:bg-slate-600/50 rounded-md transition-colors"
            title="Güncelleme Kontrol Et"
          >
            <RefreshCw className="h-3.5 w-3.5 text-white/70" />
          </button>
          <button 
            onClick={() => {
              if (window.electronAPI?.invoke) {
                window.electronAPI.invoke('window:hide-kiosk');
              } else {
                window.close();
              }
            }}
            className="p-1.5 hover:bg-red-600/50 rounded-md transition-colors"
            title="Gizle"
          >
            <X className="h-3.5 w-3.5 text-white/70" />
          </button>
        </div>
      </div>

      {/* License Warning */}
      {isLicenseValid === false && (
        <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-red-900/50 to-red-800/50 border border-red-600/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-3 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-red-300 font-medium text-sm">Lisans Gerekli</span>
          </div>
          {showLicenseInput && (
            <div className="space-y-2">
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="Lisans anahtarı..."
                  value={licenseKey}
                  onChange={handleLicenseKeyChange}
                  className="flex-1 text-xs h-8 bg-slate-800/50 border-red-600/50 text-white placeholder-slate-400"
                  disabled={isCheckingLicense}
                />
                <Button 
                  onClick={validateLicense}
                  disabled={isCheckingLicense || !licenseKey.trim()}
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 h-8 px-3 text-xs"
                >
                  {isCheckingLicense ? <LoadingSpinner size="small" /> : <Key className="h-3 w-3" />}
                </Button>
              </div>
              {licenseError && (
                <div className="text-xs text-red-400">{licenseError}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Update Notification */}
      {updateAvailable && (
        <div className="mx-4 mt-3 p-3 bg-gradient-to-r from-blue-900/50 to-blue-800/50 border border-blue-600/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Download className="h-4 w-4 text-blue-400" />
              <span className="text-blue-300 font-medium text-sm">Güncelleme: v{updateInfo?.version}</span>
            </div>
            {isDownloading ? (
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-blue-800 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${downloadProgress}%` }}
                  ></div>
                </div>
                <span className="text-xs text-blue-300">{downloadProgress}%</span>
              </div>
            ) : (
              <Button 
                onClick={startDownload}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 h-8 px-3 text-xs"
              >
                İndir
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-hidden">
        {/* Status Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {/* System Status */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 text-xs font-medium">Sistem</span>
              <Check className="h-4 w-4 text-green-400" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <span className="text-slate-400">CPU:</span>
              <span className="text-white font-bold">{systemStats.cpuUsage}%</span>
              <span className="text-slate-400">RAM:</span>
              <span className="text-white font-bold">{systemStats.memoryUsage}%</span>
            </div>
          </div>

          {/* License Status */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/80 rounded-lg p-3 border border-slate-600/30 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-300 text-xs font-medium">Lisans</span>
              <Shield className={`h-4 w-4 ${
                isLicenseValid === true ? 'text-green-400' : 
                isLicenseValid === false ? 'text-red-400' : 'text-yellow-400'
              }`} />
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Durum:</span>
                <span className={`font-bold px-2 py-0.5 rounded text-xs ${
                  isLicenseValid === true ? 'text-green-300 bg-green-900/30' : 
                  isLicenseValid === false ? 'text-red-300 bg-red-900/30' : 'text-yellow-300 bg-yellow-900/30'
                }`}>
                  {isLicenseValid === true ? 'Geçerli' : 
                   isLicenseValid === false ? 'Geçersiz' : 'Kontrol...'}
                </span>
              </div>
              {licenseExpiresAt && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Süre:</span>
                  <span className="text-white font-bold text-xs">{timeRemaining}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {/* End of Day Process */}
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 rounded-lg p-3 border border-purple-600/30 hover:border-purple-500/50 transition-all cursor-pointer group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2 bg-purple-800/30 rounded-full group-hover:bg-purple-700/40 transition-colors">
                <Moon className="h-4 w-4 text-purple-300" />
              </div>
              <div>
                <h3 className="text-white font-medium text-xs">Gün Sonu</h3>
                <p className="text-purple-300 text-xs opacity-80">Günlük işlemler</p>
              </div>
              <div className="w-full space-y-1">
                <Button 
                  onClick={() => {
                    if (window.electronAPI?.window?.showCustom) {
                      window.electronAPI.window.showCustom();
                    }
                  }}
                  size="sm"
                  className="w-full bg-purple-600 hover:bg-purple-700 h-6 text-xs px-2"
                >
                  <FileText className="h-2.5 w-2.5 mr-1" />
                  Rapor Al
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full border-purple-600/50 text-purple-300 hover:bg-purple-800/30 h-6 text-xs px-2"
                >
                  <BarChart3 className="h-2.5 w-2.5 mr-1" />
                  İstatistikler
                </Button>
              </div>
            </div>
          </div>

          {/* Settings Process */}
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-lg p-3 border border-blue-600/30 hover:border-blue-500/50 transition-all cursor-pointer group">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="p-2 bg-blue-800/30 rounded-full group-hover:bg-blue-700/40 transition-colors">
                <Settings className="h-4 w-4 text-blue-300" />
              </div>
              <div>
                <h3 className="text-white font-medium text-xs">Ayarlar</h3>
                <p className="text-blue-300 text-xs opacity-80">Sistem yapılandırması</p>
              </div>
              <div className="w-full space-y-1">
                <Button 
                  onClick={() => {
                    if (window.electronAPI?.window?.showDealerSettings) {
                      window.electronAPI.window.showDealerSettings();
                    }
                  }}
                  size="sm"
                  className="w-full bg-blue-600 hover:bg-blue-700 h-6 text-xs px-2"
                >
                  <Key className="h-2.5 w-2.5 mr-1" />
                  Bayi Ayarları
                </Button>
                <Button 
                  size="sm"
                  variant="outline"
                  className="w-full border-blue-600/50 text-blue-300 hover:bg-blue-800/30 h-6 text-xs px-2"
                >
                  <Calendar className="h-2.5 w-2.5 mr-1" />
                  Sistem Ayarları
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="px-4 py-2 bg-gradient-to-r from-slate-800/30 to-slate-700/30 border-t border-slate-600/30">
        <div className="text-center">
          <div className="text-xs text-slate-400">
            GAF Dijital Çözümler • v{version} • info@gafdigi.com
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;