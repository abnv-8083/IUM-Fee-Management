import React, { useState } from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { Family, Student, RiskScore } from '../types';
import {
  Users,
  Search,
  UserPlus,
  AlertTriangle,
  ShieldCheck,
  Star,
  Sparkles,
  Phone,
  Mail,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  Info,
  Calendar,
  X,
  Plus,
  Check,
  RefreshCw,
  Coins,
  Settings as SettingsIcon
} from 'lucide-react';

interface FamiliesViewProps {
  families: (Family & { risk?: RiskScore; students?: Student[] })[];
  onOpenPaymentModal: (family: Family) => void;
  onOpenReminderModal: (family: Family) => void;
  onFamilyCreated: () => void;
  onFamilyUpdated: () => void;
  onFamilyDeleted: () => void;
  onEditFamilyInSettings?: (familyId: string) => void;
}

export const FamiliesView: React.FC<FamiliesViewProps> = ({
  families = [],
  onOpenPaymentModal,
  onOpenReminderModal,
  onFamilyCreated,
  onFamilyUpdated,
  onFamilyDeleted,
  onEditFamilyInSettings
}) => {
  const { formatMoney, currencySymbol, currencyCode, settings, updateSettings, applyFixedRateToAll } = useCurrency();
  const safeFamilies = families || [];
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<'all' | 'high' | 'medium' | 'low' | 'trusted'>('all');
  const [inspectRiskFamily, setInspectRiskFamily] = useState<(Family & { risk?: RiskScore; students?: Student[] }) | null>(null);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);

  // Quick Edit Standard Base Tuition Rate Modal State
  const [isEditBaseRateOpen, setIsEditBaseRateOpen] = useState(false);
  const [quickBaseRateInput, setQuickBaseRateInput] = useState<number | string>(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
  const [quickApplyToAll, setQuickApplyToAll] = useState(false);
  const [isSavingQuickBaseRate, setIsSavingQuickBaseRate] = useState(false);
  const [quickBaseRateFeedback, setQuickBaseRateFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New family form state - Mandatory manual family code entry for existing ledger numbers
  const [newFamilyCode, setNewFamilyCode] = useState('');
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [newParentName, setNewParentName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newMonthlyFee, setNewMonthlyFee] = useState<number | string>(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
  const [newFeeType, setNewFeeType] = useState<'tuition' | 'combo' | 'transport'>('tuition');
  const [newStudents, setNewStudents] = useState<{ name: string; grade: string }[]>([
    { name: '', grade: 'Grade 9 - Algebra' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Family Modal state - all fields editable including family code
  const [editingFamily, setEditingFamily] = useState<(Family & { risk?: RiskScore; students?: Student[]; fee_plan?: any }) | null>(null);
  const [editFamilyCode, setEditFamilyCode] = useState('');
  const [editParentName, setEditParentName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');
  const [editMonthlyFee, setEditMonthlyFee] = useState<number | string>(100);
  const [editFeeType, setEditFeeType] = useState<'tuition' | 'combo' | 'transport'>('tuition');
  const [editStudents, setEditStudents] = useState<{ id?: string; name: string; grade: string; status?: 'active' | 'inactive' | 'graduated' }[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Handler to quickly save the Standard Base Fixed Tuition Rate
  const handleSaveQuickBaseRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const rateNum = Number(quickBaseRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      setQuickBaseRateFeedback({
        type: 'error',
        text: 'Please enter a valid positive tuition rate.'
      });
      return;
    }

    setIsSavingQuickBaseRate(true);
    setQuickBaseRateFeedback(null);
    try {
      if (quickApplyToAll) {
        const result = await applyFixedRateToAll(rateNum);
        if (result.success) {
          setQuickBaseRateFeedback({
            type: 'success',
            text: `Standard base rate updated to ${formatMoney(rateNum)}/mo and applied to all active families!`
          });
          onFamilyUpdated();
          setTimeout(() => {
            setIsEditBaseRateOpen(false);
            setQuickBaseRateFeedback(null);
          }, 900);
        } else {
          setQuickBaseRateFeedback({
            type: 'error',
            text: 'Failed to batch apply rate to families.'
          });
        }
      } else {
        const success = await updateSettings({
          fixed_tuition_rate: rateNum,
          tuition_pricing_model: 'fixed_rate'
        });
        if (success) {
          setQuickBaseRateFeedback({
            type: 'success',
            text: `Standard base rate successfully updated to ${formatMoney(rateNum)}/month!`
          });
          onFamilyUpdated();
          setTimeout(() => {
            setIsEditBaseRateOpen(false);
            setQuickBaseRateFeedback(null);
          }, 900);
        } else {
          setQuickBaseRateFeedback({
            type: 'error',
            text: 'Failed to update standard base rate.'
          });
        }
      }
    } catch (err: any) {
      setQuickBaseRateFeedback({ type: 'error', text: err.message || 'Error updating base rate' });
    } finally {
      setIsSavingQuickBaseRate(false);
    }
  };

  const filteredFamilies = safeFamilies.filter((f) => {
    const matchesSearch =
      f.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.family_code && f.family_code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      f.phone.includes(searchTerm) ||
      f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (f.students && f.students.some((s) => s.name.toLowerCase().includes(searchTerm.toLowerCase())));

    if (!matchesSearch) return false;

    if (filterTier === 'all') return true;
    if (filterTier === 'trusted') return f.risk?.is_trusted_payer;
    return f.risk?.tier === filterTier;
  });

  const handleOpenEditModal = (family: Family & { risk?: RiskScore; students?: Student[]; fee_plan?: any }) => {
    setEditingFamily(family);
    setEditFamilyCode(family.family_code || '');
    setEditParentName(family.parent_name || '');
    setEditPhone(family.phone || '');
    setEditEmail(family.email || '');
    setEditAddress(family.address || '');
    setEditNotes(family.notes || '');
    setEditStatus(family.status || 'active');
    setEditMonthlyFee(family.fee_plan?.amount || settings.fixed_tuition_rate || 100);
    setEditFeeType(family.fee_plan?.fee_type || 'tuition');
    if (family.students && family.students.length > 0) {
      setEditStudents(family.students.map((s) => ({ id: s.id, name: s.name, grade: s.grade, status: s.status })));
    } else {
      setEditStudents([{ name: '', grade: 'General Batch', status: 'active' }]);
    }
    setEditError(null);
  };

  const handleAddEditStudentField = () => {
    setEditStudents([...editStudents, { name: '', grade: 'General Batch', status: 'active' }]);
  };

  const handleRemoveEditStudentField = (index: number) => {
    if (editStudents.length <= 1) return;
    setEditStudents(editStudents.filter((_, i) => i !== index));
  };

  const handleSaveFamilyEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFamily) return;
    if (!editFamilyCode.trim()) {
      setEditError('Family Code / Ledger Number is mandatory.');
      return;
    }
    if (!editParentName.trim() || !editPhone.trim() || !editEmail.trim()) {
      setEditError('Parent name, phone, and email are required.');
      return;
    }
    if (Number(editMonthlyFee) < 100) {
      setEditError('Fixed monthly rate must start on at least ₹100.');
      return;
    }

    setIsUpdating(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/families/${editingFamily.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            family_code: editFamilyCode.trim(),
            parent_name: editParentName.trim(),
            phone: editPhone.trim(),
            email: editEmail.trim(),
            address: editAddress.trim(),
            notes: editNotes.trim(),
            status: editStatus,
            monthly_fee: Number(editMonthlyFee),
            fee_type: editFeeType,
            students: editStudents.filter((s) => s.name.trim().length > 0)
          },
          performed_by: 'Staff'
        })
      });

      const data = await res.json();
      if (data.success) {
        setEditingFamily(null);
        onFamilyUpdated();
      } else {
        setEditError(data.error || 'Failed to update family details.');
      }
    } catch (err: any) {
      setEditError(err.message || 'An error occurred while updating family.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddStudentField = () => {
    setNewStudents([...newStudents, { name: '', grade: 'Grade 10 - STEM Core' }]);
  };

  const handleRemoveStudentField = (index: number) => {
    if (newStudents.length <= 1) return;
    setNewStudents(newStudents.filter((_, i) => i !== index));
  };

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyCode.trim()) {
      setRegisterError('Family Code / Ledger Number is mandatory. Please enter the existing ledger code or folio number.');
      return;
    }
    if (!newParentName.trim() || !newPhone.trim() || !newEmail.trim()) {
      setRegisterError('Parent name, phone, and email are required.');
      return;
    }

    setIsSubmitting(true);
    setRegisterError(null);
    try {
      const res = await fetch('/api/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_code: newFamilyCode.trim(),
          parent_name: newParentName.trim(),
          phone: newPhone.trim(),
          email: newEmail.trim(),
          address: newAddress.trim(),
          notes: newNotes.trim(),
          monthly_fee: Number(newMonthlyFee) || settings.fixed_tuition_rate || 100,
          fee_type: newFeeType,
          students: newStudents.filter((s) => s.name.trim().length > 0)
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsRegisterOpen(false);
        // Reset form
        setNewFamilyCode('');
        setNewParentName('');
        setNewPhone('');
        setNewEmail('');
        setNewAddress('');
        setNewNotes('');
        setNewMonthlyFee(settings.fixed_tuition_rate || 100);
        setNewStudents([{ name: '', grade: 'Grade 9 - Algebra' }]);
        setRegisterError(null);
        onFamilyCreated();
      } else {
        setRegisterError(data.error || 'Failed to register family.');
      }
    } catch (err: any) {
      console.error('Failed to create family:', err);
      setRegisterError(err.message || 'An error occurred while creating family.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFamily = async (familyId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove family "${name}" and archive associated records?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/families/${familyId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performed_by: 'Staff Admin' })
      });
      if (res.ok) {
        onFamilyDeleted();
      }
    } catch (err) {
      console.error('Failed to delete family:', err);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Users className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Family & Student Risk Intelligence Directory
            </h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Rules-based payment risk scoring, multi-sibling detection, and loyalty trust classification.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2 text-xs">
            <span className="text-slate-500 font-medium">Standard Base Tuition:</span>
            <span className="font-extrabold text-slate-900">{formatMoney(settings.fixed_tuition_rate)}/mo</span>
            <button
              type="button"
              id="btn-edit-base-rate-quick"
              onClick={() => {
                setQuickBaseRateInput(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
                setQuickBaseRateFeedback(null);
                setIsEditBaseRateOpen(true);
              }}
              className="ml-1 text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 hover:underline cursor-pointer"
              title="Edit Standard Base Fixed Tuition Rate"
            >
              <Edit2 className="w-3 h-3" />
              <span>Edit Rate</span>
            </button>
          </div>

          <button
            id="btn-open-register-modal"
            onClick={() => {
              setNewMonthlyFee(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
              setIsRegisterOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer self-start md:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            Register Family
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="families-search-input"
            type="text"
            placeholder="Search parent name, student, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-500 mr-1">Filter:</span>
          {(['all', 'high', 'medium', 'low', 'trusted'] as const).map((tier) => (
            <button
              key={tier}
              id={`filter-family-${tier}`}
              onClick={() => setFilterTier(tier)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                filterTier === tier
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tier === 'trusted' ? '★ Trusted Payers' : `${tier} Risk`}
            </button>
          ))}
        </div>
      </div>

      {/* Family Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFamilies.map((family) => {
          const risk = family.risk;
          const isHigh = risk?.tier === 'high';
          const isMedium = risk?.tier === 'medium';
          const isTrusted = risk?.is_trusted_payer;

          return (
            <div
              key={family.id}
              className={`bg-white rounded-2xl border p-6 shadow-xs flex flex-col justify-between transition-all ${
                isHigh
                  ? 'border-rose-200 hover:border-rose-400 bg-rose-50/15'
                  : isMedium
                  ? 'border-amber-200 hover:border-amber-400'
                  : 'border-slate-200 hover:border-indigo-300'
              }`}
            >
              <div>
                {/* Top Row: Parent Name + Badges */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {family.parent_name}
                      </h3>
                      {family.family_code && (
                        <span
                          title="Ledger Folio / Family Code"
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs"
                        >
                          {family.family_code}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{family.phone}</p>
                  </div>

                  {/* Risk Badge & Trust Badge */}
                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => setInspectRiskFamily(family)}
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                        isHigh
                          ? 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-rose-200'
                          : isMedium
                          ? 'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                      }`}
                    >
                      <span>Risk: {risk?.score}/100</span>
                      <Info className="w-3 h-3" />
                    </button>

                    {isTrusted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-1" />
                        Trusted Payer
                      </span>
                    )}
                  </div>
                </div>

                {/* Enrolled Students */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Enrolled Students ({family.students?.length || 0})
                  </div>
                  <div className="space-y-1.5">
                    {family.students && family.students.length > 0 ? (
                      family.students.map((s) => (
                        <div
                          key={s.id}
                          className="text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200/80 flex items-center justify-between"
                        >
                          <span className="font-medium text-slate-800">{s.name}</span>
                          <span className="text-[11px] text-slate-500">{s.grade}</span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-slate-400 italic">No students linked yet</div>
                    )}
                  </div>
                </div>

                {/* Adaptive Suggestions (F6) */}
                {family.students && family.students.length >= 2 && (
                  <div className="mt-3 bg-indigo-50/70 border border-indigo-100 rounded-lg p-2 text-xs text-indigo-900 flex items-start gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Adaptive Suggestion:</strong> Eligible for{' '}
                      {family.students.length >= 3 ? '15% Tier-3 Multi-Child relief' : '10% Sibling Relief Tier'}.
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Actions & Fee */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <div className="text-[11px] text-slate-500">Monthly Plan</div>
                  <div className="text-lg font-bold text-slate-900">
                    {formatMoney(family.fee_plan?.amount || 350)}
                    <span className="text-xs font-normal text-slate-500">/mo</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    id={`edit-family-${family.id}`}
                    onClick={() => handleOpenEditModal(family)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1"
                    title="Edit Family Profile, Contacts, Students & Fee Plan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => onOpenPaymentModal(family)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    Record Pay
                  </button>
                  <button
                    onClick={() => onOpenReminderModal(family)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Remind
                  </button>
                  <button
                    onClick={() => handleDeleteFamily(family.id, family.parent_name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Family"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredFamilies.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">No Families Registered Yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Your database is clean and ready for public launch. Click "Register Family" to add parent contacts, student rosters, and assign monthly fee plans in Indian Rupees (₹).
            </p>
            <button
              onClick={() => setIsRegisterOpen(true)}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Register First Family
            </button>
          </div>
        )}
      </div>

      {/* Modal: Risk Score Breakdown (F1) */}
      {inspectRiskFamily && inspectRiskFamily.risk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Info className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Payment Risk Intelligence Analysis</h3>
                  <p className="text-xs text-slate-500">{inspectRiskFamily.parent_name}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectRiskFamily(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Big Score Header */}
              <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase">Composite Risk Score</div>
                  <div className="text-3xl font-extrabold text-slate-900">
                    {inspectRiskFamily.risk.score}
                    <span className="text-base font-normal text-slate-400">/100</span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase ${
                      inspectRiskFamily.risk.tier === 'high'
                        ? 'bg-rose-100 text-rose-800'
                        : inspectRiskFamily.risk.tier === 'medium'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {inspectRiskFamily.risk.tier} Risk Tier
                  </span>
                  <div className="text-xs text-slate-500 mt-1">
                    Trust Rating: <strong>{inspectRiskFamily.risk.trust_score}/100</strong>
                  </div>
                </div>
              </div>

              {/* Factor Breakdown */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Contributing Scoring Factors
                </h4>
                <div className="space-y-2">
                  {inspectRiskFamily.risk.contributing_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-start justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{factor.label}</div>
                        <div className="text-slate-500 mt-0.5">{factor.explanation}</div>
                      </div>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-xs shrink-0 ${
                          factor.impact > 0
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {factor.impact > 0 ? `+${factor.impact}` : factor.impact} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommended Action */}
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950">
                <div className="font-bold mb-0.5">Recommended Staff Protocol:</div>
                <div>{inspectRiskFamily.risk.recommended_action}</div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex justify-end">
              <button
                onClick={() => setInspectRiskFamily(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Register New Family (FR1) */}
      {isRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <UserPlus className="w-4 h-4" />
                </span>
                <h3 className="font-bold text-slate-900 text-base">Register New Family & Students</h3>
              </div>
              <button
                onClick={() => setIsRegisterOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateFamily} className="p-6 space-y-4 overflow-y-auto flex-1">
              {registerError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{registerError}</span>
                </div>
              )}

              {/* Family Code / Ledger Folio Number (Mandatory Manual Entry) */}
              <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="new-family-code-input" className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Family Code / Ledger Number</span>
                    <span className="text-rose-600 font-bold">* (Mandatory)</span>
                  </label>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/90 border border-amber-300/80 px-2 py-0.5 rounded-md">
                    Manual Ledger Entry
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-2">
                  Enter the ledger folio number or family code already assigned to this household in your physical ledger books.
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">#</span>
                  <input
                    id="new-family-code-input"
                    type="text"
                    required
                    placeholder="e.g. FAM-042 or 104-B"
                    value={newFamilyCode}
                    onChange={(e) => {
                      setNewFamilyCode(e.target.value);
                      if (registerError) setRegisterError(null);
                    }}
                    className="w-full pl-7 pr-3 py-2 text-sm font-bold font-mono uppercase tracking-wide rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Full Name *</label>
                <input
                  id="new-parent-name-input"
                  type="text"
                  required
                  placeholder="e.g. Jessica & David Miller"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 (555) 000-0000"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="parent@example.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="Street address, unit/apt"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Fee Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">Monthly Expected Fee ({currencySymbol}) *</label>
                    <button
                      type="button"
                      onClick={() => setNewMonthlyFee(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100)}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                    >
                      Use Fixed Rate ({formatMoney(settings.fixed_tuition_rate)})
                    </button>
                  </div>
                  <div className="relative mb-2">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">{currencySymbol}</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={newMonthlyFee}
                      onChange={(e) => setNewMonthlyFee(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {(currencyCode === 'INR' ? [100, 250, 500, 1000, 1500, 2000, 2500] : [100, 150, 200, 250, 300, 350, 400]).map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setNewMonthlyFee(amt)}
                        className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                          newMonthlyFee === amt
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {formatMoney(amt)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Plan Category</label>
                  <select
                    value={newFeeType}
                    onChange={(e: any) => setNewFeeType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="tuition">Tuition Core</option>
                    <option value="combo">Tuition + Lab / Study Materials</option>
                    <option value="transport">Tuition + Transport</option>
                  </select>
                </div>
              </div>

              {/* Students Section (Multiple Students Support) */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Enrolled Students ({newStudents.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStudentField}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Sibling
                  </button>
                </div>

                <div className="space-y-3">
                  {newStudents.map((st, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder={`Student #${idx + 1} Name`}
                          value={st.name}
                          onChange={(e) => {
                            const updated = [...newStudents];
                            updated[idx].name = e.target.value;
                            setNewStudents(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>
                      <div className="w-48">
                        <input
                          type="text"
                          required
                          placeholder="Grade / Course Batch"
                          value={st.grade}
                          onChange={(e) => {
                            const updated = [...newStudents];
                            updated[idx].grade = e.target.value;
                            setNewStudents(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>
                      {newStudents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStudentField(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special billing instructions, preferred communication window..."
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRegisterOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Registering...' : 'Complete Registration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Family Details Modal */}
      {editingFamily && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edit Family Details</h3>
                  <p className="text-xs text-slate-500">
                    Household ID: <span className="font-mono font-semibold">{editingFamily.id}</span> • {editingFamily.parent_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingFamily(null)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveFamilyEdit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{editError}</span>
                </div>
              )}

              {/* Primary Contact Details */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Primary Household Contact</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Family Code / Ledger # *
                    </label>
                    <input
                      id="edit-family-code-input"
                      type="text"
                      required
                      placeholder="e.g. FAM-042"
                      value={editFamilyCode}
                      onChange={(e) => setEditFamilyCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm font-mono font-bold uppercase rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Parent / Guardian Name *</label>
                    <input
                      id="edit-parent-name-input"
                      type="text"
                      required
                      placeholder="e.g., Rajesh Sharma"
                      value={editParentName}
                      onChange={(e) => setEditParentName(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e: any) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
                    >
                      <option value="active">Active Household</option>
                      <option value="inactive">Inactive / Archived</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="+91 98765 43210"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="parent@example.com"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                  <input
                    type="text"
                    placeholder="Street, City, Postal Code"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Fee Plan & Fixed Rate (Starting on 100 Rs) */}
              <div className="pt-4 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Tuition & Billing Plan (Starting from ₹100)</h4>
                <p className="text-[11px] text-slate-400 mb-3">Configure expected monthly charges for this household.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">Monthly Expected Fee ({currencySymbol}) *</label>
                      <button
                        type="button"
                        onClick={() => setEditMonthlyFee(settings.fixed_tuition_rate || 100)}
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                      >
                        Reset to Baseline ({formatMoney(settings.fixed_tuition_rate || 100)})
                      </button>
                    </div>
                    <div className="relative mb-2">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">{currencySymbol}</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={editMonthlyFee}
                        onChange={(e) => setEditMonthlyFee(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(currencyCode === 'INR' ? [100, 250, 500, 1000, 1500, 2000, 2500] : [100, 150, 200, 250, 300, 350, 400]).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setEditMonthlyFee(amt)}
                          className={`text-[10px] px-2 py-0.5 rounded-md border font-medium cursor-pointer transition-colors ${
                            editMonthlyFee === amt
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {formatMoney(amt)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Fee Plan Category</label>
                    <select
                      value={editFeeType}
                      onChange={(e: any) => setEditFeeType(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="tuition">Tuition Core</option>
                      <option value="combo">Tuition + Lab / Study Materials</option>
                      <option value="transport">Tuition + Transport</option>
                    </select>
                    <p className="text-[11px] text-slate-400 mt-2">
                      Applies to all active students registered under this household billing cycle.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enrolled Students & Siblings */}
              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Enrolled Students ({editStudents.length})</h4>
                    <p className="text-[11px] text-slate-400">Manage student names, assigned batches, and individual enrollment status.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddEditStudentField}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Sibling
                  </button>
                </div>

                <div className="space-y-2.5">
                  {editStudents.map((st, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-2.5">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder={`Student #${idx + 1} Full Name`}
                          value={st.name}
                          onChange={(e) => {
                            const updated = [...editStudents];
                            updated[idx].name = e.target.value;
                            setEditStudents(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>
                      <div className="w-full sm:w-44">
                        <input
                          type="text"
                          required
                          placeholder="Grade / Course Batch"
                          value={st.grade}
                          onChange={(e) => {
                            const updated = [...editStudents];
                            updated[idx].grade = e.target.value;
                            setEditStudents(updated);
                          }}
                          className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <select
                          value={st.status || 'active'}
                          onChange={(e: any) => {
                            const updated = [...editStudents];
                            updated[idx].status = e.target.value;
                            setEditStudents(updated);
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white font-medium"
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      </div>
                      {editStudents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveEditStudentField(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer self-end sm:self-center rounded-lg hover:bg-rose-50 transition-colors"
                          title="Remove Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Administrative Notes */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Administrative / Internal Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special fee arrangements, communication preferences, payment promises..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {onEditFamilyInSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        const id = editingFamily.id;
                        setEditingFamily(null);
                        onEditFamilyInSettings(id);
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <SettingsIcon className="w-3.5 h-3.5" />
                      <span>Advanced Settings</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingFamily(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    {isUpdating ? (
                      <>Saving Changes...</>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" /> Save Family Details
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Edit Standard Base Tuition Rate */}
      {isEditBaseRateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-600 text-white">
                  <Edit2 className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Edit Standard Base Tuition Rate</h3>
                  <p className="text-[11px] text-slate-500">Configure institutional billing baseline</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditBaseRateOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickBaseRate} className="p-6 space-y-4">
              {quickBaseRateFeedback && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium ${
                    quickBaseRateFeedback.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {quickBaseRateFeedback.text}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="quick-base-rate-input" className="block text-xs font-bold text-slate-800">
                    Standard Base Fixed Tuition Rate ({currencySymbol} / Month) *
                  </label>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    Current: {formatMoney(settings.fixed_tuition_rate)}/mo
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mb-3">
                  This rate serves as the standard monthly fee for tuition plans and new registrations across your academy.
                </p>

                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">
                    {currencySymbol}
                  </span>
                  <input
                    id="quick-base-rate-input"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={quickBaseRateInput}
                    onChange={(e) => setQuickBaseRateInput(e.target.value)}
                    placeholder="Enter amount e.g. 100"
                    className="w-full pl-9 pr-4 py-2.5 text-base font-extrabold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] text-slate-500 font-medium block mb-1.5">Quick Presets:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(currencyCode === 'INR'
                    ? [100, 200, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 3000]
                    : [100, 150, 200, 250, 300, 350, 400, 500]
                  ).map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setQuickBaseRateInput(amt)}
                      className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                        Number(quickBaseRateInput) === amt
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {formatMoney(amt)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Option to batch update all active families */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={quickApplyToAll}
                    onChange={(e) => setQuickApplyToAll(e.target.checked)}
                    className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">
                      Synchronize all active enrolled families ({safeFamilies.filter((f) => f.status === 'active').length})
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      When checked, updates existing household plans to {formatMoney(Number(quickBaseRateInput) || 0)}/mo immediately.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditBaseRateOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingQuickBaseRate || !quickBaseRateInput || Number(quickBaseRateInput) <= 0}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSavingQuickBaseRate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Standard Rate</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
