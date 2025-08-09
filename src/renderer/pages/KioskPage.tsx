import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { UpdateControl } from '../components/UpdateControl';
import { PortControl } from '../components/PortControl';
import { PavoControl } from '../components/PavoControl';
import { PrinterControl } from '../components/PrinterControl';

export const KioskPage: React.FC = () => {
  const [licenseStatus, setLicenseStatus] = useState<{
    valid: boolean;
    message?: string;
    expiresAt?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  useEffect(() => {
    // Check license status on mount
    checkLicenseStatus();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Check license status every 5 minutes
    const licenseInterval = setInterval(() => {
      checkLicenseStatus();
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(licenseInterval);
    };
  }, []);

  const checkLicenseStatus = async () => {
    try {
      const status = await window.electronAPI.license.getStatus();
      setLicenseStatus(status);
      
      if (!status.valid) {
        // License is invalid, redirect to renewal page
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

  const handleMinimize = () => {
    window.electronAPI.app.minimize();
  };

  const handleMaximize = () => {
    window.electronAPI.app.maximize();
  };

  const handleQuit = () => {
    if (window.confirm('Are you sure you want to quit the application?')) {
      window.electronAPI.app.quit();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="kiosk-container">
        <div className="kiosk-content">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600 text-xl">Loading kiosk...</p>
        </div>
      </div>
    );
  }

  if (!licenseStatus?.valid) {
    return (
      <div className="kiosk-container">
        <div className="kiosk-content">
          <div className="text-center">
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg mb-6">
              <h2 className="text-2xl font-bold mb-2">License Invalid</h2>
              <p className="text-lg">
                {licenseStatus?.message || 'Your license has expired or is invalid.'}
              </p>
              <p className="mt-2 text-sm">
                Redirecting to license renewal page...
              </p>
            </div>
            <LoadingSpinner size="large" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kiosk-container">
      {/* Header with controls (only visible in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 flex space-x-2 z-10">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-full transition-colors"
            title="Admin Panel"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleMinimize}
            className="bg-yellow-500 hover:bg-yellow-600 text-white p-2 rounded-full transition-colors"
            title="Minimize"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleMaximize}
            className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-full transition-colors"
            title="Maximize/Restore"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={handleQuit}
            className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full transition-colors"
            title="Quit"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* Main content */}
      <div className="kiosk-content">
        <div className="text-center max-w-4xl mx-auto">
          {/* Welcome message */}
          <div className="mb-12">
            <h1 className="text-6xl font-bold text-gray-800 mb-4 slide-up">
              Welcome to Kiosk
            </h1>
            <p className="text-2xl text-gray-600 slide-up" style={{ animationDelay: '0.1s' }}>
              Your interactive information terminal
            </p>
          </div>

          {/* Date and time display */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 mb-12 shadow-lg slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="text-5xl font-bold text-gray-800 mb-2">
              {formatTime(currentTime)}
            </div>
            <div className="text-xl text-gray-600">
              {formatDate(currentTime)}
            </div>
          </div>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg slide-up" style={{ animationDelay: '0.3s' }}>
              <div className="text-blue-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Information</h3>
              <p className="text-gray-600">Access important information and updates</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg slide-up" style={{ animationDelay: '0.4s' }}>
              <div className="text-green-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Services</h3>
              <p className="text-gray-600">Quick access to available services</p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg slide-up" style={{ animationDelay: '0.5s' }}>
              <div className="text-purple-600 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Support</h3>
              <p className="text-gray-600">Get help and assistance when needed</p>
            </div>
          </div>

          {/* License status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 slide-up" style={{ animationDelay: '0.6s' }}>
            <div className="flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-green-700 font-medium">License Active</span>
              {licenseStatus.expiresAt && (
                <span className="text-green-600 ml-2">
                  (Expires: {new Date(licenseStatus.expiresAt).toLocaleDateString()})
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Admin Panel (only visible in development) */}
      {process.env.NODE_ENV === 'development' && showAdminPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Yönetim Paneli</h2>
              <button
                onClick={() => setShowAdminPanel(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Port Control */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Port Yönetimi</h3>
                  <PortControl />
                </div>
                
                {/* Update Control */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Güncelleme Yönetimi</h3>
                  <UpdateControl />
                </div>

                {/* Printer Control */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Yazıcı Yönetimi</h3>
                  <PrinterControl />
                </div>

                {/* Pavo Control */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Pavo Yönetimi</h3>
                  <PavoControl />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};