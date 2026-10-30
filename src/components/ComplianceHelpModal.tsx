/**
 * RecoverOS AI - MSME & Section 43B(h) Statutory Compliance Guide
 * Provides plain-English legal requirements, statutory calculation rules, and best practices.
 */

import React from 'react';
import { X, ShieldAlert, CheckCircle2, AlertTriangle, BookOpen, ExternalLink } from 'lucide-react';

interface ComplianceHelpModalProps {
  onClose: () => void;
}

export const ComplianceHelpModal: React.FC<ComplianceHelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                MSMED Act 2006 & Section 43B(h) Guide
              </h2>
              <p className="text-xs text-slate-500">
                Practical compliance rules for Indian B2B suppliers and buyers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700 leading-relaxed">
          {/* Rule 1 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>1. Who is covered under Section 43B(h)?</span>
            </h3>
            <p className="text-slate-600">
              Section 43B(h) of the Income Tax Act applies strictly when the supplier is registered as a <strong>Micro or Small enterprise</strong> under the MSMED Act 2006. Medium enterprises and unregistered suppliers are <em>exempt</em> from Section 43B(h).
            </p>
          </div>

          {/* Rule 2 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>2. Statutory Credit Limits: 15 vs 45 Days</span>
            </h3>
            <ul className="list-disc list-inside space-y-1 text-slate-600 ml-1">
              <li><strong>Without written agreement:</strong> Payment must be cleared within <strong>15 days</strong> of invoice delivery / acceptance.</li>
              <li><strong>With written contract:</strong> Payment terms may be negotiated up to a statutory maximum of <strong>45 days</strong>. Any agreement specifying terms longer than 45 days is legally deemed void to the extent of the excess.</li>
            </ul>
          </div>

          {/* Rule 3 */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2 text-amber-950">
            <h3 className="font-bold text-amber-900 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <span>3. Consequences for Buyers Failing to Pay</span>
            </h3>
            <p>
              If a buyer fails to pay within the statutory window, the purchase expense is <strong>disallowed as a deductible business expense</strong> in that financial year and added back to taxable income, triggering corporate tax liability until the amount is actually settled.
            </p>
          </div>

          {/* Rule 4 */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <h3 className="font-bold text-slate-900 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>4. Mandatory Dispute Notice Rules</span>
            </h3>
            <p className="text-slate-600">
              If a buyer raises a formal objection in writing regarding goods/services within <strong>15 days</strong> of delivery, the deemed-acceptance date is paused until the supplier resolves the dispute. This is why RecoverOS AI flags disputed invoices separately.
            </p>
          </div>

          <div className="text-[11px] text-slate-400 italic">
            Disclaimer: RecoverOS AI provides automated date calculation aids based on statutory provisions. These calculations represent compliance estimates and do not constitute formal legal or tax counsel.
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
