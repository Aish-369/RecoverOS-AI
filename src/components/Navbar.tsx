/**
 * RecoverOS AI - Production SaaS Top Navigation Bar
 * Responsive, clean 3-zone contract with mobile toggle, search, and action triggers.
 */

import React from 'react';
import { Search, Plus, UploadCloud, Menu, Building2, HelpCircle } from 'lucide-react';
import { BusinessProfile } from '../types';

interface NavbarProps {
  profile: BusinessProfile;
  activeViewTitle: string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenAddInvoice: () => void;
  onOpenCsvImport: () => void;
  onOpenHelp: () => void;
  onToggleMobileMenu: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  profile,
  activeViewTitle,
  searchQuery,
  onSearchChange,
  onOpenAddInvoice,
  onOpenCsvImport,
  onOpenHelp,
  onToggleMobileMenu,
}) => {
  const displayName = profile.businessName ? profile.businessName : 'My Workspace';

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
      {/* Zone 1: Mobile Toggle, Wordmark & Context */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onToggleMobileMenu}
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg md:hidden transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            R
          </div>
          <span className="font-bold text-slate-900 text-base sm:text-lg tracking-tight whitespace-nowrap">
            RecoverOS <span className="text-indigo-600 font-semibold">AI</span>
          </span>
        </div>

        <span className="hidden sm:inline text-slate-300" aria-hidden="true">/</span>

        <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500">
          <Building2 className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-700 font-semibold truncate max-w-[160px]">{displayName}</span>
          <span aria-hidden="true">·</span>
          <span>{activeViewTitle}</span>
        </div>
      </div>

      {/* Zone 2: Functional Search Input */}
      <div className="flex-1 max-w-md hidden md:block">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search invoices, clients, PO numbers..."
            className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Zone 3: Actions & Help */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={onOpenHelp}
          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="MSME & Section 43B(h) Compliance Guide"
          aria-label="Compliance Guide"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenCsvImport}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap"
        >
          <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
          <span>Import CSV</span>
        </button>

        <button
          onClick={onOpenAddInvoice}
          className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-xs whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Invoice</span>
        </button>
      </div>
    </header>
  );
};
