import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  DashboardPayload,
  Family,
  PendingFeeItem
} from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { PendingView } from './components/PendingView';
import { FamiliesView } from './components/FamiliesView';
import { AnomaliesView } from './components/AnomaliesView';
import { SettingsView } from './components/SettingsView';
import { PaymentModal } from './components/PaymentModal';
import { SmartReminderModal } from './components/SmartReminderModal';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { GraduationCap, RefreshCw, AlertCircle, WifiOff, CheckCircle2 } from 'lucide-react';

function AppContent() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ium_sidebar_collapsed') === '1';
    } catch (e) {
      return false;
    }
  });

  // Stable identity so the drawer's Escape/scroll-lock effect does not re-run.
  const closeSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const toggleSidebar = useCallback(() => setIsSidebarOpen((open) => !open), []);
  const toggleSidebarCollapsed = useCallback(() => setIsSidebarCollapsed((collapsed) => !collapsed), []);

  useEffect(() => {
    try {
      localStorage.setItem('ium_sidebar_collapsed', isSidebarCollapsed ? '1' : '0');
    } catch (e) {
      // ignore storage errors
    }
  }, [isSidebarCollapsed]);

  // Initialize data from local cache if available for instant non-blocking load
  const [data, setData] = useState<DashboardPayload | null>(() => {
    try {
      const cached = localStorage.getItem('ium_dashboard_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      // ignore
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem('ium_dashboard_cache');
    } catch (e) {
      return true;
    }
  });

  const [error, setError] = useState<string | null>(null);
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null);

  const { syncSettingsFromPayload } = useCurrency();

  // Modals state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [preselectedFamily, setPreselectedFamily] = useState<Family | undefined>(undefined);
  const [preselectedAmount, setPreselectedAmount] = useState<number | undefined>(undefined);

  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [reminderFamily, setReminderFamily] = useState<Family | null>(null);
  const [reminderPendingItem, setReminderPendingItem] = useState<PendingFeeItem | undefined>(undefined);

  const [selectedFamilyForEditId, setSelectedFamilyForEditId] = useState<string | null>(null);

  const hasLoadedRef = useRef(false);
  const retryTimerRef = useRef<any>(null);

  // Fetch complete dashboard data with exponential backoff
  const fetchData = useCallback(async (attempt = 1) => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setRetryCountdown(null);

    // Only set loading to true if we don't have any cached data yet
    if (!hasLoadedRef.current && !data) {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) {
        let msg = `Server returned HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error) {
            msg = errJson.error;
          }
        } catch {
          // ignore json parse error
        }
        throw new Error(msg);
      }
      const json: DashboardPayload = await res.json();
      setData(json);
      try {
        localStorage.setItem('ium_dashboard_cache', JSON.stringify(json));
      } catch (e) {
        // ignore storage errors
      }
      if (json.settings) {
        syncSettingsFromPayload(json.settings);
      }
      hasLoadedRef.current = true;
      setError(null);
      setLoading(false);
    } catch (err: any) {
      const msg = err?.message || 'Error communicating with IUM backend';
      const isAtlasWhitelistError =
        msg.toLowerCase().includes('whitelist') ||
        msg.toLowerCase().includes('network access') ||
        msg.toLowerCase().includes('database unavailable');
      const isFatalConfig = isAtlasWhitelistError || msg.includes('MONGODB_URI is not set');

      // If server is warming up or connection momentarily unavailable, retry with backoff
      // But if it's an IP whitelist or missing env error, stop retrying immediately so the user doesn't wait indefinitely
      if (attempt < 3 && !isFatalConfig) {
        const backoffMs = attempt * 1000;
        console.warn(`Connection attempt ${attempt} failed, retrying in ${backoffMs}ms...`);
        retryTimerRef.current = setTimeout(() => {
          fetchData(attempt + 1);
        }, backoffMs);
        return;
      }

      // If all automatic retries failed or fatal configuration error:
      setLoading(false);
      setError(msg);
      console.warn('Backend connection unavailable:', msg);
    }
  }, [syncSettingsFromPayload, data]);

  useEffect(() => {
    fetchData(1);
    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [fetchData]);

  // Handlers for payment modal
  const handleOpenNewPayment = (family?: Family, amount?: number) => {
    setPreselectedFamily(family);
    setPreselectedAmount(amount);
    setIsPaymentModalOpen(true);
  };

  // Handlers for reminder modal
  const handleOpenReminderModal = (family: Family, pendingItem?: PendingFeeItem) => {
    setReminderFamily(family);
    setReminderPendingItem(pendingItem);
    setIsReminderModalOpen(true);
  };

  const handleEditFamilyInSettings = (familyId: string) => {
    setSelectedFamilyForEditId(familyId);
    setCurrentView('settings');
  };

  // Full-screen loading when no data is cached yet
  if (!data && loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg animate-bounce mb-4">
          <GraduationCap className="w-7 h-7" />
        </div>
        <h2 className="text-base font-bold text-slate-900 tracking-tight">
          Loading IUM Fee Management Platform...
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Initializing rules-based risk intelligence and cash-flow projections
        </p>
      </div>
    );
  }

  // Full-screen error only if there is NO data cached and initial load completely failed
  if (!data) {
    const isMongoWhitelistError =
      error?.toLowerCase().includes('whitelist') ||
      error?.toLowerCase().includes('network access') ||
      error?.toLowerCase().includes('database unavailable');

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full border border-rose-200 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            {isMongoWhitelistError ? 'MongoDB Atlas IP Whitelist Required' : 'System Connection Error'}
          </h2>
          <p className="text-xs text-slate-600 mt-1 mb-4">
            {isMongoWhitelistError
              ? 'Vercel serverless functions cannot connect to your MongoDB Atlas cluster because Atlas is blocking incoming connections from outside IP addresses.'
              : (error || 'Unable to establish initial connection with server.')}
          </p>

          {isMongoWhitelistError && (
            <div className="mb-5 text-left text-xs bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900">
              <strong className="block font-semibold mb-2 text-amber-950 text-sm">
                How to resolve in MongoDB Atlas:
              </strong>
              <ol className="list-decimal pl-4 space-y-1.5 text-amber-800 leading-relaxed">
                <li>
                  Log in to your <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" className="underline font-semibold hover:text-amber-950">MongoDB Atlas Dashboard</a>.
                </li>
                <li>
                  In the left sidebar under <strong>Security</strong>, click <strong>Network Access</strong>.
                </li>
                <li>
                  Click the <strong>+ Add IP Address</strong> button.
                </li>
                <li>
                  Click <strong>Allow Access from Anywhere</strong> (sets <code>0.0.0.0/0</code>) so Vercel&apos;s dynamic serverless functions can connect.
                </li>
                <li>
                  Click <strong>Confirm</strong>. Atlas takes ~30–60 seconds to deploy the change.
                </li>
              </ol>
            </div>
          )}

          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchData(1);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const payload = data;

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 font-sans transition-[padding] duration-200 selection:bg-indigo-100 selection:text-indigo-900 ${
        isSidebarCollapsed ? 'lg:pl-[4.5rem]' : 'lg:pl-64'
      }`}
    >
      {/* Offline / Reconnecting notice if we are using cached data while server is temporarily disconnected */}
      {error && (
        <div className="bg-amber-500 text-white text-xs px-4 py-2 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 max-w-2xl">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>
              <strong>Offline Mode / Cached Data:</strong> Could not reach server ({error}). Showing cached records.
            </span>
          </div>
          <button
            onClick={() => {
              setError(null);
              fetchData(1);
            }}
            className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Reconnect
          </button>
        </div>
      )}
      {/* Navigation: docked column at lg, off-canvas drawer below it */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingCount={payload.pendingItems?.length || 0}
        anomalyCount={(payload.anomalies || []).filter((a) => a.status === 'pending_review').length}
        highRiskCount={payload.metrics?.high_risk_count || 0}
        onOpenNewPayment={() => handleOpenNewPayment()}
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
      />

      {/* Topbar: current section heading and the drawer toggle */}
      <Header
        currentView={currentView}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={toggleSidebar}
      />

      {/* Main Viewport Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16">
        {currentView === 'dashboard' && (
          <DashboardView
            metrics={payload.metrics}
            forecasts={payload.forecasts || []}
            pendingItems={payload.pendingItems || []}
            families={payload.families || []}
            recentPayments={payload.recentPayments || payload.payments || []}
            onNavigate={setCurrentView}
            onOpenNewPayment={() => handleOpenNewPayment()}
            onOpenNewFamily={() => setCurrentView('families')}
            onOpenReminderModal={handleOpenReminderModal}
            onPaymentUpdated={fetchData}
          />
        )}

        {currentView === 'pending' && (
          <PendingView
            pendingItems={payload.pendingItems || []}
            onOpenReminderModal={handleOpenReminderModal}
            onOpenPaymentModal={handleOpenNewPayment}
          />
        )}

        {currentView === 'families' && (
          <FamiliesView
            families={payload.families || []}
            onOpenPaymentModal={handleOpenNewPayment}
            onOpenReminderModal={handleOpenReminderModal}
            onFamilyCreated={fetchData}
            onFamilyUpdated={fetchData}
            onFamilyDeleted={fetchData}
            onEditFamilyInSettings={handleEditFamilyInSettings}
          />
        )}

        {currentView === 'anomalies' && (
          <AnomaliesView
            anomalies={payload.anomalies || []}
            onAnomalyResolved={fetchData}
          />
        )}

        {currentView === 'settings' && (
          <SettingsView
            families={payload.families || []}
            selectedFamilyId={selectedFamilyForEditId}
            onFamilyUpdated={fetchData}
            onSettingsUpdated={fetchData}
            onNavigate={setCurrentView}
            onOpenPaymentModal={handleOpenNewPayment}
            onOpenReminderModal={handleOpenReminderModal}
          />
        )}
      </main>

      {/* Global Modals */}
      <PaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        families={payload.families}
        preselectedFamily={preselectedFamily}
        preselectedAmount={preselectedAmount}
        onPaymentSuccess={fetchData}
      />

      {reminderFamily && (
        <SmartReminderModal
          isOpen={isReminderModalOpen}
          family={reminderFamily}
          pendingItem={reminderPendingItem}
          onClose={() => {
            setIsReminderModalOpen(false);
            setReminderFamily(null);
            setReminderPendingItem(undefined);
          }}
          onReminderSent={fetchData}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <CurrencyProvider>
      <AppContent />
    </CurrencyProvider>
  );
}
