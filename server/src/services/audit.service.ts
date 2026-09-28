import type { AuditLog } from '../types/index.js';
import { AuditLogModel, generateId, toPlain } from '../models/index.js';

export type AuditEntry = Omit<AuditLog, 'id' | 'timestamp'> &
  Partial<Pick<AuditLog, 'id' | 'timestamp'>>;

/**
 * Appends a tamper-evident entry to the audit trail.
 * Every create/edit/void/delete in the system funnels through here.
 */
export async function recordAudit(entry: AuditEntry): Promise<AuditLog> {
  const doc = await AuditLogModel.create({
    ...entry,
    id: entry.id || generateId('log'),
    timestamp: entry.timestamp || new Date().toISOString(),
  });

  return doc.toJSON() as AuditLog;
}

/** Returns the audit trail, newest first. */
export async function listAuditLogs(limit?: number): Promise<AuditLog[]> {
  const query = AuditLogModel.find().sort({ timestamp: -1 });
  if (limit) query.limit(limit);
  const docs = await query.lean();
  return toPlain<AuditLog[]>(docs);
}
