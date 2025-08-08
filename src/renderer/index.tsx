import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Get the root element
const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

// Create root and render the app
const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Hot module replacement for development
if (process.env.NODE_ENV === 'development' && (module as unknown as { hot?: { accept: () => void } }).hot) {
  (module as unknown as { hot?: { accept: () => void } }).hot!.accept();
}