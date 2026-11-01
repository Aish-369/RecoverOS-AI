/**
 * ============================================================================
 * RecoverOS AI - Commercial Dispute Management Modal
 * ============================================================================
 * 
 * FILE PURPOSE:
 * In B2B services, an invoice might not be paid because of an active commercial
 * disagreement (e.g. deliverable revision, billing discrepancy).
 * Marking an invoice as 'disputed' pauses follow-up escalation to avoid damaging
 * client goodwill, and logs the commercial dispute reason in the audit trail.
 */

import React, { useState } from 'react';
import { X, AlertTriangle, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { Invoice } from '../types';

interface DisputeModalProps {
  invoice: Invoice;
  onClose: () => void;
  onConfirmDispute: (invoice: Invoice, isDisputed: boolean, reason?: string) => void;
}

const COMMON_DISPUTE_REASONS = [
  'Deliverable revision or acceptance pending',
  'Billing rate or milestone scope discrepancy',
  'Purchase Order (PO) amendment needed',
  'Client internal budget or cashflow hold',
  'Contractual dispute regarding specifications',
];

export const DisputeModal: React.FC<DisputeModalProps> = ({
  invoice,
  onClose,
  onConfirmDispute,
}) => {
  const isCurrentlyDisputed = invoice.status === 'disputed';
  const [selectedReason, setSelectedReason] = useState<string>(
    invoice.disputeReason || COMMON_DISPUTE_REASONS[0]
  );
  const [customNotes, setCustomNotes] = useState<string>('');

  const handleApplyDispute = () => {
    const fullReason = customNotes.trim() 
      ? `${selectedReason}: ${customNotes.trim()}`
      : selectedReason;
    onConfirmDispute(invoice, true, fullReason);
  };

  const handleClearDispute = () => {
    onConfirmDispute(invoice, false, undefined);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isCurrentlyDisputed ? 'Resolve Commercial Dispute' : 'Record Commercial Dispute'}
              </h3>
              <p className="text-xs text-slate-500">
                Invoice #{invoice.invoiceNumber} · {invoice.customerName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {isCurrentlyDisputed ? (
            <div className="space-y-4">
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1">
                <span className="font-bold text-rose-900 block">Current Dispute Note:</span>
                <p className="text-rose-700">{invoice.disputeReason || 'Marked in commercial dispute.'}</p>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Clearing this dispute will return the invoice to its deterministic aging schedule ({invoice.daysOverdue} days overdue) and re-enable follow-up recommendations in the Action Queue.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleClearDispute}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Resolve & Clear Dispute</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Why record a dispute?</p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Under the MSMED Act Section 43B(h), if a buyer raises an objection or dispute regarding goods/services within 15 days, statutory timelines are paused until the objection is resolved.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select Dispute Reason
                </label>
                <select
                  value={selectedReason}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {COMMON_DISPUTE_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Additional Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Details of the client's email or objection..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyDispute}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Mark in Dispute</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
