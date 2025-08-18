import React from 'react';
import HomePage from './pages/HomePage';
import { ErrorBoundary } from './components/ErrorBoundary';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <div className="app min-h-screen">
        <HomePage />
      </div>
    </ErrorBoundary>
  );
};

export default App;