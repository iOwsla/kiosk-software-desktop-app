import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LicenseInputPage } from './pages/LicenseInputPage';
import { KioskPage } from './pages/KioskPage';
import { LicenseRenewalPage } from './pages/LicenseRenewalPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NotificationManager } from './components/NotificationManager';
import { StatusIndicator } from './components/StatusIndicator';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="app min-h-screen bg-gray-50 relative">
          {/* Status indicator - fixed position */}
          <div className="fixed top-4 left-4 z-40">
            <StatusIndicator />
          </div>
          
          {/* Notification manager - fixed position */}
          <NotificationManager />
          
          <Routes>
            {/* Default route redirects to license input */}
            <Route path="/" element={<Navigate to="/license-input" replace />} />
            
            {/* License input page */}
            <Route path="/license-input" element={<LicenseInputPage />} />
            
            {/* Main kiosk page */}
            <Route path="/kiosk" element={<KioskPage />} />
            
            {/* License renewal page */}
            <Route path="/license-renewal" element={<LicenseRenewalPage />} />
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/license-input" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;