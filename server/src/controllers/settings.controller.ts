import type { Request, Response } from 'express';
import {
  applyFixedRateToAllFamilies,
  clearDatabase,
  getSettings,
  updateSettings,
} from '../services/settings.service.js';

/** Derives the acting user label from the request body. */
function actingUser(req: Request): string {
  return req.body?.performed_by || 'Admin';
}

/** GET /api/settings */
export async function getSettingsHandler(_req: Request, res: Response) {
  const settings = await getSettings();
  res.json({ success: true, settings });
}

/** PUT /api/settings */
export async function updateSettingsHandler(req: Request, res: Response) {
  const result = await updateSettings(req.body, actingUser(req));
  res.json(result);
}

/** POST /api/settings/apply-fixed-rate */
export async function applyFixedRateHandler(req: Request, res: Response) {
  const rateNum = Number(req.body.fixed_rate);
  if (!rateNum || Number.isNaN(rateNum) || rateNum <= 0) {
    return res.status(400).json({ error: 'Valid fixed rate amount is required.' });
  }

  const result = await applyFixedRateToAllFamilies(rateNum, actingUser(req));
  res.json(result);
}

/** POST /api/database/clear */
export async function clearDatabaseHandler(req: Request, res: Response) {
  const result = await clearDatabase(actingUser(req));
  res.json(result);
}
