import type { SystemSettings } from '../types/index.js';
import {
  AnomalyModel,
  AuditLogModel,
  DEFAULT_SETTINGS,
  FamilyModel,
  FeePlanModel,
  PaymentModel,
  ReminderLogModel,
  SettingsModel,
  StudentModel,
  generateId,
  toPlain,
  type SettingsDocument,
} from '../models/index.js';
import { recordAudit } from './audit.service.js';

/** Reads the singleton settings document, seeding defaults on first run. */
export async function getSettings(): Promise<SystemSettings> {
  const existing = await SettingsModel.findOne({ key: 'system' }).lean();
  if (existing) {
    return stripKey(existing as SettingsDocument);
  }

  const created = await SettingsModel.create({ ...DEFAULT_SETTINGS, key: 'system' });
  return stripKey(created.toJSON() as SettingsDocument);
}

export async function updateSettings(
  updates: Partial<SystemSettings>,
  performedBy: string = 'Admin'
): Promise<{ success: boolean; settings: SystemSettings }> {
  const previous = await getSettings();

  const saved = await SettingsModel.findOneAndUpdate(
    { key: 'system' },
    { $set: updates, $setOnInsert: { key: 'system' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).lean();

  const settings = stripKey(saved as SettingsDocument);

  await recordAudit({
    entity: 'settings',
    entity_id: 'system_settings',
    action: 'edit',
    performed_by: performedBy || 'Admin',
    details: `Updated institutional system settings: currency=${settings.currency_code} (${settings.currency_symbol}), pricing_model=${settings.tuition_pricing_model}, fixed_rate=${settings.fixed_tuition_rate}.`,
    previous_state: previous,
    new_state: settings,
  });

  return { success: true, settings };
}

/**
 * Applies a single tuition rate to every active family, creating a fee plan for
 * any family that does not have one yet.
 */
export async function applyFixedRateToAllFamilies(
  rate: number,
  performedBy: string = 'Admin'
): Promise<{ success: boolean; updated_count: number; rate: number }> {
  const activeFamilies = await FamilyModel.find({ status: 'active' }).select('id').lean();
  const existingPlans = await FeePlanModel.find({
    family_id: { $in: activeFamilies.map((f) => f.id) },
  }).lean();

  const planByFamily = new Map(existingPlans.map((plan) => [plan.family_id, plan]));
  const today = new Date().toISOString().split('T')[0];

  const operations = activeFamilies.map((family) => {
    const existing = planByFamily.get(family.id);

    if (existing) {
      return {
        updateOne: {
          filter: { id: existing.id },
          update: { $set: { amount: rate, fee_type: 'tuition', billing_cycle: 'monthly' } },
        },
      };
    }

    return {
      insertOne: {
        document: {
          id: generateId('plan'),
          family_id: family.id,
          amount: rate,
          fee_type: 'tuition',
          billing_cycle: 'monthly',
          effective_from: today,
        },
      },
    };
  });

  if (operations.length > 0) {
    await FeePlanModel.bulkWrite(operations as any);
  }

  await updateSettingsQuietly({ fixed_tuition_rate: rate, tuition_pricing_model: 'fixed_rate' });

  const settings = await getSettings();
  await recordAudit({
    entity: 'fee_plan',
    entity_id: 'all_families',
    action: 'edit',
    performed_by: performedBy || 'Admin',
    details: `Applied standard fixed tuition rate of ${settings.currency_symbol}${rate}/month across ${operations.length} enrolled families.`,
  });

  return { success: true, updated_count: operations.length, rate };
}

/**
 * Wipes every transactional collection and restores factory settings.
 * Used before a public launch so no sample data ships with the app.
 */
export async function clearDatabase(
  performedBy = 'Admin'
): Promise<{ success: boolean; message: string }> {
  await Promise.all([
    FamilyModel.deleteMany({}),
    StudentModel.deleteMany({}),
    FeePlanModel.deleteMany({}),
    PaymentModel.deleteMany({}),
    AnomalyModel.deleteMany({}),
    ReminderLogModel.deleteMany({}),
    AuditLogModel.deleteMany({}),
  ]);

  await SettingsModel.findOneAndUpdate(
    { key: 'system' },
    {
      $set: {
        ...DEFAULT_SETTINGS,
        currency_code: 'INR',
        currency_symbol: '₹',
        currency_name: 'Indian Rupee (INR)',
        currency_position: 'prefix',
      },
      $setOnInsert: { key: 'system' },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );

  await recordAudit({
    entity: 'settings',
    entity_id: 'system_database',
    action: 'edit',
    performed_by: performedBy,
    details:
      'Initialized fresh production database with Indian Rupee (INR / ₹) and cleared all sample records for public launch.',
  });

  return {
    success: true,
    message: 'All dummy records wiped and currency configured to Indian Rupee (₹).',
  };
}

/** Updates settings without writing an audit entry (used for internal syncs). */
async function updateSettingsQuietly(updates: Partial<SystemSettings>): Promise<void> {
  await SettingsModel.findOneAndUpdate(
    { key: 'system' },
    { $set: updates, $setOnInsert: { key: 'system' } },
    { upsert: true, setDefaultsOnInsert: true }
  );
}

/** Removes the singleton `key` plus Mongo internals from a settings document. */
function stripKey(doc: SettingsDocument): SystemSettings {
  const { key, ...settings } = toPlain<SettingsDocument>(doc);
  return settings as SystemSettings;
}
