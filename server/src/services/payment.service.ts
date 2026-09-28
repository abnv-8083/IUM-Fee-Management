import type { Payment } from '../types/index.js';
import { FamilyModel, FeePlanModel, PaymentModel, generateId, toPlain } from '../models/index.js';
import { recordAudit } from './audit.service.js';
import { getSettings } from './settings.service.js';

export interface RecordPaymentInput {
  family_id: string;
  amount: number;
  month: number;
  year: number;
  payment_date?: string;
  method?: Payment['method'];
  invoice_number: string;
  reference_no?: string;
  notes?: string;
  recorded_by?: string;
  status?: Payment['status'];
}

/** Case-insensitive invoice lookup restricted to records that are not void. */
async function findLiveInvoice(invoice: string, excludeId?: string) {
  const escaped = invoice.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const filter: Record<string, unknown> = {
    invoice_number: new RegExp(`^${escaped}$`, 'i'),
    status: { $ne: 'void' },
  };
  if (excludeId) filter.id = { $ne: excludeId };
  return toPlain<Payment | null>(await PaymentModel.findOne(filter).lean());
}

export async function recordPayment(
  data: RecordPaymentInput
): Promise<{ success: boolean; payment?: Payment; message?: string }> {
  const recorder = data.recorded_by || 'Front Desk Staff';

  if (!data.invoice_number || !data.invoice_number.trim()) {
    return { success: false, message: 'Invoice Number is mandatory when recording a payment.' };
  }

  const invoiceTrimmed = data.invoice_number.trim();

  const existingInvoice = await findLiveInvoice(invoiceTrimmed);
  if (existingInvoice) {
    return {
      success: false,
      message: `Invoice Number "${invoiceTrimmed}" already exists on payment #${existingInvoice.id} (${existingInvoice.family_name}). Please enter a unique invoice number.`,
    };
  }

  // Duplicate guard: same family, month and year that is already settled.
  const existingPayment = toPlain<Payment>(await PaymentModel.findOne({
    family_id: data.family_id,
    month: data.month,
    year: data.year,
    status: 'paid',
  }).lean());

  if (existingPayment) {
    const settings = await getSettings();
    return {
      success: false,
      message: `Duplicate Payment Warning: A paid record (#${existingPayment.id}) for ${settings.currency_symbol}${existingPayment.amount} already exists for this family in month ${data.month}/${data.year}.`,
    };
  }

  const [family, plan] = await Promise.all([
    FamilyModel.findOne({ id: data.family_id }).lean(),
    FeePlanModel.findOne({ family_id: data.family_id }).lean(),
  ]);


  const newId = generateId('pay');
  const dueDateStr = `${data.year}-${String(data.month).padStart(2, '0')}-02`;

  const newPayment: Payment = {
    id: newId,
    family_id: data.family_id,
    family_name: family?.parent_name || 'Family',
    fee_plan_id: plan?.id,
    amount: data.amount,
    month: data.month,
    year: data.year,
    payment_date: data.payment_date || new Date().toISOString().split('T')[0],
    due_date: dueDateStr,
    method: data.method || 'cash',
    invoice_number: invoiceTrimmed,
    reference_no: data.reference_no,
    status: data.status || (plan && data.amount < plan.amount ? 'partial' : 'paid'),
    notes: data.notes,
    recorded_by: recorder,
    created_at: new Date().toISOString(),
  };

  await PaymentModel.create(newPayment);

  const settings = await getSettings();
  await recordAudit({
    entity: 'payment',
    entity_id: newId,
    action: 'create',
    performed_by: recorder,
    details: `Collected ${settings.currency_symbol}${newPayment.amount} [Invoice: ${invoiceTrimmed}] via ${newPayment.method.toUpperCase()} for ${family?.parent_name || 'Family'} (Term: ${newPayment.month}/${newPayment.year}).`,
    new_state: newPayment,
  });

  return { success: true, payment: newPayment };
}

export async function voidPayment(
  paymentId: string,
  reason: string,
  performedBy: string
): Promise<{ success: boolean; message?: string }> {
  const payment = toPlain<Payment>(await PaymentModel.findOne({ id: paymentId }).lean());
  if (!payment) {
    return { success: false, message: 'Payment record not found.' };
  }

  if (payment.status === 'void') {
    return { success: false, message: 'Payment is already voided.' };
  }

  const previousState = { ...payment };

  const updated = toPlain<Payment>(
    await PaymentModel.findOneAndUpdate(
      { id: paymentId },
      { $set: { status: 'void', void_reason: reason, updated_at: new Date().toISOString() } },
      { new: true }
    ).lean()
  );

  await recordAudit({
    entity: 'payment',
    entity_id: paymentId,
    action: 'void',
    performed_by: performedBy || 'Accountant',
    details: `Voided payment #${paymentId} (${payment.amount}). Reason: ${reason}`,
    previous_state: previousState,
    new_state: updated,
  });

  return { success: true };
}

export async function editPayment(
  paymentId: string,
  updates: Partial<Payment>,
  reason: string,
  performedBy: string
): Promise<{ success: boolean; payment?: Payment; message?: string }> {
  const payment = toPlain<Payment>(await PaymentModel.findOne({ id: paymentId }).lean());
  if (!payment) {
    return { success: false, message: 'Payment record not found.' };
  }

  const previousState = { ...payment };
  const set: Record<string, any> = {};

  if (updates.invoice_number !== undefined) {
    const trimmedInv = String(updates.invoice_number).trim();
    if (!trimmedInv) {
      return { success: false, message: 'Invoice number cannot be blank. It is a mandatory field.' };
    }
    const duplicate = await findLiveInvoice(trimmedInv, paymentId);
    if (duplicate) {
      return {
        success: false,
        message: `Invoice Number "${trimmedInv}" is already used on payment #${duplicate.id} (${duplicate.family_name}).`,
      };
    }
    set.invoice_number = trimmedInv;
  }

  if (updates.amount !== undefined) set.amount = Number(updates.amount);
  if (updates.method) set.method = updates.method;
  if (updates.reference_no !== undefined) set.reference_no = updates.reference_no;
  if (updates.notes !== undefined) set.notes = updates.notes;
  if (updates.payment_date) set.payment_date = updates.payment_date;
  if (updates.month !== undefined) set.month = Number(updates.month);
  if (updates.year !== undefined) set.year = Number(updates.year);
  if (updates.status) set.status = updates.status;

  const month = set.month ?? payment.month;
  const year = set.year ?? payment.year;
  if (month && year) {
    set.due_date = `${year}-${String(month).padStart(2, '0')}-02`;
  }

  set.updated_at = new Date().toISOString();

  const saved = toPlain<Payment>(
    await PaymentModel.findOneAndUpdate({ id: paymentId }, { $set: set }, { new: true }).lean()
  );

  const settings = await getSettings();
  await recordAudit({
    entity: 'payment',
    entity_id: paymentId,
    action: 'edit',
    performed_by: performedBy || 'Accountant',
    details: `Edited payment #${paymentId} (Invoice: ${saved.invoice_number}). Reason: ${reason}. Amount: ${settings.currency_symbol}${saved.amount}, Method: ${saved.method}`,
    previous_state: previousState,
    new_state: saved,
  });

  return { success: true, payment: saved };
}

export async function listPayments(): Promise<Payment[]> {
  const docs = await PaymentModel.find().sort({ created_at: -1 }).lean();
  return toPlain<Payment[]>(docs);
}
