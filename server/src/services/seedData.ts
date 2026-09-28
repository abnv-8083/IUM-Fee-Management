/**
 * Bundled demo dataset used by `npm run seed`.
 *
 * The academic cycle it models runs May 2026 - Dec 2026 with fees due on the 2nd,
 * which matches the reference date the intelligence engine evaluates against.
 */
import type { Family, Student, FeePlan, Payment, AuditLog, ReminderLog, Anomaly } from '../types/index.js';

export function generateSeedData(): {
  families: Family[];
  students: Student[];
  feePlans: FeePlan[];
  payments: Payment[];
  auditLogs: AuditLog[];
  reminders: ReminderLog[];
  anomalies: Anomaly[];
} {
  const families: Family[] = [
    {
      id: 'fam-1',
      family_code: 'FAM-001',
      parent_name: 'Dr. Aris Thorne',
      phone: '+1 (555) 234-5678',
      email: 'aris.thorne@example.com',
      address: '742 Evergreen Terrace, Suite 4',
      created_at: '2025-11-15T09:00:00Z',
      status: 'active',
      notes: 'Prefers communication after 5 PM. Very responsive.'
    },
    {
      id: 'fam-2',
      family_code: 'FAM-002',
      parent_name: 'Marcus & Elena Vance',
      phone: '+1 (555) 345-6789',
      email: 'marcus.vance@example.com',
      address: '124 Conch St, Apt 2B',
      created_at: '2025-12-01T10:30:00Z',
      status: 'active',
      notes: 'Two children enrolled. Has requested sibling discount consideration.'
    },
    {
      id: 'fam-3',
      family_code: 'FAM-003',
      parent_name: 'Devon Patel',
      phone: '+1 (555) 456-7890',
      email: 'devon.patel@example.com',
      address: '890 Maplewood Way',
      created_at: '2026-01-10T14:15:00Z',
      status: 'active',
      notes: 'Consistently delayed payments due to out-of-town consulting work.'
    },
    {
      id: 'fam-4',
      family_code: 'FAM-004',
      parent_name: 'Sarah Jenkins',
      phone: '+1 (555) 567-8901',
      email: 'sjenkins@example.org',
      address: '312 Elm Creek Blvd',
      created_at: '2026-02-01T11:00:00Z',
      status: 'active',
      notes: 'Single parent, requested flexible split-installment schedule.'
    },
    {
      id: 'fam-5',
      family_code: 'FAM-005',
      parent_name: 'Tariq & Farah Mansoor',
      phone: '+1 (555) 678-9012',
      email: 'farah.m@example.com',
      address: '450 Oakridge Heights',
      created_at: '2025-10-05T08:45:00Z',
      status: 'active',
      notes: 'Prompt payer, always clears invoices within 24 hours of generation.'
    },
    {
      id: 'fam-6',
      family_code: 'FAM-006',
      parent_name: 'Robert C. Sterling',
      phone: '+1 (555) 789-0123',
      email: 'rsterling.law@example.com',
      address: '15 Financial Center Plaza',
      created_at: '2026-03-01T16:20:00Z',
      status: 'active',
      notes: 'High default risk. Disputed previous transportation add-on charge.'
    },
    {
      id: 'fam-7',
      family_code: 'FAM-007',
      parent_name: 'Maya Lin-Kowalski',
      phone: '+1 (555) 890-1234',
      email: 'maya.lin@example.com',
      address: '98 Beacon Hill Court',
      created_at: '2026-01-20T13:00:00Z',
      status: 'active',
      notes: 'Three siblings enrolled. Candidate for Tier-3 family scholarship.'
    },
    {
      id: 'fam-8',
      family_code: 'FAM-008',
      parent_name: 'Gabriel & Chloe Ross',
      phone: '+1 (555) 901-2345',
      email: 'gabriel.ross@example.com',
      address: '67 Highland Ridge',
      created_at: '2026-04-12T10:00:00Z',
      status: 'active',
      notes: 'Recently transferred from another coaching branch.'
    }
  ];

  const students: Student[] = [
    { id: 'stu-1', family_id: 'fam-1', name: 'Julian Thorne', grade: 'Grade 10 - Advanced Math', enrollment_date: '2025-11-15', status: 'active' },
    { id: 'stu-2', family_id: 'fam-2', name: 'Liam Vance', grade: 'Grade 8 - Science & Physics', enrollment_date: '2025-12-01', status: 'active' },
    { id: 'stu-3', family_id: 'fam-2', name: 'Sophia Vance', grade: 'Grade 6 - Foundation English', enrollment_date: '2025-12-01', status: 'active' },
    { id: 'stu-4', family_id: 'fam-3', name: 'Rohan Patel', grade: 'Grade 11 - Chem & Calculus', enrollment_date: '2026-01-10', status: 'active' },
    { id: 'stu-5', family_id: 'fam-4', name: 'Emily Jenkins', grade: 'Grade 9 - Algebra II', enrollment_date: '2026-02-01', status: 'active' },
    { id: 'stu-6', family_id: 'fam-5', name: 'Zayn Mansoor', grade: 'Grade 12 - Honors Biology', enrollment_date: '2025-10-05', status: 'active' },
    { id: 'stu-7', family_id: 'fam-6', name: 'Hunter Sterling', grade: 'Grade 10 - STEM Core', enrollment_date: '2026-03-01', status: 'active' },
    { id: 'stu-8', family_id: 'fam-7', name: 'Lucas Kowalski', grade: 'Grade 7 - Mathematics', enrollment_date: '2026-01-20', status: 'active' },
    { id: 'stu-9', family_id: 'fam-7', name: 'Olivia Kowalski', grade: 'Grade 5 - Core English', enrollment_date: '2026-01-20', status: 'active' },
    { id: 'stu-10', family_id: 'fam-7', name: 'Ethan Kowalski', grade: 'Grade 3 - Early Learners', enrollment_date: '2026-02-15', status: 'active' },
    { id: 'stu-11', family_id: 'fam-8', name: 'Nora Ross', grade: 'Grade 11 - Pre-Med Prep', enrollment_date: '2026-04-12', status: 'active' }
  ];

  const feePlans: FeePlan[] = [
    { id: 'plan-1', family_id: 'fam-1', amount: 350, fee_type: 'tuition', billing_cycle: 'monthly', effective_from: '2025-11-15' },
    { id: 'plan-2', family_id: 'fam-2', amount: 550, fee_type: 'combo', billing_cycle: 'monthly', effective_from: '2025-12-01' },
    { id: 'plan-3', family_id: 'fam-3', amount: 400, fee_type: 'tuition', billing_cycle: 'monthly', effective_from: '2026-01-10' },
    { id: 'plan-4', family_id: 'fam-4', amount: 320, fee_type: 'tuition', billing_cycle: 'monthly', effective_from: '2026-02-01' },
    { id: 'plan-5', family_id: 'fam-5', amount: 450, fee_type: 'combo', billing_cycle: 'monthly', effective_from: '2025-10-05' },
    { id: 'plan-6', family_id: 'fam-6', amount: 480, fee_type: 'combo', billing_cycle: 'monthly', effective_from: '2026-03-01' },
    { id: 'plan-7', family_id: 'fam-7', amount: 750, fee_type: 'combo', billing_cycle: 'monthly', effective_from: '2026-01-20' },
    { id: 'plan-8', family_id: 'fam-8', amount: 380, fee_type: 'tuition', billing_cycle: 'monthly', effective_from: '2026-04-12' }
  ];

  // Historical payments: Months 4, 5, 6, 7, 8 of 2026
  const payments: Payment[] = [
    // fam-1: Always on-time or early
    { id: 'pay-101', invoice_number: 'INV-2026-0101', family_id: 'fam-1', family_name: 'Dr. Aris Thorne', amount: 350, month: 4, year: 2026, payment_date: '2026-04-01', due_date: '2026-04-02', method: 'bank_transfer', reference_no: 'ACH-88910', status: 'paid', recorded_by: 'Staff - Clara', created_at: '2026-04-01T11:00:00Z' },
    { id: 'pay-102', invoice_number: 'INV-2026-0102', family_id: 'fam-1', family_name: 'Dr. Aris Thorne', amount: 350, month: 5, year: 2026, payment_date: '2026-05-01', due_date: '2026-05-02', method: 'bank_transfer', reference_no: 'ACH-90123', status: 'paid', recorded_by: 'Staff - Clara', created_at: '2026-05-01T10:15:00Z' },
    { id: 'pay-103', invoice_number: 'INV-2026-0103', family_id: 'fam-1', family_name: 'Dr. Aris Thorne', amount: 350, month: 6, year: 2026, payment_date: '2026-06-02', due_date: '2026-06-02', method: 'bank_transfer', reference_no: 'ACH-92341', status: 'paid', recorded_by: 'Staff - Clara', created_at: '2026-06-02T09:30:00Z' },
    { id: 'pay-104', invoice_number: 'INV-2026-0104', family_id: 'fam-1', family_name: 'Dr. Aris Thorne', amount: 350, month: 7, year: 2026, payment_date: '2026-07-01', due_date: '2026-07-02', method: 'bank_transfer', reference_no: 'ACH-94562', status: 'paid', recorded_by: 'Staff - Clara', created_at: '2026-07-01T08:50:00Z' },
    { id: 'pay-105', invoice_number: 'INV-2026-0105', family_id: 'fam-1', family_name: 'Dr. Aris Thorne', amount: 350, month: 8, year: 2026, payment_date: '2026-08-01', due_date: '2026-08-02', method: 'bank_transfer', reference_no: 'ACH-97103', status: 'paid', recorded_by: 'Staff - Clara', created_at: '2026-08-01T11:20:00Z' },
    { id: 'pay-106', invoice_number: 'INV-2026-0106', family_id: 'fam-1', family_name: 'Dr. Aris Thorne', amount: 350, month: 9, year: 2026, payment_date: '2026-09-02', due_date: '2026-09-02', method: 'bank_transfer', reference_no: 'ACH-99411', status: 'paid', recorded_by: 'Staff - Clara', created_at: '2026-09-02T10:00:00Z' },

    // fam-2: Pays with 3-7 days delay
    { id: 'pay-201', invoice_number: 'INV-2026-0201', family_id: 'fam-2', family_name: 'Marcus & Elena Vance', amount: 550, month: 5, year: 2026, payment_date: '2026-05-08', due_date: '2026-05-02', method: 'upi', reference_no: 'UPI-449102', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-05-08T15:00:00Z' },
    { id: 'pay-202', invoice_number: 'INV-2026-0202', family_id: 'fam-2', family_name: 'Marcus & Elena Vance', amount: 550, month: 6, year: 2026, payment_date: '2026-06-07', due_date: '2026-06-02', method: 'upi', reference_no: 'UPI-481903', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-06-07T14:20:00Z' },
    { id: 'pay-203', invoice_number: 'INV-2026-0203', family_id: 'fam-2', family_name: 'Marcus & Elena Vance', amount: 550, month: 7, year: 2026, payment_date: '2026-07-06', due_date: '2026-07-02', method: 'upi', reference_no: 'UPI-512930', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-07-06T16:00:00Z' },
    { id: 'pay-204', invoice_number: 'INV-2026-0204', family_id: 'fam-2', family_name: 'Marcus & Elena Vance', amount: 550, month: 8, year: 2026, payment_date: '2026-08-09', due_date: '2026-08-02', method: 'upi', reference_no: 'UPI-548911', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-08-09T17:10:00Z' },

    // fam-3: Heavy delays (15 - 35 days overdue)
    { id: 'pay-301', invoice_number: 'INV-2026-0301', family_id: 'fam-3', family_name: 'Devon Patel', amount: 400, month: 5, year: 2026, payment_date: '2026-05-24', due_date: '2026-05-02', method: 'cheque', reference_no: 'CHQ-00452', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-05-24T12:00:00Z' },
    { id: 'pay-302', invoice_number: 'INV-2026-0302', family_id: 'fam-3', family_name: 'Devon Patel', amount: 400, month: 6, year: 2026, payment_date: '2026-06-29', due_date: '2026-06-02', method: 'cheque', reference_no: 'CHQ-00488', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-06-29T11:45:00Z' },
    { id: 'pay-303', invoice_number: 'INV-2026-0303', family_id: 'fam-3', family_name: 'Devon Patel', amount: 400, month: 7, year: 2026, payment_date: '2026-08-05', due_date: '2026-07-02', method: 'cheque', reference_no: 'CHQ-00512', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-08-05T14:30:00Z' },

    // fam-4: Partial payments and small delays
    { id: 'pay-401', invoice_number: 'INV-2026-0401', family_id: 'fam-4', family_name: 'Sarah Jenkins', amount: 320, month: 6, year: 2026, payment_date: '2026-06-12', due_date: '2026-06-02', method: 'cash', reference_no: 'RCP-10492', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-06-12T10:00:00Z' },
    { id: 'pay-402', invoice_number: 'INV-2026-0402', family_id: 'fam-4', family_name: 'Sarah Jenkins', amount: 320, month: 7, year: 2026, payment_date: '2026-07-15', due_date: '2026-07-02', method: 'cash', reference_no: 'RCP-10821', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-07-15T09:30:00Z' },
    { id: 'pay-403', invoice_number: 'INV-2026-0403', family_id: 'fam-4', family_name: 'Sarah Jenkins', amount: 160, month: 8, year: 2026, payment_date: '2026-08-18', due_date: '2026-08-02', method: 'cash', reference_no: 'RCP-11002', status: 'partial', notes: 'Installment 1 of 2. Remaining balance $160 due Aug 30.', recorded_by: 'FrontDesk - David', created_at: '2026-08-18T11:15:00Z' },

    // fam-5: Star Trusted Payer
    { id: 'pay-501', invoice_number: 'INV-2026-0501', family_id: 'fam-5', family_name: 'Tariq & Farah Mansoor', amount: 450, month: 5, year: 2026, payment_date: '2026-05-01', due_date: '2026-05-02', method: 'bank_transfer', reference_no: 'WIRE-9921', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-05-01T08:00:00Z' },
    { id: 'pay-502', invoice_number: 'INV-2026-0502', family_id: 'fam-5', family_name: 'Tariq & Farah Mansoor', amount: 450, month: 6, year: 2026, payment_date: '2026-06-01', due_date: '2026-06-02', method: 'bank_transfer', reference_no: 'WIRE-9954', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-06-01T08:15:00Z' },
    { id: 'pay-503', invoice_number: 'INV-2026-0503', family_id: 'fam-5', family_name: 'Tariq & Farah Mansoor', amount: 450, month: 7, year: 2026, payment_date: '2026-07-01', due_date: '2026-07-02', method: 'bank_transfer', reference_no: 'WIRE-9988', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-07-01T08:10:00Z' },
    { id: 'pay-504', invoice_number: 'INV-2026-0504', family_id: 'fam-5', family_name: 'Tariq & Farah Mansoor', amount: 450, month: 8, year: 2026, payment_date: '2026-08-01', due_date: '2026-08-02', method: 'bank_transfer', reference_no: 'WIRE-10041', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-08-01T08:30:00Z' },
    { id: 'pay-505', invoice_number: 'INV-2026-0505', family_id: 'fam-5', family_name: 'Tariq & Farah Mansoor', amount: 450, month: 9, year: 2026, payment_date: '2026-09-01', due_date: '2026-09-02', method: 'bank_transfer', reference_no: 'WIRE-10115', status: 'paid', recorded_by: 'Accountant - Ray', created_at: '2026-09-01T09:00:00Z' },

    // fam-6: High default risk, stopped paying in July
    { id: 'pay-601', invoice_number: 'INV-2026-0601', family_id: 'fam-6', family_name: 'Robert C. Sterling', amount: 480, month: 5, year: 2026, payment_date: '2026-05-28', due_date: '2026-05-02', method: 'cheque', reference_no: 'CHQ-99102', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-05-28T16:00:00Z' },
    { id: 'pay-602', invoice_number: 'INV-2026-0602', family_id: 'fam-6', family_name: 'Robert C. Sterling', amount: 480, month: 6, year: 2026, payment_date: '2026-07-08', due_date: '2026-06-02', method: 'cheque', reference_no: 'CHQ-99184', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-07-08T15:30:00Z' },

    // fam-7: Large fee, slight delay (sibling discount recommended)
    { id: 'pay-701', invoice_number: 'INV-2026-0701', family_id: 'fam-7', family_name: 'Maya Lin-Kowalski', amount: 750, month: 5, year: 2026, payment_date: '2026-05-09', due_date: '2026-05-02', method: 'upi', reference_no: 'UPI-771234', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-05-09T14:00:00Z' },
    { id: 'pay-702', invoice_number: 'INV-2026-0702', family_id: 'fam-7', family_name: 'Maya Lin-Kowalski', amount: 750, month: 6, year: 2026, payment_date: '2026-06-11', due_date: '2026-06-02', method: 'upi', reference_no: 'UPI-779810', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-06-11T13:30:00Z' },
    { id: 'pay-703', invoice_number: 'INV-2026-0703', family_id: 'fam-7', family_name: 'Maya Lin-Kowalski', amount: 750, month: 7, year: 2026, payment_date: '2026-07-14', due_date: '2026-07-02', method: 'upi', reference_no: 'UPI-784521', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-07-14T11:00:00Z' },
    { id: 'pay-704', invoice_number: 'INV-2026-0704', family_id: 'fam-7', family_name: 'Maya Lin-Kowalski', amount: 750, month: 8, year: 2026, payment_date: '2026-08-16', due_date: '2026-08-02', method: 'upi', reference_no: 'UPI-791044', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-08-16T15:20:00Z' },

    // fam-8: New family, paid on time
    { id: 'pay-801', invoice_number: 'INV-2026-0801', family_id: 'fam-8', family_name: 'Gabriel & Chloe Ross', amount: 380, month: 6, year: 2026, payment_date: '2026-06-02', due_date: '2026-06-02', method: 'cash', reference_no: 'RCP-12001', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-06-02T10:30:00Z' },
    { id: 'pay-802', invoice_number: 'INV-2026-0802', family_id: 'fam-8', family_name: 'Gabriel & Chloe Ross', amount: 380, month: 7, year: 2026, payment_date: '2026-07-03', due_date: '2026-07-02', method: 'cash', reference_no: 'RCP-12450', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-07-03T11:00:00Z' },
    { id: 'pay-803', invoice_number: 'INV-2026-0803', family_id: 'fam-8', family_name: 'Gabriel & Chloe Ross', amount: 380, month: 8, year: 2026, payment_date: '2026-08-04', due_date: '2026-08-02', method: 'cash', reference_no: 'RCP-12890', status: 'paid', recorded_by: 'FrontDesk - David', created_at: '2026-08-04T09:45:00Z' }
  ];

  const auditLogs: AuditLog[] = [
    {
      id: 'log-1',
      timestamp: '2026-08-18T11:15:00Z',
      entity: 'payment',
      entity_id: 'pay-403',
      action: 'create',
      performed_by: 'FrontDesk - David',
      details: 'Recorded partial installment of $160 for Sarah Jenkins (Month: 8/2026).'
    },
    {
      id: 'log-2',
      timestamp: '2026-08-05T14:30:00Z',
      entity: 'payment',
      entity_id: 'pay-303',
      action: 'create',
      performed_by: 'Accountant - Ray',
      details: 'Late payment recorded for Devon Patel (34 days overdue from July 2nd due date).'
    },
    {
      id: 'log-3',
      timestamp: '2026-07-12T16:40:00Z',
      entity: 'payment',
      entity_id: 'pay-void-demo',
      action: 'void',
      performed_by: 'Accountant - Ray',
      details: 'Voided duplicate cheque entry #CHQ-99180 ($480) for Robert C. Sterling due to wrong bank draft number.',
      previous_state: { amount: 480, status: 'paid', reference_no: 'CHQ-99180' },
      new_state: { status: 'void', void_reason: 'Entered incorrect cheque slip number; reissued under #CHQ-99184' }
    }
  ];

  const reminders: ReminderLog[] = [
    {
      id: 'rem-1',
      family_id: 'fam-3',
      family_name: 'Devon Patel',
      channel: 'whatsapp',
      tone: 'firm',
      message: 'Dear Mr. Patel, your tuition fee payment for July remains outstanding. Please process the pending $400 to prevent interruption to Rohan\'s calculus classes.',
      suggested_time: 'Tuesday 6:30 PM (historically highest WhatsApp open rate)',
      sent_at: '2026-07-28T18:30:00Z',
      sent_by: 'Staff - Clara',
      status: 'sent'
    },
    {
      id: 'rem-2',
      family_id: 'fam-6',
      family_name: 'Robert C. Sterling',
      channel: 'sms',
      tone: 'final',
      message: 'URGENT: IUM Institute fee balance of $960 (July + August) is over 45 days past due. Immediate payment required or enrollment may be paused.',
      suggested_time: 'Monday 10:00 AM',
      sent_at: '2026-08-20T10:00:00Z',
      sent_by: 'Admin - Director',
      status: 'sent'
    }
  ];

  const anomalies: Anomaly[] = [
    {
      id: 'anom-1',
      type: 'unusual_delay',
      family_id: 'fam-6',
      family_name: 'Robert C. Sterling',
      severity: 'high',
      description: 'Zero payments recorded for July & August 2026. Delinquency exceeds 70 days.',
      detected_at: '2026-08-25T08:00:00Z',
      status: 'pending_review'
    },
    {
      id: 'anom-2',
      type: 'amount_deviation',
      family_id: 'fam-4',
      family_name: 'Sarah Jenkins',
      amount: 160,
      expected_amount: 320,
      severity: 'medium',
      description: 'Payment pay-403 ($160) is 50% below monthly standard fee ($320). Logged as partial installment.',
      detected_at: '2026-08-18T11:16:00Z',
      status: 'pending_review'
    }
  ];

  return {
    families,
    students,
    feePlans,
    payments,
    auditLogs,
    reminders,
    anomalies
  };
}
