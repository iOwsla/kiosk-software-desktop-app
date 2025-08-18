import { Router } from 'express';
import { LicenseManager } from '../../src/main/services/LicenseManager';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const licenseManager = new LicenseManager();

// POST /api/license/verify - License key doğrulama
router.post('/verify', asyncHandler(async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({
      success: false,
      message: 'API key is required'
    });
  }
  
  try {
    const result = await licenseManager.verifyLicenseViaAPI(apiKey);

    return res.json({
      status: result.isValid,
      message: result.message || 'Unknown error',
      expiresAt: result.expiresAt,
      isExpired: result.isValid ? false : (result.message || '').includes('expired')
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
}));

export { router as licenseRouter };