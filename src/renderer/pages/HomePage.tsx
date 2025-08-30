import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Shield, Check, X, RefreshCw, Download, Key, AlertTriangle, Sparkles } from 'lucide-react';
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
    <div className="w-[600px] h-[400px] mx-auto my-auto flex flex-col overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 rounded-2xl shadow-2xl border border-white/20">
      <div className="flex flex-col overflow-hidden p-4">
        {/* Lisans kontrol bildirimi */}
        {isLicenseValid === false && (
          <div className="mb-3 p-4 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/50 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-3">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-red-900">Lisans Gerekli</h3>
                <p className="text-xs text-red-700/80">Geçerli lisans anahtarı gereklidir.</p>
              </div>
            </div>
            {showLicenseInput && (
              <div className="mt-3 space-y-3">
                <div className="flex space-x-2">
                  <Input
                    type="text"
                    placeholder="Lisans anahtarı..."
                    value={licenseKey}
                    onChange={handleLicenseKeyChange}
                    className="flex-1 text-xs h-9 bg-white/80 border-red-200 focus:border-red-400 rounded-lg shadow-sm"
                    disabled={isCheckingLicense}
                  />
                  <Button 
                    onClick={validateLicense}
                    disabled={isCheckingLicense || !licenseKey.trim()}
                    size="sm"
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 h-9 px-4 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
                  >
                    {isCheckingLicense ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        <span className="text-xs font-medium">Doğrula</span>
                      </>
                    )}
                  </Button>
                </div>
                {licenseError && (
                  <div className="flex items-center space-x-2 p-2 bg-red-100/50 rounded-lg">
                    <X className="h-4 w-4 text-red-600" />
                    <span className="text-xs text-red-700 font-medium">{licenseError}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Güncelleme bildirimi */}
        {updateAvailable && (
          <div className="mb-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200/50 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Download className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-900">
                    Güncelleme: v{updateInfo?.version}
                  </h3>
                  <p className="text-xs text-blue-700/80">
                    {updateInfo?.size && `Boyut: ${updateInfo.size}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isDownloading ? (
                  <div className="flex items-center space-x-3">
                    <div className="w-32 bg-blue-200/50 rounded-full h-3 shadow-inner">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-300 shadow-sm" 
                        style={{ width: `${downloadProgress}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-blue-700">{downloadProgress}%</span>
                  </div>
                ) : (
                  <Button 
                    onClick={startDownload}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    İndir
                  </Button>
                )}
              </div>
            </div>
            {updateInfo?.notes && updateInfo.notes.length > 0 && (
              <div className="mt-4 pt-4 border-t border-blue-200/50">
                <h4 className="text-sm font-semibold text-blue-900 mb-3">Güncelleme notları:</h4>
                <ul className="text-sm text-blue-700/90 space-y-2">
                  {updateInfo.notes.map((note, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-blue-500 mt-1 font-bold">•</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Ana İçerik */}
        <div className="text-center">
          {/* Logo ve Hub Panel Başlığı */}
          <div className="flex items-center justify-between mb-4 px-4">
            {/* Logo */}
            <div>
              <img 
                src={gafYaziLogo} 
                alt="GAF Logo" 
                className="h-10 w-auto" 
                style={{
                  imageRendering: 'crisp-edges',
                  WebkitImageRendering: 'crisp-edges',
                  filter: 'none'
                } as React.CSSProperties}
              />
            </div>
            
            {/* Hub Panel Başlığı */}
            <div className="text-right flex items-center space-x-3">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">Hub Panel</h1>
                <p className="text-sm text-slate-600 font-medium mt-1">v1.3.0</p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    if (window.electronAPI?.window?.showDealerSettings) {
                      window.electronAPI.window.showDealerSettings();
                    }
                  }}
                  className="p-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 text-white"
                  title="Bayi Ayarları"
                >
                  <Key className="h-4 w-4" />
                </button>
                <button 
                  onClick={checkForUpdates}
                  className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg shadow-md transition-all duration-200 transform hover:scale-105 text-white"
                  title="Güncelleme Kontrol Et"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Sistem Bilgileri Kartları */}
          <div className="grid grid-cols-2 gap-3 mb-3 px-4">
            {/* Sistem Durumu Kartı */}
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-xl shadow-lg border border-white/50 p-3 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-200/50">
                <h3 className="text-sm font-bold text-slate-800">Sistem Durumu</h3>
                <div className="p-1 bg-green-100 rounded-full">
                  <Check className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="text-slate-600 font-medium">CPU:</div>
                <div className="text-slate-900 font-bold">15%</div>
                <div className="text-slate-600 font-medium">RAM:</div>
                <div className="text-slate-900 font-bold">45%</div>
              </div>
            </div>

            {/* Lisans Durumu Kartı */}
            <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-white/50 p-3 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-blue-200/50">
                <h3 className="text-sm font-bold text-slate-800">Lisans</h3>
                <div className="p-1 bg-blue-100 rounded-full">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-xs space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Durum:</span>
                  <span className={`font-bold px-2 py-1 rounded text-xs ${
                    isLicenseValid === true ? 'text-green-700 bg-green-100' : 
                    isLicenseValid === false ? 'text-red-700 bg-red-100' : 'text-yellow-700 bg-yellow-100'
                  }`}>
                    {isLicenseValid === true ? 'Geçerli' : 
                     isLicenseValid === false ? 'Geçersiz' : 'Kontrol...'}
                  </span>
                </div>
                {licenseExpiresAt && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Süre:</span>
                    <span className="text-slate-900 font-bold text-xs">{timeRemaining}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 text-center p-2 z-10">
        <div className="bg-gradient-to-r from-slate-100/90 to-blue-100/90 rounded-lg p-2 backdrop-blur-sm border border-white/30 shadow-lg mx-auto max-w-md">
          <div className="text-sm text-slate-700">
            <div className="font-bold bg-gradient-to-r from-slate-800 to-blue-800 bg-clip-text text-transparent">
              GAF Dijital Çözümler - info@gafdigi.com
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;