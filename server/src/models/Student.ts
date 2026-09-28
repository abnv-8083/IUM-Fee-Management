import { Schema, model, type Model } from 'mongoose';
import type { Student } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const studentSchema = new Schema<Student>(
  {
    id: { type: String, required: true, unique: true, index: true },
    family_id: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    grade: { type: String, default: 'General', trim: true },
    enrollment_date: { type: String, required: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'graduated'],
      default: 'active',
      index: true,
    },
  },
  baseSchemaOptions
);

export const StudentModel: Model<Student> = model<Student>('Student', studentSchema);
