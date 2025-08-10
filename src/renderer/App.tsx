import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="app min-h-screen">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="*" element={<HomePage />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

export default App;