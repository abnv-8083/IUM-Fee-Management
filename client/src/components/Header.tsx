import React from 'react';
import { viewLabel } from '../navigation';
import { Menu } from 'lucide-react';

interface HeaderProps {
  currentView: string;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

/**
 * Topbar. Carries the current section's heading, and on small screens the
 * control that opens the navigation drawer.
 */
export const Header: React.FC<HeaderProps> = ({
  currentView,
  isSidebarOpen,
  onToggleSidebar
}) => {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <button
            id="sidebar-toggle-btn"
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open navigation"
            aria-controls="app-sidebar"
            aria-expanded={isSidebarOpen}
            className="-ml-2 shrink-0 cursor-pointer rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-base font-bold tracking-tight text-slate-900 sm:text-lg">
            {viewLabel(currentView)}
          </h1>
        </div>
      </div>
    </header>
  );
};
