import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  applyFixedRateHandler,
  getSettingsHandler,
  updateSettingsHandler,
} from '../controllers/settings.controller.js';

const router = Router();

router.get('/', asyncHandler(getSettingsHandler));
router.put('/', asyncHandler(updateSettingsHandler));
router.post('/apply-fixed-rate', asyncHandler(applyFixedRateHandler));

export default router;
