import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { pavoController } from '../controllers/PavoController';
import { PavoDeviceStore } from '../services/PavoDeviceStore';

const router = Router();

router.get('/config', pavoController.getConfig);
router.post('/config', pavoController.setConfig);
router.post('/scan', asyncHandler(pavoController.scan.bind(pavoController)));
router.post('/proxy', asyncHandler(pavoController.proxy.bind(pavoController)));

// Multi-device endpoints (in-memory store for now)
const store = PavoDeviceStore.getInstance();
router.get('/devices', (_req, res) => {
  res.json({ success: true, data: store.list() });
});
router.post('/devices', (req, res) => {
  const created = store.create(req.body || {});
  res.json({ success: true, data: created });
});
router.put('/devices/:id', (req, res) => {
  const { id } = req.params;
  const updated = store.update(id, req.body || {});
  res.json({ success: true, data: updated });
});
router.delete('/devices/:id', (req, res) => {
  const { id } = req.params;
  store.remove(id);
  res.json({ success: true, data: true });
});

export { router as pavoRouter };


