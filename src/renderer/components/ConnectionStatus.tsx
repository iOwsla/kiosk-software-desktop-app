import React, { useState, useEffect } from 'react';
import { TouchButton } from './TouchButton';
import '../styles/touch.css';

export interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  onSyncClick?: () => void;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  className = '',
  showDetails = true,
  onSyncClick
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [connectionSpeed, setConnectionSpeed] = useState<'slow' | 'medium' | 'fast' | null>(null);

  useEffect(() => {
    // Monitor online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectionSpeed();
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setConnectionSpeed(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    if (isOnline) {
      checkConnectionSpeed();
    }

    // Check sync status periodically
    const interval = setInterval(() => {
      checkSyncStatus();
    }, 30000); // Every 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const checkConnectionSpeed = async () => {
    try {
      const startTime = performance.now();
      
      // Try to fetch a small resource
      await fetch('/health', { method: 'HEAD' });
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (responseTime < 100) {
        setConnectionSpeed('fast');
      } else if (responseTime < 300) {
        setConnectionSpeed('medium');
      } else {
        setConnectionSpeed('slow');
      }
    } catch {
      setConnectionSpeed('slow');
    }
  };

  const checkSyncStatus = async () => {
    try {
      // TODO: Get actual sync status from electron API
      const status = await window.electronAPI.sync.getStatus();
      if (status) {
        setPendingCount(status.pendingItems || 0);
        setLastSyncTime(status.lastSync ? new Date(status.lastSync) : null);
      }
    } catch (error) {
      console.error('Failed to check sync status:', error);
    }
  };

  const handleSync = async () => {
    if (!isOnline || syncStatus === 'syncing') return;

    setSyncStatus('syncing');
    
    try {
      if (onSyncClick) {
        await onSyncClick();
      } else {
        // TODO: Trigger sync via electron API
        await window.electronAPI.sync.syncNow();
      }
      
      setSyncStatus('success');
      setPendingCount(0);
      setLastSyncTime(new Date());
      
      setTimeout(() => {
        setSyncStatus('idle');
      }, 3000);
    } catch (error) {
      setSyncStatus('error');
      console.error('Sync failed:', error);
      
      setTimeout(() => {
        setSyncStatus('idle');
      }, 5000);
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (syncStatus === 'syncing') return 'bg-yellow-500';
    if (syncStatus === 'error') return 'bg-red-500';
    if (syncStatus === 'success') return 'bg-green-500';
    if (pendingCount > 0) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getStatusText = () => {
    if (!isOnline) return 'Çevrimdışı';
    if (syncStatus === 'syncing') return 'Senkronize ediliyor...';
    if (syncStatus === 'error') return 'Senkronizasyon hatası';
    if (syncStatus === 'success') return 'Senkronize edildi';
    if (pendingCount > 0) return `${pendingCount} bekleyen işlem`;
    return 'Çevrimiçi';
  };

  const getConnectionIcon = () => {
    if (!isOnline) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M3.27 3L2 4.27l2.05 2.06C2.78 7.6 2 9.21 2 11c0 3.07 2.13 5.64 5 6.31V19H5v2h14v-2h-2v-1.69c.51-.1 1-.26 1.47-.48l2.26 2.27L22 18l-18.73-18zM7 11c0-1.48.65-2.81 1.67-3.73l7.06 7.06C14.81 15.35 13.48 16 12 16c-2.76 0-5-2.24-5-5zm10-1.69V7h2c0-2.76-4.03-5-9-5-3.82 0-7.09 1.34-8.52 3.24l1.48 1.48C4.07 5.59 5.82 5 7.7 5c3.8 0 7.3 2 7.3 4v2.31c0 .52-.17 1.02-.48 1.44l1.47 1.47c.63-.8.99-1.8.99-2.91z"/>
        </svg>
      );
    }

    if (connectionSpeed === 'fast') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 9l2-2v8H1V9zm4-4l2-2v12H5V5zm4-4l2-2v16H9V1zm4 0l2 2v14h-2V1zm4 4l2 2v10h-2V5zm4 4l2 2v6h-2V9z"/>
        </svg>
      );
    }

    if (connectionSpeed === 'medium') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M1 9l2-2v8H1V9zm8-8l2-2v16H9V1zm4 0l2 2v14h-2V1zm4 4l2 2v10h-2V5z" opacity="0.3"/>
          <path d="M1 9l2-2v8H1V9zm4-4l2-2v12H5V5zm4-4l2-2v16H9V1z"/>
        </svg>
      );
    }

    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M1 9l2-2v8H1V9z" opacity="0.3"/>
        <path d="M1 9l2-2v8H1V9zm4-4l2-2v12H5V5z"/>
      </svg>
    );
  };

  const formatLastSyncTime = () => {
    if (!lastSyncTime) return 'Henüz senkronize edilmedi';
    
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} gün önce`;
    if (hours > 0) return `${hours} saat önce`;
    if (minutes > 0) return `${minutes} dakika önce`;
    return 'Az önce';
  };

  return (
    <div className={`flex items-center gap-4 p-4 bg-white rounded-xl shadow-lg ${className}`}>
      {/* Status Indicator */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`w-4 h-4 rounded-full ${getStatusColor()} ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
          {pendingCount > 0 && isOnline && (
            <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {pendingCount > 9 ? '9+' : pendingCount}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {getConnectionIcon()}
          <span className="font-medium text-gray-700">
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="flex-1 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <div>Son senkronizasyon: {formatLastSyncTime()}</div>
            {connectionSpeed && isOnline && (
              <div className="flex items-center gap-1 mt-1">
                <span>Bağlantı hızı:</span>
                <span className={`font-medium ${
                  connectionSpeed === 'fast' ? 'text-green-600' :
                  connectionSpeed === 'medium' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {connectionSpeed === 'fast' ? 'Hızlı' :
                   connectionSpeed === 'medium' ? 'Orta' : 'Yavaş'}
                </span>
              </div>
            )}
          </div>

          {/* Sync Button */}
          <TouchButton
            onClick={handleSync}
            variant={syncStatus === 'error' ? 'danger' : 'primary'}
            size="small"
            disabled={!isOnline || syncStatus === 'syncing'}
            loading={syncStatus === 'syncing'}
            icon={
              syncStatus === 'success' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : syncStatus === 'error' ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )
            }
          >
            {syncStatus === 'success' ? 'Tamamlandı' :
             syncStatus === 'error' ? 'Tekrar Dene' :
             'Senkronize Et'}
          </TouchButton>
        </div>
      )}
    </div>
  );
};

// Compact version for header/navbar
export const CompactConnectionStatus: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending items
    const checkPending = async () => {
      try {
        const status = await window.electronAPI.sync.getStatus();
        setPendingCount(status.pendingItems || 0);
      } catch {
        // Ignore errors
      }
    };

    checkPending();
    const interval = setInterval(checkPending, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} ${isOnline ? 'animate-pulse' : ''}`} />
      <span className="text-sm font-medium text-gray-700">
        {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
      </span>
      {pendingCount > 0 && (
        <span className="bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {pendingCount}
        </span>
      )}
    </div>
  );
};