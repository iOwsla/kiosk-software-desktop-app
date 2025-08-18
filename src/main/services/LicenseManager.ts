import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import { logger } from '../../../api/utils/logger';

export interface LicenseStatus {
  isValid: boolean;
  licenseKey?: string;
  expiryDate?: Date;
  error?: string;
}

export class LicenseManager {
  private licenseFilePath: string;
  private currentLicense: string | null = null;

  constructor() {
    // Store license file in user data directory
    const userDataPath = app.getPath('userData');
    this.licenseFilePath = path.join(userDataPath, 'license.key');
    this.loadStoredLicense();
  }

  /**
   * Load stored license from file system
   */
  private loadStoredLicense(): void {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        const licenseData = fs.readFileSync(this.licenseFilePath, 'utf8');
        this.currentLicense = licenseData.trim();
        logger.info('License loaded from storage');
      }
    } catch (error) {
      logger.error('Failed to load stored license', { error });
    }
  }

  /**
   * Validate a license key
   */
  async validateLicense(licenseKey: string): Promise<LicenseStatus> {
    try {
      // Basic validation - check if license key format is correct
      if (!licenseKey || licenseKey.length < 10) {
        return {
          isValid: false,
          error: 'Invalid license key format'
        };
      }

      // Simple validation logic - you can enhance this with actual license validation
      // Support both API key format (sk_...) and traditional license format (XXXX-XXXX-XXXX-XXXX)
      const apiKeyPattern = /^sk_[a-f0-9]{64}$/; // API key format: sk_ followed by 64 hex characters
      const licensePattern = /^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/; // Traditional license format
      
      const isValidApiKey = apiKeyPattern.test(licenseKey);
      const isValidLicenseKey = licensePattern.test(licenseKey);
      
      if (!isValidApiKey && !isValidLicenseKey) {
        return {
          isValid: false,
          error: 'License key must be either API key format (sk_...) or traditional format (XXXX-XXXX-XXXX-XXXX)'
        };
      }

      // For demonstration, we'll consider the license valid if it matches the pattern
      // In a real application, you would validate against a license server
      const expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Valid for 1 year

      logger.info('License validation successful', { licenseKey: licenseKey.substring(0, 4) + '****' });
      
      return {
        isValid: true,
        licenseKey,
        expiryDate
      };
    } catch (error) {
      logger.error('License validation failed', { error });
      return {
        isValid: false,
        error: 'License validation failed'
      };
    }
  }

  /**
   * Save a valid license key to storage
   */
  async saveLicense(licenseKey: string): Promise<boolean> {
    try {
      // Validate the license first
      const validation = await this.validateLicense(licenseKey);
      
      if (!validation.isValid) {
        throw new Error(validation.error || 'Invalid license key');
      }

      // Save to file
      fs.writeFileSync(this.licenseFilePath, licenseKey, 'utf8');
      this.currentLicense = licenseKey;
      
      logger.info('License saved successfully');
      return true;
    } catch (error) {
      logger.error('Failed to save license', { error });
      throw error;
    }
  }

  /**
   * Get current license status
   */
  getLicenseStatus(): LicenseStatus {
    if (!this.currentLicense) {
      return {
        isValid: false,
        error: 'No license found'
      };
    }

    // For stored licenses, we assume they are valid
    // In a real application, you might want to re-validate periodically
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    return {
      isValid: true,
      licenseKey: this.currentLicense,
      expiryDate
    };
  }

  /**
   * Remove stored license
   */
  removeLicense(): boolean {
    try {
      if (fs.existsSync(this.licenseFilePath)) {
        fs.unlinkSync(this.licenseFilePath);
      }
      this.currentLicense = null;
      logger.info('License removed successfully');
      return true;
    } catch (error) {
      logger.error('Failed to remove license', { error });
      return false;
    }
  }

  /**
   * Check if application has a valid license
   */
  hasValidLicense(): boolean {
    const status = this.getLicenseStatus();
    return status.isValid;
  }

  /**
   * HTTP API method for license verification using axios
   * Makes a direct HTTP call to the license verification endpoint
   */
  async verifyLicenseViaAPI(apiKey: string): Promise<{ isValid: boolean; message: string; expiresAt?: string; isExpired?: boolean }> {
    try {
      const response = await axios.post('http://localhost:8001/api/license/verify', {
        apiKey: apiKey
      }, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return {
        isValid: response.data.success || false,
        message: response.data.message || 'Unknown response',
        expiresAt: response.data.expiresAt,
        isExpired: response.data.isExpired || false
      };
    } catch (error: any) {
      logger.error('License API verification failed', { error: error.message });
      return {
        isValid: false,
        message: error.response?.data?.message || 'API connection failed',
        isExpired: false
      };
    }
  }

}