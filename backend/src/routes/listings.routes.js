import express from 'express';
import { search, getById } from '../controllers/listingsController.js';

const router = express.Router();

router.get('/search', search);
router.get('/:id', getById);

export default router;
