import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { pavoController } from '../controllers/PavoController';

const router = Router();

router.get('/config', asyncHandler(async (req, res) => pavoController.getConfig(req, res)));
router.post('/config', asyncHandler(async (req, res) => pavoController.setConfig(req, res)));
router.post('/scan', asyncHandler(pavoController.scan.bind(pavoController)));
router.post('/proxy', asyncHandler(pavoController.proxy.bind(pavoController)));

export { router as pavoRouter };


