import React, { useState, useEffect } from 'react';
import { PortChangeNotification, UpdateNotification } from '../../../shared/types';
import { AlertMessage } from './AlertMessage';

interface Notification {
  id: string;
  type: 'port' | 'update';
  message: string;
  alertType: 'error' | 'success' | 'warning' | 'info';
  timestamp: number;
  autoClose?: boolean;
}

export const NotificationManager: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = React.useCallback((notification: Notification) => {
    setNotifications(prev => [...prev, notification]);

    // Otomatik kapanma
    if (notification.autoClose) {
      setTimeout(() => {
        removeNotification(notification.id);
      }, 5000); // 5 saniye sonra kapat
    }
  }, []);

  useEffect(() => {
    // Port değişikliği bildirimleri için listener
    const handlePortChange = (data: PortChangeNotification) => {
      const notification: Notification = {
        id: `port-${Date.now()}`,
        type: 'port',
        message: `Port değişti: ${data.oldPort} → ${data.newPort}`,
        alertType: 'info',
        timestamp: Date.now(),
        autoClose: true
      };
      addNotification(notification);
    };

    // Güncelleme bildirimleri için listener
    const handleUpdateStatus = (data: UpdateNotification) => {
      let message = '';
      let alertType: 'error' | 'success' | 'warning' | 'info' = 'info';
      let autoClose = true;

      switch (data.status) {
        case 'checking':
          message = 'Güncellemeler kontrol ediliyor...';
          alertType = 'info';
          break;
        case 'available':
          message = `Yeni güncelleme mevcut: v${data.version || 'Bilinmiyor'}`;
          alertType = 'warning';
          autoClose = false;
          break;
        case 'downloading':
          message = `Güncelleme indiriliyor... ${data.progress ? `(${Math.round(data.progress)}%)` : ''}`;
          alertType = 'info';
          break;
        case 'downloaded':
          message = 'Güncelleme indirildi. Yeniden başlatma gerekiyor.';
          alertType = 'success';
          autoClose = false;
          break;
        case 'error':
          message = `Güncelleme hatası: ${data.error || 'Bilinmeyen hata'}`;
          alertType = 'error';
          autoClose = false;
          break;
        case 'not-available':
          message = 'Güncel sürüm kullanılıyor.';
          alertType = 'success';
          break;
        default:
          message = 'Güncelleme durumu değişti.';
          alertType = 'info';
      }

      const notification: Notification = {
        id: `update-${Date.now()}`,
        type: 'update',
        message,
        alertType,
        timestamp: Date.now(),
        autoClose
      };
      addNotification(notification);
    };

    // Event listener'ları ekle
    if (window.electronAPI?.on) {
      window.electronAPI.on.portChanged(handlePortChange);
      window.electronAPI.on.updateStatus(handleUpdateStatus);
    }

    // Cleanup
    return () => {
      if (window.electronAPI?.off) {
        window.electronAPI.off.portChanged(handlePortChange);
        window.electronAPI.off.updateStatus(handleUpdateStatus);
      }
    };
  }, [addNotification]);



  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(notification => (
        <div key={notification.id} className="fade-in">
          <AlertMessage
            type={notification.alertType}
            message={notification.message}
            onClose={() => removeNotification(notification.id)}
            className="shadow-lg"
          />
        </div>
      ))}
    </div>
  );
};