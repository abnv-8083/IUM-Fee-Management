import { Schema, model, type Model } from 'mongoose';
import type { AuditLog } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const auditLogSchema = new Schema<AuditLog>(
  {
    id: { type: String, required: true, unique: true, index: true },
    timestamp: { type: String, required: true, index: true },
    entity: {
      type: String,
      enum: ['payment', 'family', 'student', 'fee_plan', 'settings'],
      required: true,
      index: true,
    },
    entity_id: { type: String, required: true, index: true },
    action: { type: String, enum: ['create', 'edit', 'void', 'delete'], required: true },
    performed_by: { type: String, required: true },
    details: { type: String, required: true },
    previous_state: { type: Schema.Types.Mixed },
    new_state: { type: Schema.Types.Mixed },
  },
  baseSchemaOptions
);

export const AuditLogModel: Model<AuditLog> = model<AuditLog>('AuditLog', auditLogSchema);
