/**
 * RecoverOS AI - Human-in-the-Loop Message Draft & Approval Modal
 * 
 * Rules:
 * - Zero fallback fake phone numbers or emails.
 * - Requires real recipient contact info or provides inline entry.
 * - Accurately logs external dispatch state (App Opened) without claiming automated delivery.
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Send, 
  Copy, 
  Check, 
  MessageSquare, 
  Mail, 
  ShieldCheck, 
  AlertTriangle,
  Phone,
  Info
} from 'lucide-react';
import { Invoice, BusinessProfile, FollowUpTone, RecoveryAction } from '../types';
import { 
  generateFollowUpDrafts, 
  buildWhatsAppWebUrl, 
  buildMailtoUrl,
  validatePhoneForWhatsApp,
  validateEmail
} from '../utils/draftGenerator';
import { formatINR } from '../utils/agingEngine';

interface DraftModalProps {
  invoice: Invoice;
  profile: BusinessProfile;
  initialAction?: RecoveryAction;
  onClose: () => void;
  onRecordActionDispatched: (
    invoice: Invoice, 
    channel: 'whatsapp' | 'email', 
    updatedContact?: { phone?: string; email?: string }
  ) => void;
}

export const DraftModal: React.FC<DraftModalProps> = ({
  invoice,
  profile,
  initialAction,
  onClose,
  onRecordActionDispatched,
}) => {
  const [recipientPhone, setRecipientPhone] = useState<string>(invoice.customerPhone || '');
  const [recipientEmail, setRecipientEmail] = useState<string>(invoice.customerEmail || '');

  const drafts = generateFollowUpDrafts(invoice, profile);
  
  const initialTone: FollowUpTone = initialAction?.defaultTone || (
    invoice.daysOverdue >= 31 && invoice.isMsmeEligible 
      ? 'statutory_43b' 
      : invoice.daysOverdue >= 16 
      ? 'firm' 
      : 'gentle'
  );

  const [activeTone, setActiveTone] = useState<FollowUpTone>(initialTone);
  const [channel, setChannel] = useState<'whatsapp' | 'email'>('whatsapp');
  const [subjectText, setSubjectText] = useState<string>(drafts[initialTone].subject);
  const [bodyText, setBodyText] = useState<string>(
    channel === 'whatsapp' ? drafts[initialTone].whatsappMessage : drafts[initialTone].body
  );
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    const selected = drafts[activeTone];
    setSubjectText(selected.subject);
    if (channel === 'whatsapp') {
      setBodyText(selected.whatsappMessage);
    } else {
      setBodyText(selected.body);
    }
  }, [activeTone, channel]);

  const phoneValidation = validatePhoneForWhatsApp(recipientPhone);
  const emailValidation = validateEmail(recipientEmail);

  const handleCopy = () => {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExecuteWhatsApp = () => {
    if (!phoneValidation.isValid) return;
    const waUrl = buildWhatsAppWebUrl(recipientPhone, bodyText);
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    onRecordActionDispatched(invoice, 'whatsapp', {
      phone: recipientPhone !== invoice.customerPhone ? recipientPhone : undefined,
    });
  };

  const handleExecuteEmail = () => {
    if (!emailValidation.isValid) return;
    const mailto = buildMailtoUrl(recipientEmail, subjectText, bodyText);
    window.location.href = mailto;
    onRecordActionDispatched(invoice, 'email', {
      email: recipientEmail !== invoice.customerEmail ? recipientEmail : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-2xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Follow-up Draft & Human Approval Gate
              </span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Grounded Data
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and approve before opening communication. No message is dispatched without human confirmation.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400">Recipient:</span>{' '}
            <strong className="text-slate-900">{invoice.customerName}</strong>
          </div>
          <div>
            <span className="text-slate-400">Invoice:</span>{' '}
            <strong className="font-mono text-slate-800">{invoice.invoiceNumber}</strong>
          </div>
          <div>
            <span className="text-slate-400">Outstanding:</span>{' '}
            <strong className="font-mono text-indigo-600 font-bold">{formatINR(invoice.balanceAmount)}</strong>
          </div>
          <div>
            <span className="text-slate-400">Status:</span>{' '}
            <strong className="text-rose-600 font-semibold">{invoice.daysOverdue}d Overdue</strong>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Calibrated Tone Preset:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setActiveTone('gentle')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTone === 'gentle'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">1. Gentle Inquiry</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Collaborative milestone check-in.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTone('firm')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTone === 'firm'
                    ? 'border-indigo-600 bg-indigo-50/50 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="text-xs font-bold text-slate-900">2. Firm Accounting</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Formal statement with UTR request.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setActiveTone('statutory_43b')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  activeTone === 'statutory_43b'
                    ? 'border-amber-600 bg-amber-50/50 shadow-2xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>3. Statutory 43B(h)</span>
                  <span className="text-[9px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-semibold">MSME</span>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 leading-snug">
                  Advisory on buyer tax deduction cliff.
                </div>
              </button>
            </div>
          </div>

          {/* Channel Selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-700">Dispatch Channel:</span>
            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  channel === 'whatsapp'
                    ? 'bg-white text-emerald-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp 1-Click</span>
              </button>
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                  channel === 'email'
                    ? 'bg-white text-indigo-800 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-indigo-600" />
                <span>Email Client</span>
              </button>
            </div>
          </div>

          {/* Contact Verification & Inline Entry */}
          {channel === 'whatsapp' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Recipient WhatsApp Phone #</span>
                </label>
                {phoneValidation.isValid ? (
                  <span className="text-[10px] text-emerald-700 font-medium">Valid Phone</span>
                ) : (
                  <span className="text-[10px] text-rose-600 font-medium">{phoneValidation.error}</span>
                )}
              </div>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210 or 9876543210"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className={`w-full text-xs font-mono p-2 border rounded-lg ${
                  !phoneValidation.isValid 
                    ? 'border-rose-300 bg-rose-50/30 text-rose-900' 
                    : 'border-slate-200 bg-slate-50 text-slate-900'
                }`}
              />
              {!phoneValidation.isValid && (
                <p className="text-[11px] text-rose-600 mt-1">
                  WhatsApp Web requires a valid 10-digit mobile number.
                </p>
              )}
            </div>
          )}

          {channel === 'email' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Recipient Email Address</span>
                  </label>
                  {emailValidation.isValid ? (
                    <span className="text-[10px] text-emerald-700 font-medium">Valid Email</span>
                  ) : (
                    <span className="text-[10px] text-rose-600 font-medium">{emailValidation.error}</span>
                  )}
                </div>
                <input
                  type="email"
                  placeholder="e.g. finance@clientdomain.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className={`w-full text-xs p-2 border rounded-lg ${
                    !emailValidation.isValid 
                      ? 'border-rose-300 bg-rose-50/30 text-rose-900' 
                      : 'border-slate-200 bg-slate-50 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Subject Line:
                </label>
                <input
                  type="text"
                  value={subjectText}
                  onChange={(e) => setSubjectText(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>
            </div>
          )}

          {/* Editable Draft Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Message Text (Editable):
              </label>
              <button
                type="button"
                onClick={handleCopy}
                className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed resize-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Delivery Transparency Note */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Delivery Tracking Note:</strong> Clicking dispatch opens the verified application link (WhatsApp Web or Email client). External message delivery cannot be independently verified unless an authorized WhatsApp Business API / Mail server webhook is connected.
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {channel === 'whatsapp' ? (
              <button
                type="button"
                disabled={!phoneValidation.isValid}
                onClick={handleExecuteWhatsApp}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Approve & Launch WhatsApp Web</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={!emailValidation.isValid}
                onClick={handleExecuteEmail}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-xs transition-colors flex items-center gap-2"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Approve & Open Email Client</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
