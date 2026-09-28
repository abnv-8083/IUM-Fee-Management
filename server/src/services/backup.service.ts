import type { SystemSettings } from '../types/index.js';
import {
  AnomalyModel,
  AuditLogModel,
  FamilyModel,
  FeePlanModel,
  PaymentModel,
  ReminderLogModel,
  SettingsModel,
  StudentModel,
  toPlain,
} from '../models/index.js';
import { recordAudit } from './audit.service.js';
import { getSettings } from './settings.service.js';

export interface BackupPayload {
  families: any[];
  students: any[];
  feePlans: any[];
  payments: any[];
  auditLogs: any[];
  reminders: any[];
  anomalies: any[];
  settings?: SystemSettings | Record<string, unknown>;
  exported_at: string;
}

/** Serialises every collection into a single portable JSON document. */
export async function getBackupJson(): Promise<string> {
  const [families, students, feePlans, payments, auditLogs, reminders, anomalies, settings] =
    await Promise.all([
      FamilyModel.find().lean(),
      StudentModel.find().lean(),
      FeePlanModel.find().lean(),
      PaymentModel.find().lean(),
      AuditLogModel.find().lean(),
      ReminderLogModel.find().lean(),
      AnomalyModel.find().lean(),
      getSettings(),
    ]);

  // Sanitised so a re-uploaded backup contains no stale Mongo internals.
  const payload: BackupPayload = {
    families: toPlain(families),
    students: toPlain(students),
    feePlans: toPlain(feePlans),
    payments: toPlain(payments),
    auditLogs: toPlain(auditLogs),
    reminders: toPlain(reminders),
    anomalies: toPlain(anomalies),
    settings,
    exported_at: new Date().toISOString(),
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Replaces the entire dataset with the contents of a backup file.
 * Validation is intentionally shallow-but-strict: the two collections that
 * define an intact ledger (families and payments) must be present.
 */
export async function restoreBackup(
  payload: any,
  performedBy: string
): Promise<{ success: boolean; message?: string }> {
  if (!payload || !Array.isArray(payload.families) || !Array.isArray(payload.payments)) {
    return { success: false, message: 'Invalid backup format. Missing required collections.' };
  }

  await Promise.all([
    FamilyModel.deleteMany({}),
    StudentModel.deleteMany({}),
    AnomalyModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
    ReminderLogModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    FeePlanModel.deleteMany({}),
  ]);

  // `toPlain` guards against hand-edited backups that still carry `_id`.
  if (payload.families.length) await FamilyModel.insertMany(toPlain(payload.families));
  if (payload.students?.length) await StudentModel.insertMany(toPlain(payload.students));
  if (payload.feePlans?.length) await FeePlanModel.insertMany(toPlain(payload.feePlans));
  if (payload.payments?.length) await PaymentModel.insertMany(toPlain(payload.payments));
  if (payload.reminders?.length) await ReminderLogModel.insertMany(toPlain(payload.reminders));
  if (payload.anomalies?.length) await AnomalyModel.insertMany(toPlain(payload.anomalies));

  if (payload.settings) {
    const { key, _id, ...settings } = payload.settings as Record<string, unknown>;
    await SettingsModel.findOneAndUpdate(
      { key: 'system' },
      { $set: { ...settings, key: 'system' } },
      { upsert: true }
    );
  }

  // Restore the audit trail last so the restore entry is the newest record.
  if (payload.auditLogs?.length) await AuditLogModel.insertMany(toPlain(payload.auditLogs));

  await recordAudit({
    entity: 'family',
    entity_id: 'SYSTEM',
    action: 'create',
    performed_by: performedBy || 'System Admin',
    details: 'Database restored successfully from user backup file.',
  });

  return { success: true };
}
