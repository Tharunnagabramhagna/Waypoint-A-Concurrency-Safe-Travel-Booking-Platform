import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { hold, create, listMine, getOne, cancel } from '../controllers/bookingsController.js';
import { getTracking } from '../controllers/trackingController.js';

const router = express.Router();

router.use(requireAuth);
router.post('/hold', hold);
router.post('/', create);
router.get('/', listMine);
router.get('/:id/tracking', getTracking);
router.get('/:id', getOne);
router.post('/:id/cancel', cancel);

export default router;
