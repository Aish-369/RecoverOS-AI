/**
 * ============================================================================
 * RecoverOS AI - Edit Invoice Modal
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Allows agency managers to update invoice metadata (client contact coordinates,
 * milestone descriptions, notes, and due dates).
 * 
 * FINANCIAL INTEGRITY SAFEGUARDS:
 * - If payments have already been recorded, totalAmount cannot be reduced below
 *   the already-collected paidAmount.
 * - Changing the due date recalculates daysOverdue and aging categories deterministically.
 */

import React, { useState } from 'react';
import { X, Save, Calendar, Phone, Mail } from 'lucide-react';
import { Invoice, BusinessProfile } from '../types';
import { calculateDaysOverdue, categorizeInvoiceAging, evaluateMsmeStatutoryStatus } from '../utils/agingEngine';

interface EditInvoiceModalProps {
  invoice: Invoice;
  profile: BusinessProfile;
  onClose: () => void;
  onSaveInvoice: (updatedInvoice: Invoice) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  profile,
  onClose,
  onSaveInvoice,
}) => {
  const [customerName, setCustomerName] = useState<string>(invoice.customerName);
  const [customerPhone, setCustomerPhone] = useState<string>(invoice.customerPhone || '');
  const [customerEmail, setCustomerEmail] = useState<string>(invoice.customerEmail || '');
  const [dueDate, setDueDate] = useState<string>(invoice.dueDate);
  const [projectMilestone, setProjectMilestone] = useState<string>(invoice.projectMilestone || '');
  const [notes, setNotes] = useState<string>(invoice.notes || '');
  const [totalAmount, setTotalAmount] = useState<number>(invoice.totalAmount);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !dueDate) {
      setError('Customer name and due date are required.');
      return;
    }

    if (totalAmount < invoice.paidAmount) {
      setError(`Total amount cannot be less than already collected amount (₹${invoice.paidAmount.toLocaleString('en-IN')}).`);
      return;
    }

    const newDaysOverdue = calculateDaysOverdue(dueDate);
    const newStatus = categorizeInvoiceAging(totalAmount, invoice.paidAmount, newDaysOverdue, invoice.status === 'disputed');
    const newMsmeStatus = evaluateMsmeStatutoryStatus(
      profile.isMsmeRegistered,
      invoice.isMsmeEligible,
      newDaysOverdue,
      newStatus === 'paid',
      newStatus === 'disputed'
    );

    const updated: Invoice = {
      ...invoice,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      customerEmail: customerEmail.trim() || undefined,
      dueDate,
      totalAmount,
      balanceAmount: Math.max(0, Math.round((totalAmount - invoice.paidAmount) * 100) / 100),
      daysOverdue: newDaysOverdue,
      status: newStatus,
      msmeStatutoryStatus: newMsmeStatus,
      projectMilestone: projectMilestone.trim() || undefined,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    onSaveInvoice(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Edit Invoice #{invoice.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Update billing details, milestones, or recipient coordinates
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Customer Name <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Amount (INR)
              </label>
              <input
                type="number"
                min={invoice.paidAmount}
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number (WhatsApp)
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="accounts@client.com"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Milestone / Scope
            </label>
            <input
              type="text"
              placeholder="e.g. Phase 2 Frontend Architecture"
              value={projectMilestone}
              onChange={(e) => setProjectMilestone(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Notes
            </label>
            <textarea
              rows={2}
              placeholder="Notes on communication or payment commitments..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
