import { Schema, model, type Model } from 'mongoose';
import type { FeePlan } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const feePlanSchema = new Schema<FeePlan>(
  {
    id: { type: String, required: true, unique: true, index: true },
    family_id: { type: String, required: true, index: true },
    student_id: { type: String },
    amount: { type: Number, required: true, min: 0 },
    fee_type: {
      type: String,
      enum: ['tuition', 'transport', 'books', 'lab', 'combo'],
      default: 'tuition',
    },
    billing_cycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'monthly',
    },
    effective_from: { type: String, required: true },
  },
  baseSchemaOptions
);

export const FeePlanModel: Model<FeePlan> = model<FeePlan>('FeePlan', feePlanSchema);
