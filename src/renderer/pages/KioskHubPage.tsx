import React, { useState, useEffect } from 'react';
import { TouchButton } from '../components/TouchButton';
import { TouchCard } from '../components/SwipeableCard';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { PavoControl } from '../components/PavoControl';
import { PrinterControl } from '../components/PrinterControl';
import '../styles/touch.css';

interface HubModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route?: string;
  action?: () => void;
  badge?: string | number;
  isActive: boolean;
  metrics?: {
    label: string;
    value: string | number;
  }[];
}

export const KioskHubPage: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPavoControl, setShowPavoControl] = useState(false);
  const [showPrinterControl, setShowPrinterControl] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    loadDashboardStats();

    const interval = setInterval(loadDashboardStats, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const loadDashboardStats = async () => {
    try {
      const stats = await window.electronAPI.database.getDashboardStats();
      setDashboardStats(stats);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
      setIsLoading(false);
    }
  };

  const handleModuleClick = (module: HubModule) => {
    setSelectedModule(module.id);
    
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }

    if (module.route) {
      window.location.hash = module.route;
    } else if (module.action) {
      module.action();
    }
  };

  const handleBackToMonitor = () => {
    window.location.hash = '/kiosk';
  };

  const handleSync = async () => {
    try {
      await window.electronAPI.sync.syncNow();
      loadDashboardStats();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const modules: HubModule[] = [
    {
      id: 'pavo',
      title: 'Pavo Yönetimi',
      description: 'Ödeme cihazı entegrasyonu',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/>
        </svg>
      ),
      color: 'from-teal-500 to-teal-600',
      action: () => setShowPavoControl(true),
      isActive: true,
      metrics: []
    },
    {
      id: 'printer',
      title: 'Yazıcı Yönetimi',
      description: 'Fiş yazıcı konfigürasyonu',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
        </svg>
      ),
      color: 'from-amber-500 to-amber-600',
      action: () => setShowPrinterControl(true),
      isActive: true,
      metrics: []
    },
    {
      id: 'inventory',
      title: 'Envanter Yönetimi',
      description: 'Stok takibi ve ürün yönetimi',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4l16-.02V7z"/>
        </svg>
      ),
      color: 'from-purple-500 to-purple-600',
      isActive: true,
      metrics: [
        { label: 'Toplam Ürün', value: dashboardStats?.totalProducts || 0 },
        { label: 'Kritik Stok', value: 8 }
      ]
    },
    {
      id: 'sales',
      title: 'Satış İşlemleri',
      description: 'POS ve ödeme yönetimi',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
        </svg>
      ),
      color: 'from-blue-500 to-blue-600',
      isActive: true,
      badge: dashboardStats?.todayTransactions || 0,
      metrics: [
        { label: "Bugünkü Satış", value: `₺${dashboardStats?.todayRevenue || 0}` },
        { label: 'İşlem', value: dashboardStats?.todayTransactions || 0 }
      ]
    },
    {
      id: 'customers',
      title: 'Müşteri Yönetimi',
      description: 'Müşteri bilgileri ve sadakat programı',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
        </svg>
      ),
      color: 'from-green-500 to-green-600',
      isActive: true,
      metrics: [
        { label: 'Toplam Müşteri', value: dashboardStats?.activeCustomers || 0 },
        { label: 'Yeni', value: 12 }
      ]
    },
    {
      id: 'reports',
      title: 'Raporlama',
      description: 'Detaylı analizler ve raporlar',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
        </svg>
      ),
      color: 'from-orange-500 to-orange-600',
      isActive: true,
      metrics: [
        { label: 'Haftalık', value: '+23%' },
        { label: 'Aylık', value: '+45%' }
      ]
    },
    {
      id: 'settings',
      title: 'Sistem Ayarları',
      description: 'Konfigürasyon ve yönetim',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
        </svg>
      ),
      color: 'from-gray-500 to-gray-600',
      isActive: true,
      metrics: []
    },
    {
      id: 'integrations',
      title: 'Entegrasyonlar',
      description: 'Harici sistem bağlantıları',
      icon: (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M16 20h4v-4h-4v4zM16 8h4V4h-4v4zm-8 12h4v-4H8v4zM4 16h4v-4H4v4zm0-8h4V4H4v4zm8 0h4V4h-4v4zm0 8h4v-4h-4v4zM8 8h4V4H8v4z"/>
        </svg>
      ),
      color: 'from-indigo-500 to-indigo-600',
      isActive: true,
      badge: dashboardStats?.pendingSync || 0,
      metrics: [
        { label: 'Bağlı', value: 3 },
        { label: 'Bekleyen', value: dashboardStats?.pendingSync || 0 }
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-400 text-xl">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-4">
              <TouchButton
                onClick={handleBackToMonitor}
                variant="secondary"
                size="small"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                }
              >
                Monitör
              </TouchButton>
              
              <div className="border-l border-gray-600 pl-4">
                <h1 className="text-2xl font-bold text-white">Yönetim HUB</h1>
                <p className="text-sm text-gray-400">Merkezi Kontrol Paneli</p>
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center gap-6">
              <ConnectionStatus className="bg-gray-700/50" showDetails={false} />
              
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                <span className="text-sm font-medium text-gray-300">
                  {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                </span>
                {dashboardStats?.pendingSync > 0 && (
                  <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {dashboardStats.pendingSync} bekliyor
                  </span>
                )}
              </div>

              <TouchButton
                onClick={handleSync}
                variant="primary"
                size="small"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
                disabled={!isOnline}
              >
                Senkronize
              </TouchButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-8">
        {/* Quick Stats Bar */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Günlük Satış</span>
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">₺{dashboardStats?.todayRevenue || 0}</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">İşlem Sayısı</span>
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{dashboardStats?.todayTransactions || 0}</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Ürün Sayısı</span>
              <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{dashboardStats?.totalProducts || 0}</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Müşteriler</span>
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{dashboardStats?.activeCustomers || 0}</p>
          </div>
          
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Bekleyen Sync</span>
              <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-white">{dashboardStats?.pendingSync || 0}</p>
          </div>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-4 gap-6">
          {modules.map((module) => (
            <TouchCard
              key={module.id}
              onClick={() => handleModuleClick(module)}
              className={`
                relative overflow-hidden bg-gray-800/50 backdrop-blur-sm 
                border border-gray-700 hover:border-gray-600
                transition-all duration-300 hover:scale-[1.02]
                ${selectedModule === module.id ? 'ring-2 ring-blue-500' : ''}
                ${!module.isActive ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              padding="large"
            >
              {/* Background Gradient */}
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${module.color} opacity-10 rounded-full -mr-16 -mt-16`} />
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-16 h-16 bg-gradient-to-br ${module.color} rounded-2xl flex items-center justify-center text-white`}>
                    {module.icon}
                  </div>
                  
                  {module.badge !== undefined && Number(module.badge) > 0 && (
                    <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      {module.badge}
                    </span>
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">
                  {module.title}
                </h3>
                
                <p className="text-sm text-gray-400 mb-4">
                  {module.description}
                </p>

                {module.metrics && module.metrics.length > 0 && (
                  <div className="flex gap-4 pt-4 border-t border-gray-700">
                    {module.metrics.map((metric, idx) => (
                      <div key={idx}>
                        <p className="text-xs text-gray-500">{metric.label}</p>
                        <p className="text-lg font-semibold text-white">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TouchCard>
          ))}
        </div>

        {/* Quick Actions Bar */}
        <div className="mt-8 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Hızlı İşlemler</h3>
          <div className="flex gap-4">
            <TouchButton
              onClick={() => window.electronAPI.database.getDashboardStats().then(setDashboardStats)}
              variant="secondary"
              size="medium"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Verileri Yenile
            </TouchButton>
            
            <TouchButton
              onClick={() => window.electronAPI.app.openDevTools()}
              variant="secondary"
              size="medium"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Sistem Ayarları
            </TouchButton>
            
            <TouchButton
              onClick={() => window.electronAPI.printer.printTest()}
              variant="secondary"
              size="medium"
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              }
            >
              Yazıcı Test
            </TouchButton>
          </div>
        </div>
      </main>

      {/* Pavo Control Modal */}
      {showPavoControl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Pavo Ödeme Cihazı Yönetimi</h2>
              <TouchButton
                onClick={() => setShowPavoControl(false)}
                variant="secondary"
                size="small"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              >
                Kapat
              </TouchButton>
            </div>
            <div className="p-4">
              <PavoControl />
            </div>
          </div>
        </div>
      )}

      {/* Printer Control Modal */}
      {showPrinterControl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Yazıcı Yönetimi</h2>
              <TouchButton
                onClick={() => setShowPrinterControl(false)}
                variant="secondary"
                size="small"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                }
              >
                Kapat
              </TouchButton>
            </div>
            <div className="p-4">
              <PrinterControl />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};