/**
 * RecoverOS AI - Invoices & Accounts Receivable Management View
 * 
 * High-density tabular grid with:
 * - Search by invoice #, customer name, milestone
 * - Status filter tabs: All, Current, 1-30d, 31-44d, 45d+ Overdue, Paid, Disputed
 * - Sorting by Amount, Due Date, Days Overdue
 * - Single-click Draft follow-up & Record Payment triggers
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  ArrowUpDown, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet,
  Plus,
  HelpCircle,
  AlertTriangle
} from 'lucide-react';
import { Invoice } from '../types';
import { formatINR } from '../utils/agingEngine';

interface InvoiceTableViewProps {
  invoices: Invoice[];
  initialFilter?: string;
  onOpenDraft: (invoice: Invoice) => void;
  onOpenMarkPaid: (invoice: Invoice) => void;
  onOpenAddInvoice: () => void;
  onOpenCsvImport: () => void;
  onToggleDispute: (invoice: Invoice) => void;
}

type SortField = 'dueDate' | 'totalAmount' | 'daysOverdue' | 'customerName';
type SortDirection = 'asc' | 'desc';

export const InvoiceTableView: React.FC<InvoiceTableViewProps> = ({
  invoices,
  initialFilter = 'all',
  onOpenDraft,
  onOpenMarkPaid,
  onOpenAddInvoice,
  onOpenCsvImport,
  onToggleDispute,
}) => {
  const [filter, setFilter] = useState<string>(initialFilter);
  const [search, setSearch] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('daysOverdue');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (filter === 'current' && inv.status !== 'current') return false;
      if (filter === 'overdue' && (inv.daysOverdue <= 0 || inv.status === 'paid')) return false;
      if (filter === 'overdue_0_30' && inv.status !== 'overdue_0_30') return false;
      if (filter === 'overdue_31_44' && inv.status !== 'overdue_31_44') return false;
      if (filter === 'overdue_45_plus' && inv.status !== 'overdue_45_plus') return false;
      if (filter === 'paid' && inv.status !== 'paid') return false;
      if (filter === 'disputed' && inv.status !== 'disputed') return false;

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = inv.customerName.toLowerCase().includes(query);
        const matchesNum = inv.invoiceNumber.toLowerCase().includes(query);
        const matchesMilestone = (inv.projectMilestone || '').toLowerCase().includes(query);
        if (!matchesName && !matchesNum && !matchesMilestone) return false;
      }

      return true;
    });
  }, [invoices, filter, search]);

  const sortedInvoices = useMemo(() => {
    return [...filteredInvoices].sort((a, b) => {
      let valA: string | number = a[sortField];
      let valB: string | number = b[sortField];

      if (sortField === 'customerName') {
        valA = a.customerName.toLowerCase();
        valB = b.customerName.toLowerCase();
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredInvoices, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const counts = useMemo(() => {
    return {
      all: invoices.length,
      current: invoices.filter((i) => i.status === 'current').length,
      overdue_0_30: invoices.filter((i) => i.status === 'overdue_0_30').length,
      overdue_31_44: invoices.filter((i) => i.status === 'overdue_31_44').length,
      overdue_45_plus: invoices.filter((i) => i.status === 'overdue_45_plus').length,
      paid: invoices.filter((i) => i.status === 'paid').length,
      disputed: invoices.filter((i) => i.status === 'disputed').length,
    };
  }, [invoices]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Invoices & Accounts Receivable
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor aging buckets, record partial and full payments, and dispatch follow-ups.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCsvImport}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={onOpenAddInvoice}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-1 overflow-x-auto w-full md:w-auto p-0.5 bg-slate-100 rounded-lg shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'all' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({counts.all})
          </button>
          <button
            onClick={() => setFilter('current')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'current' ? 'bg-white text-emerald-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Current ({counts.current})
          </button>
          <button
            onClick={() => setFilter('overdue_0_30')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'overdue_0_30' ? 'bg-white text-indigo-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1-30d ({counts.overdue_0_30})
          </button>
          <button
            onClick={() => setFilter('overdue_31_44')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'overdue_31_44' ? 'bg-white text-amber-900 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            31-44d Cliff ({counts.overdue_31_44})
          </button>
          <button
            onClick={() => setFilter('overdue_45_plus')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'overdue_45_plus' ? 'bg-white text-rose-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            45d+ ({counts.overdue_45_plus})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              filter === 'paid' ? 'bg-white text-emerald-700 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Paid ({counts.paid})
          </button>
          {counts.disputed > 0 && (
            <button
              onClick={() => setFilter('disputed')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                filter === 'disputed' ? 'bg-white text-rose-800 shadow-2xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Disputed ({counts.disputed})
            </button>
          )}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search invoice or client..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Main Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold select-none">
                <th 
                  onClick={() => handleSort('customerName')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Customer & Milestone</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Invoice #</th>
                <th 
                  onClick={() => handleSort('dueDate')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Due Date</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('daysOverdue')}
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Days Overdue</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th 
                  onClick={() => handleSort('totalAmount')}
                  className="py-3 px-4 text-right cursor-pointer hover:text-slate-800"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Balance / Total</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">No invoices match your selection</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Try clearing search filters or import a billing CSV.
                    </p>
                  </td>
                </tr>
              ) : (
                sortedInvoices.map((inv) => {
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {inv.customerName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-xs">
                          {inv.projectMilestone || 'Project Deliverables'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 font-medium tabular-nums">
                        {inv.invoiceNumber}
                      </td>

                      <td className="py-3.5 px-4 tabular-nums text-slate-600">
                        {inv.dueDate}
                      </td>

                      <td className="py-3.5 px-4">
                        {inv.status === 'paid' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Paid</span>
                          </span>
                        ) : inv.status === 'disputed' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>In Dispute</span>
                          </span>
                        ) : inv.daysOverdue > 0 ? (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold tabular-nums ${
                              inv.daysOverdue >= 45
                                ? 'bg-rose-100 text-rose-800 font-bold'
                                : inv.daysOverdue >= 31
                                ? 'bg-amber-100 text-amber-900 font-bold'
                                : 'bg-indigo-50 text-indigo-700'
                            }`}
                          >
                            +{inv.daysOverdue} days
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-medium tabular-nums">
                            Due in {Math.abs(inv.daysOverdue)}d
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="font-bold text-slate-900 font-mono tabular-nums text-xs">
                          {formatINR(inv.balanceAmount)}
                        </div>
                        {inv.paidAmount > 0 && inv.status !== 'paid' && (
                          <div className="text-[10px] text-slate-400 tabular-nums">
                            Paid: {formatINR(inv.paidAmount)} · Total: {formatINR(inv.totalAmount)}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {inv.status === 'paid' ? (
                          <span className="text-slate-400 text-[11px]">—</span>
                        ) : inv.status === 'disputed' ? (
                          <span className="text-[10px] text-rose-600">Dispute On Hold</span>
                        ) : inv.msmeStatutoryStatus === 'approaching_deadline' ? (
                          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded" title="Approaching 45d limit: Buyer tax deduction at risk">
                            43B(h) Cliff ({45 - inv.daysOverdue}d left)
                          </span>
                        ) : inv.msmeStatutoryStatus === 'statutory_breach' ? (
                          <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded" title="Exceeded 45d statutory limit">
                            Statutory Breach
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Within Terms</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status !== 'paid' && (
                            <>
                              <button
                                onClick={() => onOpenMarkPaid(inv)}
                                className="px-2.5 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 rounded font-medium transition-colors"
                              >
                                Record Payment
                              </button>
                              <button
                                onClick={() => onOpenDraft(inv)}
                                className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>Draft</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => onToggleDispute(inv)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded text-[10px]"
                            title={inv.status === 'disputed' ? 'Clear Dispute' : 'Mark in Dispute'}
                          >
                            {inv.status === 'disputed' ? 'Unmark Dispute' : 'Dispute'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
