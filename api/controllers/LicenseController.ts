import { Request, Response } from 'express';
import { LicenseService } from '../services/LicenseService';
import { logger } from '../utils/logger';
import { LicenseVerificationRequest, LicenseVerificationResponse } from '../../shared/types';

export class LicenseController {
  private licenseService: LicenseService;

  constructor() {
    this.licenseService = new LicenseService();
  }

  public async verifyLicense(req: Request, res: Response): Promise<void> {
    try {
      const { apiKey }: LicenseVerificationRequest = req.body;

      if (!apiKey) {
        res.status(400).json({
          valid: false,
          message: 'API key is required'
        } as LicenseVerificationResponse);
        return;
      }

      logger.info('License verification requested', { 
        apiKeyPrefix: apiKey.substring(0, 8) + '...' 
      });

      // TODO: Implement actual license verification
      // For now, return mock response
      const result = await this.licenseService.verifyLicense(apiKey);

      res.json(result);
    } catch (error) {
      logger.error('License verification failed', { error });
      res.status(500).json({
        valid: false,
        message: 'Internal server error during license verification'
      } as LicenseVerificationResponse);
    }
  }

  public async getLicenseStatus(req: Request, res: Response): Promise<void> {
    try {
      const apiKey = req.headers['x-api-key'] as string;

      if (!apiKey) {
        res.status(400).json({
          valid: false,
          message: 'API key header is required'
        } as LicenseVerificationResponse);
        return;
      }

      logger.info('License status requested', { 
        apiKeyPrefix: apiKey.substring(0, 8) + '...' 
      });

      const result = await this.licenseService.getLicenseStatus(apiKey);

      res.json(result);
    } catch (error) {
      logger.error('License status check failed', { error });
      res.status(500).json({
        valid: false,
        message: 'Internal server error during license status check'
      } as LicenseVerificationResponse);
    }
  }
}