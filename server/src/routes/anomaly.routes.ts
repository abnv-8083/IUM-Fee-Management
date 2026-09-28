import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { resolveAnomalyHandler } from '../controllers/anomaly.controller.js';

const router = Router();

router.post('/:id/resolve', asyncHandler(resolveAnomalyHandler));

export default router;
