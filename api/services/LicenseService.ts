import { LicenseVerificationResponse, LicenseStatus } from '../../shared/types';
import { logger } from '../utils/logger';

export class LicenseService {
  private licenseCache: Map<string, LicenseStatus> = new Map();

  constructor() {
    // Initialize with some mock data for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock valid license for development
    const mockValidLicense: LicenseStatus = {
      isValid: true,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      lastVerified: new Date(),
      apiKey: 'dev-license-key-12345'
    };

    // Mock expired license for testing
    const mockExpiredLicense: LicenseStatus = {
      isValid: false,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      lastVerified: new Date(),
      apiKey: 'expired-license-key-67890'
    };

    this.licenseCache.set('dev-license-key-12345', mockValidLicense);
    this.licenseCache.set('expired-license-key-67890', mockExpiredLicense);
  }

  public async verifyLicense(apiKey: string): Promise<LicenseVerificationResponse> {
    try {
      logger.info('Verifying license', { apiKeyPrefix: apiKey.substring(0, 8) + '...' });

      // TODO: Replace with actual API call to license server
      // For now, use mock data
      const cachedLicense = this.licenseCache.get(apiKey);

      if (cachedLicense) {
        const isStillValid = cachedLicense.expiresAt && cachedLicense.expiresAt > new Date();
        
        if (isStillValid) {
          // Update last verified time
          cachedLicense.lastVerified = new Date();
          this.licenseCache.set(apiKey, cachedLicense);

          return {
          valid: true,
          expiresAt: cachedLicense.expiresAt?.toISOString(),
          message: 'License is valid',
          isExpired: false
        };
        } else {
          return {
          valid: false,
          expiresAt: cachedLicense.expiresAt?.toISOString(),
          message: 'License has expired',
          isExpired: true
        };
        }
      }

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock response for unknown keys
      return {
        valid: false,
        message: 'Invalid license key',
        isExpired: false
      };

    } catch (error) {
      logger.error('License verification error', { error, apiKeyPrefix: apiKey.substring(0, 8) + '...' });
      throw new Error('License verification failed');
    }
  }

  public async getLicenseStatus(apiKey: string): Promise<LicenseVerificationResponse> {
    try {
      logger.info('Getting license status', { apiKeyPrefix: apiKey.substring(0, 8) + '...' });

      const cachedLicense = this.licenseCache.get(apiKey);
        if (cachedLicense) {
          const isStillValid = Boolean(cachedLicense.expiresAt && cachedLicense.expiresAt > new Date());
          
          return {
            valid: isStillValid,
            expiresAt: cachedLicense.expiresAt?.toISOString(),
            message: isStillValid ? 'License is active' : 'License has expired',
            isExpired: !isStillValid
          };
      }

      return {
        valid: false,
        message: 'License not found',
        isExpired: false
      };

    } catch (error) {
      logger.error('License status check error', { error, apiKeyPrefix: apiKey.substring(0, 8) + '...' });
      throw new Error('License status check failed');
    }
  }

  public async startBackgroundVerification(apiKey: string, intervalMinutes: number = 5): Promise<void> {
    logger.info('Starting background license verification', { 
      apiKeyPrefix: apiKey.substring(0, 8) + '...',
      intervalMinutes 
    });

    setInterval(async () => {
      try {
        await this.verifyLicense(apiKey);
      } catch (error) {
        logger.error('Background license verification failed', { error });
      }
    }, intervalMinutes * 60 * 1000);
  }
}