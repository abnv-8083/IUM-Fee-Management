import { Schema, model, type Model } from 'mongoose';
import type { Payment } from '../types/index.js';
import { baseSchemaOptions } from './schemaOptions.js';

const paymentSchema = new Schema<Payment>(
  {
    id: { type: String, required: true, unique: true, index: true },
    family_id: { type: String, required: true, index: true },
    family_name: { type: String },
    fee_plan_id: { type: String },
    amount: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12, index: true },
    year: { type: Number, required: true, index: true },
    payment_date: { type: String, required: true, index: true },
    due_date: { type: String, required: true },
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'upi', 'cheque', 'card'],
      default: 'cash',
    },
    invoice_number: { type: String, required: true, trim: true },
    reference_no: { type: String },
    status: { type: String, enum: ['paid', 'partial', 'void'], default: 'paid', index: true },
    void_reason: { type: String },
    notes: { type: String },
    recorded_by: { type: String, default: 'Front Desk Staff' },
    created_at: { type: String, required: true },
    updated_at: { type: String },
  },
  baseSchemaOptions
);

// Invoice numbers must be unique among non-void records. Because voided invoices
// are released for reuse, a plain unique index is too strict and no partial
// expression can express `status != 'void'`; the rule is validated in
// `payment.service.ts` instead and the index below just speeds up lookup.
paymentSchema.index({ invoice_number: 1 });
paymentSchema.index({ family_id: 1, year: 1, month: 1 });

export const PaymentModel: Model<Payment> = model<Payment>('Payment', paymentSchema);
