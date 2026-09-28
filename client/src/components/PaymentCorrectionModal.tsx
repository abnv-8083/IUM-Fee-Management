import React, { useState } from 'react';
import { AUDIT_ACTOR, Payment } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import { Edit, X, AlertCircle, Receipt, Sparkles, Slash } from 'lucide-react';

export type CorrectionMode = 'edit' | 'void';

interface PaymentCorrectionModalProps {
  /** The payment under correction. */
  payment: Payment | null;
  mode: CorrectionMode | null;
  onClose: () => void;
  /** Called after a successful save so the caller can refetch. */
  onSaved: () => void;
}

const BILLING_MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September (Current)' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' }
];

const PAYMENT_METHODS: { value: Payment['method']; label: string }[] = [
  { value: 'cash', label: 'Cash in hand' },
  { value: 'upi', label: 'UPI / Instant Pay' },
  { value: 'cheque', label: 'Bank Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer / ACH' }
];

/**
 * Edit and void a recorded payment.
 *
 * Both operations are audit-tracked, so each demands a written reason before it
 * will talk to the API. Lifted out of the ledger so the dashboard can offer the
 * same corrections now that the ledger view is gone.
 */
export const PaymentCorrectionModal: React.FC<PaymentCorrectionModalProps> = ({
  payment,
  mode,
  ...rest
}) => {
  if (!payment || !mode) return null;
  // Keyed so switching records resets every field instead of leaking state.
  return <CorrectionForm key={`${mode}-${payment.id}`} payment={payment} mode={mode} {...rest} />;
};

const CorrectionForm: React.FC<{ payment: Payment; mode: CorrectionMode } & Omit<
  PaymentCorrectionModalProps,
  'payment' | 'mode'
>> = ({ payment, mode, onClose, onSaved }) => {
  const { formatMoney, currencySymbol } = useCurrency();

  const [invoiceNumber, setInvoiceNumber] = useState(
    payment.invoice_number || `INV-${payment.year || 2026}-${payment.id.replace(/\D/g, '')}`
  );
  const [amount, setAmount] = useState<number>(payment.amount);
  const [paymentDate, setPaymentDate] = useState(
    payment.payment_date || new Date().toISOString().split('T')[0]
  );
  const [month, setMonth] = useState<number>(payment.month || 9);
  const [year, setYear] = useState<number>(payment.year || 2026);
  const [method, setMethod] = useState<Payment['method']>(payment.method || 'cash');
  const [referenceNo, setReferenceNo] = useState(payment.reference_no || '');
  const [status, setStatus] = useState<Payment['status']>(payment.status || 'paid');
  const [notes, setNotes] = useState(payment.notes || '');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const performedBy = AUDIT_ACTOR;

  const handleVoid = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!reason.trim()) {
      setError('A mandatory audit reason is required to void a financial transaction.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${payment.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason.trim(), performed_by: performedBy })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to void payment.');
        return;
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!invoiceNumber.trim()) {
      setError('Invoice number is strictly mandatory. Please provide a valid invoice number.');
      return;
    }
    if (!reason.trim()) {
      setError('Mandatory audit explanation is required to edit financial transactions.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/payments/${payment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            invoice_number: invoiceNumber.trim(),
            amount: Number(amount),
            payment_date: paymentDate,
            month: Number(month),
            year: Number(year),
            method,
            reference_no: referenceNo.trim(),
            status,
            notes: notes.trim()
          },
          reason: reason.trim(),
          performed_by: performedBy
        })
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to update payment.');
        return;
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error occurred.');
    } finally {
      setIsSaving(false);
    }
  };

  const errorBanner = error && (
    <div className="mx-6 mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
      <div>{error}</div>
    </div>
  );

  if (mode === 'void') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
        <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-slate-200 bg-rose-50/70 px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-rose-600 p-1.5 text-white">
                <Slash className="h-4 w-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">Void Payment Record</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {errorBanner}

          <form onSubmit={handleVoid} className="space-y-4 p-6">
            <p className="text-xs text-slate-600">
              You are voiding receipt <strong>{payment.id}</strong> (Invoice:{' '}
              <strong>{payment.invoice_number || 'N/A'}</strong>) for{' '}
              <strong>{payment.family_name}</strong> ({formatMoney(payment.amount)}). A mandatory audit reason
              is required.
            </p>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Reason for Voiding *
              </label>
              <textarea
                id="void-reason-textarea"
                required
                rows={3}
                placeholder="e.g. Cheque bounced / Duplicate staff entry..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                id="confirm-void-payment-btn"
                type="submit"
                disabled={isSaving}
                className="cursor-pointer rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isSaving ? 'Voiding...' : 'Confirm Void'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-indigo-600 p-1.5 text-white">
              <Edit className="h-4 w-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Edit Payment Transaction</h3>
              <p className="text-xs text-slate-500">
                Editing payment record for <strong>{payment.family_name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorBanner}

        <form onSubmit={handleEdit} className="max-h-[80vh] space-y-4 overflow-y-auto p-6">
          {/* Mandatory Invoice Number */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
            <div className="mb-1 flex items-center justify-between">
              <label className="block flex items-center gap-1 text-xs font-bold text-slate-900">
                <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                Invoice Number <span className="text-rose-600">* (Mandatory)</span>
              </label>
              <button
                type="button"
                onClick={() => setInvoiceNumber(`INV-${year}-${Math.floor(1000 + Math.random() * 9000)}`)}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
              >
                <Sparkles className="h-3 w-3" />
                Generate New
              </button>
            </div>
            <input
              id="edit-invoice-number-input"
              type="text"
              required
              placeholder="e.g. INV-2026-1049"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-sm font-bold tracking-wide focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Amount Paid ({currencySymbol}) *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                  {currencySymbol}
                </span>
                <input
                  id="edit-amount-input"
                  type="number"
                  required
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Date *</label>
              <input
                id="edit-date-input"
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Fee Term */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Billing Month</label>
              <select
                id="edit-month-select"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none"
              >
                {BILLING_MONTHS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Billing Year</label>
              <input
                id="edit-year-input"
                type="number"
                min="2020"
                max="2035"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium focus:outline-none"
              />
            </div>
          </div>

          {/* Method & Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Method</label>
              <select
                id="edit-method-select"
                value={method}
                onChange={(e) => setMethod(e.target.value as Payment['method'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm capitalize focus:outline-none"
              >
                {PAYMENT_METHODS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Payment Status</label>
              <select
                id="edit-status-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as Payment['status'])}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium capitalize focus:outline-none"
              >
                <option value="paid">Paid (Fully Cleared)</option>
                <option value="partial">Partial Payment</option>
              </select>
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ref # / Cheque # <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="edit-ref-input"
                type="text"
                placeholder="e.g. CHQ-994201 or UTR-49102"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Notes / Remarks <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                id="edit-notes-input"
                type="text"
                placeholder="e.g. Cleared via counter desk"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none"
              />
            </div>
          </div>

          {/* Mandatory Audit Reason */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-900">
              Mandatory Audit Explanation *
            </label>
            <textarea
              id="edit-reason-textarea"
              required
              rows={2}
              placeholder="Explain why this payment is being edited (e.g., corrected invoice number, changed method from cash to UPI)..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              id="save-payment-edit-btn"
              type="submit"
              disabled={isSaving}
              className="cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving Changes...' : 'Save & Log Audit Trail'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
