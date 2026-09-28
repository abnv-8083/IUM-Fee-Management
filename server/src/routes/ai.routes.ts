import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { aiQueryHandler } from '../controllers/ai.controller.js';

const router = Router();

router.post('/query', asyncHandler(aiQueryHandler));

export default router;
