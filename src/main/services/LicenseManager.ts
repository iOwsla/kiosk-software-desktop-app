import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import { LicenseVerificationResponse } from '../../../shared/types';
import { logger } from '../../../api/utils/logger';
import { HardwareIdGenerator, HardwareInfo } from '../utils/hwid';

export class LicenseManager {
  private configPath: string;
  private verificationInterval: NodeJS.Timeout | null = null;
  private currentApiKey: string | null = null;
  private apiBaseUrl = 'http://localhost:8001/api';

  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'license.json');
  }

  public async checkInitialLicense(): Promise<boolean> {
    try {
      const savedApiKey = await this.getSavedApiKey();
      if (!savedApiKey) {
        logger.info('No saved API key found');
        return false;
      }

      this.currentApiKey = savedApiKey;
      const result = await this.verifyLicense(savedApiKey);
      return result.valid;
    } catch (error) {
      logger.error('Initial license check failed', { error });
      return false;
    }
  }

  public async verifyLicense(apiKey: string): Promise<LicenseVerificationResponse> {
    try {
      logger.info('Verifying license', { apiKeyPrefix: apiKey.substring(0, 8) + '...' });

      // Get hardware information
      const hardwareInfo = await HardwareIdGenerator.getHardwareInfo();

      const response = await axios.post(`${this.apiBaseUrl}/license/verify`, {
        apiKey,
        hwid: hardwareInfo.hwid,
        deviceInfo: {
          hostname: hardwareInfo.hostname,
          platform: hardwareInfo.platform,
          arch: hardwareInfo.arch,
          cpuModel: hardwareInfo.cpuModel
        }
      }, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // API returns { status: boolean, message: string, expiresAt?: string, isExpired?: boolean }
      const apiResponse = response.data;
      
      // Convert API response to our format
      const result: LicenseVerificationResponse = {
        valid: apiResponse.status === true,
        message: apiResponse.message,
        expiresAt: apiResponse.expiresAt,
        isExpired: apiResponse.isExpired
      };
      
      if (result.valid) {
        this.currentApiKey = apiKey;
        await this.saveApiKey(apiKey);
        logger.info('License verification successful');
      } else {
        logger.warn('License verification failed', { message: result.message });
      }

      return result;
    } catch (error) {
      logger.error('License verification error', { error });
      
      if (axios.isAxiosError(error)) {
        if (error.code === 'ECONNREFUSED') {
          return {
            valid: false,
            message: 'Lisans sunucusuna bağlanılamıyor. Sunucunun çalıştığından emin olun.'
          };
        }
        
        if (error.response?.status === 401) {
          return {
            valid: false,
            message: 'Geçersiz API anahtarı. Lütfen geçerli bir lisans anahtarı girin.'
          };
        }

        if (error.response?.status === 403) {
          return {
            valid: false,
            message: 'Bu cihaz için lisans yetkisi yok.'
          };
        }
        
        return {
          valid: false,
          message: error.response?.data?.message || 'Lisans doğrulama başarısız.'
        };
      }

      return {
        valid: false,
        message: 'License verification failed'
      };
    }
  }

  public async getLicenseStatus(): Promise<LicenseVerificationResponse> {
    try {
      if (!this.currentApiKey) {
        return {
          valid: false,
          message: 'No API key available'
        };
      }

      // Use verify endpoint instead of status endpoint for background checks
      return await this.verifyLicense(this.currentApiKey);
    } catch (error) {
      logger.error('License status check error', { error });
      return {
        valid: false,
        message: 'Status check failed'
      };
    }
  }

  public async saveApiKey(apiKey: string): Promise<void> {
    try {
      const config = {
        apiKey,
        savedAt: new Date().toISOString()
      };

      await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf8');
      logger.info('API key saved successfully');
    } catch (error) {
      logger.error('Failed to save API key', { error });
      throw new Error('Failed to save API key');
    }
  }

  public async getSavedApiKey(): Promise<string | null> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf8');
      const config = JSON.parse(configData);
      return config.apiKey || null;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  public startBackgroundVerification(intervalMinutes: number = 5): void {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
    }

    if (!this.currentApiKey) {
      logger.warn('Cannot start background verification: no API key');
      return;
    }

    logger.info('Starting background license verification', { intervalMinutes });

    this.verificationInterval = setInterval(async () => {
      try {
        if (this.currentApiKey) {
          const result = await this.getLicenseStatus();
          
          if (!result.valid) {
            logger.warn('Background verification failed - license invalid');
            // Notify renderer to show license renewal page
            this.handleLicenseExpired();
          }
        }
      } catch (error) {
        logger.error('Background license verification error', { error });
      }
    }, intervalMinutes * 60 * 1000);
  }

  public stopBackgroundVerification(): void {
    if (this.verificationInterval) {
      clearInterval(this.verificationInterval);
      this.verificationInterval = null;
      logger.info('Background license verification stopped');
    }
  }

  private handleLicenseExpired(): void {
    // This will be handled by the WindowManager
    // For now, just log the event
    logger.warn('License expired - user should be redirected to renewal page');
  }

  public clearSavedLicense(): Promise<void> {
    this.currentApiKey = null;
    return fs.unlink(this.configPath).catch(() => {
      // File doesn't exist, that's fine
    });
  }

  public async getHardwareInfo(): Promise<HardwareInfo> {
    return await HardwareIdGenerator.getHardwareInfo();
  }
}