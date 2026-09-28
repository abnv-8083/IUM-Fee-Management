import { Schema, model, type Model } from 'mongoose';
import type { SystemSettings } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

export interface SettingsDocument extends SystemSettings {
  /** Singleton key - always `system` so only one settings row can exist. */
  key: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
  currency_code: 'INR',
  currency_symbol: '₹',
  currency_name: 'Indian Rupee (INR)',
  currency_position: 'prefix',
  tuition_pricing_model: 'fixed_rate',
  fixed_tuition_rate: 100,
  enforce_fixed_rate_all: false,
  due_day: 2,
  grace_period_days: 5,
  sibling_discount_2nd: 10,
  sibling_discount_3rd: 15,
  high_risk_cutoff: 60,
};

const settingsSchema = new Schema<SettingsDocument>(
  {
    key: { type: String, required: true, unique: true, default: 'system' },
    currency_code: { type: String, default: DEFAULT_SETTINGS.currency_code },
    currency_symbol: { type: String, default: DEFAULT_SETTINGS.currency_symbol },
    currency_name: { type: String, default: DEFAULT_SETTINGS.currency_name },
    currency_position: {
      type: String,
      enum: ['prefix', 'suffix'],
      default: DEFAULT_SETTINGS.currency_position,
    },
    tuition_pricing_model: {
      type: String,
      enum: ['fixed_rate', 'tiered', 'custom'],
      default: DEFAULT_SETTINGS.tuition_pricing_model,
    },
    fixed_tuition_rate: { type: Number, default: DEFAULT_SETTINGS.fixed_tuition_rate },
    enforce_fixed_rate_all: { type: Boolean, default: DEFAULT_SETTINGS.enforce_fixed_rate_all },
    due_day: { type: Number, default: DEFAULT_SETTINGS.due_day },
    grace_period_days: { type: Number, default: DEFAULT_SETTINGS.grace_period_days },
    sibling_discount_2nd: { type: Number, default: DEFAULT_SETTINGS.sibling_discount_2nd },
    sibling_discount_3rd: { type: Number, default: DEFAULT_SETTINGS.sibling_discount_3rd },
    high_risk_cutoff: { type: Number, default: DEFAULT_SETTINGS.high_risk_cutoff },
  },
  baseSchemaOptions
);

export const SettingsModel: Model<SettingsDocument> = model<SettingsDocument>(
  'Settings',
  settingsSchema
);
