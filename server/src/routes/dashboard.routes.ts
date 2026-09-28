import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getDashboard } from '../controllers/dashboard.controller.js';

const router = Router();

router.get('/', asyncHandler(getDashboard));

export default router;
