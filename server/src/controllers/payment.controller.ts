import type { Request, Response } from 'express';
import { editPayment, recordPayment, voidPayment } from '../services/payment.service.js';

/** POST /api/payments */
export async function createPayment(req: Request, res: Response) {
  const {
    family_id, amount, month, year, payment_date, method,
    invoice_number, reference_no, notes, recorded_by,
  } = req.body;

  if (!family_id || !amount || !month || !year) {
    return res
      .status(400)
      .json({ error: 'Missing required payment fields (family_id, amount, month, year).' });
  }
  if (!invoice_number || !String(invoice_number).trim()) {
    return res
      .status(400)
      .json({ error: 'Invoice number is mandatory when recording a payment.' });
  }

  const result = await recordPayment({
    family_id,
    amount: Number(amount),
    month: Number(month),
    year: Number(year),
    payment_date: payment_date || new Date().toISOString().split('T')[0],
    method: method || 'cash',
    invoice_number: String(invoice_number).trim(),
    reference_no,
    notes,
    recorded_by: recorded_by || 'Front Desk Staff',
  });

  if (!result.success) {
    return res.status(409).json({ error: result.message });
  }

  res.status(201).json({ success: true, payment: result.payment });
}

/** POST /api/payments/:id/void */
export async function voidPaymentHandler(req: Request, res: Response) {
  const { id } = req.params;
  const { reason, performed_by } = req.body;

  if (!reason) {
    return res
      .status(400)
      .json({ error: 'Void reason is mandatory for audit trail compliance.' });
  }

  const result = await voidPayment(id, reason, performed_by || 'Accountant');
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ success: true });
}

/** PUT /api/payments/:id */
export async function updatePayment(req: Request, res: Response) {
  const { id } = req.params;
  const { updates, reason, performed_by } = req.body;

  if (!reason) {
    return res
      .status(400)
      .json({ error: 'Audit explanation reason is required when modifying payment records.' });
  }

  const result = await editPayment(id, updates || {}, reason, performed_by || 'Accountant');
  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ success: true, payment: result.payment });
}
