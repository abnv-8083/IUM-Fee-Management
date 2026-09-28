import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { clearDatabaseHandler } from '../controllers/settings.controller.js';

const router = Router();

// Clears all transactional collections ahead of a public launch.
router.post('/clear', asyncHandler(clearDatabaseHandler));

export default router;
