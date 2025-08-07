import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertMessage } from '../components/AlertMessage';

export const LicenseInputPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const handleVerifyLicense = React.useCallback(async (keyToVerify?: string) => {
    const keyToUse = keyToVerify || apiKey;
    
    if (!keyToUse.trim()) {
      setError('Please enter an API key');
      return;
    }

    // Check if electronAPI is available
    if (!window.electronAPI || !window.electronAPI.license) {
      setError('Application not running in Electron context');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await window.electronAPI.license.verify(keyToUse);
      
      if (result.valid) {
        // Save the API key
        await window.electronAPI.license.saveKey(keyToUse);
        // The main process will handle window switching
      } else {
        setError(result.message || 'Invalid API key');
      }
    } catch (error) {
      console.error('License verification failed:', error);
      setError('Failed to verify license. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  useEffect(() => {
    // Check if there's a saved API key on component mount
    const checkSavedKey = async () => {
      try {
        // Check if electronAPI is available (only in Electron context)
        if (window.electronAPI && window.electronAPI.license) {
          const savedKey = await window.electronAPI.license.getSavedKey();
          if (savedKey) {
            setApiKey(savedKey);
            // Automatically verify the saved key
            await handleVerifyLicense(savedKey);
          }
        } else {
          console.warn('electronAPI not available - running in browser context');
        }
      } catch (error) {
        console.error('Failed to get saved API key:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    checkSavedKey();
  }, [handleVerifyLicense]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerifyLicense();
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKey(e.target.value);
    if (error) {
      setError(null);
    }
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <LoadingSpinner size="large" />
          <p className="mt-4 text-gray-600">Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="license-form fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Kiosk Application
          </h1>
          <p className="text-gray-600">
            Enter your API key to access the application
          </p>
        </div>

        {error && (
          <AlertMessage type="error" message={error} className="mb-6" />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="text"
              value={apiKey}
              onChange={handleKeyChange}
              placeholder="Enter your API key"
              className={`license-input ${error ? 'input-error' : ''}`}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !apiKey.trim()}
            className="w-full btn-primary py-3 text-lg relative"
          >
            {isLoading ? (
              <>
                <LoadingSpinner className="mr-2" />
                Verifying...
              </>
            ) : (
              'Verify License'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your system administrator
          </p>
        </div>
      </div>
    </div>
  );
};