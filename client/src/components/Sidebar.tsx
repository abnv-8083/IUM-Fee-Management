import React, { useEffect, useState } from 'react';
import { COUNTER_TONES, NAV_SECTIONS } from '../navigation';
import {
  GraduationCap,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Clock,
  Users,
  Receipt,
  Settings,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
  pendingCount: number;
  anomalyCount: number;
  highRiskCount: number;
  onOpenNewPayment: () => void;
  /** Drawer visibility. Ignored at `lg`, where the sidebar is always docked. */
  isOpen: boolean;
  onClose: () => void;
  /** Icon-only rail. Applies at `lg` only; the mobile drawer is always full width. */
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const SECTION_ICONS: Record<string, typeof TrendingUp> = {
  dashboard: TrendingUp,
  pending: Clock,
  families: Users,
  anomalies: AlertTriangle,
  settings: Settings
};

/** Tracks the `lg` breakpoint so the drawer only traps focus while it is a drawer. */
function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  );

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const onChange = (event: MediaQueryListEvent) => setIsDesktop(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return isDesktop;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  setCurrentView,
  pendingCount,
  anomalyCount,
  highRiskCount,
  onOpenNewPayment,
  isOpen,
  onClose,
  isCollapsed,
  onToggleCollapse
}) => {
  const isDesktop = useIsDesktop();

  const counts: Record<string, number> = {
    pending: pendingCount,
    families: highRiskCount,
    anomalies: anomalyCount
  };

  // Escape closes the drawer, and lock the page behind it while open.
  useEffect(() => {
    if (!isOpen || isDesktop) return undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isDesktop, onClose]);

  const drawerHidden = !isDesktop && !isOpen;
  /** Collapse only ever hides text at `lg`; the drawer keeps its labels. */
  const hideWhenCollapsed = isCollapsed ? 'lg:hidden' : '';

  return (
    <>
      {/* Scrim: only ever visible while the drawer is over the page. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-200 lg:hidden ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      <aside
        id="app-sidebar"
        aria-label="Primary"
        inert={drawerHidden || undefined}
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white transition-[transform,width] duration-200 ease-out lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        } ${isCollapsed ? 'lg:w-[4.5rem]' : 'lg:w-64'}`}
      >
        {/* Brand */}
        <div
          className={`flex items-start gap-3 px-4 pb-5 pt-5 ${
            isCollapsed ? 'lg:justify-center lg:px-2' : ''
          }`}
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className={`min-w-0 flex-1 ${hideWhenCollapsed}`}>
            <p className="truncate text-sm font-bold leading-tight tracking-tight text-slate-900">
              IUM Fee Management
            </p>
            <span className="mt-1 inline-flex items-center rounded-md border border-indigo-200/60 bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
              <Sparkles className="mr-1 h-2.5 w-2.5" />
              Risk Engine v1.0
            </span>
          </div>
          <button
            id="sidebar-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/*
          Nav items are full-bleed so the selected section's left rule sits
          against the edge, reading as a marker rather than a floating pill.
        */}
        <nav aria-label="Sections" className="flex-1 overflow-y-auto py-1">
          {NAV_SECTIONS.map((section) => {
            const Icon = SECTION_ICONS[section.id] ?? TrendingUp;
            const isActive = currentView === section.id;
            const count = counts[section.id] ?? 0;
            const countTitle = section.countLabel ? `${count} ${section.countLabel}` : undefined;

            return (
              <button
                key={section.id}
                id={`nav-tab-${section.id}`}
                type="button"
                onClick={() => {
                  setCurrentView(section.id);
                  if (!isDesktop) onClose();
                }}
                aria-current={isActive ? 'page' : undefined}
                data-active={isActive}
                title={section.label}
                className={`group relative flex w-full items-center gap-3 rounded-r-lg border-l-[3px] px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 ${
                  isCollapsed ? 'lg:justify-center lg:gap-0 lg:px-0' : ''
                } ${
                  isActive
                    ? 'border-l-indigo-600 bg-indigo-50 font-semibold text-indigo-700'
                    : 'border-l-transparent font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                  }`}
                />
                <span className={`flex-1 truncate ${hideWhenCollapsed}`}>{section.label}</span>

                {count > 0 && (
                  <>
                    {/* Inline chip while expanded. */}
                    <span
                      title={countTitle}
                      className={`inline-flex h-5 min-w-[1.25rem] shrink-0 items-center justify-center rounded-md px-1.5 text-[10px] font-bold tabular-nums ${COUNTER_TONES[section.tone]} ${hideWhenCollapsed}`}
                    >
                      {count}
                      {section.countLabel && <span className="sr-only"> {section.countLabel}</span>}
                    </span>
                    {/*
                      Collapsed rail: the count moves to the item's corner so the
                      urgency signals survive without room for a label.
                    */}
                    {isCollapsed && (
                      <span
                        title={countTitle}
                        className={`absolute right-1.5 top-1 hidden h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[9px] font-bold tabular-nums lg:inline-flex ${COUNTER_TONES[section.tone]}`}
                      >
                        {count}
                        <span className="sr-only"> {section.countLabel}</span>
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* The primary action stays reachable at the foot of the sidebar. */}
        <div className="space-y-2 border-t border-slate-200 p-4">
          <button
            id="header-record-payment-btn"
            type="button"
            onClick={onOpenNewPayment}
            title="Record Payment"
            className={`inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-3 py-2.5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
              isCollapsed ? 'lg:px-0' : ''
            }`}
          >
            <Receipt className="h-4 w-4 shrink-0" />
            <span className={hideWhenCollapsed}>Record Payment</span>
          </button>
        </div>

        {/*
          Collapse control straddles the sidebar's edge so it sits in the same
          place whether the rail is wide or narrow.
        */}
        <button
          id="sidebar-collapse-btn"
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-controls="app-sidebar"
          aria-expanded={!isCollapsed}
          className="absolute -right-3 top-1/2 hidden h-6 w-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-xs transition-colors hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 lg:flex"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>
    </>
  );
};
