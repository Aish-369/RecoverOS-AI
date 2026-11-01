/**
 * RecoverOS AI - Manual Invoice Entry Modal
 * Adds an individual invoice with automatic aging and Section 43B(h) evaluation.
 */

import React, { useState } from 'react';
import { X, Plus, Calendar, DollarSign } from 'lucide-react';
import { Invoice, BusinessProfile } from '../types';
import { calculateDaysOverdue, categorizeInvoiceAging, evaluateMsmeStatutoryStatus } from '../utils/agingEngine';

interface AddInvoiceModalProps {
  profile: BusinessProfile;
  onClose: () => void;
  onAddInvoice: (invoice: Invoice) => void;
}

export const AddInvoiceModal: React.FC<AddInvoiceModalProps> = ({
  profile,
  onClose,
  onAddInvoice,
}) => {
  const [invoiceNumber, setInvoiceNumber] = useState<string>(
    `ARTX-2024-${Math.floor(100 + Math.random() * 900)}`
  );
  const [customerName, setCustomerName] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [issueDate, setIssueDate] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [dueDate, setDueDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [totalAmount, setTotalAmount] = useState<number>(150000);
  const [milestone, setMilestone] = useState<string>('UX Design & Tech Retainer');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || totalAmount <= 0 || !dueDate) {
      setError('Please fill all mandatory fields with valid values.');
      return;
    }

    const daysOverdue = calculateDaysOverdue(dueDate);
    const status = categorizeInvoiceAging(totalAmount, 0, daysOverdue);
    const msmeStatus = evaluateMsmeStatutoryStatus(profile.isMsmeRegistered, true, daysOverdue, false, false);

    const newInvoice: Invoice = {
      id: `inv_manual_${Date.now()}`,
      workspaceId: profile.workspaceId,
      invoiceNumber: invoiceNumber.trim(),
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      issueDate,
      dueDate,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status,
      daysOverdue,
      isMsmeEligible: profile.isMsmeRegistered,
      msmeStatutoryStatus: msmeStatus,
      projectMilestone: milestone.trim(),
      notes: notes.trim() || undefined,
      isDemoData: false,
      createdAt: new Date().toISOString(),
    };

    onAddInvoice(newInvoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Add New Invoice Record
            </h3>
            <p className="text-xs text-slate-500">
              Input billing record for {profile.businessName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Invoice Number <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Tech Pvt Ltd"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Total Amount (INR) <span className="text-rose-600">*</span>
              </label>
              <input
                type="number"
                required
                min={1}
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Due Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer Email
              </label>
              <input
                type="email"
                placeholder="finance@client.in"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                WhatsApp / Phone
              </label>
              <input
                type="text"
                placeholder="+91 98765 43210"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Milestone / Deliverable Scope
            </label>
            <input
              type="text"
              value={milestone}
              onChange={(e) => setMilestone(e.target.value)}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save & Calculate Aging</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
