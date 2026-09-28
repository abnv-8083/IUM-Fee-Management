import { Schema, model, type Model } from 'mongoose';
import type { Family } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const familySchema = new Schema<Family>(
  {
    id: { type: String, required: true, unique: true, index: true },
    // Uniqueness is enforced case-insensitively in `family.service.ts`. A DB-level
    // unique index is intentionally avoided so restoring a legacy backup cannot
    // fail with a raw duplicate-key error.
    family_code: { type: String, required: true, trim: true, index: true },
    parent_name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    address: { type: String, trim: true },
    // Stored as an ISO string to match the API contract consumed by the client.
    created_at: { type: String, required: true },
    notes: { type: String },
    status: { type: String, enum: ['active', 'inactive'], default: 'active', index: true },
  },
  baseSchemaOptions
);

export const FamilyModel: Model<Family> = model<Family>('Family', familySchema);
