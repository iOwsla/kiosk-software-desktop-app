import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { printerController } from '../controllers/PrinterController';

const router = Router();

// Yazıcı listesi
router.get('/list', asyncHandler(printerController.listPrinters));

// Yazdırma işlemleri
router.post('/print', asyncHandler(printerController.printJob));
router.post('/print-test', asyncHandler(printerController.printTest));
router.post('/print-sample', asyncHandler(printerController.printSample));

export { router as printerRouter };


