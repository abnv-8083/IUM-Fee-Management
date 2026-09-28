import type { Request, Response } from 'express';
import { getBackupJson, restoreBackup } from '../services/backup.service.js';

/** GET /api/backup */
export async function downloadBackupHandler(_req: Request, res: Response) {
  const backup = await getBackupJson();

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=ium_fee_backup_${Date.now()}.json`
  );
  res.send(backup);
}

/**
 * POST /api/restore
 *
 * With the role switcher gone there is no caller identity to record, so a
 * restore is always attributed to the system account.
 */
export async function restoreBackupHandler(req: Request, res: Response) {
  const result = await restoreBackup(req.body, 'System Admin');
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ success: true, message: 'Database restored successfully.' });
}
