/**
 * The acting user recorded on every audit entry.
 *
 * The platform has no authentication, and the role switcher that used to name
 * the actor here has been removed, so each write is attributed to this single
 * fixed label instead.
 */
export const AUDIT_ACTOR = 'Admin User';

export interface Student {
  id: string;
  family_id: string;
  name: string;
  grade: string;
  enrollment_date: string;
  status: 'active' | 'inactive' | 'graduated';
}

export interface FeePlan {
  id: string;
  family_id: string;
  student_id?: string;
  amount: number;
  fee_type: 'tuition' | 'transport' | 'books' | 'lab' | 'combo';
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  effective_from: string;
}

export interface Family {
  id: string;
  family_code: string; // Mandatory manually entered ledger number / family code
  parent_name: string;
  phone: string;
  email: string;
  address?: string;
  created_at: string;
  notes?: string;
  status: 'active' | 'inactive';
  students?: Student[];
  fee_plans?: FeePlan[];
  fee_plan?: FeePlan;
}

export type PaymentMethod = 'cash' | 'bank_transfer' | 'upi' | 'cheque' | 'card';
export type PaymentStatus = 'paid' | 'partial' | 'void';

export interface Payment {
  id: string;
  family_id: string;
  family_name?: string;
  fee_plan_id?: string;
  amount: number;
  month: number; // 1 - 12
  year: number;
  payment_date: string; // YYYY-MM-DD
  due_date: string; // YYYY-MM-02
  method: PaymentMethod;
  invoice_number: string; // Mandatory invoice number
  reference_no?: string;
  status: PaymentStatus;
  void_reason?: string;
  notes?: string;
  recorded_by: string;
  created_at: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  entity: 'payment' | 'family' | 'student' | 'fee_plan' | 'settings';
  entity_id: string;
  action: 'create' | 'edit' | 'void' | 'delete';
  performed_by: string;
  details: string;
  previous_state?: any;
  new_state?: any;
}

export interface RiskFactor {
  label: string;
  impact: number; // positive = raises risk, negative = lowers risk
  explanation: string;
}

export interface RiskScore {
  family_id: string;
  score: number; // 0 - 100
  tier: 'low' | 'medium' | 'high';
  trust_score: number; // 0 - 100
  is_trusted_payer: boolean;
  computed_at: string;
  average_delay_days: number;
  past_defaults_count: number;
  sibling_count: number;
  fee_to_average_ratio: number;
  contributing_factors: RiskFactor[];
  recommended_action: string;
  best_reminder_time: string;
}

export interface ReminderLog {
  id: string;
  family_id: string;
  family_name?: string;
  channel: 'whatsapp' | 'sms' | 'email' | 'manual';
  message: string;
  tone: 'gentle' | 'polite' | 'firm' | 'final';
  suggested_time: string;
  sent_at: string;
  sent_by: string;
  status: 'drafted' | 'sent' | 'delivered';
}

export interface Anomaly {
  id: string;
  type: 'amount_deviation' | 'duplicate_entry' | 'spike' | 'unusual_delay';
  family_id: string;
  family_name: string;
  payment_id?: string;
  amount?: number;
  expected_amount?: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  detected_at: string;
  status: 'pending_review' | 'resolved' | 'dismissed';
  resolution_notes?: string;
  /** Staff member who actioned the review, when one has been recorded. */
  resolved_by?: string;
}

export interface MonthlyForecast {
  month_key: string; // "2026-09"
  month_label: string; // "Sep 2026"
  is_future: boolean;
  expected_gross: number;
  risk_discount: number;
  forecast_baseline: number;
  forecast_conservative: number;
  forecast_optimistic: number;
  actual_collected?: number;
  collection_rate?: number;
}

export interface PendingFeeItem {
  family: Family;
  students: Student[];
  monthly_fee: number;
  month: number;
  year: number;
  due_date: string;
  days_overdue: number;
  risk_score: RiskScore;
  last_payment_date?: string;
  suggested_discount_tier?: string;
}

export interface SystemSettings {
  currency_code: string;
  currency_symbol: string;
  currency_name?: string;
  currency_position: 'prefix' | 'suffix';
  tuition_pricing_model: 'fixed_rate' | 'tiered' | 'custom';
  fixed_tuition_rate: number;
  enforce_fixed_rate_all: boolean;
  due_day: number;
  grace_period_days: number;
  sibling_discount_2nd: number;
  sibling_discount_3rd: number;
  high_risk_cutoff: number;
}

export interface DashboardMetrics {
  total_families: number;
  active_students: number;
  collected_this_month: number;
  pending_this_month: number;
  high_risk_count: number;
  medium_risk_count: number;
  low_risk_count: number;
  trusted_payers_count: number;
  pending_anomalies_count: number;
  forecast_next_month: number;
  average_delay_days: number;
}

export interface DashboardPayload {
  metrics: DashboardMetrics;
  families: (Family & { risk?: RiskScore; students?: Student[]; fee_plan?: FeePlan })[];
  pendingItems: PendingFeeItem[];
  forecasts: MonthlyForecast[];
  anomalies: Anomaly[];
  recentPayments: Payment[];
  payments?: Payment[];
  reminders: ReminderLog[];
  auditLogs: AuditLog[];
  settings?: SystemSettings;
}
