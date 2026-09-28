import type { Request, Response } from 'express';
import { updateAnomalyStatus } from '../services/anomaly.service.js';

/** POST /api/anomalies/:id/resolve */
export async function resolveAnomalyHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { status, notes, performed_by } = req.body;

  const result = await updateAnomalyStatus(
    id,
    status || 'resolved',
    notes || 'Inspected by staff',
    performed_by || 'Staff'
  );

  res.json(result);
}
