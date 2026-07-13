import express from 'express';
import { search, getById, mapOverview } from '../controllers/listingsController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { setOverride, clearOverride } from '../controllers/trackingController.js';

const router = express.Router();

router.get('/search', search);
router.get('/map-overview', mapOverview);
router.get('/:id', getById);

// Admin tracking overrides for simulations
router.post('/:id/tracking/override', requireAuth, requireRole('platform_admin', 'provider_admin'), setOverride);
router.delete('/:id/tracking/override', requireAuth, requireRole('platform_admin', 'provider_admin'), clearOverride);

export default router;
