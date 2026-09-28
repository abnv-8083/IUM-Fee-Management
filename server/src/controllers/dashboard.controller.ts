import type { Request, Response } from 'express';
import { getFullDashboardPayload } from '../services/dashboard.service.js';

/** GET /api/dashboard - the complete boot payload for the React client. */
export async function getDashboard(_req: Request, res: Response) {
  const data = await getFullDashboardPayload();
  res.json(data);
}
