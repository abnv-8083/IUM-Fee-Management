import type { ReminderLog } from '../types/index.js';
import { ReminderLogModel, generateId, toPlain } from '../models/index.js';
import { generateSmartReminder } from './intelligence.service.js';
import { getFullDashboardPayload } from './dashboard.service.js';
import { getSettings } from './settings.service.js';

/**
 * Builds a tone-calibrated reminder for one family, based on its live risk score
 * and outstanding balance for the current billing period.
 */
export async function generateReminderForFamily(familyId: string): Promise<{
  family_id: string;
  family_name: string;
  phone: string;
  email: string;
  fee_amount: number;
  tone: ReminderLog['tone'];
  message: string;
  suggested_time: string;
} | null> {
  const payload = await getFullDashboardPayload();
  const family = payload.families.find((f) => f.id === familyId);
  if (!family) return null;

  const pendingItem = payload.pendingItems.find((p) => p.family.id === familyId);
  const feeAmount = pendingItem ? pendingItem.monthly_fee : family.fee_plan?.amount || 2500;
  const settings = await getSettings();
  const currencySymbol = settings.currency_symbol || '₹';

  const reminder = generateSmartReminder(
    family,
    family.risk!,
    feeAmount,
    'September',
    currencySymbol
  );

  return {
    family_id: family.id,
    family_name: family.parent_name,
    phone: family.phone,
    email: family.email,
    fee_amount: feeAmount,
    ...reminder,
  };
}

export async function logReminder(
  reminder: Omit<ReminderLog, 'id' | 'sent_at'>
): Promise<ReminderLog> {
  const created = await ReminderLogModel.create({
    ...reminder,
    id: generateId('rem'),
    sent_at: new Date().toISOString(),
  });

  return created.toJSON() as ReminderLog;
}

export async function listReminders(): Promise<ReminderLog[]> {
  const docs = await ReminderLogModel.find().sort({ sent_at: -1 }).lean();
  return toPlain<ReminderLog[]>(docs);
}
