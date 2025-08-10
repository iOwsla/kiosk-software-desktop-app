import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import { CheckCircle2, Package2, Shield, AlertCircle, Printer, CreditCard, Settings, Store, Download, RefreshCw, Sparkles, Check, X } from 'lucide-react';
import { LicenseInputPage } from './LicenseInputPage';
import { LoadingSpinner } from '../components/LoadingSpinner';

const HomePage: React.FC = () => {
  const [version, setVersion] = useState<string>('');
  const [isLicenseValid, setIsLicenseValid] = useState<boolean | null>(null);
  const [isCheckingLicense, setIsCheckingLicense] = useState(true);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<any>(null);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  useEffect(() => {
    // Version bilgisini al
    window.electronAPI.getAppVersion().then((appVersion) => {
      setVersion(appVersion);
    }).catch((error) => {
      console.error('Version bilgisi alınamadı:', error);
      setVersion('1.0.9');
    });

    // Lisans durumunu kontrol et
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    try {
      setIsCheckingLicense(true);
      setLicenseError(null);
      
      // Önce kaydedilmiş API key var mı kontrol et
      if (window.electronAPI && window.electronAPI.license) {
        const savedKey = await window.electronAPI.license.getSavedKey();
        
        if (savedKey) {
          // Kaydedilmiş key varsa doğrula
          const result = await window.electronAPI.license.verify(savedKey);
          setIsLicenseValid(result.valid);
          
          if (!result.valid) {
            setLicenseError(result.message || 'Lisans geçersiz');
          }
        } else {
          // Kaydedilmiş key yoksa
          setIsLicenseValid(false);
        }
      } else {
        // Electron API mevcut değilse
        setIsLicenseValid(false);
        setLicenseError('Uygulama Electron ortamında çalışmıyor');
      }
    } catch (error) {
      console.error('Lisans kontrolü başarısız:', error);
      setIsLicenseValid(false);
      setLicenseError('Lisans kontrolü sırasında bir hata oluştu');
    } finally {
      setIsCheckingLicense(false);
    }
  };

  const handleLicenseVerified = () => {
    // Lisans doğrulandıktan sonra sayfayı yenile
    setIsLicenseValid(true);
    setLicenseError(null);
  };

  const checkForUpdates = async () => {
    setIsCheckingUpdate(true);
    try {
      // Simüle edilmiş güncelleme kontrolü
      // Gerçek uygulamada window.electronAPI.update.check() gibi bir çağrı yapılabilir
      setTimeout(() => {
        setUpdateAvailable(true);
        setUpdateInfo({
          version: '1.1.0',
          releaseDate: '2024-01-15',
          size: '45 MB',
          notes: [
            'Yeni ödeme sistemi entegrasyonu',
            'Performans iyileştirmeleri',
            'Hata düzeltmeleri'
          ]
        });
        setIsCheckingUpdate(false);
      }, 2000);
    } catch (error) {
      console.error('Güncelleme kontrolü başarısız:', error);
      setIsCheckingUpdate(false);
    }
  };

  const startDownload = () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    
    // Simüle edilmiş indirme işlemi
    const interval = setInterval(() => {
      setDownloadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDownloading(false);
          // Güncelleme tamamlandı bildirimi
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  // Lisans kontrolü yapılıyor
  if (isCheckingLicense) {
    return (
      <div className="h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-2 text-sm text-muted-foreground">Lisans kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  // Lisans geçersizse veya yoksa lisans giriş sayfasını göster
  if (!isLicenseValid) {
    return <LicenseInputPage />;
  }

  // Lisans geçerliyse ana sayfayı göster
  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col">
      {/* Güncelleme Bildirimi */}
      {updateAvailable && !isDownloading && (
        <div className="bg-gradient-to-r from-green-600/20 to-blue-600/20 border-b border-white/20 backdrop-blur-sm">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
              <div>
                <p className="text-white font-medium text-sm">Yeni güncelleme mevcut! v{updateInfo?.version}</p>
                <p className="text-white/70 text-xs">Boyut: {updateInfo?.size} • Yayın: {updateInfo?.releaseDate}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={startDownload}
              >
                <Download className="w-4 h-4 mr-1" />
                İndir
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:text-white"
                onClick={() => setUpdateAvailable(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* İndirme İlerlemesi */}
      {isDownloading && (
        <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/20 backdrop-blur-sm">
          <div className="px-6 py-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white text-sm font-medium">Güncelleme indiriliyor...</span>
              <span className="text-white/70 text-sm">{downloadProgress}%</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Ana İçerik */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <Card className="border shadow-2xl bg-white/10 backdrop-blur-xl border-white/20">
            {/* Başlık */}
            <CardHeader className="text-center pb-4 relative">
              <div className="absolute top-4 right-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white/60 hover:text-white hover:bg-white/10"
                  onClick={checkForUpdates}
                  disabled={isCheckingUpdate}
                >
                  {isCheckingUpdate ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span className="ml-1 text-xs">Güncelleme Kontrol</span>
                </Button>
              </div>
              
              <div className="mx-auto mb-3 w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                <Store className="w-7 h-7 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Gaf Digi
              </CardTitle>
              <CardDescription className="text-sm mt-1 text-purple-200">
                Kiosk Yönetim Sistemi
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4 px-6">
              {/* Durum Bilgisi */}
              <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-green-300 text-sm font-medium">Sistem Aktif</span>
                </div>
                <Badge className="bg-white/10 text-white text-xs">
                  v{version || '1.0.9'}
                </Badge>
              </div>

              {/* Yönetim Butonları - 2x2 Grid */}
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/20 hover:bg-white/10 text-white transition-all hover:scale-105"
                  onClick={() => console.log('Yazıcı Yönetimi')}
                >
                  <Printer className="w-6 h-6 text-purple-400" />
                  <span className="text-xs font-medium">Yazıcı Yönetimi</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/20 hover:bg-white/10 text-white transition-all hover:scale-105"
                  onClick={() => console.log('Ödeme Entegrasyonu')}
                >
                  <CreditCard className="w-6 h-6 text-green-400" />
                  <span className="text-xs font-medium">Ödeme Sistemi</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/20 hover:bg-white/10 text-white transition-all hover:scale-105"
                  onClick={() => console.log('Genel Ayarlar')}
                >
                  <Settings className="w-6 h-6 text-blue-400" />
                  <span className="text-xs font-medium">Genel Ayarlar</span>
                </Button>

                <Button 
                  variant="outline" 
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-white/5 border-white/20 hover:bg-white/10 text-white transition-all hover:scale-105"
                  onClick={() => console.log('Mağaza Yönetimi')}
                >
                  <Store className="w-6 h-6 text-orange-400" />
                  <span className="text-xs font-medium">Mağaza Yönetimi</span>
                </Button>
              </div>

              {/* Alt Bilgi Kartları */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-300">Lisans Durumu</span>
                    <Check className="w-3 h-3 text-green-400" />
                  </div>
                  <p className="text-white font-medium text-sm">Aktif</p>
                  <p className="text-white/50 text-xs">Süresiz lisans</p>
                </div>

                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-purple-300">Sistem Sürümü</span>
                    <Package2 className="w-3 h-3 text-blue-400" />
                  </div>
                  <p className="text-white font-medium text-sm">v{version || '1.0.9'}</p>
                  <p className="text-white/50 text-xs">Kararlı sürüm</p>
                </div>
              </div>

              {/* Güncelleme Notları */}
              {updateAvailable && updateInfo && (
                <div className="p-3 bg-gradient-to-r from-green-600/10 to-blue-600/10 rounded-lg border border-white/10">
                  <h4 className="text-white font-medium text-sm mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    Güncelleme Detayları
                  </h4>
                  <ul className="space-y-1">
                    {updateInfo.notes.map((note: string, index: number) => (
                      <li key={index} className="text-white/70 text-xs flex items-start gap-2">
                        <span className="text-green-400 mt-0.5">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="pt-4 pb-3">
              <p className="text-xs text-purple-300/60 text-center w-full">
                © 2024 Gaf Digi. Tüm hakları saklıdır.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;