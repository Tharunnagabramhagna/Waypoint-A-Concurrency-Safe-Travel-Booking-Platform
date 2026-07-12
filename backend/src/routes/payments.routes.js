import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { capture } from '../controllers/paymentsController.js';

const router = express.Router();

router.use(requireAuth);
router.post('/capture', capture);

export default router;
