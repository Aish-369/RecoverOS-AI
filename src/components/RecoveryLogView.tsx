/**
 * RecoverOS AI - Payment Receipts & Audit Trail View
 * Records verifiable payment transactions with UTR numbers and DSO tracking.
 */

import React from 'react';
import { Download, ShieldAlert, Receipt, CheckCircle2 } from 'lucide-react';
import { PaymentRecord } from '../types';
import { formatINR } from '../utils/agingEngine';
import { downloadCSV } from '../utils/csvParser';

interface RecoveryLogViewProps {
  logs: PaymentRecord[];
  onNavigateToInvoices: () => void;
}

export const RecoveryLogView: React.FC<RecoveryLogViewProps> = ({
  logs,
  onNavigateToInvoices,
}) => {
  const totalRecovered = logs.reduce((acc, item) => acc + item.amount, 0);

  const handleExportAuditCSV = () => {
    const csvContent = [
      'Invoice Number,Customer Name,Amount (INR),Payment Date,Reference / UTR,Method,Verification Status,Notes,Recorded At',
      ...logs.map((l) => 
        `"${l.invoiceNumber}","${l.customerName}",${l.amount},"${l.paymentDate}","${l.referenceNumber}","${l.paymentMethod}","${l.verificationStatus}","${l.notes}","${l.recordedAt}"`
      )
    ].join('\n');

    downloadCSV(`recoveros_payment_audit_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
            <Receipt className="w-4 h-4 text-indigo-600" />
            <span>Remittance Records</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
            Payment Receipts & Audit Trail
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit history of all full and partial payments recorded in your workspace.
          </p>
        </div>

        <button
          onClick={handleExportAuditCSV}
          disabled={logs.length === 0}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Audit Log (CSV)</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Total Recorded Collections</span>
          <span className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1 block">
            {formatINR(totalRecovered)}
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {logs.length} confirmed remittances
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Transaction Reference Coverage</span>
          <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1 block">
            100%
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Every entry requires a bank UTR or cheque reference
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <span className="text-xs font-medium text-slate-500 block">Bank Verification Status</span>
          <span className="text-sm font-bold text-amber-800 mt-2 block">
            Manual Entry (Pending Direct Feed)
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Statement reconciliations logged by workspace team
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4">Payment Date</th>
                <th className="py-3 px-4">Bank UTR / Reference</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <p className="text-xs font-semibold text-slate-600">No payment receipts recorded yet</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      When payments arrive, click "Record Payment" on any invoice to record the bank transaction.
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-900">
                      {item.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {item.customerName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 tabular-nums">
                      {formatINR(item.amount)}
                    </td>
                    <td className="py-3.5 px-4 tabular-nums text-slate-600">
                      {item.paymentDate}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-700 text-[11px] select-all">
                      {item.referenceNumber}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-slate-800">
                      {item.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                        User-Recorded
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
