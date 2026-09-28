import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  createPayment,
  updatePayment,
  voidPaymentHandler,
} from '../controllers/payment.controller.js';

const router = Router();

router.post('/', asyncHandler(createPayment));
router.put('/:id', asyncHandler(updatePayment));
router.post('/:id/void', asyncHandler(voidPaymentHandler));

export default router;
