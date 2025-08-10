import React, { useState, useEffect } from 'react';
import { Shield, Key, Cpu, Monitor, Wifi, AlertCircle } from 'lucide-react';

export const LicenseInputPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [hardwareInfo, setHardwareInfo] = useState<any>(null);
  const [showHardwareInfo, setShowHardwareInfo] = useState(false);

  const handleVerifyLicense = async () => {
    const keyToUse = apiKey;
    
    if (!keyToUse.trim()) {
      setError('Lütfen bir API anahtarı girin');
      return;
    }

    if (!window.electronAPI || !window.electronAPI.license) {
      setError('Uygulama Electron ortamında çalışmıyor');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.license.verify(keyToUse);
      
      if (result.valid) {
        await window.electronAPI.license.saveKey(keyToUse);
      } else {
        setError(result.message || 'Geçersiz API anahtarı');
      }
    } catch (error) {
      console.error('License verification failed:', error);
      setError('Lisans doğrulanamadı. Lütfen bağlantınızı kontrol edip tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      try {
        if (window.electronAPI && window.electronAPI.license) {
          // Get hardware info
          const hwInfo = await window.electronAPI.license.getHardwareInfo();
          setHardwareInfo(hwInfo);

          // Check saved key but DON'T auto-verify
          const savedKey = await window.electronAPI.license.getSavedKey();
          if (savedKey) {
            setApiKey(savedKey);
            // Removed auto-verification - user must click button
          }
        } else {
          console.warn('electronAPI not available - running in browser context');
        }
      } catch (error) {
        console.error('Initialization failed:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyLicense();
  };

  const handleKeyInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (error) setError(null);
  };

  if (isInitializing) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="mt-3 text-sm text-white/70">Sistem başlatılıyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl shadow-xl mb-3">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Kiosk Software
          </h1>
          <p className="text-purple-200 text-sm">
            Lisans anahtarınızı girerek başlayın
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white/10 backdrop-blur-xl rounded-xl shadow-xl p-4 border border-white/20">
          {error && (
            <div className="mb-3 p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-200 text-xs">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="apiKey" className="flex items-center gap-2 text-sm font-medium text-purple-200 mb-2">
                <Key className="w-4 h-4" />
                API Anahtarı
              </label>
              <input
                id="apiKey"
                type="text"
                value={apiKey}
                onChange={handleKeyInput}
                placeholder="sk_xxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono"
                disabled={isLoading}
                autoFocus
              />
              <p className="mt-1 text-xs text-purple-300/60">
                API anahtarınız &quot;sk_&quot; ile başlamalıdır
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !apiKey.trim()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white text-sm font-semibold rounded-lg shadow-lg hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Doğrulanıyor...
                </span>
              ) : (
                'Lisansı Doğrula'
              )}
            </button>
          </form>

          {/* Hardware Info Toggle */}
          <button
            onClick={() => setShowHardwareInfo(!showHardwareInfo)}
            className="w-full mt-3 py-1.5 text-purple-300 text-xs hover:text-purple-200 transition-colors flex items-center justify-center gap-2"
          >
            <Cpu className="w-3 h-3" />
            Sistem Bilgileri {showHardwareInfo ? '▲' : '▼'}
          </button>

          {/* Hardware Info Display */}
          {showHardwareInfo && hardwareInfo && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Monitor className="w-3 h-3 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-purple-300 font-medium">Cihaz ID</p>
                    <p className="text-white/60 text-xs font-mono break-all">
                      {hardwareInfo.hwid?.substring(0, 24)}...
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Cpu className="w-3 h-3 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-purple-300 font-medium">İşlemci</p>
                    <p className="text-white/60 text-xs">{hardwareInfo.cpuModel}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Wifi className="w-3 h-3 text-purple-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-purple-300 font-medium">Sistem</p>
                    <p className="text-white/60 text-xs">
                      {hardwareInfo.hostname} • {hardwareInfo.platform} {hardwareInfo.arch}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-3 text-center">
          <p className="text-purple-300/60 text-xs">
            Yardıma mı ihtiyacınız var?
          </p>
          <a href="#" className="text-purple-400 hover:text-purple-300 text-xs font-medium transition-colors">
            Destek ile iletişime geçin
          </a>
        </div>
      </div>
    </div>
  );
};