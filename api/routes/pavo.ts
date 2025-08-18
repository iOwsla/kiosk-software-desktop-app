import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { pavoController } from '../controllers/PavoController';

const router = Router();

router.post('/scan', asyncHandler(pavoController.scan.bind(pavoController)));

router.post('/proxy', asyncHandler(pavoController.proxy.bind(pavoController)));

export { router as pavoRouter };


