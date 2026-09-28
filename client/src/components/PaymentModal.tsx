import React, { useState, useEffect } from 'react';
import { Family } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import {
  X,
  Receipt,
  Camera,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  Calendar,
  CreditCard,
  FileText,
  Sparkles
} from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  families: Family[];
  preselectedFamily?: Family;
  preselectedAmount?: number;
  onPaymentSuccess: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  families,
  preselectedFamily,
  preselectedAmount,
  onPaymentSuccess
}) => {
  const { formatMoney, currencySymbol, settings } = useCurrency();
  const [selectedFamilyId, setSelectedFamilyId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState<number>(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
  const [month, setMonth] = useState<number>(9);
  const [year, setYear] = useState<number>(2026);
  const [paymentDate, setPaymentDate] = useState<string>('2026-09-10');
  const [method, setMethod] = useState<'cash' | 'cheque' | 'bank_transfer' | 'upi'>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [recordedBy, setRecordedBy] = useState('Front Desk Staff');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ocrScanning, setOcrScanning] = useState(false);
  const [ocrSuccess, setOcrSuccess] = useState(false);

  const generateNextInvoice = (targetYear: number = 2026) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return `INV-${targetYear}-${randomSuffix}`;
  };

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage('');
      setOcrSuccess(false);
      return;
    }

    // Auto-suggest next invoice number if empty
    if (!invoiceNumber) {
      setInvoiceNumber(generateNextInvoice(year));
    }

    if (preselectedFamily) {
      setSelectedFamilyId(preselectedFamily.id);
      setAmount(preselectedAmount || preselectedFamily.fee_plan?.amount || 350);
    } else if (families.length > 0 && !selectedFamilyId) {
      setSelectedFamilyId(families[0].id);
      setAmount(families[0].fee_plan?.amount || 350);
    }
  }, [isOpen, preselectedFamily, families]);

  if (!isOpen) return null;

  const handleFamilyChange = (famId: string) => {
    setSelectedFamilyId(famId);
    const fam = families.find((f) => f.id === famId);
    if (fam && fam.fee_plan) {
      setAmount(fam.fee_plan.amount);
    }
  };

  const handleSimulateOCR = async () => {
    setOcrScanning(true);
    setErrorMessage('');
    try {
      const fam = families.find((f) => f.id === selectedFamilyId);
      const res = await fetch('/api/ocr/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `BANK CHEQUE / COUNTERFOIL - ${fam?.parent_name || 'Tuition Pay'} - Amount: ${currencySymbol}${amount}.00 - Date: 2026-09-09 - Chq# 884192`
        })
      });

      const data = await res.json();
      if (data.success && data.extracted) {
        setAmount(data.extracted.amount);
        setReferenceNo(data.extracted.reference_no);
        setMethod('cheque');
        if (!invoiceNumber) {
          setInvoiceNumber(`INV-${year}-${Math.floor(1000 + Math.random() * 9000)}`);
        }
        setOcrSuccess(true);
        setTimeout(() => setOcrSuccess(false), 3000);
      }
    } catch (err) {
      console.error('OCR Simulation failed:', err);
    } finally {
      setOcrScanning(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Strict validation: Invoice Number is mandatory
    if (!invoiceNumber || !invoiceNumber.trim()) {
      setErrorMessage('Invoice Number is mandatory. Please enter a valid invoice number or click "Auto-generate".');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: selectedFamilyId,
          amount: Number(amount),
          month: Number(month),
          year: Number(year),
          payment_date: paymentDate,
          method,
          invoice_number: invoiceNumber.trim(),
          reference_no: referenceNo,
          notes,
          recorded_by: recordedBy
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to record payment.');
        return;
      }

      onPaymentSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const monthsList = [
    { num: 5, name: 'May 2026' },
    { num: 6, name: 'June 2026' },
    { num: 7, name: 'July 2026' },
    { num: 8, name: 'August 2026' },
    { num: 9, name: 'September 2026 (Current)' },
    { num: 10, name: 'October 2026 (Advance)' },
    { num: 11, name: 'November 2026 (Advance)' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <Receipt className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Record Tuition Fee Payment</h3>
              <p className="text-xs text-slate-500">Generates immutable audit receipt & updates risk model</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Payment Error:</span> {errorMessage}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Family Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Tuition Family *</label>
            <select
              id="payment-family-select"
              required
              value={selectedFamilyId}
              onChange={(e) => handleFamilyChange(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            >
              {families.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.family_code ? `[${f.family_code}] ` : ''}{f.parent_name} ({f.phone}) — Scheduled: {formatMoney(f.fee_plan?.amount || 350)}/mo
                </option>
              ))}
            </select>
          </div>

          {/* Invoice Number (Mandatory) */}
          <div className="bg-amber-50/50 border border-amber-200/80 p-3.5 rounded-xl">
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                Invoice Number <span className="text-rose-600 font-bold">* (Mandatory)</span>
              </label>
              <button
                type="button"
                onClick={() => setInvoiceNumber(generateNextInvoice(year))}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                Auto-generate
              </button>
            </div>
            <input
              id="payment-invoice-number-input"
              type="text"
              required
              placeholder="e.g. INV-2026-1049"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold font-mono tracking-wide rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Required for institutional auditing, fee receipts, and Excel ledger reporting.
            </p>
          </div>

          {/* Amount & Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">Amount Paid ({currencySymbol}) *</label>
                <button
                  type="button"
                  onClick={handleSimulateOCR}
                  disabled={ocrScanning}
                  title="Simulate optical receipt/cheque reader"
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5 cursor-pointer"
                >
                  <Camera className="w-3 h-3" />
                  {ocrScanning ? 'Scanning...' : 'OCR Scan'}
                </button>
              </div>
              <div className="relative">
                <span className="text-xs font-bold text-slate-500 absolute left-3 top-1/2 -translate-y-1/2">{currencySymbol}</span>
                <input
                  id="payment-amount-input"
                  type="number"
                  step="1"
                  required
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Month *</label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
              >
                {monthsList.map((m) => (
                  <option key={m.num} value={m.num}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {ocrSuccess && (
            <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>OCR Scanner auto-verified check amount and generated reference code.</span>
            </div>
          )}

          {/* Payment Method & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={method}
                onChange={(e: any) => setMethod(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white capitalize"
              >
                <option value="cash">Cash in hand</option>
                <option value="upi">UPI / Instant Pay</option>
                <option value="cheque">Bank Cheque</option>
                <option value="bank_transfer">Direct ACH / Wire</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Date</label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Reference & Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ref # / Cheque # <span className="font-normal text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. CHQ-994201"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Collector Staff</label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transaction Memo / Notes</label>
            <input
              type="text"
              placeholder="e.g. Received at reception, student picked up books"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-payment-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment & Print Receipt'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
