import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { printerController } from '../controllers/PrinterController';

const router = Router();

router.get('/settings', asyncHandler(printerController.getSettings));
router.post('/settings', asyncHandler(printerController.setSettings));
router.get('/list', asyncHandler(printerController.list));
router.post('/ip/add', asyncHandler(printerController.addIP));
router.post('/set-active', asyncHandler(printerController.setActive));
router.post('/print-test', asyncHandler(printerController.printTest));
router.post('/print', asyncHandler(printerController.printJob));
router.post('/print-sample', asyncHandler(printerController.printSample));
router.post('/discover-ip', asyncHandler(printerController.discoverIP));
router.delete('/:id', asyncHandler(printerController.remove));

export { router as printerRouter };


