import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { parseReceiptHandler } from '../controllers/ai.controller.js';

const router = Router();

// POST /api/ocr/parse - normalise scanned receipt text into payment fields.
router.post('/parse', asyncHandler(parseReceiptHandler));

export default router;
