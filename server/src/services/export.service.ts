import * as XLSX from 'xlsx';
import { getAllRiskScores, getPendingFeeItems } from './dashboard.service.js';
import { loadCoreCollections } from './family.service.js';
import { getSettings } from './settings.service.js';

const MONTH_LABEL_LIST = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Escapes a value for inclusion in a quoted CSV cell. */
function csvCell(value: unknown): string {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export async function generateCsvExport(
  type: 'pending' | 'ledger' | 'risk'
): Promise<string> {
  const collections = await loadCoreCollections();

  if (type === 'pending') {
    const pending = getPendingFeeItems(collections, getAllRiskScores(collections));
    const headers = [
      'Family ID', 'Parent Name', 'Phone', 'Email', 'Students Count',
      'Monthly Due', 'Due Date', 'Days Overdue', 'Risk Tier', 'Risk Score',
      'Suggested Discount Tier',
    ];
    const rows = pending.map((p) => [
      csvCell(p.family.id),
      csvCell(p.family.parent_name),
      csvCell(p.family.phone),
      csvCell(p.family.email),
      p.students.length,
      p.monthly_fee,
      p.due_date,
      p.days_overdue,
      p.risk_score.tier.toUpperCase(),
      p.risk_score.score,
      csvCell(p.suggested_discount_tier || 'None'),
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  if (type === 'ledger') {
    const headers = [
      'Payment ID', 'Family Name', 'Month/Year', 'Amount', 'Date Paid',
      'Due Date', 'Method', 'Status', 'Reference No', 'Recorded By',
    ];
    const rows = collections.payments.map((p: any) => [
      csvCell(p.id),
      csvCell(p.family_name || ''),
      csvCell(`${p.month}/${p.year}`),
      p.amount,
      p.payment_date,
      p.due_date,
      String(p.method || '').toUpperCase(),
      String(p.status || '').toUpperCase(),
      csvCell(p.reference_no || ''),
      csvCell(p.recorded_by),
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  const riskScores = getAllRiskScores(collections);
  const headers = [
    'Family ID', 'Parent Name', 'Risk Score', 'Risk Tier', 'Trust Score',
    'Average Delay Days', 'Past Defaults', 'Recommended Action',
  ];
  const rows = collections.families.map((f) => {
    const r = riskScores[f.id];
    return [
      csvCell(f.id),
      csvCell(f.parent_name),
      r ? r.score : 0,
      r ? r.tier.toUpperCase() : 'LOW',
      r ? r.trust_score : 100,
      r ? r.average_delay_days : 0,
      r ? r.past_defaults_count : 0,
      csvCell(r?.recommended_action || ''),
    ];
  });
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export interface ExcelExportFilters {
  type?: 'ledger' | 'pending' | 'families' | 'all';
  start_date?: string;
  end_date?: string;
  month?: number | string;
  year?: number | string;
  method?: string;
  status?: string;
  search?: string;
}

/**
 * Builds a three-sheet workbook: the payment ledger, an executive summary and
 * the family fee roster.
 */
export async function generateExcelExport(filters: ExcelExportFilters): Promise<Buffer> {
  const collections = await loadCoreCollections();
  const settings = await getSettings();
  const symbol = settings.currency_symbol || '₹';

  const { families: allFamilies, students: allStudents } = collections;
  let payments = [...collections.payments] as any[];

  if (filters.start_date) payments = payments.filter((p) => p.payment_date >= filters.start_date!);
  if (filters.end_date) payments = payments.filter((p) => p.payment_date <= filters.end_date!);
  if (filters.month && filters.month !== 'all') {
    payments = payments.filter((p) => p.month === Number(filters.month));
  }
  if (filters.year && filters.year !== 'all') {
    payments = payments.filter((p) => p.year === Number(filters.year));
  }
  if (filters.method && filters.method !== 'all') {
    payments = payments.filter(
      (p) => String(p.method).toLowerCase() === filters.method!.toLowerCase()
    );
  }
  if (filters.status && filters.status !== 'all') {
    payments = payments.filter(
      (p) => String(p.status).toLowerCase() === filters.status!.toLowerCase()
    );
  }
  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    payments = payments.filter(
      (p) =>
        (p.invoice_number && p.invoice_number.toLowerCase().includes(q)) ||
        (p.family_name && p.family_name.toLowerCase().includes(q)) ||
        (p.reference_no && p.reference_no.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
    );
  }

  const wb = XLSX.utils.book_new();

  // Tab 1: Payment Transactions Ledger
  const paymentRows = payments.map((p) => {
    const family = allFamilies.find((f) => f.id === p.family_id);
    const students = allStudents
      .filter((s) => s.family_id === p.family_id)
      .map((s) => s.name)
      .join(', ');
    const monthName =
      p.month >= 1 && p.month <= 12 ? MONTH_LABEL_LIST[p.month - 1] : `Month ${p.month}`;

    return {
      'Invoice #': p.invoice_number || `INV-${p.year || 2026}-${String(p.id).replace(/\D/g, '')}`,
      'Family Code / Ledger #': family?.family_code || 'N/A',
      'Payment Date': p.payment_date,
      'Billing Month & Year': `${monthName} ${p.year}`,
      'Family / Payer Name': p.family_name || family?.parent_name || 'N/A',
      'Enrolled Student(s)': students || 'N/A',
      [`Amount Paid (${symbol})`]: p.amount,
      'Payment Method': p.method ? String(p.method).toUpperCase().replace('_', ' ') : 'CASH',
      'Payment Status': String(p.status).toUpperCase(),
      'Ref / Cheque / UTR #': p.reference_no || '',
      'Collector Staff': p.recorded_by,
      'Payment ID': p.id,
      Notes: p.notes || (p.status === 'void' ? `Void: ${p.void_reason || ''}` : ''),
    };
  });

  const wsPayments = XLSX.utils.json_to_sheet(paymentRows);
  wsPayments['!cols'] = [
    { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 24 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 35 },
  ];
  XLSX.utils.book_append_sheet(wb, wsPayments, 'Payments Ledger');

  // Tab 2: Financial Summary
  const validPayments = payments.filter((p) => p.status !== 'void');
  const sumBy = (method: string) =>
    validPayments.filter((p) => p.method === method).reduce((acc, p) => acc + p.amount, 0);
  const totalAmount = validPayments.reduce((acc, p) => acc + p.amount, 0);

  const dateDesc =
    filters.start_date && filters.end_date
      ? `${filters.start_date} to ${filters.end_date}`
      : filters.start_date
      ? `From ${filters.start_date}`
      : filters.end_date
      ? `Up to ${filters.end_date}`
      : 'All Dates';

  const monthDesc =
    filters.month && filters.month !== 'all'
      ? MONTH_LABEL_LIST[Number(filters.month) - 1] || String(filters.month)
      : 'All Months';

  const summaryRows = [
    { Parameter: 'Report Title', Value: 'Institutional Tuition Fee Collection Report' },
    { Parameter: 'Export Date & Time', Value: new Date().toLocaleString() },
    { Parameter: 'Date Range Filter', Value: dateDesc },
    { Parameter: 'Billing Month Filter', Value: monthDesc },
    {
      Parameter: 'Billing Year Filter',
      Value: filters.year && filters.year !== 'all' ? String(filters.year) : 'All Years',
    },
    { Parameter: 'Total Transactions Exported', Value: payments.length },
    {
      Parameter: `Total Collected Amount (${symbol})`,
      Value: `${symbol} ${totalAmount.toLocaleString()}`,
    },
    { Parameter: `Cash Collections (${symbol})`, Value: `${symbol} ${sumBy('cash').toLocaleString()}` },
    { Parameter: `UPI Collections (${symbol})`, Value: `${symbol} ${sumBy('upi').toLocaleString()}` },
    {
      Parameter: `Bank Transfer / ACH (${symbol})`,
      Value: `${symbol} ${sumBy('bank_transfer').toLocaleString()}`,
    },
    {
      Parameter: `Cheque Collections (${symbol})`,
      Value: `${symbol} ${sumBy('cheque').toLocaleString()}`,
    },
    { Parameter: 'Voided Records Count', Value: payments.filter((p) => p.status === 'void').length },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Report');

  // Tab 3: Family Fee Roster
  const familyRows = allFamilies.map((f) => {
    const plan = collections.feePlans.find((fp) => fp.family_id === f.id);
    const students = allStudents.filter((s) => s.family_id === f.id);
    const totalPaid = validPayments
      .filter((p) => p.family_id === f.id)
      .reduce((sum, p) => sum + p.amount, 0);

    return {
      'Family ID': f.id,
      'Family Code / Ledger #': f.family_code || 'N/A',
      'Parent Name': f.parent_name,
      Phone: f.phone,
      Email: f.email,
      Students: students.map((s) => `${s.name} (${s.grade || 'N/A'})`).join('; '),
      [`Monthly Fee (${symbol})`]: plan ? plan.amount : settings.fixed_tuition_rate,
      [`Total Paid in Period (${symbol})`]: totalPaid,
      'Account Status': String(f.status).toUpperCase(),
    };
  });

  const wsFamilies = XLSX.utils.json_to_sheet(familyRows);
  wsFamilies['!cols'] = [
    { wch: 14 }, { wch: 22 }, { wch: 26 }, { wch: 18 }, { wch: 24 },
    { wch: 30 }, { wch: 20 }, { wch: 24 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, wsFamilies, 'Family Fee Roster');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
}