/**
 * RecoverOS AI - Production SaaS Sidebar
 * Supports responsive desktop sidebar and collapsible mobile drawer.
 */

import React from 'react';
import { 
  LayoutDashboard, 
  FileSpreadsheet, 
  UploadCloud, 
  Zap, 
  Receipt, 
  Settings, 
  X,
  ShieldCheck, 
  Clock,
  BookOpen
} from 'lucide-react';
import { AgingSummary, BusinessProfile } from '../types';

export type NavigationTab = 
  | 'dashboard' 
  | 'invoices' 
  | 'csv_import' 
  | 'actions' 
  | 'recovery_log' 
  | 'research'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  summary: AgingSummary;
  profile: BusinessProfile;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  summary,
  profile,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ComponentType<{ className?: string }>; badge?: number | string }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'invoices', label: 'Invoices & Receivables', icon: FileSpreadsheet, badge: summary.activeInvoicesCount },
    { id: 'csv_import', label: 'Import CSV Data', icon: UploadCloud },
    { id: 'actions', label: 'Action Queue', icon: Zap, badge: summary.overdueInvoicesCount > 0 ? summary.overdueInvoicesCount : undefined },
    { id: 'recovery_log', label: 'Payment Records', icon: Receipt },
    { id: 'research', label: 'Legal & Market Dossier', icon: BookOpen },
    { id: 'settings', label: 'Settings & Profile', icon: Settings },
  ];

  const handleSelect = (tab: NavigationTab) => {
    onSelectTab(tab);
    onCloseMobile();
  };

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full p-4 space-y-6">
      <div className="space-y-6">
        {/* Mobile Header with Close button */}
        <div className="flex items-center justify-between md:hidden pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-900 text-sm">Navigation</span>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Workspace
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] tabular-nums font-semibold ${
                      isActive
                        ? 'bg-indigo-200/60 text-indigo-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Section 43B(h) Statutory Indicator Widget */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>Section 43B(h) Clock</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {profile.isMsmeRegistered
              ? `UDYAM Registered · 45-day statutory limit active.`
              : 'MSME registration not verified. Configure in Settings to activate tax deduction compliance.'}
          </p>
          {summary.statutory43BAtRiskCount > 0 ? (
            <div className="pt-1.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-amber-800 font-medium">At-Risk Window:</span>
              <span className="font-semibold text-rose-600 tabular-nums">
                {summary.statutory43BAtRiskCount} Invoices
              </span>
            </div>
          ) : (
            <div className="pt-1.5 border-t border-slate-200/60 text-[11px] text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Zero statutory cliff invoices</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-4 border-t border-slate-200 text-[11px] text-slate-500">
        <div className="font-medium text-slate-700 truncate">
          {profile.businessName || 'RecoverOS AI'}
        </div>
        <p className="text-slate-400 mt-0.5">Deterministic Revenue Copilot</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col shrink-0 h-[calc(100vh-4rem)] sticky top-16 select-none">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl z-50 flex flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
