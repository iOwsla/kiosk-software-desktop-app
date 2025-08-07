import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { AlertMessage } from '../components/AlertMessage';

export const LicenseRenewalPage: React.FC = () => {
  const [newApiKey, setNewApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentApiKey, setCurrentApiKey] = useState<string | null>(null);

  useEffect(() => {
    // Get the current API key to show partial information
    const getCurrentKey = async () => {
      try {
        const savedKey = await window.electronAPI.license.getSavedKey();
        if (savedKey) {
          // Show only first 8 and last 4 characters
          const masked = savedKey.length > 12 
            ? `${savedKey.substring(0, 8)}...${savedKey.substring(savedKey.length - 4)}`
            : savedKey.substring(0, 8) + '...';
          setCurrentApiKey(masked);
        }
      } catch (error) {
        console.error('Failed to get current API key:', error);
      }
    };

    getCurrentKey();
  }, []);

  const handleRenewLicense = async () => {
    if (!newApiKey.trim()) {
      setError('Please enter a new API key');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.electronAPI.license.verify(newApiKey);
      
      if (result.valid) {
        // Save the new API key
        await window.electronAPI.license.saveKey(newApiKey);
        setSuccess('License renewed successfully! Redirecting to kiosk...');
        
        // Redirect to kiosk after a short delay
        setTimeout(() => {
          window.electronAPI.window.showKiosk();
        }, 2000);
      } else {
        setError(result.message || 'Invalid API key');
      }
    } catch (error) {
      console.error('License renewal failed:', error);
      setError('Failed to renew license. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRenewLicense();
  };

  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewApiKey(e.target.value);
    if (error) {
      setError(null);
    }
    if (success) {
      setSuccess(null);
    }
  };

  const handleBackToInput = () => {
    window.electronAPI.window.showLicenseInput();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg p-8 fade-in">
        <div className="text-center mb-8">
          <div className="bg-red-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            License Renewal Required
          </h1>
          <p className="text-gray-600">
            Your current license has expired or is invalid. Please enter a new API key to continue.
          </p>
        </div>

        {currentApiKey && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-1">Current API Key:</p>
            <p className="font-mono text-sm text-gray-800">{currentApiKey}</p>
          </div>
        )}

        {error && (
          <AlertMessage type="error" message={error} className="mb-6" />
        )}

        {success && (
          <AlertMessage type="success" message={success} className="mb-6" />
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="newApiKey" className="block text-sm font-medium text-gray-700 mb-2">
              New API Key
            </label>
            <input
              id="newApiKey"
              type="text"
              value={newApiKey}
              onChange={handleKeyChange}
              placeholder="Enter your new API key"
              className={`license-input ${error ? 'input-error' : ''}`}
              disabled={isLoading || !!success}
              autoFocus
            />
          </div>

          <div className="space-y-3">
            <button
              type="submit"
              disabled={isLoading || !newApiKey.trim() || !!success}
              className="w-full btn-primary py-3 text-lg relative"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Renewing License...
                </>
              ) : success ? (
                'License Renewed ✓'
              ) : (
                'Renew License'
              )}
            </button>

            <button
              type="button"
              onClick={handleBackToInput}
              disabled={isLoading}
              className="w-full btn-secondary py-3 text-lg"
            >
              Back to License Input
            </button>
          </div>
        </form>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Need Help?</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Contact your system administrator</li>
            <li>• Check your license renewal email</li>
            <li>• Verify your internet connection</li>
          </ul>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            License verification is required to continue using this application
          </p>
        </div>
      </div>
    </div>
  );
};