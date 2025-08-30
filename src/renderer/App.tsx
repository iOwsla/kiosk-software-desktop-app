import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CustomPage from './pages/CustomPage';
import DealerSettingsPage from './pages/DealerSettingsPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="app min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/custom-page" element={<CustomPage />} />
            <Route path="/dealer-settings" element={<DealerSettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;