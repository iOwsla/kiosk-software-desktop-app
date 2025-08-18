import { Router } from 'express';
import { PortController } from '../controllers/PortController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const portController = new PortController();

// POST /api/port/scan - IP aralığında port tarama
router.post('/scan', asyncHandler(portController.scanPortRange.bind(portController)));

export { router as portRouter };