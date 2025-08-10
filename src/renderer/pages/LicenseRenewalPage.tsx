import React, { useState, useEffect } from 'react';
import { AlertTriangle, Key, RefreshCw, ArrowLeft, Clock, Shield, Info } from 'lucide-react';

export const LicenseRenewalPage: React.FC = () => {
  const [newApiKey, setNewApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        // Get hardware info
        const hwInfo = await window.electronAPI.license.getHardwareInfo();
        setHardwareInfo(hwInfo);

        // Get current API key
        const savedKey = await window.electronAPI.license.getSavedKey();
        if (savedKey) {
          const masked = savedKey.length > 12 
            ? `${savedKey.substring(0, 8)}...${savedKey.substring(savedKey.length - 4)}`
            : savedKey.substring(0, 8) + '...';
          setCurrentApiKey(masked);
        }
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    };

    initialize();
  }, []);

  const handleRenewLicense = async () => {
    if (!newApiKey.trim()) {
      setError('Lütfen yeni bir API anahtarı girin');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.license.verify(newApiKey);
      
      if (result.valid) {
        await window.electronAPI.license.saveKey(newApiKey);
        setSuccess('Lisans başarıyla yenilendi! Yönlendiriliyorsunuz...');
        
        setTimeout(() => {
          window.electronAPI.window.showKiosk();
        }, 2000);
      } else {
        setError(result.message || 'Geçersiz API anahtarı');
      }
    } catch (error) {
      console.error('License renewal failed:', error);
      setError('Lisans yenilenemedi. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRenewLicense();
  };

  const handleKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewApiKey(e.target.value);
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleBackToInput = () => {
    window.electronAPI.window.showLicenseInput();
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-orange-900 to-red-900 p-3">
      <div className="w-full max-w-md">
        {/* Warning Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl shadow-xl mb-2 animate-pulse">
            <AlertTriangle className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white mb-1">
            Lisans Yenileme Gerekli
          </h1>
          <p className="text-orange-200 text-xs">
            Mevcut lisansınızın süresi dolmuş veya geçersiz
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl shadow-xl p-3 border border-white/20">
          {/* Current License Info */}
          {currentApiKey && (
            <div className="mb-3 p-2 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-1">
                <span className="text-orange-300 text-xs font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Mevcut Lisans
                </span>
                <span className="px-2 py-0.5 bg-red-500/20 text-red-300 text-xs rounded-full">
                  Süresi Dolmuş
                </span>
              </div>
              <p className="font-mono text-white/60 text-xs">{currentApiKey}</p>
            </div>
          )}

          {/* Alert Messages */}
          {error && (
            <div className="mb-3 p-2 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-xs">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg flex items-start gap-2">
              <Shield className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
              <p className="text-green-200 text-xs">{success}</p>
            </div>
          )}

          {/* Renewal Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="newApiKey" className="flex items-center gap-2 text-xs font-medium text-orange-200 mb-2">
                <Key className="w-3 h-3" />
                Yeni API Anahtarı
              </label>
              <input
                id="newApiKey"
                type="text"
                value={newApiKey}
                onChange={handleKeyInput}
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all font-mono"
                disabled={isLoading || !!success}
                autoFocus
              />
              <p className="mt-1 text-xs text-orange-300/60">
                API anahtarınız "sk_" ile başlamalıdır
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="submit"
                disabled={isLoading || !newApiKey.trim() || !!success}
                className="w-full py-2 px-3 bg-gradient-to-r from-orange-600 to-red-600 text-white text-sm font-semibold rounded-lg shadow-lg hover:from-orange-700 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                    Lisans Yenileniyor...
                  </span>
                ) : success ? (
                  <span className="flex items-center justify-center">
                    <Shield className="w-4 h-4 mr-1" />
                    Lisans Yenilendi
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Lisansı Yenile
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={handleBackToInput}
                disabled={isLoading}
                className="w-full py-2 px-3 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg border border-white/20 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-4 h-4" />
                Lisans Girişine Dön
              </button>
            </div>
          </form>

          {/* Device Info */}
          {hardwareInfo && (
            <div className="mt-3 p-2 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center gap-1 mb-1">
                <Info className="w-3 h-3 text-orange-400" />
                <span className="text-orange-300 text-xs font-medium">Cihaz Bilgileri</span>
              </div>
              <p className="text-white/50 text-xs font-mono">
                ID: {hardwareInfo.hwid?.substring(0, 16)}...
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {hardwareInfo.hostname} • {hardwareInfo.platform}
              </p>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-3 bg-white/5 backdrop-blur-xl rounded-lg p-2 border border-white/10">
          <h3 className="text-xs font-medium text-orange-300 mb-1">Yardıma mı ihtiyacınız var?</h3>
          <ul className="text-xs text-white/60 space-y-0.5">
            <li>• Sistem yöneticinizle iletişime geçin</li>
            <li>• Lisans yenileme e-postanızı kontrol edin</li>
            <li>• İnternet bağlantınızı doğrulayın</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="mt-2 text-center">
          <p className="text-white/40 text-xs">
            Uygulamayı kullanmaya devam etmek için lisans doğrulaması gereklidir
          </p>
        </div>
      </div>
    </div>
  );
};