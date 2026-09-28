import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import {
  generateReminderHandler,
  sendReminderHandler,
} from '../controllers/reminder.controller.js';

const router = Router();

router.post('/generate', asyncHandler(generateReminderHandler));
router.post('/send', asyncHandler(sendReminderHandler));

export default router;
