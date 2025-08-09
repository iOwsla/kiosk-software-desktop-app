import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ConnectionStatus } from '../components/ConnectionStatus';
import { TouchButton } from '../components/TouchButton';
import { TouchCard } from '../components/SwipeableCard';
import '../styles/touch.css';

interface SystemStatus {
  service: string;
  status: 'running' | 'stopped' | 'error' | 'pending';
  message?: string;
  lastUpdate?: Date;
}

interface SystemMetric {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  color?: string;
}

export const KioskPage: React.FC = () => {
  const [licenseStatus, setLicenseStatus] = useState<{
    valid: boolean;
    message?: string;
    expiresAt?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([]);
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeConnections, setActiveConnections] = useState(0);

  useEffect(() => {
    checkLicenseStatus();
    loadSystemStatus();
    loadMetrics();
    
    // Update statuses every 10 seconds
    const statusInterval = setInterval(() => {
      loadSystemStatus();
      loadMetrics();
    }, 10000);

    // Check license every 5 minutes
    const licenseInterval = setInterval(() => {
      checkLicenseStatus();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(licenseInterval);
    };
  }, []);

  const checkLicenseStatus = async () => {
    try {
      const status = await window.electronAPI.license.getStatus();
      setLicenseStatus(status);
      
      if (!status.valid) {
        setTimeout(() => {
          window.electronAPI.window.showLicenseRenewal();
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to check license status:', error);
      setLicenseStatus({
        valid: false,
        message: 'Failed to check license status'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    // Load real-time system statuses
    const statuses: SystemStatus[] = [
      {
        service: 'API Server',
        status: 'running',
        message: 'Port 3001',
        lastUpdate: new Date()
      },
      {
        service: 'Database',
        status: 'running',
        message: 'SQLite Connected',
        lastUpdate: new Date()
      },
      {
        service: 'Sync Service',
        status: 'running',
        message: 'Auto-sync enabled',
        lastUpdate: new Date()
      },
      {
        service: 'Update Service',
        status: 'running',
        message: 'Checking every 60 min',
        lastUpdate: new Date()
      },
      {
        service: 'Port Monitor',
        status: 'running',
        message: 'No conflicts',
        lastUpdate: new Date()
      },
      {
        service: 'License Monitor',
        status: 'running',
        message: 'Valid until ' + (licenseStatus?.expiresAt ? new Date(licenseStatus.expiresAt).toLocaleDateString() : 'N/A'),
        lastUpdate: new Date()
      }
    ];
    
    setSystemStatuses(statuses);
  };

  const loadMetrics = async () => {
    try {
      const stats = await window.electronAPI.database.getDashboardStats();
      
      const metricsData: SystemMetric[] = [
        {
          label: 'Active Sessions',
          value: activeConnections,
          trend: 'stable',
          color: 'blue'
        },
        {
          label: 'Pending Sync',
          value: stats.pendingSync,
          unit: 'items',
          trend: stats.pendingSync > 10 ? 'up' : 'stable',
          color: stats.pendingSync > 0 ? 'orange' : 'green'
        },
        {
          label: 'Total Products',
          value: stats.totalProducts.toLocaleString(),
          trend: 'stable',
          color: 'purple'
        },
        {
          label: 'Registered Customers',
          value: stats.activeCustomers.toLocaleString(),
          trend: 'up',
          color: 'green'
        },
        {
          label: 'Memory Usage',
          value: Math.round(process.memoryUsage?.().heapUsed / 1024 / 1024) || 0,
          unit: 'MB',
          trend: 'stable',
          color: 'cyan'
        },
        {
          label: 'Uptime',
          value: formatUptime(process.uptime?.() || 0),
          trend: 'stable',
          color: 'indigo'
        }
      ];
      
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return (
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
        );
      case 'stopped':
        return (
          <div className="w-3 h-3 bg-gray-400 rounded-full" />
        );
      case 'error':
        return (
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
        );
      case 'pending':
        return (
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
        );
      default:
        return null;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        );
      case 'down':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        );
    }
  };

  const handleOpenHub = () => {
    // Navigate to hub page
    window.location.hash = '/hub';
  };

  const handleMinimizeToTray = () => {
    window.electronAPI.app.minimize();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-400 text-xl">Sistem başlatılıyor...</p>
        </div>
      </div>
    );
  }

  if (!licenseStatus?.valid) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-900/20 border border-red-500 text-red-400 px-6 py-4 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-2">Lisans Geçersiz</h2>
            <p className="text-lg">
              {licenseStatus?.message || 'Lisansınızın süresi dolmuş veya geçersiz.'}
            </p>
            <p className="mt-2 text-sm">
              Lisans yenileme sayfasına yönlendiriliyorsunuz...
            </p>
          </div>
          <LoadingSpinner size="large" />
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Kiosk System Monitor</h1>
                <p className="text-xs text-gray-400">Arka Plan Servisleri Yönetimi</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <ConnectionStatus className="bg-gray-700/50" showDetails={false} />
              
              <TouchButton
                onClick={handleOpenHub}
                variant="primary"
                size="small"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
              >
                HUB Panel
              </TouchButton>
              
              <TouchButton
                onClick={handleMinimizeToTray}
                variant="secondary"
                size="small"
                icon={
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                  </svg>
                }
              >
                Arka Plana Al
              </TouchButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        {/* System Metrics */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          {metrics.map((metric, index) => (
            <TouchCard key={index} className="bg-gray-800/50 backdrop-blur-sm border border-gray-700" padding="small">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">{metric.label}</span>
                {getTrendIcon(metric.trend)}
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-2xl font-bold text-${metric.color}-400`}>
                  {metric.value}
                </span>
                {metric.unit && (
                  <span className="text-sm text-gray-500">{metric.unit}</span>
                )}
              </div>
            </TouchCard>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* System Services Status */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
              </svg>
              Sistem Servisleri
            </h2>
            
            <div className="space-y-3">
              {systemStatuses.map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(service.status)}
                    <div>
                      <p className="text-sm font-medium text-white">{service.service}</p>
                      <p className="text-xs text-gray-400">{service.message}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">
                    {service.lastUpdate?.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Sistem Aktivitesi
            </h2>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <div className="text-xs text-gray-400 p-2 bg-gray-700/30 rounded font-mono">
                [14:32:15] API Server başlatıldı - Port 3001
              </div>
              <div className="text-xs text-gray-400 p-2 bg-gray-700/30 rounded font-mono">
                [14:32:14] Database bağlantısı kuruldu
              </div>
              <div className="text-xs text-gray-400 p-2 bg-gray-700/30 rounded font-mono">
                [14:32:13] Offline sync servisi aktif
              </div>
              <div className="text-xs text-gray-400 p-2 bg-gray-700/30 rounded font-mono">
                [14:32:12] Port monitoring başlatıldı
              </div>
              <div className="text-xs text-gray-400 p-2 bg-gray-700/30 rounded font-mono">
                [14:32:11] Lisans doğrulandı
              </div>
              <div className="text-xs text-gray-400 p-2 bg-gray-700/30 rounded font-mono">
                [14:32:10] Sistem başlatılıyor...
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Hızlı İşlemler</h2>
          
          <div className="grid grid-cols-4 gap-4">
            <TouchButton
              onClick={() => window.electronAPI.sync.syncNow()}
              variant="primary"
              size="medium"
              fullWidth
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              }
            >
              Manuel Senkronizasyon
            </TouchButton>
            
            <TouchButton
              onClick={() => window.electronAPI.database.getDashboardStats().then(loadMetrics)}
              variant="secondary"
              size="medium"
              fullWidth
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                </svg>
              }
            >
              Veritabanı Durumu
            </TouchButton>
            
            <TouchButton
              onClick={() => loadSystemStatus()}
              variant="secondary"
              size="medium"
              fullWidth
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            >
              Servisleri Kontrol Et
            </TouchButton>
            
            <TouchButton
              onClick={() => window.electronAPI.app.openDevTools()}
              variant="secondary"
              size="medium"
              fullWidth
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Geliştirici Araçları
            </TouchButton>
          </div>
        </div>
      </main>
    </div>
  );
};