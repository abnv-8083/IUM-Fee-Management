import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { CorrectionMode, PaymentCorrectionModal } from './PaymentCorrectionModal';
import {
  DashboardMetrics,
  MonthlyForecast,
  PendingFeeItem,
  Family,
  Payment
} from '../types';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Receipt,
  UserPlus,
  Send,
  CheckCircle2,
  Calendar,
  DollarSign,
  Edit,
  Slash
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

interface DashboardViewProps {
  metrics: DashboardMetrics;
  forecasts: MonthlyForecast[];
  pendingItems: PendingFeeItem[];
  families: (Family & { risk?: any })[];
  recentPayments: Payment[];
  onNavigate: (view: string) => void;
  onOpenNewPayment: () => void;
  onOpenNewFamily: () => void;
  onOpenReminderModal: (family: Family, pendingItem?: PendingFeeItem) => void;
  onPaymentUpdated: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  forecasts = [],
  pendingItems = [],
  families = [],
  recentPayments = [],
  onNavigate,
  onOpenNewPayment,
  onOpenNewFamily,
  onOpenReminderModal,
  onPaymentUpdated
}) => {
  const { formatMoney, formatShortMoney, currencySymbol } = useCurrency();
  const [correction, setCorrection] = useState<{ payment: Payment; mode: CorrectionMode } | null>(null);
  const safeFamilies = families || [];
  const safeForecasts = forecasts || [];
  const safePendingItems = pendingItems || [];
  const safeRecentPayments = recentPayments || [];

  const highRiskFamilies = safeFamilies.filter((f) => f.risk?.tier === 'high');
  const collectionRate =
    metrics.collected_this_month + metrics.pending_this_month > 0
      ? Math.round(
          (metrics.collected_this_month /
            (metrics.collected_this_month + metrics.pending_this_month)) *
            100
        )
      : 0;

  // Chart data: transform forecasts into comparison series
  const chartData = safeForecasts.map((f) => ({
    name: f.month_label.replace(' 2026', '').replace(' (Current)', '*').replace(' (Projected)', ' (P)'),
    Actual: f.actual_collected !== undefined ? f.actual_collected : null,
    Forecast: f.forecast_baseline,
    GrossGoal: f.expected_gross
  }));

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner: Status & Quick Action Buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              September 2026 Billing Period
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
              Reference: Sept 10, 2026
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Monthly fee cycle due on the 2nd. Intelligence engine actively forecasting collections and risk scores.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <button
            id="dash-record-payment-btn"
            onClick={onOpenNewPayment}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            Record Payment
          </button>
          <button
            id="dash-register-family-btn"
            onClick={onOpenNewFamily}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            New Family
          </button>
          <button
            id="dash-view-pending-btn"
            onClick={() => onNavigate('pending')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/60 transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4 text-indigo-600" />
            Auto-Reminders ({pendingItems.length})
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (4 Key Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Metric 1: Collected */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Collected (September)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              {currencySymbol}
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {formatMoney(metrics.collected_this_month)}
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-600">
            <span className="font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mr-2">
              {collectionRate}%
            </span>
            <span>of monthly scheduled gross collected</span>
          </div>
        </div>

        {/* Metric 2: Pending Overdue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Pending Balance</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-amber-600 tracking-tight">
            {formatMoney(metrics.pending_this_month)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Across {pendingItems.length} accounts</span>
            <button
              onClick={() => onNavigate('pending')}
              className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center cursor-pointer"
            >
              Inspect List <ArrowRight className="w-3 h-3 ml-0.5" />
            </button>
          </div>
        </div>

        {/* Metric 3: Next Month Forecast (F2) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Oct 2026 Forecast</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-indigo-600 tracking-tight">
            {formatMoney(metrics.forecast_next_month)}
          </div>
          <div className="mt-3 flex items-center text-xs text-slate-600">
            <span className="text-slate-500">Risk-weighted net expectation</span>
          </div>
        </div>

        {/* Metric 4: Risk Profiles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Risk Intelligence</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold text-rose-600 tracking-tight flex items-baseline gap-2">
            {metrics.high_risk_count}
            <span className="text-xs font-normal text-slate-500">High Risk Profiles</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
              {metrics.trusted_payers_count} Star Trusted
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-medium">
              {metrics.medium_risk_count} Medium
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid: Cash Flow Forecast Visualizer & High-Risk Attention Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Cash Flow Forecast Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                Cash Flow Forecast vs Actual Collections
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Past 5 months actuals vs. next 3 months predictive forecast models
              </p>
            </div>
          </div>

          <div className="h-64 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatShortMoney(v)} />
                <Tooltip
                  formatter={(value: any) => [formatMoney(value), '']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} name={`Actual Collected (${currencySymbol})`} />
                <Bar dataKey="Forecast" fill="#6366f1" radius={[4, 4, 0, 0]} name={`Projected Forecast (${currencySymbol})`} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>* September ongoing. (P) indicates projected Q4 cycles.</span>
            <span className="font-medium text-indigo-600">Model accuracy tolerance: &plusmn;8.4%</span>
          </div>
        </div>

        {/* Right: High-Risk Attention Queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                High-Risk Attention Queue
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Families requiring proactive intervention before next cycle
              </p>
            </div>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-rose-100 text-rose-700">
              {highRiskFamilies.length} Active
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[290px] pr-1">
            {highRiskFamilies.map((family) => {
              const pending = pendingItems.find((p) => p.family.id === family.id);
              const risk = family.risk;
              return (
                <div
                  key={family.id}
                  className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/40 hover:bg-rose-50/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {family.parent_name}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-rose-600 text-white">
                        {risk?.score}/100
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5 truncate">
                      Avg delay: <strong className="text-rose-700">{risk?.average_delay_days}d</strong> &bull; Defaults: {risk?.past_defaults_count}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Fee: {formatMoney(family.fee_plan?.amount || 0)}/mo &bull; {family.students?.length || 1} child
                    </p>
                  </div>

                  <button
                    onClick={() => onOpenReminderModal(family, pending)}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" />
                    Auto-Remind
                  </button>
                </div>
              );
            })}

            {highRiskFamilies.length === 0 && (
              <div className="py-12 text-center text-slate-500 text-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No families currently flagged in High Risk tier.
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('families')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
            >
              View Full Family Risk Scoring Directory &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Recent Activity & Payment Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Payment Transactions</h2>
            <p className="text-xs text-slate-500">Latest recorded fee receipts with audit verification</p>
          </div>
          <span className="hidden text-xs text-slate-400 sm:block">
            Edit or void any receipt from its row
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-slate-600">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3">Receipt ID</th>
                <th className="px-6 py-3">Payer / Family</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Term</th>
                <th className="px-6 py-3">Method</th>
                <th className="px-6 py-3">Recorded Date</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {safeRecentPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No payment transactions recorded yet</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Ready for public launch! Use "Record Payment" to log the first tuition receipt in Indian Rupees ({currencySymbol}).
                    </p>
                  </td>
                </tr>
              ) : (
                safeRecentPayments.slice(0, 6).map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-mono text-xs font-medium text-slate-800">
                      {payment.id}
                    </td>
                    <td className="px-6 py-3.5 font-semibold text-slate-900">
                      {payment.family_name}
                    </td>
                    <td className="px-6 py-3.5 font-bold text-slate-900">
                      {formatMoney(payment.amount)}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {payment.month}/{payment.year}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {payment.method.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500">
                      {payment.payment_date}
                    </td>
                    <td className="px-6 py-3.5">
                      {payment.status === 'paid' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                          Paid
                        </span>
                      )}
                      {payment.status === 'partial' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                          Partial
                        </span>
                      )}
                      {payment.status === 'void' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 text-slate-700 line-through">
                          Void
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          id={`dashboard-edit-payment-btn-${payment.id}`}
                          type="button"
                          onClick={() => setCorrection({ payment, mode: 'edit' })}
                          title="Edit all fields of this payment"
                          className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-indigo-50 hover:text-indigo-600"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        {payment.status !== 'void' && (
                          <button
                            id={`dashboard-void-payment-btn-${payment.id}`}
                            type="button"
                            onClick={() => setCorrection({ payment, mode: 'void' })}
                            title="Void payment record with mandatory audit explanation"
                            className="cursor-pointer rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Slash className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Corrections for recently recorded receipts */}
      <PaymentCorrectionModal
        payment={correction?.payment ?? null}
        mode={correction?.mode ?? null}
        onClose={() => setCorrection(null)}
        onSaved={onPaymentUpdated}
      />
    </div>
  );
};
