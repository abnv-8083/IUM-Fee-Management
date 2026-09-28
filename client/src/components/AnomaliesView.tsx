import React, { useState } from 'react';
import { Anomaly, AUDIT_ACTOR } from '../types';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  Filter,
  Check,
  X
} from 'lucide-react';

interface AnomaliesViewProps {
  anomalies: Anomaly[];
  onAnomalyResolved: () => void;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({
  anomalies = [],
  onAnomalyResolved
}) => {
  const safeAnomalies = anomalies || [];
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_review' | 'resolved' | 'dismissed'>('all');
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filtered = safeAnomalies.filter((a) => {
    if (statusFilter === 'all') return true;
    return a.status === statusFilter;
  });

  const pendingCount = safeAnomalies.filter((a) => a.status === 'pending_review').length;

  const handleResolveAction = async (status: 'resolved' | 'dismissed') => {
    if (!selectedAnomaly) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/anomalies/${selectedAnomaly.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: resolutionNotes || `Marked as ${status} by ${AUDIT_ACTOR}`,
          performed_by: AUDIT_ACTOR
        })
      });

      if (res.ok) {
        setSelectedAnomaly(null);
        setResolutionNotes('');
        onAnomalyResolved();
      }
    } catch (err) {
      console.error('Failed to resolve anomaly:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Payment Anomaly & Fraud Review Queue
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Automated detection of irregular payment amounts, sudden behavioral lapses, and duplicate submissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'pending_review', 'resolved', 'dismissed'] as const).map((s) => (
            <button
              key={s}
              id={`filter-anomaly-${s}`}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                statusFilter === s
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Anomaly Cards List */}
      <div className="space-y-4">
        {filtered.map((anomaly) => {
          const isPending = anomaly.status === 'pending_review';
          const isHigh = anomaly.severity === 'high';

          return (
            <div
              key={anomaly.id}
              className={`bg-white rounded-2xl border p-5 sm:p-6 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isPending && isHigh
                  ? 'border-rose-200 bg-rose-50/10'
                  : isPending
                  ? 'border-amber-200 bg-amber-50/10'
                  : 'border-slate-200 opacity-80'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      anomaly.severity === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : anomaly.severity === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {anomaly.severity} Severity
                  </span>

                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    {anomaly.family_name}
                  </h3>

                  <span className="text-xs text-slate-500 font-mono">
                    Type: {anomaly.type.replace('_', ' ').toUpperCase()}
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      anomaly.status === 'pending_review'
                        ? 'bg-amber-100 text-amber-900'
                        : anomaly.status === 'resolved'
                        ? 'bg-emerald-100 text-emerald-900'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {anomaly.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700">{anomaly.description}</p>

                <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-1">
                  <span>Detected: {new Date(anomaly.detected_at).toLocaleDateString()}</span>
                  {anomaly.resolved_by && <span>Inspected by: {anomaly.resolved_by}</span>}
                  {anomaly.resolution_notes && (
                    <span className="italic text-slate-600">Note: "{anomaly.resolution_notes}"</span>
                  )}
                </div>
              </div>

              {isPending && (
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    id={`resolve-anomaly-${anomaly.id}`}
                    onClick={() => {
                      setSelectedAnomaly(anomaly);
                      setResolutionNotes('');
                    }}
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
                  >
                    Verify & Resolve
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">All Clear</h3>
            <p className="text-xs text-slate-500 mt-1">No anomalies in this category.</p>
          </div>
        )}
      </div>

      {/* Modal: Resolve Anomaly */}
      {selectedAnomaly && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <ShieldAlert className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">Anomaly Investigation</h3>
              </div>
              <button
                onClick={() => setSelectedAnomaly(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="font-bold text-slate-900">{selectedAnomaly.family_name}</div>
                <div className="text-slate-600">{selectedAnomaly.description}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Investigation & Verification Note
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g. Verified with parent: payment split due to family travel, confirmed valid."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleResolveAction('dismissed')}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 cursor-pointer"
                >
                  Dismiss as False Positive
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleResolveAction('resolved')}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs cursor-pointer"
                >
                  Mark Verified & Resolved
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
