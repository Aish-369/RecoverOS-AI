/**
 * RecoverOS AI - Record Payment Modal
 * 
 * Supports both partial remittances and full settlements.
 * Validates that payment amount is positive and <= outstanding balance.
 * Recalculates remaining balance accurately.
 */

import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Invoice, PaymentRecord } from '../types';
import { formatINR } from '../utils/agingEngine';

interface MarkPaidModalProps {
  invoice: Invoice;
  onClose: () => void;
  onConfirmPayment: (paymentRecord: PaymentRecord, paymentAmount: number) => void;
}

export const MarkPaidModal: React.FC<MarkPaidModalProps> = ({
  invoice,
  onClose,
  onConfirmPayment,
}) => {
  const currentBalance = Math.max(0, invoice.totalAmount - invoice.paidAmount);
  const [amountReceived, setAmountReceived] = useState<number>(currentBalance);
  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [refNumber, setRefNumber] = useState<string>('');
  const [method, setMethod] = useState<'neft_rtgs' | 'upi' | 'cheque' | 'imps' | 'other'>('neft_rtgs');
  const [notes, setNotes] = useState<string>('Bank statement reconciliation pending.');
  const [error, setError] = useState<string | null>(null);

  const newBalance = Math.max(0, Math.round((currentBalance - amountReceived) * 100) / 100);
  const isFullSettlement = newBalance <= 0.009;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(amountReceived) || amountReceived <= 0) {
      setError('Payment amount must be greater than zero.');
      return;
    }

    if (amountReceived > currentBalance) {
      setError(`Payment cannot exceed the outstanding balance of ${formatINR(currentBalance)}.`);
      return;
    }

    if (!refNumber.trim()) {
      setError('Please provide a bank UTR or transaction reference number.');
      return;
    }

    const record: PaymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: invoice.workspaceId,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      amount: amountReceived,
      paymentDate,
      referenceNumber: refNumber.trim(),
      paymentMethod: method,
      verificationStatus: 'user_recorded_pending_verification',
      notes: notes.trim(),
      recordedAt: new Date().toISOString(),
    };

    onConfirmPayment(record, amountReceived);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Record Payment Receipt
            </h3>
            <p className="text-xs text-slate-500">
              {invoice.customerName} · <span className="font-mono">{invoice.invoiceNumber}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Payment Amount (INR) <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={() => setAmountReceived(currentBalance)}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Set to Full Balance ({formatINR(currentBalance)})
              </button>
            </div>
            <input
              type="number"
              required
              step="0.01"
              min={0.01}
              max={currentBalance}
              value={amountReceived}
              onChange={(e) => setAmountReceived(parseFloat(e.target.value) || 0)}
              className="w-full text-sm font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:bg-white"
            />
            
            <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1">
              <div className="flex justify-between text-slate-500">
                <span>Total Invoiced:</span>
                <span className="font-mono text-slate-800">{formatINR(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Prior Amount Paid:</span>
                <span className="font-mono text-slate-800">{formatINR(invoice.paidAmount)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-slate-200/60 pt-1 text-slate-800">
                <span>Remaining After Payment:</span>
                <span className={`font-mono ${isFullSettlement ? 'text-emerald-700' : 'text-amber-800'}`}>
                  {formatINR(newBalance)} {isFullSettlement ? '(Paid in Full)' : '(Partial)'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Date <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              >
                <option value="neft_rtgs">NEFT / RTGS</option>
                <option value="upi">UPI Transfer</option>
                <option value="cheque">Cheque</option>
                <option value="imps">IMPS</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Bank UTR / Transaction Reference # <span className="text-rose-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. HDFC0098172648"
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              className="w-full text-xs font-mono p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reconciliation Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-slate-800">Audit Classification:</div>
            <div>
              Status: <span className="font-medium text-amber-800">User-Recorded (Pending Bank Verification)</span>.
            </div>
            <div>
              {isFullSettlement
                ? 'This invoice will be marked as Paid in full.'
                : 'This invoice will remain Open with reduced balance.'}
            </div>
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
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
