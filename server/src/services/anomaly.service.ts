import type { Anomaly } from '../types/index.js';
import { AnomalyModel, toPlain } from '../models/index.js';
import { recordAudit } from './audit.service.js';

/**
 * Records a staff decision on an anomaly.
 *
 * Anomalies detected on the fly are not persisted until someone acts on them,
 * so an unseen id is upserted here rather than rejected.
 */
export async function updateAnomalyStatus(
  anomalyId: string,
  status: Anomaly['status'],
  notes: string,
  performedBy: string
): Promise<{ success: boolean }> {
  const existing = toPlain<Anomaly>(await AnomalyModel.findOne({ id: anomalyId }).lean());

  if (!existing) {
    await AnomalyModel.create({
      id: anomalyId,
      type: 'amount_deviation',
      family_id: '',
      family_name: '',
      severity: 'medium',
      description: 'Dynamic anomaly review',
      detected_at: new Date().toISOString(),
      status,
      resolution_notes: notes,
      resolved_by: performedBy || 'Staff',
    });
  } else {
    await AnomalyModel.updateOne(
      { id: anomalyId },
      { $set: { status, resolution_notes: notes, resolved_by: performedBy || 'Staff' } }
    );
  }

  await recordAudit({
    entity: 'payment',
    entity_id: anomalyId,
    action: 'edit',
    performed_by: performedBy || 'Auditor',
    details: `Anomaly #${anomalyId} marked as ${status.toUpperCase()}. Notes: ${notes}`,
  });

  return { success: true };
}

export async function listAnomalies(): Promise<Anomaly[]> {
  const docs = await AnomalyModel.find().sort({ detected_at: -1 }).lean();
  return toPlain<Anomaly[]>(docs);
}
