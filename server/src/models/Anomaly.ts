import { Schema, model, type Model } from 'mongoose';
import type { Anomaly } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const anomalySchema = new Schema<Anomaly>(
  {
    id: { type: String, required: true, unique: true, index: true },
    type: {
      type: String,
      enum: ['amount_deviation', 'duplicate_entry', 'spike', 'unusual_delay'],
      required: true,
    },
    family_id: { type: String, index: true },
    family_name: { type: String },
    payment_id: { type: String },
    amount: { type: Number },
    expected_amount: { type: Number },
    severity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    description: { type: String, required: true },
    detected_at: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['pending_review', 'resolved', 'dismissed'],
      default: 'pending_review',
      index: true,
    },
    resolution_notes: { type: String },
    resolved_by: { type: String },
  },
  baseSchemaOptions
);

export const AnomalyModel: Model<Anomaly> = model<Anomaly>('Anomaly', anomalySchema);
