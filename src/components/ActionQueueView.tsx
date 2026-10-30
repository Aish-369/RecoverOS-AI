/**
 * RecoverOS AI - AI & Rule-Based Prioritized Action Queue
 * Transparent, explainable action queue ranked by financial risk, 43B(h) leverage, and aging duration.
 */

import React from 'react';
import { Zap, Send, ShieldAlert, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { RecoveryAction, Invoice } from '../types';
import { formatINR } from '../utils/agingEngine';

interface ActionQueueViewProps {
  actions: RecoveryAction[];
  invoices: Invoice[];
  onOpenDraft: (invoice: Invoice, action: RecoveryAction) => void;
  onOpenMarkPaid: (invoice: Invoice) => void;
}

export const ActionQueueView: React.FC<ActionQueueViewProps> = ({
  actions,
  invoices,
  onOpenDraft,
  onOpenMarkPaid,
}) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
          <Zap className="w-4 h-4 text-indigo-600" />
          <span>Priority Action Engine</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
          Prioritized Revenue Recovery Queue
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Every recommended action is scored deterministically based on exposure amount, days past due, and Section 43B(h) statutory leverage. Human approval is mandatory before any message is dispatched.
        </p>
      </div>

      {actions.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">
            Action Queue is Clean!
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            There are currently no overdue invoices requiring follow-ups. All receivables are either paid or comfortably within credit terms.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {actions.map((act, index) => {
            const matchedInv = invoices.find((i) => i.id === act.invoiceId);
            if (!matchedInv) return null;

            return (
              <div
                key={act.id}
                className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center shrink-0 mt-0.5 font-mono">
                    #{index + 1}
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {act.customerName}
                      </span>
                      <span className="text-xs font-mono text-slate-500">
                        {act.invoiceNumber}
                      </span>
                      {act.urgency === 'critical' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          Critical · {act.daysOverdue}d Overdue
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900">
                          High · {act.daysOverdue}d Overdue
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-medium">
                        Priority Score: {act.priorityScore}/100
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {act.reason}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400">
                      <span>Milestone: {matchedInv.projectMilestone || 'Agency Scope'}</span>
                      <span aria-hidden="true">·</span>
                      <span className="text-slate-600 font-medium">
                        Recommended Channel: {act.recommendedChannel === 'whatsapp' ? 'WhatsApp Web 1-Click' : 'Email'}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="text-indigo-600 font-medium">
                        Tone: {act.defaultTone === 'statutory_43b' ? 'MSME 43B(h) Notice' : act.defaultTone === 'firm' ? 'Firm Accounting' : 'Gentle Inquiry'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 self-end md:self-center border-t md:border-t-0 pt-3 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-400 block">Balance Due</span>
                    <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                      {formatINR(act.balanceAmount)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onOpenMarkPaid(matchedInv)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Mark Paid
                    </button>
                    <button
                      onClick={() => onOpenDraft(matchedInv, act)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Review AI Draft</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
