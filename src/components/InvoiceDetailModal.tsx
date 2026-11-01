/**
 * ============================================================================
 * RecoverOS AI - Invoice Detail & Payment History Ledger Modal
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Provides a comprehensive, granular inspection view for any selected invoice.
 * Indian B2B SME owners and finance managers need to inspect the complete story
 * of an account receivable before deciding on recovery actions or legal notices.
 * 
 * KEY CAPABILITIES:
 * 1. Financial breakdown: Total Invoiced, Confirmed Remittances, and Remaining Balance.
 * 2. Deterministic aging and Section 43B(h) compliance exposure countdown.
 * 3. Client contact coordinates with verification status.
 * 4. Itemized Payment Remittance Ledger showing every partial or full payment recorded
 *    with bank UTR, method, and transaction timestamp.
 * 5. Direct access to actions: Record Payment, Follow-up Draft, Edit, Dispute, and Delete.
 */

import React from 'react';
import { 
  X, 
  Send, 
  Receipt, 
  Calendar, 
  Clock, 
  Phone, 
  Mail, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  FileText, 
  Edit3, 
  Trash2 
} from 'lucide-react';
import { Invoice, PaymentRecord, BusinessProfile } from '../types';
import { formatINR } from '../utils/agingEngine';

interface InvoiceDetailModalProps {
  invoice: Invoice;
  profile: BusinessProfile;
  payments: PaymentRecord[];
  onClose: () => void;
  onOpenDraft: (invoice: Invoice) => void;
  onOpenMarkPaid: (invoice: Invoice) => void;
  onOpenEdit: (invoice: Invoice) => void;
  onOpenDispute: (invoice: Invoice) => void;
  onDeleteInvoice: (invoice: Invoice) => void;
}

export const InvoiceDetailModal: React.FC<InvoiceDetailModalProps> = ({
  invoice,
  profile,
  payments,
  onClose,
  onOpenDraft,
  onOpenMarkPaid,
  onOpenEdit,
  onOpenDispute,
  onDeleteInvoice,
}) => {
  // Filter payments associated with this invoice
  const relatedPayments = payments.filter(
    (p) => p.invoiceId === invoice.id || p.invoiceNumber === invoice.invoiceNumber
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                #{invoice.invoiceNumber}
              </span>
              <h2 className="text-base font-bold text-slate-900">
                {invoice.customerName}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice Ledger & Statutory Compliance Details
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Financial Breakdown Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-slate-500 block">Total Invoiced</span>
              <span className="text-base font-bold text-slate-900 font-mono tabular-nums mt-1 block">
                {formatINR(invoice.totalAmount)}
              </span>
            </div>

            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-emerald-800 block">Paid Remittances</span>
              <span className="text-base font-bold text-emerald-700 font-mono tabular-nums mt-1 block">
                {formatINR(invoice.paidAmount)}
              </span>
            </div>

            <div className="bg-indigo-50/40 border border-indigo-100 rounded-xl p-3.5">
              <span className="text-[11px] font-medium text-indigo-800 block">Remaining Balance</span>
              <span className="text-base font-bold text-indigo-700 font-mono tabular-nums mt-1 block">
                {formatINR(invoice.balanceAmount)}
              </span>
            </div>
          </div>

          {/* Timeline & Aging Status */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Billing Schedule & Aging Status</span>
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Issue Date</span>
                <span className="font-medium text-slate-800">{invoice.issueDate || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Due Date</span>
                <span className="font-medium text-slate-800">{invoice.dueDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Calendar Aging</span>
                {invoice.status === 'paid' ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Settled
                  </span>
                ) : invoice.daysOverdue > 0 ? (
                  <span className="text-rose-700 font-bold">{invoice.daysOverdue} days overdue</span>
                ) : (
                  <span className="text-emerald-700 font-medium">Due in {Math.abs(invoice.daysOverdue)} days</span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Section 43B(h)</span>
                {invoice.msmeStatutoryStatus === 'approaching_deadline' ? (
                  <span className="text-amber-800 font-semibold">31-44d Warning</span>
                ) : invoice.msmeStatutoryStatus === 'statutory_breach' ? (
                  <span className="text-rose-700 font-bold">Statutory Breach</span>
                ) : (
                  <span className="text-slate-600">Within Limit</span>
                )}
              </div>
            </div>

            {invoice.status === 'disputed' && (
              <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Account Marked in Commercial Dispute</span>
                </div>
                <p className="text-rose-700">
                  Reason: {invoice.disputeReason || 'Unresolved deliverable or billing scope inquiry.'}
                </p>
                <p className="text-[11px] text-rose-500">
                  Standard collection workflows are paused pending commercial resolution.
                </p>
              </div>
            )}
          </div>

          {/* Contact Coordinates & Scope */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Deliverable Scope & Contacts</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Project Milestone</span>
                <span className="font-medium text-slate-800">{invoice.projectMilestone || 'Standard Deliverables'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Follow-up Activity</span>
                <span className="font-medium text-slate-800">
                  {invoice.followUpCount || 0} communications dispatched
                  {invoice.lastFollowUpDate ? ` (Last: ${invoice.lastFollowUpDate})` : ''}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 font-mono text-[11px]">{invoice.customerPhone || 'No phone recorded'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-700 text-[11px]">{invoice.customerEmail || 'No email recorded'}</span>
              </div>
            </div>

            {invoice.notes && (
              <div className="pt-2 border-t border-slate-100 text-xs text-slate-600">
                <span className="text-slate-400 block text-[11px]">Internal Notes:</span>
                <p className="mt-0.5">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* Payment Remittance History Ledger */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-slate-500" />
                <span>Payment Remittance Ledger</span>
              </h3>
              <span className="text-xs text-slate-500 font-medium">
                {relatedPayments.length} recorded {relatedPayments.length === 1 ? 'credit' : 'credits'}
              </span>
            </div>

            {relatedPayments.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-lg text-center text-slate-400 text-xs">
                No payment credits recorded against this invoice yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden text-xs">
                {relatedPayments.map((p) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors">
                    <div>
                      <div className="font-bold text-emerald-700 font-mono tabular-nums">
                        +{formatINR(p.amount)}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Ref: <span className="font-mono text-slate-700">{p.referenceNumber}</span> · {p.paymentMethod.toUpperCase()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-600 tabular-nums">{p.paymentDate}</div>
                      <div className="text-[10px] text-slate-400">{p.notes || 'User recorded'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenEdit(invoice)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5 text-slate-500" />
              <span>Edit</span>
            </button>
            <button
              onClick={() => onOpenDispute(invoice)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>{invoice.status === 'disputed' ? 'Clear Dispute' : 'Dispute'}</span>
            </button>
            <button
              onClick={() => onDeleteInvoice(invoice)}
              className="px-3 py-1.5 text-xs font-medium text-rose-700 bg-white border border-rose-200 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {invoice.status !== 'paid' && (
              <>
                <button
                  onClick={() => onOpenMarkPaid(invoice)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Record Payment
                </button>
                <button
                  onClick={() => onOpenDraft(invoice)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Draft Follow-up</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
