import * as XLSX from 'xlsx';
import { Payment, Family } from '../types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export interface ExcelExportOptions {
  payments: Payment[];
  families?: Family[];
  startDate?: string;
  endDate?: string;
  month?: number | 'all';
  year?: number | 'all';
  currencySymbol?: string;
  fileName?: string;
}

export function exportPaymentsToExcel({
  payments,
  families = [],
  startDate,
  endDate,
  month = 'all',
  year = 'all',
  currencySymbol = '₹',
  fileName
}: ExcelExportOptions): void {
  // Apply filtering if provided
  let filtered = [...payments];

  if (startDate) {
    filtered = filtered.filter((p) => p.payment_date >= startDate);
  }
  if (endDate) {
    filtered = filtered.filter((p) => p.payment_date <= endDate);
  }
  if (month && month !== 'all') {
    filtered = filtered.filter((p) => p.month === Number(month));
  }
  if (year && year !== 'all') {
    filtered = filtered.filter((p) => p.year === Number(year));
  }

  // Create workbook
  const wb = XLSX.utils.book_new();

  // Tab 1: Detailed Payment Transactions
  const paymentRows = filtered.map((p) => {
    const family = families.find((f) => f.id === p.family_id);
    const invoiceNum = p.invoice_number || (p.reference_no?.startsWith('INV') ? p.reference_no : `INV-${p.year || 2026}-${p.id.replace(/\D/g, '').padStart(4, '0')}`);
    const monthName = p.month >= 1 && p.month <= 12 ? MONTH_NAMES[p.month - 1] : `Month ${p.month}`;

    return {
      'Invoice #': invoiceNum,
      'Family Code / Ledger #': family?.family_code || 'N/A',
      'Payment Date': p.payment_date,
      'Billing Month & Year': `${monthName} ${p.year}`,
      'Family / Payer Name': p.family_name || family?.parent_name || 'N/A',
      [`Amount (${currencySymbol})`]: p.amount,
      'Payment Method': p.method ? p.method.toUpperCase().replace('_', ' ') : 'CASH',
      'Ref / Cheque / UTR #': p.reference_no || '',
      'Payment Status': p.status.toUpperCase(),
      'Recorded By': p.recorded_by || 'Staff',
      'Transaction ID': p.id,
      'Notes & Audit Remarks': p.notes || (p.status === 'void' ? `Void: ${p.void_reason || ''}` : '')
    };
  });

  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);

  // Set column widths for readability
  wsPayments['!cols'] = [
    { wch: 18 }, // Invoice #
    { wch: 22 }, // Family Code / Ledger #
    { wch: 14 }, // Payment Date
    { wch: 22 }, // Billing Month & Year
    { wch: 26 }, // Family Name
    { wch: 16 }, // Amount
    { wch: 16 }, // Payment Method
    { wch: 20 }, // Ref #
    { wch: 14 }, // Status
    { wch: 18 }, // Recorded By
    { wch: 16 }, // Transaction ID
    { wch: 35 }  // Notes
  ];

  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments Ledger');

  // Tab 2: Executive Summary & Filtering Details
  const nonVoidPayments = filtered.filter((p) => p.status !== 'void');
  const totalAmount = nonVoidPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const cashAmount = nonVoidPayments.filter((p) => p.method === 'cash').reduce((sum, p) => sum + p.amount, 0);
  const upiAmount = nonVoidPayments.filter((p) => p.method === 'upi').reduce((sum, p) => sum + p.amount, 0);
  const bankAmount = nonVoidPayments.filter((p) => p.method === 'bank_transfer').reduce((sum, p) => sum + p.amount, 0);
  const chequeAmount = nonVoidPayments.filter((p) => p.method === 'cheque').reduce((sum, p) => sum + p.amount, 0);

  const dateFilterDesc = startDate && endDate
    ? `From ${startDate} to ${endDate}`
    : startDate
    ? `From ${startDate} onwards`
    : endDate
    ? `Up to ${endDate}`
    : 'All Dates Included';

  const monthFilterDesc = month && month !== 'all'
    ? `${MONTH_NAMES[Number(month) - 1] || month}`
    : 'All Months Included';

  const summaryRows = [
    { 'Summary Parameter': 'Report Title', 'Detail': 'Tuition & Fee Collection Ledger (Excel Export)' },
    { 'Summary Parameter': 'Export Generated At', 'Detail': new Date().toLocaleString() },
    { 'Summary Parameter': 'Date Range Filter', 'Detail': dateFilterDesc },
    { 'Summary Parameter': 'Billing Month Filter', 'Detail': monthFilterDesc },
    { 'Summary Parameter': 'Billing Year Filter', 'Detail': year && year !== 'all' ? String(year) : 'All Years' },
    { 'Summary Parameter': 'Total Filtered Transactions', 'Detail': filtered.length },
    { 'Summary Parameter': 'Total Active Paid Records', 'Detail': nonVoidPayments.length },
    { 'Summary Parameter': `Total Collections (${currencySymbol})`, 'Detail': `${currencySymbol} ${totalAmount.toLocaleString()}` },
    { 'Summary Parameter': `Cash Collections (${currencySymbol})`, 'Detail': `${currencySymbol} ${cashAmount.toLocaleString()}` },
    { 'Summary Parameter': `UPI / Instant Collections (${currencySymbol})`, 'Detail': `${currencySymbol} ${upiAmount.toLocaleString()}` },
    { 'Summary Parameter': `Bank / ACH Collections (${currencySymbol})`, 'Detail': `${currencySymbol} ${bankAmount.toLocaleString()}` },
    { 'Summary Parameter': `Cheque Collections (${currencySymbol})`, 'Detail': `${currencySymbol} ${chequeAmount.toLocaleString()}` },
    { 'Summary Parameter': 'Voided Records Count', 'Detail': filtered.filter((p) => p.status === 'void').length }
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [
    { wch: 32 },
    { wch: 45 }
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Report');

  // Tab 3: Family Summary (if families available)
  if (families.length > 0) {
    const familyRows = families.map((f) => {
      const famPayments = nonVoidPayments.filter((p) => p.family_id === f.id);
      const famTotalPaid = famPayments.reduce((acc, p) => acc + p.amount, 0);
      const scheduledFee = f.fee_plan?.amount || f.fee_plans?.[0]?.amount || 0;

      return {
        'Family ID': f.id,
        'Family Code / Ledger #': f.family_code || 'N/A',
        'Parent / Family Name': f.parent_name,
        'Phone': f.phone,
        'Email': f.email,
        [`Scheduled Monthly Fee (${currencySymbol})`]: scheduledFee,
        [`Total Paid in Period (${currencySymbol})`]: famTotalPaid,
        'Status': f.status.toUpperCase(),
        'Last Known Payment': famPayments[0]?.payment_date || 'None'
      };
    });

    const wsFamilies = XLSX.utils.json_to_sheet(familyRows);
    wsFamilies['!cols'] = [
      { wch: 14 },
      { wch: 22 },
      { wch: 28 },
      { wch: 18 },
      { wch: 26 },
      { wch: 24 },
      { wch: 24 },
      { wch: 12 },
      { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(wb, wsFamilies, 'Family Accounts');
  }

  // Determine export file name
  let generatedName = fileName;
  if (!generatedName) {
    const dateStamp = new Date().toISOString().split('T')[0];
    if (month && month !== 'all') {
      const mStr = MONTH_NAMES[Number(month) - 1] || `M${month}`;
      generatedName = `Tuition_Payments_${mStr}_${year !== 'all' ? year : 2026}_${dateStamp}.xlsx`;
    } else if (startDate && endDate) {
      generatedName = `Tuition_Payments_${startDate}_to_${endDate}.xlsx`;
    } else {
      generatedName = `Tuition_Payments_Ledger_${dateStamp}.xlsx`;
    }
  }

  if (!generatedName.endsWith('.xlsx')) {
    generatedName += '.xlsx';
  }

  // Trigger file download
  XLSX.writeFile(wb, generatedName);
}
