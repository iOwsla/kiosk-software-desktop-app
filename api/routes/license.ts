import { Router } from 'express';
import { LicenseController } from '../controllers/LicenseController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const licenseController = new LicenseController();

// POST /api/license/verify - Verify license key
router.post('/verify', asyncHandler(licenseController.verifyLicense.bind(licenseController)));

// GET /api/license/status - Get license status
router.get('/status', asyncHandler(licenseController.getLicenseStatus.bind(licenseController)));

export { router as licenseRouter };