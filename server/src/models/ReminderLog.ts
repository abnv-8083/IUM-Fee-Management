import { Schema, model, type Model } from 'mongoose';
import type { ReminderLog } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const reminderLogSchema = new Schema<ReminderLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    family_id: { type: String, required: true, index: true },
    family_name: { type: String },
    channel: {
      type: String,
      enum: ['whatsapp', 'sms', 'email', 'manual'],
      default: 'whatsapp',
    },
    message: { type: String, required: true },
    tone: { type: String, enum: ['gentle', 'polite', 'firm', 'final'], default: 'polite' },
    suggested_time: { type: String, default: 'Immediate' },
    sent_at: { type: String, required: true, index: true },
    sent_by: { type: String, default: 'Staff' },
    status: {
      type: String,
      enum: ['drafted', 'sent', 'delivered'],
      default: 'sent',
    },
  },
  baseSchemaOptions
);

export const ReminderLogModel: Model<ReminderLog> = model<ReminderLog>(
  'ReminderLog',
  reminderLogSchema
);
