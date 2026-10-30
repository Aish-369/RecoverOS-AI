/**
 * RecoverOS AI - Production Settings & Workspace Profile View
 * 
 * Manages:
 * - Agency & Company Profile (GSTIN, Address, Contact Person)
 * - MSME Udyam Registration & Section 43B(h) Compliance Settings
 * - UPI Settlement Handles
 * - Workspace Reset & Test Fixture Seeding
 */

import React, { useState } from 'react';
import { Settings, ShieldCheck, Save, RefreshCw, Trash2, HelpCircle } from 'lucide-react';
import { BusinessProfile } from '../types';

interface SettingsViewProps {
  profile: BusinessProfile;
  onSaveProfile: (profile: BusinessProfile) => void;
  onSeedDemoData: () => void;
  onClearAllData: () => void;
  onOpenHelp: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  profile,
  onSaveProfile,
  onSeedDemoData,
  onClearAllData,
  onOpenHelp,
}) => {
  const [formData, setFormData] = useState<BusinessProfile>({ ...profile });
  const [savedNotice, setSavedNotice] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile(formData);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <Settings className="w-4 h-4 text-indigo-600" />
            <span>Workspace Profile</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Agency & Compliance Settings
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your GSTIN, MSME registration status, and UPI remittance details.
          </p>
        </div>

        <button
          onClick={onOpenHelp}
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 p-2 bg-indigo-50 rounded-lg"
        >
          <HelpCircle className="w-4 h-4" />
          <span>Section 43B(h) Guide</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
        {/* Section 1: Business Identity */}
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            1. Company & Billing Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Agency Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Studio Artix Pvt Ltd"
                value={formData.businessName}
                onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Entity Type
              </label>
              <input
                type="text"
                placeholder="e.g. Private Limited / Partnership / LLP"
                value={formData.entityType}
                onChange={(e) => setFormData({ ...formData, entityType: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN (Goods & Services Tax ID)
              </label>
              <input
                type="text"
                placeholder="e.g. 29AABCU9603R1ZX"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Payment Terms (Agreement Default)
              </label>
              <select
                value={formData.standardPaymentTermDays}
                onChange={(e) => setFormData({ ...formData, standardPaymentTermDays: parseInt(e.target.value, 10) })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              >
                <option value={15}>15 Days (Statutory default without agreement)</option>
                <option value={30}>30 Days (Standard written contract)</option>
                <option value={45}>45 Days (Maximum statutory credit window)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: MSME Statutory Compliance */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              2. MSMED Act & Section 43B(h) Configuration
            </h2>
            <label className="flex items-center gap-2 text-xs font-semibold text-indigo-700 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isMsmeRegistered}
                onChange={(e) => setFormData({ ...formData, isMsmeRegistered: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span>Registered Micro or Small Enterprise</span>
            </label>
          </div>

          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-3">
            <div>
              <label className="block text-xs font-semibold text-amber-950 mb-1">
                Udyam Registration Number
              </label>
              <input
                type="text"
                placeholder="e.g. UDYAM-KR-03-0098412"
                value={formData.msmeRegistrationNumber}
                onChange={(e) => setFormData({ ...formData, msmeRegistrationNumber: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-white border border-amber-300 rounded-lg text-slate-900"
              />
            </div>
            <p className="text-[11px] text-amber-900/90 leading-relaxed">
              Section 43B(h) applies only if the supplier is registered under the MSMED Act 2006 as a Micro or Small enterprise. Buyers who fail to pay within 45 days face disallowance of their income tax expense deductions.
            </p>
          </div>
        </div>

        {/* Section 3: Contact & UPI */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
            3. Instant Payment UPI Handle & Signing Contact
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                UPI ID for Payment Links
              </label>
              <input
                type="text"
                placeholder="e.g. youragency@icici"
                value={formData.upiId}
                onChange={(e) => setFormData({ ...formData, upiId: e.target.value })}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contact Person Name
              </label>
              <input
                type="text"
                placeholder="e.g. Amitabh Sen"
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Finance Desk Email
              </label>
              <input
                type="email"
                placeholder="billing@youragency.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            {savedNotice && (
              <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>Profile updated successfully!</span>
              </span>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>

      {/* Workspace Data Management */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Workspace Data Management
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Load sample test data (Studio Artix Pvt Ltd) to evaluate the engine, or wipe the workspace for a fresh import.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSeedDemoData}
            className="px-3.5 py-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Load Sample Test Data</span>
          </button>

          <button
            type="button"
            onClick={onClearAllData}
            className="px-3.5 py-2 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Workspace</span>
          </button>
        </div>
      </div>
    </div>
  );
};
