import { Router } from 'express';
import { UpdateController } from '../controllers/UpdateController';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();
const updateController = new UpdateController();

// GET /api/update/status - Mevcut güncelleme durumunu al
router.get('/status', asyncHandler(updateController.getUpdateStatus.bind(updateController)));

// GET /api/update/info - Uygulama ve güncelleme bilgilerini al
router.get('/info', asyncHandler(updateController.getUpdateInfo.bind(updateController)));

// POST /api/update/check - Güncelleme kontrolü yap
router.post('/check', asyncHandler(updateController.checkForUpdates.bind(updateController)));

// POST /api/update/download - Güncellemeyi indir
router.post('/download', asyncHandler(updateController.downloadUpdate.bind(updateController)));

// POST /api/update/install - Güncellemeyi yükle ve uygulamayı yeniden başlat
router.post('/install', asyncHandler(updateController.installUpdate.bind(updateController)));

// POST /api/update/auto-check/start - Otomatik güncelleme kontrolünü başlat
router.post('/auto-check/start', asyncHandler(updateController.startAutoUpdateCheck.bind(updateController)));

// POST /api/update/auto-check/stop - Otomatik güncelleme kontrolünü durdur
router.post('/auto-check/stop', asyncHandler(updateController.stopAutoUpdateCheck.bind(updateController)));

// POST /api/update/settings - Güncelleme ayarlarını değiştir
router.post('/settings', asyncHandler(updateController.updateSettings.bind(updateController)));

export { router as updateRouter };