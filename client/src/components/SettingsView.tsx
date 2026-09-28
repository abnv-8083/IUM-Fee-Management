import React, { useState, useEffect } from 'react';
import {
  Family,
  Student,
  FeePlan,
  RiskScore,
  AUDIT_ACTOR,
  SystemSettings
} from '../types';
import { useCurrency, SUPPORTED_CURRENCIES } from '../context/CurrencyContext';
import {
  Settings as SettingsIcon,
  Users,
  Search,
  UserCheck,
  UserX,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  Shield,
  Sliders,
  Calendar,
  CreditCard,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Receipt,
  Bell,
  Coins,
  Globe,
  Check,
  Building,
  RefreshCw,
  Layers,
  Percent,
  DollarSign,
  Rocket
} from 'lucide-react';

interface SettingsViewProps {
  families: (Family & { risk?: RiskScore; students?: Student[]; fee_plan?: FeePlan })[];
  selectedFamilyId?: string | null;
  onFamilyUpdated: () => void;
  onSettingsUpdated?: () => void;
  onNavigate: (view: string) => void;
  onOpenPaymentModal: (family: Family) => void;
  onOpenReminderModal: (family: Family) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  families,
  selectedFamilyId,
  onFamilyUpdated,
  onSettingsUpdated,
  onNavigate,
  onOpenPaymentModal,
  onOpenReminderModal
}) => {
  const {
    settings,
    currencySymbol,
    currencyCode,
    currencyPosition,
    formatMoney,
    updateSettings,
    applyFixedRateToAll,
    clearAllDatabaseRecords
  } = useCurrency();

  const [activeTab, setActiveTab] = useState<'families' | 'tuition' | 'currency' | 'billing' | 'risk' | 'launch'>('families');
  const [isClearingData, setIsClearingData] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [launchFeedback, setLaunchFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Mode: edit existing family or register new family inside settings
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(false);
  const [currentFamilyId, setCurrentFamilyId] = useState<string>('');

  // Family Form State
  const [parentName, setParentName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [monthlyFee, setMonthlyFee] = useState<number>(350);
  const [feeType, setFeeType] = useState<FeePlan['fee_type']>('tuition');
  const [students, setStudents] = useState<
    Array<{ id?: string; name: string; grade: string; status: 'active' | 'inactive' | 'graduated' }>
  >([]);

  const [isSavingFamily, setIsSavingFamily] = useState(false);
  const [familyFeedback, setFamilyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fixed Tuition Rate Tab State
  const [fixedRateInput, setFixedRateInput] = useState<number | string>(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
  const [isFixedRateDirty, setIsFixedRateDirty] = useState(false);
  const [isSavingFixedRate, setIsSavingFixedRate] = useState(false);
  const [pricingModel, setPricingModel] = useState<'fixed_rate' | 'tiered' | 'custom'>(settings.tuition_pricing_model || 'fixed_rate');
  const [enforceOnNew, setEnforceOnNew] = useState<boolean>(settings.enforce_fixed_rate_all || false);
  const [isApplyingBatchRate, setIsApplyingBatchRate] = useState(false);
  const [tuitionFeedback, setTuitionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Currency Tab State
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string>(settings.currency_code || 'INR');
  const [customCurrencySymbol, setCustomCurrencySymbol] = useState<string>(settings.currency_symbol || '₹');
  const [customCurrencyCode, setCustomCurrencyCode] = useState<string>(settings.currency_code || 'INR');
  const [customCurrencyPosition, setCustomCurrencyPosition] = useState<'prefix' | 'suffix'>(settings.currency_position || 'prefix');
  const [isSavingCurrency, setIsSavingCurrency] = useState(false);
  const [currencyFeedback, setCurrencyFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Billing Policies State
  const [dueDay, setDueDay] = useState<number>(settings.due_day || 2);
  const [gracePeriodDays, setGracePeriodDays] = useState<number>(settings.grace_period_days || 5);
  const [siblingDiscount2nd, setSiblingDiscount2nd] = useState<number>(settings.sibling_discount_2nd || 10);
  const [siblingDiscount3rd, setSiblingDiscount3rd] = useState<number>(settings.sibling_discount_3rd || 15);
  const [isSavingBilling, setIsSavingBilling] = useState(false);
  const [billingFeedback, setBillingFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Risk Rules State
  const [highRiskCutoff, setHighRiskCutoff] = useState<number>(settings.high_risk_cutoff || 60);

  // Keep local state synced when settings context changes
  useEffect(() => {
    if (settings) {
      if (!isFixedRateDirty) {
        setFixedRateInput(settings.fixed_tuition_rate !== undefined ? settings.fixed_tuition_rate : 100);
      }
      setPricingModel(settings.tuition_pricing_model || 'fixed_rate');
      setEnforceOnNew(settings.enforce_fixed_rate_all || false);
      setSelectedCurrencyCode(settings.currency_code || 'INR');
      setCustomCurrencySymbol(settings.currency_symbol || '₹');
      setCustomCurrencyCode(settings.currency_code || 'INR');
      setCustomCurrencyPosition(settings.currency_position || 'prefix');
      setDueDay(settings.due_day || 2);
      setGracePeriodDays(settings.grace_period_days || 5);
      setSiblingDiscount2nd(settings.sibling_discount_2nd || 10);
      setSiblingDiscount3rd(settings.sibling_discount_3rd || 15);
      setHighRiskCutoff(settings.high_risk_cutoff || 60);
    }
  }, [settings, isFixedRateDirty]);

  // Handler for full public launch reset
  const handleClearDatabase = async () => {
    try {
      setIsClearingData(true);
      setLaunchFeedback(null);
      await clearAllDatabaseRecords();
      onFamilyUpdated();
      onSettingsUpdated();
      setClearConfirmOpen(false);
      setLaunchFeedback({
        type: 'success',
        text: 'Database successfully cleared and re-initialized with Indian Rupee (₹) defaults! All dummy records have been removed.'
      });
    } catch (err: any) {
      setLaunchFeedback({
        type: 'error',
        text: err.message || 'Failed to clear database records.'
      });
    } finally {
      setIsClearingData(false);
    }
  };

  // Handle selected family from props or fallback to first
  useEffect(() => {
    if (selectedFamilyId) {
      setCurrentFamilyId(selectedFamilyId);
      setIsCreatingNewFamily(false);
    } else if (!currentFamilyId && families.length > 0 && !isCreatingNewFamily) {
      setCurrentFamilyId(families[0].id);
    }
  }, [selectedFamilyId, families, currentFamilyId, isCreatingNewFamily]);

  // Load selected family data into form fields
  useEffect(() => {
    if (isCreatingNewFamily) {
      setParentName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      setStatus('active');
      setMonthlyFee(settings.fixed_tuition_rate || 350);
      setFeeType('tuition');
      setStudents([{ name: '', grade: 'Grade 9 - Standard', status: 'active' }]);
      setFamilyFeedback(null);
      return;
    }

    if (!currentFamilyId) return;
    const fam = families.find((f) => f.id === currentFamilyId);
    if (fam) {
      setParentName(fam.parent_name || '');
      setPhone(fam.phone || '');
      setEmail(fam.email || '');
      setAddress(fam.address || '');
      setNotes(fam.notes || '');
      setStatus(fam.status || 'active');
      setMonthlyFee(fam.fee_plan?.amount || settings.fixed_tuition_rate || 350);
      setFeeType(fam.fee_plan?.fee_type || 'tuition');

      const stList =
        fam.students && fam.students.length > 0
          ? fam.students.map((s) => ({
              id: s.id,
              name: s.name,
              grade: s.grade,
              status: s.status || 'active'
            }))
          : [{ name: '', grade: 'Grade 9 - Standard', status: 'active' as const }];
      setStudents(stList);
      setFamilyFeedback(null);
    }
  }, [currentFamilyId, families, isCreatingNewFamily, settings.fixed_tuition_rate]);

  // Filtered families list for the selector column
  const filteredFamilies = families.filter((f) => {
    const matchesSearch =
      f.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.phone.includes(searchQuery) ||
      f.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.students || []).some((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const selectedFamily = families.find((f) => f.id === currentFamilyId);

  // Student editing helpers
  const handleStudentChange = (
    index: number,
    field: 'name' | 'grade' | 'status',
    value: string
  ) => {
    setStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddStudent = () => {
    setStudents((prev) => [
      ...prev,
      { name: '', grade: 'Grade 10 - Standard', status: 'active' }
    ]);
  };

  const handleRemoveStudent = (index: number) => {
    if (students.length <= 1) {
      setStudents([{ name: '', grade: 'Grade 9 - Standard', status: 'active' }]);
      return;
    }
    setStudents((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Submit Family Edits / Creation
  const handleSaveFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim()) {
      setFamilyFeedback({ type: 'error', text: 'Parent / Primary Contact name is required.' });
      return;
    }
    if (!phone.trim()) {
      setFamilyFeedback({ type: 'error', text: 'Valid contact phone number is required.' });
      return;
    }

    setIsSavingFamily(true);
    setFamilyFeedback(null);

    try {
      const cleanedStudents = students.filter((s) => s.name.trim().length > 0);

      if (isCreatingNewFamily) {
        // Create new family
        const res = await fetch('/api/families', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent_name: parentName.trim(),
            phone: phone.trim(),
            email: email.trim() || `${parentName.toLowerCase().replace(/\s+/g, '.')}@family.org`,
            address: address.trim(),
            notes: notes.trim(),
            monthly_fee: Number(monthlyFee),
            fee_type: feeType,
            students: cleanedStudents,
            recorded_by: `${AUDIT_ACTOR} (Settings Console)`
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setFamilyFeedback({
            type: 'success',
            text: `New family "${parentName}" registered with monthly fee of ${formatMoney(monthlyFee)}!`
          });
          setIsCreatingNewFamily(false);
          if (data.family?.id) {
            setCurrentFamilyId(data.family.id);
          }
          onFamilyUpdated();
        } else {
          setFamilyFeedback({
            type: 'error',
            text: data.error || 'Failed to create family record.'
          });
        }
      } else {
        // Update existing family
        const res = await fetch(`/api/families/${currentFamilyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent_name: parentName.trim(),
            phone: phone.trim(),
            email: email.trim(),
            address: address.trim(),
            notes: notes.trim(),
            status,
            monthly_fee: Number(monthlyFee),
            fee_type: feeType,
            students: cleanedStudents,
            performed_by: `${AUDIT_ACTOR} (Settings Console)`
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          setFamilyFeedback({
            type: 'success',
            text: `Family profile for "${parentName}" successfully saved and updated in database!`
          });
          onFamilyUpdated();
        } else {
          setFamilyFeedback({
            type: 'error',
            text: data.error || 'Failed to update family records.'
          });
        }
      }
    } catch (err: any) {
      setFamilyFeedback({
        type: 'error',
        text: err.message || 'Network error updating family settings.'
      });
    } finally {
      setIsSavingFamily(false);
    }
  };

  // Delete / Archive Family
  const handleDeleteFamily = async () => {
    if (!selectedFamily) return;
    const confirmDelete = window.confirm(
      `Are you sure you want to delete and archive family "${selectedFamily.parent_name}"? All associated student records and future billing will be removed.`
    );
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/families/${selectedFamily.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ performed_by: `${AUDIT_ACTOR} (Settings)` })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setFamilyFeedback({
          type: 'success',
          text: `Family "${selectedFamily.parent_name}" deleted and archived.`
        });
        onFamilyUpdated();
        if (families.length > 1) {
          const next = families.find((f) => f.id !== selectedFamily.id);
          if (next) setCurrentFamilyId(next.id);
        }
      } else {
        setFamilyFeedback({
          type: 'error',
          text: data.error || 'Failed to delete family.'
        });
      }
    } catch (err: any) {
      setFamilyFeedback({ type: 'error', text: err.message || 'Error deleting family.' });
    }
  };

  const handleResetForm = () => {
    if (!selectedFamily) return;
    setParentName(selectedFamily.parent_name || '');
    setPhone(selectedFamily.phone || '');
    setEmail(selectedFamily.email || '');
    setAddress(selectedFamily.address || '');
    setNotes(selectedFamily.notes || '');
    setStatus(selectedFamily.status || 'active');
    setMonthlyFee(selectedFamily.fee_plan?.amount || settings.fixed_tuition_rate || 350);
    setFeeType(selectedFamily.fee_plan?.fee_type || 'tuition');
    setStudents(
      selectedFamily.students && selectedFamily.students.length > 0
        ? selectedFamily.students.map((s) => ({
            id: s.id,
            name: s.name,
            grade: s.grade,
            status: s.status || 'active'
          }))
        : [{ name: '', grade: 'Grade 9 - Standard', status: 'active' }]
    );
    setFamilyFeedback(null);
  };

  // Save Fixed Tuition Rate Settings
  const handleSaveTuitionSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setTuitionFeedback(null);
    const rateNum = Number(fixedRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      setTuitionFeedback({
        type: 'error',
        text: 'Please enter a valid positive tuition rate.'
      });
      return;
    }

    setIsSavingFixedRate(true);
    try {
      const success = await updateSettings({
        fixed_tuition_rate: rateNum,
        tuition_pricing_model: pricingModel,
        enforce_fixed_rate_all: enforceOnNew
      });

      if (success) {
        setIsFixedRateDirty(false);
        setFixedRateInput(rateNum);
        setTuitionFeedback({
          type: 'success',
          text: `Standard base fixed tuition rate saved to ${formatMoney(rateNum)}/month successfully!`
        });
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        setTuitionFeedback({
          type: 'error',
          text: 'Failed to persist fixed tuition rate settings.'
        });
      }
    } catch (err: any) {
      setTuitionFeedback({ type: 'error', text: err.message || 'Error saving tuition settings.' });
    } finally {
      setIsSavingFixedRate(false);
    }
  };

  // Apply Fixed Rate to All Active Families
  const handleApplyFixedRateToAll = async () => {
    const rateNum = Number(fixedRateInput);
    if (isNaN(rateNum) || rateNum <= 0) {
      setTuitionFeedback({
        type: 'error',
        text: 'Please enter a valid positive tuition rate before applying to all.'
      });
      return;
    }

    const activeCount = families.filter((f) => f.status === 'active').length;
    const confirmApply = window.confirm(
      `Apply fixed rate ${formatMoney(rateNum)} to ALL ${activeCount} active families in the database?\n\nThis will update every active household's monthly tuition billing amount immediately.`
    );
    if (!confirmApply) return;

    setIsApplyingBatchRate(true);
    setTuitionFeedback(null);

    try {
      const result = await applyFixedRateToAll(rateNum);
      if (result.success) {
        setIsFixedRateDirty(false);
        setFixedRateInput(rateNum);
        setTuitionFeedback({
          type: 'success',
          text: `Successfully applied ${formatMoney(rateNum)}/mo to all ${result.updatedCount} active families! All ledgers and forecasts updated.`
        });
        onFamilyUpdated();
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        setTuitionFeedback({
          type: 'error',
          text: 'Could not apply fixed rate to all families.'
        });
      }
    } catch (err: any) {
      setTuitionFeedback({ type: 'error', text: err.message || 'Batch update failed.' });
    } finally {
      setIsApplyingBatchRate(false);
    }
  };

  // Currency Selection Handler
  const handleSelectPresetCurrency = (c: typeof SUPPORTED_CURRENCIES[0]) => {
    setSelectedCurrencyCode(c.code);
    setCustomCurrencySymbol(c.symbol);
    setCustomCurrencyCode(c.code);
    setCustomCurrencyPosition(c.position);
  };

  // Save Currency Settings
  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCurrency(true);
    setCurrencyFeedback(null);

    try {
      const matched = SUPPORTED_CURRENCIES.find((c) => c.code === customCurrencyCode);
      const currencyName = matched ? matched.name : `${customCurrencyCode} (${customCurrencySymbol})`;

      const success = await updateSettings({
        currency_code: customCurrencyCode.trim().toUpperCase(),
        currency_symbol: customCurrencySymbol.trim(),
        currency_name: currencyName,
        currency_position: customCurrencyPosition
      });

      if (success) {
        setCurrencyFeedback({
          type: 'success',
          text: `Currency updated to ${customCurrencyCode} (${customCurrencySymbol})! All amounts and reports reformatted.`
        });
        if (onSettingsUpdated) onSettingsUpdated();
      } else {
        setCurrencyFeedback({ type: 'error', text: 'Failed to update currency settings.' });
      }
    } catch (err: any) {
      setCurrencyFeedback({ type: 'error', text: err.message || 'Error updating currency.' });
    } finally {
      setIsSavingCurrency(false);
    }
  };

  // Save Billing Policies
  const handleSaveBillingPolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBilling(true);
    setBillingFeedback(null);
    try {
      const success = await updateSettings({
        due_day: Number(dueDay),
        grace_period_days: Number(gracePeriodDays),
        sibling_discount_2nd: Number(siblingDiscount2nd),
        sibling_discount_3rd: Number(siblingDiscount3rd)
      });
      if (success) {
        setBillingFeedback({
          type: 'success',
          text: 'Billing calendar and sibling discount rules saved!'
        });
        if (onSettingsUpdated) onSettingsUpdated();
      }
    } catch (err: any) {
      setBillingFeedback({ type: 'error', text: err.message || 'Failed to save billing policies.' });
    } finally {
      setIsSavingBilling(false);
    }
  };

  // Financial impact calculations for Fixed Rate
  const activeFamilies = families.filter((f) => f.status === 'active');
  const familiesWithFixedRate = activeFamilies.filter((f) => (f.fee_plan?.amount || 0) === Number(fixedRateInput));
  const projectedTotalTuition = activeFamilies.length * Number(fixedRateInput);
  const currentTotalTuition = activeFamilies.reduce((acc, f) => acc + (f.fee_plan?.amount || 0), 0);
  const tuitionVariance = projectedTotalTuition - currentTotalTuition;

  // Format helper for live preview in Currency Tab
  const previewFormat = (amt: number) => {
    const formattedNum = Math.round(amt).toLocaleString();
    if (customCurrencyPosition === 'suffix') {
      return `${formattedNum} ${customCurrencySymbol}`;
    }
    return `${customCurrencySymbol}${formattedNum}`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
              <SettingsIcon className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Settings & Configuration Console
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Manage family profiles, adjust fixed rate tuition fees, switch currency formatting, and configure institutional billing rules.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
          <button
            id="settings-tab-families"
            onClick={() => setActiveTab('families')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'families'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Edit Families</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
              {families.length}
            </span>
          </button>

          <button
            id="settings-tab-tuition"
            onClick={() => setActiveTab('tuition')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'tuition'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-indigo-600" />
            <span>Fixed Rate Tuition</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 text-emerald-700 font-bold">
              {formatMoney(settings.fixed_tuition_rate)}
            </span>
          </button>

          <button
            id="settings-tab-currency"
            onClick={() => setActiveTab('currency')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'currency'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>Currency ({currencySymbol})</span>
          </button>

          <button
            id="settings-tab-billing"
            onClick={() => setActiveTab('billing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'billing'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Billing Policies</span>
          </button>

          <button
            id="settings-tab-risk"
            onClick={() => setActiveTab('risk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'risk'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Risk Rules</span>
          </button>

          <button
            id="settings-tab-launch"
            onClick={() => setActiveTab('launch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'launch'
                ? 'bg-white text-indigo-700 shadow-xs ring-1 ring-indigo-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Rocket className="w-3.5 h-3.5 text-indigo-600" />
            <span>Public Launch &amp; Reset</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: Edit Families & Household Profiles                                 */}
      {/* ========================================================================= */}
      {activeTab === 'families' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Family Selector Directory */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col h-[780px]">
            <div className="mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  Select Family to Edit
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {filteredFamilies.length} of {families.length}
                </span>
              </div>

              {/* Button to Register New Family in Settings */}
              <button
                id="btn-new-family-settings"
                onClick={() => {
                  setIsCreatingNewFamily(true);
                  setCurrentFamilyId('');
                }}
                className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  isCreatingNewFamily
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Register New Family in Settings</span>
              </button>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search parent, phone, student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5">
                {(['all', 'active', 'inactive'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium capitalize transition-colors cursor-pointer ${
                      filterStatus === st
                        ? 'bg-slate-900 text-white font-semibold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Families Scrollable List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {filteredFamilies.map((fam) => {
                const isSelected = !isCreatingNewFamily && fam.id === currentFamilyId;
                const risk = fam.risk;
                const studentNames = (fam.students || []).map((s) => s.name).join(', ');

                return (
                  <button
                    key={fam.id}
                    id={`select-family-${fam.id}`}
                    onClick={() => {
                      setIsCreatingNewFamily(false);
                      setCurrentFamilyId(fam.id);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer border flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-400 shadow-xs ring-1 ring-indigo-300'
                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-xs truncate max-w-[170px]">
                        {fam.parent_name}
                      </span>
                      <div className="flex items-center gap-1">
                        {fam.status === 'inactive' ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200 text-slate-700">
                            Inactive
                          </span>
                        ) : risk?.tier === 'high' ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            High Risk
                          </span>
                        ) : risk?.tier === 'medium' ? (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            Medium
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Low
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{fam.phone}</span>
                      <span className="font-bold text-slate-800">
                        {formatMoney(fam.fee_plan?.amount || 350)}/mo
                      </span>
                    </div>

                    {studentNames && (
                      <div className="text-[10px] text-slate-400 truncate">
                        Students: {studentNames}
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredFamilies.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400">
                  No families found matching filter.
                </div>
              )}
            </div>

            {/* Quick Link to Families Directory */}
            <div className="pt-3 border-t border-slate-100 mt-2">
              <button
                onClick={() => onNavigate('families')}
                className="w-full py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50/50 hover:bg-indigo-50 rounded-xl transition-colors text-center inline-flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>View Full Cards Directory</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Right Column: Family Edit / Registration Form */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs h-[780px] overflow-y-auto">
            {isCreatingNewFamily || selectedFamily ? (
              <form onSubmit={handleSaveFamily} className="space-y-6">
                {/* Form Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-bold text-slate-900">
                        {isCreatingNewFamily ? 'Register New Family' : `Editing: ${selectedFamily?.parent_name}`}
                      </h2>
                      {!isCreatingNewFamily && selectedFamily && (
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                          {selectedFamily.id}
                        </span>
                      )}
                      {isCreatingNewFamily && (
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold">
                          New Household
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isCreatingNewFamily
                        ? 'Enroll a new student household with contact records and fee parameters.'
                        : `Enrolled since ${new Date(selectedFamily?.created_at || '').toLocaleDateString()} • ${selectedFamily?.students?.length || 0} student(s) linked`}
                    </p>
                  </div>

                  {/* Actions for Existing Family */}
                  {!isCreatingNewFamily && selectedFamily && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(selectedFamily)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        Record Payment
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenReminderModal(selectedFamily)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Send Reminder
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteFamily}
                        className="p-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                        title="Delete and archive family"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {isCreatingNewFamily && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewFamily(false);
                        if (families.length > 0) setCurrentFamilyId(families[0].id);
                      }}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Cancel Registration
                    </button>
                  )}
                </div>

                {/* Status / Feedback message */}
                {familyFeedback && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                      familyFeedback.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {familyFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{familyFeedback.text}</span>
                  </div>
                )}

                {/* Section 1: Contact & Profile Details */}
                <div>
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                    Parent & Contact Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Parent / Guardian Full Name *
                      </label>
                      <input
                        id="edit-parent-name"
                        type="text"
                        required
                        value={parentName}
                        onChange={(e) => setParentName(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="e.g. Dr. Aris Thorne"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Phone Number (WhatsApp / SMS) *
                      </label>
                      <input
                        id="edit-phone"
                        type="text"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="+1 (555) 000-0000"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Email Address
                      </label>
                      <input
                        id="edit-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="parent@example.com"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Account Status
                      </label>
                      <select
                        id="edit-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="active">Active (Enrolled & Billed)</option>
                        <option value="inactive">Inactive / Archived</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Home Address
                      </label>
                      <input
                        id="edit-address"
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        placeholder="Street, City, Postal Code"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Tuition Fee Plan & Fixed Rate Option */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-indigo-600" />
                      Tuition Fee Plan & Billing Rate
                    </h3>
                    <span className="text-[11px] text-slate-500">
                      Standard due date: {settings.due_day || 2}nd of each month
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          Monthly Tuition Fee ({currencySymbol}) *
                        </label>
                        {/* Quick Action: Apply System Fixed Rate */}
                        <button
                          type="button"
                          id="btn-use-fixed-rate"
                          onClick={() => setMonthlyFee(settings.fixed_tuition_rate || 350)}
                          className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                        >
                          <Building className="w-3 h-3" />
                          <span>Use Fixed Rate ({formatMoney(settings.fixed_tuition_rate)})</span>
                        </button>
                      </div>

                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs font-bold text-slate-500">{currencySymbol}</span>
                        <input
                          id="edit-monthly-fee"
                          type="number"
                          min="1"
                          required
                          value={monthlyFee}
                          onChange={(e) => setMonthlyFee(Number(e.target.value))}
                          className="w-full pl-8 pr-3.5 py-2 text-xs font-bold text-slate-900 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      {/* Fee Presets */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-[10px] text-slate-400 font-medium">Quick Presets:</span>
                        {[
                          settings.fixed_tuition_rate,
                          Math.round(settings.fixed_tuition_rate * 0.8),
                          Math.round(settings.fixed_tuition_rate * 1.2),
                          Math.round(settings.fixed_tuition_rate * 1.5)
                        ]
                          .filter((val, idx, self) => val > 0 && self.indexOf(val) === idx)
                          .sort((a, b) => a - b)
                          .map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => setMonthlyFee(amt)}
                              className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                                monthlyFee === amt
                                  ? 'bg-indigo-600 text-white border-indigo-600 font-bold'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {formatMoney(amt)}
                            </button>
                          ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Fee Plan Classification
                      </label>
                      <select
                        id="edit-fee-type"
                        value={feeType}
                        onChange={(e) => setFeeType(e.target.value as FeePlan['fee_type'])}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="tuition">Standard Tuition</option>
                        <option value="combo">Tuition + Lab & Materials Combo</option>
                        <option value="books">Standard + Books Package</option>
                        <option value="transport">Tuition + Campus Transport</option>
                      </select>

                      {students.length > 1 && (
                        <div className="mt-2 text-[11px] text-indigo-700 bg-indigo-50/80 p-2 rounded-lg border border-indigo-200 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {students.length} siblings enrolled • Eligible for {settings.sibling_discount_2nd || 10}% Sibling Discount
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section 3: Student Roster Management */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Enrolled Students ({students.length})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Add, edit, or adjust grade levels for students associated with this household.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="edit-add-student-btn"
                      onClick={handleAddStudent}
                      className="px-2.5 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Student
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {students.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center gap-2"
                      >
                        <span className="text-[11px] font-bold text-slate-400 w-6">#{idx + 1}</span>

                        <div className="flex-1 w-full">
                          <input
                            type="text"
                            placeholder="Student Full Name"
                            value={st.name}
                            onChange={(e) => handleStudentChange(idx, 'name', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                          />
                        </div>

                        <div className="w-full sm:w-56">
                          <input
                            type="text"
                            placeholder="Grade / Course"
                            value={st.grade}
                            onChange={(e) => handleStudentChange(idx, 'grade', e.target.value)}
                            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                          />
                        </div>

                        <div className="w-full sm:w-32">
                          <select
                            value={st.status}
                            onChange={(e) => handleStudentChange(idx, 'status', e.target.value as any)}
                            className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                          >
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                            <option value="graduated">Graduated</option>
                          </select>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveStudent(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Remove Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 4: Administrative Notes */}
                <div className="pt-4 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Administrative Notes & Payment Behavior
                  </label>
                  <textarea
                    id="edit-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                    placeholder="E.g. Prefers email reminders, requested sibling fee waiver, out-of-town work schedule..."
                  />
                </div>

                {/* Footer Save / Reset Buttons */}
                <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                  {!isCreatingNewFamily && (
                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Form
                    </button>
                  )}

                  <button
                    id="save-family-settings-btn"
                    type="submit"
                    disabled={isSavingFamily}
                    className="ml-auto px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>
                      {isSavingFamily
                        ? 'Saving...'
                        : isCreatingNewFamily
                        ? 'Complete Registration'
                        : 'Save Family Updates'}
                    </span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-800">No Family Selected</h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Choose an enrolled household from the directory on the left or click "+ Register New Family" to create a new profile.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: Fixed Rate Tuition Fee & Institution Pricing Strategy               */}
      {/* ========================================================================= */}
      {activeTab === 'tuition' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Building className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Fixed Rate Tuition Fee & Pricing Strategy
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Configure the standardized baseline tuition rate for all enrolled households and apply institution-wide pricing policies.
                  </p>
                </div>
              </div>
            </div>

            {tuitionFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  tuitionFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {tuitionFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{tuitionFeedback.text}</span>
              </div>
            )}

            <form onSubmit={handleSaveTuitionSettings} className="space-y-6">
              {/* Pricing Model Option */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Institutional Pricing Architecture
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setPricingModel('fixed_rate')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      pricingModel === 'fixed_rate'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded-md bg-indigo-600 text-white">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span className="text-xs font-bold text-slate-900">Standard Fixed Rate Model</span>
                      </div>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      All households adhere to a single unified baseline rate. Ensures predictable forecasting and simplified fee auditing.
                    </p>
                  </div>

                  <div
                    onClick={() => setPricingModel('tiered')}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      pricingModel === 'tiered'
                        ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="p-1 rounded-md bg-slate-300 text-slate-700">
                        <Layers className="w-3.5 h-3.5" />
                      </span>
                      <span className="text-xs font-bold text-slate-900">Variable / Tiered Model</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-2">
                      Allows customized tuition rates per household according to academic level, special arrangements, and individualized agreements.
                    </p>
                  </div>
                </div>
              </div>

              {/* Base Fixed Tuition Rate Input */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
                    <label htmlFor="fixed-rate-tuition-input" className="block text-xs font-bold text-slate-800">
                      Standard Base Fixed Tuition Rate ({currencySymbol} / Month) *
                    </label>
                    <div className="flex items-center gap-2">
                      {isFixedRateDirty && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md animate-pulse">
                          Unsaved Changes
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md">
                        Active Base: {formatMoney(settings.fixed_tuition_rate)}/mo
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-3">
                    This amount is the default expected fee for active coaching programs and automatically populates new family billing plans. You can edit this value to any custom amount (e.g. ₹100, ₹250, ₹500, ₹1,200).
                  </p>

                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="relative w-full sm:w-64">
                      <span className="absolute left-3.5 top-2.5 text-sm font-bold text-slate-500">
                        {currencySymbol}
                      </span>
                      <input
                        id="fixed-rate-tuition-input"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={fixedRateInput}
                        onChange={(e) => {
                          setFixedRateInput(e.target.value);
                          setIsFixedRateDirty(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSaveTuitionSettings();
                          }
                        }}
                        placeholder="e.g. 100"
                        className="w-full pl-9 pr-4 py-2 text-base font-extrabold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      />
                    </div>

                    <button
                      type="button"
                      id="btn-quick-save-fixed-rate"
                      onClick={() => handleSaveTuitionSettings()}
                      disabled={isSavingFixedRate || !fixedRateInput || Number(fixedRateInput) <= 0}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSavingFixedRate ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Rate</span>
                        </>
                      )}
                    </button>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Quick Presets:</span>
                      {(currencyCode === 'INR' ? [100, 200, 250, 300, 500, 750, 1000, 1500, 2000, 2500, 3000] : [100, 150, 200, 250, 300, 350, 400, 500]).map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => {
                            setFixedRateInput(amt);
                            setIsFixedRateDirty(true);
                          }}
                          className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all cursor-pointer ${
                            Number(fixedRateInput) === amt
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {formatMoney(amt)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Enforce on New Registrations Toggle */}
                <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Enforce Fixed Rate on New Enrollments
                    </span>
                    <span className="text-[11px] text-slate-500">
                      When active, newly registered families automatically default to {formatMoney(Number(fixedRateInput) || settings.fixed_tuition_rate)}/mo.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enforceOnNew}
                      onChange={(e) => setEnforceOnNew(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {/* Save Button for Pricing Configuration */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  id="btn-save-fixed-tuition"
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Fixed Rate Policy</span>
                </button>
              </div>
            </form>

            {/* Batch Action: Apply Fixed Rate to All Families */}
            <div className="pt-6 border-t border-slate-200">
              <div className="bg-gradient-to-r from-indigo-50/70 to-slate-50 p-5 rounded-2xl border border-indigo-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    Batch Apply Fixed Rate to All Enrolled Families
                  </h3>
                  <p className="text-xs text-slate-600 mt-1 max-w-xl">
                    Synchronize all <strong>{activeFamilies.length} active families</strong> in the database to{' '}
                    <strong>{formatMoney(fixedRateInput)}/month</strong> with a single action. Existing custom amounts will be updated to this standard baseline.
                  </p>
                </div>

                <button
                  type="button"
                  id="btn-apply-fixed-rate-all"
                  onClick={handleApplyFixedRateToAll}
                  disabled={isApplyingBatchRate}
                  className="shrink-0 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isApplyingBatchRate ? 'animate-spin' : ''}`} />
                  <span>
                    {isApplyingBatchRate ? 'Updating Families...' : `Apply ${formatMoney(fixedRateInput)} to All (${activeFamilies.length})`}
                  </span>
                </button>
              </div>
            </div>

            {/* Institution Financial Impact Breakdown */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Projected Institutional Revenue Impact
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Active Households</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{activeFamilies.length} Families</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    {familiesWithFixedRate.length} currently at {formatMoney(fixedRateInput)}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Total Monthly Projection</span>
                  <span className="text-xl font-bold text-indigo-700 mt-1 block">
                    {formatMoney(projectedTotalTuition)}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    At {formatMoney(fixedRateInput)} standard rate
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Variance from Current Actual</span>
                  <span
                    className={`text-xl font-bold mt-1 block ${
                      tuitionVariance >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {tuitionVariance >= 0 ? `+${formatMoney(tuitionVariance)}` : `-${formatMoney(Math.abs(tuitionVariance))}`}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    vs current billing sum of {formatMoney(currentTotalTuition)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: Currency Changing & International Formatting                       */}
      {/* ========================================================================= */}
      {activeTab === 'currency' && (
        <div className="max-w-4xl space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                  <Globe className="w-5 h-5" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Currency Changing & Formatting Settings
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select your institution's functional currency code and symbol. All ledger records, receipts, KPI summaries, and forecasts adapt dynamically.
                  </p>
                </div>
              </div>
            </div>

            {currencyFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  currencyFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {currencyFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{currencyFeedback.text}</span>
              </div>
            )}

            {/* Current Active Currency Summary Card */}
            <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-xs">
                  {currencySymbol}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-indigo-950 uppercase tracking-wide">
                      Active Currency
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-200/70 text-indigo-800 font-extrabold">
                      {currencyCode}
                    </span>
                  </div>
                  <p className="text-xs text-indigo-900/80 mt-0.5">
                    {settings.currency_name || 'Configured Currency'} • Position: {currencyPosition === 'prefix' ? 'Prefix ($350)' : 'Suffix (350 AED)'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-indigo-700 font-medium block">Sample Display:</span>
                <span className="text-base font-extrabold text-indigo-950">
                  {formatMoney(350)} &bull; {formatMoney(2500)}
                </span>
              </div>
            </div>

            {/* Supported Major Currencies Selector Grid */}
            <div>
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Select from Supported Global Currencies
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {SUPPORTED_CURRENCIES.map((c) => {
                  const isSelected = customCurrencyCode === c.code && customCurrencySymbol === c.symbol;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      id={`currency-btn-${c.code.toLowerCase()}`}
                      onClick={() => handleSelectPresetCurrency(c)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-extrabold text-slate-900">
                          {c.code}
                        </span>
                        <span
                          className={`font-bold text-sm px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {c.symbol}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-500 truncate mt-0.5">
                        {c.name.replace(/\s*\(.*?\)/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Currency Configuration & Position */}
            <form onSubmit={handleSaveCurrency} className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Currency Symbol & Placement Specifications
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency ISO Code *
                  </label>
                  <input
                    id="custom-currency-code-input"
                    type="text"
                    required
                    maxLength={5}
                    value={customCurrencyCode}
                    onChange={(e) => setCustomCurrencyCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                    placeholder="e.g. USD, EUR, AUD"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Currency Symbol *
                  </label>
                  <input
                    id="custom-currency-symbol-input"
                    type="text"
                    required
                    maxLength={6}
                    value={customCurrencySymbol}
                    onChange={(e) => setCustomCurrencySymbol(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    placeholder="e.g. $, €, £, ₹, AED"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Symbol Placement
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCustomCurrencyPosition('prefix')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                        customCurrencyPosition === 'prefix'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Prefix ({customCurrencySymbol}350)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomCurrencyPosition('suffix')}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center ${
                        customCurrencyPosition === 'suffix'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Suffix (350 {customCurrencySymbol})
                    </button>
                  </div>
                </div>
              </div>

              {/* Live Preview of Currency Formatting */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Live Formatting Preview Across App:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Single Student Tuition:</span>
                    <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                      {previewFormat(settings.fixed_tuition_rate || 350)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Sample Overdue Balance:</span>
                    <span className="text-sm font-extrabold text-rose-700 mt-0.5 block">
                      {previewFormat(700)}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Projected Monthly Total:</span>
                    <span className="text-sm font-extrabold text-indigo-700 mt-0.5 block">
                      {previewFormat((settings.fixed_tuition_rate || 350) * families.length)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  id="btn-save-currency-settings"
                  disabled={isSavingCurrency}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingCurrency ? 'Updating Currency...' : 'Save & Apply Currency'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: Institutional Billing Policies                                     */}
      {/* ========================================================================= */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Institutional Billing & Collection Policies</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rules governing monthly billing cycles, cutoff dates, and sibling package discount tiers.
            </p>
          </div>

          {billingFeedback && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{billingFeedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSaveBillingPolicies} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Monthly Due Date (Day of Month)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={dueDay}
                    onChange={(e) => setDueDay(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                  <span className="text-xs text-slate-500">th of every month (Currently: {dueDay}nd)</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Grace Period Before Overdue Flagging (Days)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="15"
                    value={gracePeriodDays}
                    onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                  <span className="text-xs text-slate-500">Days allowed past due date before automated alerts</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  2nd Sibling Discount (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={siblingDiscount2nd}
                    onChange={(e) => setSiblingDiscount2nd(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                  <span className="text-xs text-slate-500">% reduction on secondary child tuition</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  3rd+ Sibling Package Discount (%)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="60"
                    value={siblingDiscount3rd}
                    onChange={(e) => setSiblingDiscount3rd(Number(e.target.value))}
                    className="w-24 px-3 py-2 text-xs font-bold rounded-xl border border-slate-200"
                  />
                  <span className="text-xs text-slate-500">% reduction on 3+ child tuition package</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end">
              <button
                type="submit"
                disabled={isSavingBilling}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingBilling ? 'Saving...' : 'Save Billing Policies'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: Risk Engine Rules                                                  */}
      {/* ========================================================================= */}
      {activeTab === 'risk' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs max-w-4xl space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Rules-Based Risk Intelligence Parameters</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tuning thresholds for predictive scoring (0–100) and automated escalation protocols.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20">
              <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block mb-1">
                High Risk Tier
              </span>
              <div className="text-2xl font-bold text-rose-900">Score &gt; {highRiskCutoff}</div>
              <p className="text-xs text-slate-600 mt-1">
                Triggers urgent tone reminders, weekly audit alerts, and proactive administrative follow-up.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20">
              <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                Medium Risk Tier
              </span>
              <div className="text-2xl font-bold text-amber-900">Score 30 &ndash; {highRiskCutoff}</div>
              <p className="text-xs text-slate-600 mt-1">
                Dispatches polite follow-up reminders via WhatsApp during optimal contact hours.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/20">
              <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">
                Trusted Payer Badge
              </span>
              <div className="text-2xl font-bold text-emerald-900">Trust Score &ge; 80</div>
              <p className="text-xs text-slate-600 mt-1">
                Awarded for consecutive on-time payments. Unlocks advance prepayment incentives.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: Public Launch & Database Reset                                     */}
      {/* ========================================================================= */}
      {activeTab === 'launch' && (
        <div className="max-w-4xl space-y-6">
          {/* Main Launch Status Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <span className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                  <Rocket className="w-6 h-6" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    Public Launch Readiness
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready for Launch
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your application is configured for Indian Rupees (₹) with a clean database ready for public enrollment.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setActiveTab('families');
                  setIsCreatingNewFamily(true);
                  setCurrentFamilyId('');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Enroll First Family</span>
              </button>
            </div>

            {launchFeedback && (
              <div
                className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
                  launchFeedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {launchFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{launchFeedback.text}</span>
              </div>
            )}

            {/* Metrics Overview Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Active Currency
                </span>
                <div className="text-xl font-extrabold text-indigo-700 mt-1 flex items-center gap-1.5">
                  <span>{currencySymbol}</span>
                  <span className="text-sm font-semibold text-slate-700">({currencyCode})</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Default format: {formatMoney(2500)}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Enrolled Families
                </span>
                <div className="text-xl font-extrabold text-slate-900 mt-1">
                  {families.length} Families
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  {families.length === 0 ? 'Zero dummy profiles' : 'Live household records'}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Database State
                </span>
                <div className="text-xl font-extrabold text-emerald-700 mt-1 flex items-center gap-1">
                  <Check className="w-5 h-5" /> Clean State
                </div>
                <span className="text-[11px] text-slate-400 mt-0.5 block">
                  Ready for live school operations
                </span>
              </div>
            </div>

            {/* Launch Checklist */}
            <div className="rounded-xl border border-slate-200 p-5 bg-slate-50/50 space-y-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Production Launch Checklist
              </h3>
              <div className="space-y-2.5 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Primary Currency:</strong> Configured to Indian Rupee (INR - ₹) across all ledgers and receipts.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Sample Data Cleaned:</strong> All mock households, dummy invoices, and test audit items cleared.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Intelligent AI Engine:</strong> WhatsApp &amp; SMS reminder templates dynamically format in ₹ INR.</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <span><strong>Full Full-Stack Storage:</strong> Persistent JSON file database actively storing live records.</span>
                </div>
              </div>
            </div>

            {/* Clean Wipe / Re-initialization Action */}
            <div className="pt-4 border-t border-slate-200">
              <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Reset or Wipe Database
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 max-w-lg">
                    If you ever need to reset testing data before public enrollment, this will purge all records and re-initialize the database with pristine INR configuration.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setClearConfirmOpen(true)}
                  disabled={isClearingData}
                  className="shrink-0 px-4 py-2 rounded-xl border border-rose-300 bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isClearingData ? 'animate-spin' : ''}`} />
                  <span>{isClearingData ? 'Clearing...' : 'Clear All Records'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Modal Confirmation for Database Wipe */}
          {clearConfirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 p-6 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="text-center space-y-1.5">
                  <h3 className="text-base font-bold text-slate-900">
                    Confirm Database Reset
                  </h3>
                  <p className="text-xs text-slate-500">
                    This action will delete all families, students, payments, reminders, and audit history, leaving a completely blank slate initialized in <strong>Indian Rupees (₹)</strong>.
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setClearConfirmOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearDatabase}
                    disabled={isClearingData}
                    className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isClearingData ? 'Wiping...' : 'Yes, Clear All Data'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
