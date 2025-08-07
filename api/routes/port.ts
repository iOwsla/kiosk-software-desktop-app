import { Router } from 'express';
import { PortController } from '../controllers/PortController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const portController = new PortController();

// GET /api/port/status - Mevcut port durumunu al
router.get('/status', asyncHandler(portController.getPortStatus.bind(portController)));

// POST /api/port/check - Belirtilen port'u kontrol et
router.post('/check', asyncHandler(portController.checkPort.bind(portController)));

// POST /api/port/find - Kullanılabilir port bul
router.post('/find', asyncHandler(portController.findAvailablePort.bind(portController)));

// POST /api/port/scan - Port aralığını tara
router.post('/scan', asyncHandler(portController.scanPortRange.bind(portController)));

// POST /api/port/resolve-conflict - Port çakışmasını çöz
router.post('/resolve-conflict', asyncHandler(portController.resolvePortConflict.bind(portController)));

// POST /api/port/set - Mevcut port'u ayarla
router.post('/set', asyncHandler(portController.setCurrentPort.bind(portController)));

export { router as portRouter };