import React, { useState, useEffect } from 'react';
import { Family, PendingFeeItem, RiskScore } from '../types';
import { useCurrency } from '../context/CurrencyContext';
import {
  Send,
  X,
  Copy,
  Check,
  Sparkles,
  Phone,
  MessageSquare,
  Clock,
  ExternalLink,
  ShieldAlert,
  Calendar
} from 'lucide-react';

interface SmartReminderModalProps {
  // The dashboard payload decorates each family with its computed risk score.
  family: Family & { risk?: RiskScore };
  pendingItem?: PendingFeeItem;
  isOpen: boolean;
  onClose: () => void;
  onReminderSent: (log: any) => void;
}

export const SmartReminderModal: React.FC<SmartReminderModalProps> = ({
  family,
  pendingItem,
  isOpen,
  onClose,
  onReminderSent
}) => {
  const { formatMoney } = useCurrency();
  const [tone, setTone] = useState<'gentle' | 'polite' | 'firm' | 'final'>('polite');
  const [message, setMessage] = useState('');
  const [suggestedTime, setSuggestedTime] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Set immediate default template so modal is instantly ready
    const rawAmount = pendingItem?.monthly_fee || family.fee_plan?.amount || 350;
    const formattedAmount = formatMoney(rawAmount);
    setMessage(`Dear ${family.parent_name}, this is a reminder regarding the tuition fee of ${formattedAmount} for the current term. Please complete payment at your earliest convenience.`);
    setSuggestedTime('Tuesday 6:30 PM');

    // Fetch smart draft from server API
    fetch('/api/reminders/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ family_id: family.id })
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.message) {
          setMessage(data.message);
          setTone(data.tone || 'polite');
          setSuggestedTime(data.suggested_time || 'Tuesday 6:30 PM');
        }
      })
      .catch((err) => {
        console.warn('Could not fetch custom AI reminder draft, using default template:', err);
      });
  }, [isOpen, family.id, family.parent_name, family.fee_plan?.amount, pendingItem?.monthly_fee, formatMoney]);

  if (!isOpen) return null;

  const handleToneChange = (newTone: 'gentle' | 'polite' | 'firm' | 'final') => {
    setTone(newTone);
    const rawAmount = pendingItem?.monthly_fee || family.fee_plan?.amount || 350;
    const formattedAmount = formatMoney(rawAmount);

    if (newTone === 'final') {
      setMessage(
        `URGENT NOTICE - IUM Tuition Management:\n\nDear ${family.parent_name},\nOur records indicate that the overdue fee balance of ${formattedAmount} for September (and prior terms) remains unsettled despite previous notices.\n\nTo prevent interruption to your children's coaching sessions and retain active seat enrollment, please complete this payment immediately or contact the Director's desk today.\n\nAccounting Department, IUM Institute.`
      );
    } else if (newTone === 'firm') {
      setMessage(
        `IMPORTANT REMINDER - IUM Tuition Management:\n\nDear ${family.parent_name},\nThis is a firm reminder regarding the tuition fee of ${formattedAmount} for September, which was due on the 2nd. As of today, this payment is past due.\n\nPlease process this balance today via UPI or bank transfer to avoid late administrative charges.\n\nThank you,\nAdministration Team`
      );
    } else if (newTone === 'polite') {
      setMessage(
        `Hello ${family.parent_name},\n\nWe hope you are having a wonderful week! Just a polite follow-up regarding the tuition fee for September (${formattedAmount}), due on the 2nd. If you have already initiated this transfer, kindly ignore this message or reply with the transaction reference.\n\nWarm regards,\nIUM Fee Operations`
      );
    } else {
      setMessage(
        `Hi ${family.parent_name},\n\nGentle courtesy reminder that the September fee statement (${formattedAmount}) is ready for settlement. Thank you for your continued partnership and support of our students' learning journey!\n\nBest wishes,\nIUM Tuition Centre`
      );
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleLogDispatch = async (channel: 'whatsapp' | 'sms' | 'manual') => {
    setIsSending(true);
    try {
      const res = await fetch('/api/reminders/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: family.id,
          family_name: family.parent_name,
          channel,
          message,
          tone,
          suggested_time: suggestedTime,
          sent_by: 'Staff User'
        })
      });

      const data = await res.json();
      if (data.success) {
        onReminderSent(data.reminder);
        onClose();
      }
    } catch (err) {
      console.error('Failed to log reminder:', err);
    } finally {
      setIsSending(false);
    }
  };

  // WhatsApp & SMS deep link builders
  const cleanPhone = family.phone.replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
  const smsUrl = `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Smart Reminder Engine</h3>
              <p className="text-xs text-slate-500">Auto-calibrated tone for {family.parent_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Tone Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Reminder Tone Escalation</label>
              <span className="text-[11px] text-slate-500">
                Risk Tier: <strong className="uppercase">{family.risk?.tier || 'MEDIUM'}</strong>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['gentle', 'polite', 'firm', 'final'] as const).map((t) => (
                <button
                  key={t}
                  id={`tone-btn-${t}`}
                  type="button"
                  onClick={() => handleToneChange(t)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-semibold capitalize border transition-all cursor-pointer ${
                    tone === t
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Timing recommendation */}
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-3 flex items-start gap-2.5 text-xs text-indigo-900">
            <Clock className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Algorithmic Best Dispatch Window:</span>{' '}
              <span>{suggestedTime}</span>
              <p className="text-[11px] text-indigo-700 mt-0.5">
                Derived from family's historical transaction hours & open rates.
              </p>
            </div>
          </div>

          {/* Draft Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">Message Draft</label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full text-xs font-mono p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 resize-none bg-slate-50/40"
            />
          </div>

          {/* Recipient Details Preview */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
            <span>
              <strong>Recipient:</strong> {family.parent_name} ({family.phone})
            </span>
            <span>
              <strong>Balance Due:</strong> {formatMoney(pendingItem?.monthly_fee || family.fee_plan?.amount || 350)}
            </span>
          </div>
        </div>

        {/* Footer Actions: WhatsApp / SMS / Manual Log */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* WhatsApp Link */}
            <a
              id="send-whatsapp-link"
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleLogDispatch('whatsapp')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-xs"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp
              <ExternalLink className="w-3 h-3 ml-0.5" />
            </a>

            {/* SMS Link */}
            <a
              id="send-sms-link"
              href={smsUrl}
              onClick={() => handleLogDispatch('sms')}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 transition-colors shadow-xs"
            >
              <Phone className="w-3.5 h-3.5" />
              SMS
            </a>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="mark-sent-btn"
              type="button"
              disabled={isSending}
              onClick={() => handleLogDispatch('manual')}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSending ? 'Logging...' : 'Mark as Sent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
