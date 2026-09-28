import { Router } from 'express';
import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { getConnectionState } from '../config/database.js';

import dashboardRouter from './dashboard.routes.js';
import paymentRouter from './payment.routes.js';
import familyRouter from './family.routes.js';
import settingsRouter from './settings.routes.js';
import databaseRouter from './database.routes.js';
import reminderRouter from './reminder.routes.js';
import anomalyRouter from './anomaly.routes.js';
import aiRouter from './ai.routes.js';
import ocrRouter from './ocr.routes.js';
import exportRouter from './export.routes.js';
import {
  downloadBackupHandler,
  restoreBackupHandler,
} from '../controllers/backup.controller.js';

const router = Router();

/** Liveness probe - also reports the current MongoDB connection state. */
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', database: getConnectionState(), time: new Date().toISOString() });
});

router.use('/dashboard', dashboardRouter);
router.use('/payments', paymentRouter);
router.use('/families', familyRouter);
router.use('/settings', settingsRouter);
router.use('/database', databaseRouter);
router.use('/reminders', reminderRouter);
router.use('/anomalies', anomalyRouter);
router.use('/ai', aiRouter);
router.use('/ocr', ocrRouter);
router.use('/export', exportRouter);

// Backup download (GET /api/backup) and restore (POST /api/restore) are exposed
// as two roots to stay wire-compatible with the existing client.
router.get('/backup', asyncHandler(downloadBackupHandler));
router.post('/restore', asyncHandler(restoreBackupHandler));

export default router;
