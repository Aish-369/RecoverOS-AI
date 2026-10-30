/**
 * RecoverOS AI - Production Executive Dashboard View
 * 
 * Emphasizes:
 * - Outstanding receivables
 * - Overdue invoices
 * - Follow-ups due
 * - Confirmed payments in selected period (with period filter selector)
 * - Small prioritized action list with clear reason for each recommendation
 */

import React, { useState } from 'react';
import { 
  ArrowUpRight, 
  Send, 
  UploadCloud, 
  Plus, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import { Invoice, AgingSummary, BusinessProfile, RecoveryAction } from '../types';
import { formatINR, PeriodFilter } from '../utils/agingEngine';

interface DashboardViewProps {
  summary: AgingSummary;
  profile: BusinessProfile;
  prioritizedActions: RecoveryAction[];
  invoices: Invoice[];
  period: PeriodFilter;
  onPeriodChange: (p: PeriodFilter) => void;
  onOpenDraft: (invoice: Invoice, action?: RecoveryAction) => void;
  onOpenMarkPaid: (invoice: Invoice) => void;
  onNavigateToInvoices: (statusFilter?: string) => void;
  onNavigateToCsv: () => void;
  onOpenAddInvoice: () => void;
  onSeedDemoData: () => void;
  onOpenHelp: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  summary,
  profile,
  prioritizedActions,
  invoices,
  period,
  onPeriodChange,
  onOpenDraft,
  onOpenMarkPaid,
  onNavigateToInvoices,
  onNavigateToCsv,
  onOpenAddInvoice,
  onSeedDemoData,
  onOpenHelp,
}) => {
  const isZeroState = invoices.length === 0;

  // Visual aging distribution math
  const totalReceivables = Math.max(1, summary.totalReceivables);
  const currentPct = Math.round((summary.currentAmount / totalReceivables) * 100);
  const overdue30Pct = Math.round((summary.overdue0to30Amount / totalReceivables) * 100);
  const overdue44Pct = Math.round((summary.overdue31to44Amount / totalReceivables) * 100);
  const overdue45Pct = Math.round((summary.overdue45PlusAmount / totalReceivables) * 100);

  const topActions = prioritizedActions.slice(0, 4);

  const periodLabels: Record<PeriodFilter, string> = {
    mtd: 'Month to Date',
    last_30_days: 'Last 30 Days',
    qtd: 'Quarter to Date',
    ytd: 'Year to Date',
    all: 'All Time',
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* 1. Header with Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="text-xs font-semibold text-indigo-700">
            {profile.businessName || 'Workspace Overview'}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight mt-0.5">
            Receivables Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic recovery copilot tracking payment deadlines and Section 43B(h) compliance.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
            {(['mtd', 'last_30_days', 'qtd', 'all'] as PeriodFilter[]).map((p) => (
              <button
                key={p}
                onClick={() => onPeriodChange(p)}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  period === p
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p === 'mtd' ? 'MTD' : p === 'last_30_days' ? '30 Days' : p === 'qtd' ? 'QTD' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={onNavigateToCsv}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>
        </div>
      </div>

      {/* ZERO STATE (Production onboarding state when no invoices exist) */}
      {isZeroState ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-5 shadow-xs max-w-2xl mx-auto my-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto shadow-xs">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-slate-900">
              Welcome to RecoverOS AI
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your workspace is ready. Ingest your receivables from a billing CSV (Tally, Zoho Books, QuickBooks, or Excel) to calculate deterministic aging and launch human-approved recovery drafts.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={onNavigateToCsv}
              className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Import Billing CSV</span>
            </button>

            <button
              onClick={onOpenAddInvoice}
              className="w-full sm:w-auto px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Invoice</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button
              onClick={onSeedDemoData}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline"
            >
              Or load sample digital agency data (Studio Artix Pvt Ltd) for testing
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 2. Four Core Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Metric 1: Outstanding Receivables */}
            <div 
              onClick={() => onNavigateToInvoices('all')}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Outstanding Receivables</span>
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
                {formatINR(summary.totalReceivables)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span>{summary.activeInvoicesCount} open accounts</span>
                <span className="text-indigo-600 font-medium">All Buckets</span>
              </div>
            </div>

            {/* Metric 2: Overdue Invoices */}
            <div 
              onClick={() => onNavigateToInvoices('overdue')}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Overdue Invoices</span>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-rose-600 font-mono tabular-nums">
                {formatINR(summary.totalOverdueAmount)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span className="text-rose-600 font-semibold tabular-nums">
                  {summary.overdueInvoicesCount} invoices past due
                </span>
                <span className="text-slate-400">Past Due Date</span>
              </div>
            </div>

            {/* Metric 3: Follow-ups Due (Priority Action items) */}
            <div 
              onClick={() => onNavigateToInvoices('overdue_0_30')}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Follow-ups Due</span>
                <span className="w-2 h-2 rounded-full bg-amber-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-amber-700 font-mono tabular-nums">
                {prioritizedActions.length} Accounts
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span className="text-amber-800 font-medium">
                  {summary.statutory43BAtRiskCount} in 43B(h) window
                </span>
                <span className="text-amber-600 font-medium">Requires Action</span>
              </div>
            </div>

            {/* Metric 4: Confirmed Payments in Selected Period */}
            <div 
              onClick={() => onNavigateToInvoices('paid')}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                <span>Payments ({periodLabels[period]})</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </div>
              <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
                {formatINR(summary.totalRecoveredPeriod)}
              </div>
              <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Recorded Credits</span>
                </span>
                <span className="text-slate-400">{periodLabels[period]}</span>
              </div>
            </div>
          </div>

          {/* 3. Section 43B(h) Statutory Compliance Advisory Banner */}
          <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                    Section 43B(h) Statutory Compliance Clock
                  </span>
                  <span className="text-[10px] bg-amber-200/80 text-amber-900 font-semibold px-2 py-0.5 rounded">
                    Statutory Estimate
                  </span>
                </div>
                <p className="text-xs text-amber-900/90 mt-1 leading-relaxed max-w-3xl">
                  {profile.isMsmeRegistered ? (
                    <>
                      Registered MSME ({profile.msmeRegistrationNumber || 'Verified'}). Payments beyond statutory terms (45 days under written agreement, or 15 days without) risk income tax deduction disallowance for the buyer. <strong className="text-amber-950">{summary.statutory43BAtRiskCount} open invoices</strong> are approaching this threshold.
                    </>
                  ) : (
                    <>
                      Your profile does not currently list an MSME Udyam registration number. Configure your MSME registration in Settings to activate Section 43B(h) compliance clocks for eligible corporate buyers.
                    </>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={onOpenHelp}
              className="px-3.5 py-1.5 text-xs font-semibold text-amber-900 bg-white border border-amber-300 hover:bg-amber-100 rounded-lg transition-colors shrink-0 shadow-2xs"
            >
              Compliance Guide
            </button>
          </div>

          {/* 4. Receivables Aging Distribution Strip */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Deterministic Aging Distribution
                </h2>
                <p className="text-xs text-slate-500">
                  Computed strictly from invoice due dates.
                </p>
              </div>
              <span className="text-xs font-semibold text-slate-700 font-mono tabular-nums">
                Total In Scope: {formatINR(summary.totalReceivables)}
              </span>
            </div>

            {/* Multi-segment bar */}
            <div className="h-3.5 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              <div 
                style={{ width: `${currentPct}%` }} 
                className="bg-emerald-400 transition-all"
                title={`Current: ${formatINR(summary.currentAmount)} (${currentPct}%)`}
              />
              <div 
                style={{ width: `${overdue30Pct}%` }} 
                className="bg-indigo-400 transition-all"
                title={`1-30 Days: ${formatINR(summary.overdue0to30Amount)} (${overdue30Pct}%)`}
              />
              <div 
                style={{ width: `${overdue44Pct}%` }} 
                className="bg-amber-400 transition-all"
                title={`31-44 Days: ${formatINR(summary.overdue31to44Amount)} (${overdue44Pct}%)`}
              />
              <div 
                style={{ width: `${overdue45Pct}%` }} 
                className="bg-rose-500 transition-all"
                title={`45+ Days: ${formatINR(summary.overdue45PlusAmount)} (${overdue45Pct}%)`}
              />
            </div>

            {/* Legend / Bucket Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div 
                onClick={() => onNavigateToInvoices('current')}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Current / Not Due</span>
                </div>
                <div className="mt-1 font-bold text-slate-900 text-sm font-mono tabular-nums">
                  {formatINR(summary.currentAmount)}
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {summary.currentCount} invoices ({currentPct}%)
                </div>
              </div>

              <div 
                onClick={() => onNavigateToInvoices('overdue_0_30')}
                className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs text-indigo-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                  <span>1 to 30 Days</span>
                </div>
                <div className="mt-1 font-bold text-slate-900 text-sm font-mono tabular-nums">
                  {formatINR(summary.overdue0to30Amount)}
                </div>
                <div className="text-[11px] text-slate-500 tabular-nums">
                  {summary.overdue0to30Count} invoices ({overdue30Pct}%)
                </div>
              </div>

              <div 
                onClick={() => onNavigateToInvoices('overdue_31_44')}
                className="p-3 rounded-lg border border-amber-100 bg-amber-50/30 hover:bg-amber-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs text-amber-900 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span>31 to 44 Days (Cliff)</span>
                </div>
                <div className="mt-1 font-bold text-amber-900 text-sm font-mono tabular-nums">
                  {formatINR(summary.overdue31to44Amount)}
                </div>
                <div className="text-[11px] text-amber-800 tabular-nums">
                  {summary.overdue31to44Count} invoices ({overdue44Pct}%)
                </div>
              </div>

              <div 
                onClick={() => onNavigateToInvoices('overdue_45_plus')}
                className="p-3 rounded-lg border border-rose-100 bg-rose-50/30 hover:bg-rose-50/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-xs text-rose-800 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>45+ Days (Breach)</span>
                </div>
                <div className="mt-1 font-bold text-rose-900 text-sm font-mono tabular-nums">
                  {formatINR(summary.overdue45PlusAmount)}
                </div>
                <div className="text-[11px] text-rose-700 tabular-nums">
                  {summary.overdue45PlusCount} invoices ({overdue45Pct}%)
                </div>
              </div>
            </div>
          </div>

          {/* 5. Prioritized Recommended Actions */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Prioritized Action Queue
                </h2>
                <p className="text-xs text-slate-500">
                  Ranked by overdue duration, balance size, and Section 43B(h) compliance exposure.
                </p>
              </div>

              <button
                onClick={() => onNavigateToInvoices('overdue')}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
              >
                View all overdue →
              </button>
            </div>

            {topActions.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-100">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <h3 className="text-xs font-semibold text-slate-800">
                  Zero overdue accounts requiring action
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  All receivables are within payment terms or cleared.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {topActions.map((action, index) => {
                  const matchedInv = invoices.find((i) => i.id === action.invoiceId);
                  if (!matchedInv) return null;

                  return (
                    <div
                      key={action.id}
                      className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 transition-all bg-white flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5 font-mono">
                          {index + 1}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-900 text-sm">
                              {action.customerName}
                            </span>
                            <span className="text-slate-400 font-mono text-xs">
                              {action.invoiceNumber}
                            </span>
                            {action.urgency === 'critical' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                                Critical · {action.daysOverdue}d Overdue
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900">
                                High · {action.daysOverdue}d Overdue
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            {action.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 pt-2 md:pt-0 w-full md:w-auto justify-between md:justify-end">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400">Balance Due</div>
                          <div className="text-sm font-bold text-slate-900 font-mono tabular-nums">
                            {formatINR(action.balanceAmount)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onOpenMarkPaid(matchedInv)}
                            className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 font-medium rounded-lg transition-colors whitespace-nowrap"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => onOpenDraft(matchedInv, action)}
                            className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5 whitespace-nowrap"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>Review Draft</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
