import React, { useState } from 'react';
import { PendingFeeItem, Family } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import {
  Clock,
  Send,
  Download,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Users,
  Sparkles,
  Phone,
  Mail,
  ChevronRight
} from 'lucide-react';

interface PendingViewProps {
  pendingItems: PendingFeeItem[];
  onOpenReminderModal: (family: Family, pendingItem?: PendingFeeItem) => void;
  onOpenPaymentModal: (family: Family, amount?: number) => void;
}

export const PendingView: React.FC<PendingViewProps> = ({
  pendingItems = [],
  onOpenReminderModal,
  onOpenPaymentModal
}) => {
  const { formatMoney } = useCurrency();
  const safeItems = pendingItems || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const filteredItems = safeItems.filter((item) => {
    const matchesSearch =
      item.family.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.family.phone.includes(searchTerm) ||
      (item.students || []).some((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesTier = tierFilter === 'all' || item.risk_score.tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const totalPendingAmount = safeItems.reduce((sum, item) => sum + item.monthly_fee, 0);

  const handleExportCsv = () => {
    window.location.href = '/api/export/csv?type=pending';
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Auto-Pending Fee Collection List
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Automated billing queue for September 2026 (Due date: Sept 2nd). Intelligent reminder engine ready.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="export-pending-csv-btn"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export Pending CSV
          </button>
        </div>
      </div>

      {/* Summary KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Total Outstanding Balance
          </div>
          <div className="text-3xl font-bold text-amber-600 tracking-tight">
            {formatMoney(totalPendingAmount)}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Across {pendingItems.length} active tuition accounts
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            Days Past Due (Sept 2nd)
          </div>
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            8 Days Overdue
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Reference evaluation date: September 10, 2026
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            High-Risk Unpaid Accounts
          </div>
          <div className="text-3xl font-bold text-rose-600 tracking-tight">
            {pendingItems.filter((p) => p.risk_score.tier === 'high').length}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Priority follow-up recommended with escalated tone
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="pending-search-input"
            type="text"
            placeholder="Search family, student, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        {/* Tier Filter Buttons */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1">Risk Tier:</span>
          {(['all', 'high', 'medium', 'low'] as const).map((tier) => (
            <button
              key={tier}
              id={`filter-tier-${tier}`}
              onClick={() => setTierFilter(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                tierFilter === tier
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Pending Items List */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const risk = item.risk_score;
          const isHigh = risk.tier === 'high';
          const isMedium = risk.tier === 'medium';

          return (
            <div
              key={item.family.id}
              className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-5 ${
                isHigh
                  ? 'border-rose-200 hover:border-rose-300 bg-rose-50/10'
                  : isMedium
                  ? 'border-amber-200 hover:border-amber-300'
                  : 'border-slate-200 hover:border-indigo-200'
              }`}
            >
              {/* Family & Student Details */}
              <div className="space-y-2 flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-bold text-slate-900 truncate">
                    {item.family.parent_name}
                  </h3>
                  {/* Risk Badge */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      isHigh
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : isMedium
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                  >
                    Risk Score: {risk.score}/100 ({risk.tier.toUpperCase()})
                  </span>

                  {/* Overdue Badge */}
                  <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-slate-100 text-slate-700">
                    {item.days_overdue} days past due
                  </span>

                  {item.suggested_discount_tier && (
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <Sparkles className="w-3 h-3 inline mr-1" />
                      {item.suggested_discount_tier}
                    </span>
                  )}
                </div>

                {/* Contact & Student Info */}
                <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    {item.family.phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {item.family.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Students: {item.students.map((s) => `${s.name} (${s.grade})`).join(', ')}
                  </span>
                </div>

                {/* Behavioral Intelligence Snippet */}
                <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <span>
                    <strong>Optimal Dispatch:</strong> {risk.best_reminder_time}
                  </span>
                  <span>
                    <strong>Past Delay Profile:</strong> avg {risk.average_delay_days} days overdue &bull; {risk.past_defaults_count} historical defaults
                  </span>
                </div>
              </div>

              {/* Fee Due & Action Buttons */}
              <div className="flex items-center lg:items-end justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                <div className="text-left lg:text-right">
                  <div className="text-xs font-medium text-slate-500">Amount Due</div>
                  <div className="text-2xl font-bold text-slate-900 tracking-tight">
                    {formatMoney(item.monthly_fee)}
                  </div>
                  <div className="text-[11px] text-slate-500">Due: Sept 2, 2026</div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Smart Reminder Trigger */}
                  <button
                    id={`btn-remind-${item.family.id}`}
                    onClick={() => onOpenReminderModal(item.family, item)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    Smart Reminder
                  </button>

                  {/* Record Payment */}
                  <button
                    id={`btn-pay-${item.family.id}`}
                    onClick={() => onOpenPaymentModal(item.family, item.monthly_fee)}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Pay
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Pending Records Found</h3>
            <p className="text-xs text-slate-500 mt-1">
              All accounts have settled or no families matched the current filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
