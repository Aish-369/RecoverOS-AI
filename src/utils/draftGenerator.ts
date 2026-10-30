/**
 * RecoverOS AI - Follow-up Draft Generator
 * 
 * Rules:
 * - 100% Grounded in verified invoice parameters.
 * - Zero fallback fake phone numbers or emails.
 * - Clear statutory qualification for Section 43B(h).
 * - Safe URI encoding for WhatsApp and mailto links.
 */

import { Invoice, BusinessProfile, FollowUpTone } from '../types';
import { formatINR } from './agingEngine';

export interface GeneratedDraft {
  tone: FollowUpTone;
  subject: string;
  body: string;
  whatsappMessage: string;
  toneDescription: string;
  recommendedWhen: string;
  isStatutoryNotice: boolean;
}

export function generateFollowUpDrafts(
  invoice: Invoice,
  profile: BusinessProfile
): Record<FollowUpTone, GeneratedDraft> {
  const formattedBalance = formatINR(invoice.balanceAmount);
  const formattedTotal = formatINR(invoice.totalAmount);
  const daysOverdue = Math.max(0, invoice.daysOverdue);
  const dueDate = invoice.dueDate;
  const invNumber = invoice.invoiceNumber;
  const customerName = invoice.customerName;
  const milestone = invoice.projectMilestone || 'Agreed Deliverables';
  const upiId = profile.upiId || '';
  const agencyName = profile.businessName;
  const udyamNumber = profile.msmeRegistrationNumber || '';

  // 1. Gentle Reminder
  const gentleSubject = `Invoice ${invNumber} check-in · ${agencyName}`;
  const gentleEmail = `Hi ${customerName} Team,

I hope you are having a productive week.

We wanted to check in regarding invoice ${invNumber} for ${milestone} (Amount: ${formattedBalance}), which fell due on ${dueDate}.

Could you please confirm if all deliverables were satisfactory, or if your finance desk requires any additional documentation to process clearance?

${upiId ? `Payment Details:\n• UPI ID: ${upiId}\n• Beneficiary: ${agencyName}\n` : `• Beneficiary: ${agencyName}\n`}
Thank you for your ongoing partnership.

Warm regards,
${profile.contactPerson || 'Finance Team'}
${agencyName}`;

  const gentleWhatsApp = `Hi ${customerName} team! Hope you're well. Just a quick check-in from ${agencyName} regarding invoice *${invNumber}* (${formattedBalance}) for ${milestone}, which was due on ${dueDate}. Please let us know if your accounts desk needs any clarifications. Thank you!`;

  // 2. Firm Accounting Nudge
  const firmSubject = `Statement of Account: Overdue Invoice ${invNumber} (${formattedBalance}) · ${daysOverdue} Days Past Due`;
  const firmEmail = `Dear Accounts Team at ${customerName},

This is a reminder regarding outstanding invoice ${invNumber} for ${milestone}, which is now overdue by ${daysOverdue} days (Due Date: ${dueDate}).

Account Summary:
• Invoice Number: ${invNumber}
• Total Amount: ${formattedTotal}
• Outstanding Balance: ${formattedBalance}
• Current Status: ${daysOverdue} Days Overdue

Please arrange payment clearance in your upcoming cycle and reply with the bank UTR confirmation.

${upiId ? `Settlement Details:\n• Account Name: ${agencyName}\n• UPI: ${upiId}\n` : `• Account Name: ${agencyName}\n`}
If remittance has already been initiated, kindly provide the reference number so we can update our records.

Sincerely,
${profile.contactPerson || 'Finance Desk'}
${agencyName}`;

  const firmWhatsApp = `Hello ${customerName} Accounts. Update from ${agencyName}: Invoice *${invNumber}* for *${formattedBalance}* is now *${daysOverdue} days overdue* (Due: ${dueDate}). Kindly arrange payment or share the bank UTR confirmation. ${upiId ? `UPI: ${upiId}` : ''}`;

  // 3. Statutory MSME / Section 43B(h) Notice (With explicit disclaimer)
  const daysLeftTo45 = Math.max(0, 45 - daysOverdue);
  const statSubject = `Statutory Notice: Section 43B(h) Income Tax Compliance · Invoice ${invNumber}`;
  const statEmail = `Dear Finance Director & Accounts Head, ${customerName},

Subject: Statutory Advisory under Section 43B(h) of the Income Tax Act & MSMED Act 2006 for Invoice ${invNumber}

We value our ongoing business relationship. We wish to bring to your attention that ${agencyName} is registered under the MSMED Act, 2006${udyamNumber ? ` (Udyam Registration: ${udyamNumber})` : ''}.

Invoice Details:
• Invoice Number: ${invNumber}
• Outstanding Balance: ${formattedBalance}
• Days Overdue: ${daysOverdue} Days (Due Date: ${dueDate})

Statutory Compliance Note:
Under Section 43B(h) of the Income Tax Act, payments due to registered Micro and Small enterprises beyond statutory terms (up to 45 days under written agreement) cannot be claimed as tax deductions in the financial year until actual payment is realized. ${
  daysLeftTo45 > 0 
    ? `Approximately ${daysLeftTo45} days remain before this invoice crosses the 45-day statutory limit.`
    : `This invoice has exceeded the 45-day statutory limit.`
}

To ensure mutual compliance and avoid tax disallowance during your upcoming audit, we respectfully request settlement of this invoice.

${upiId ? `Settlement Details:\n• Beneficiary: ${agencyName}\n• UPI ID: ${upiId}\n` : `• Beneficiary: ${agencyName}\n`}
Thank you for your prompt cooperation.

Sincerely,
${profile.contactPerson || 'Finance Director'}
${agencyName}

[Note: This is an advisory statement based on statutory provisions. Please consult your tax advisor to verify applicable assessment dates.]`;

  const statWhatsApp = `*STATUTORY COMPLIANCE ADVISORY* — ${agencyName}
Ref: Invoice *${invNumber}* | Balance: *${formattedBalance}* | *${daysOverdue} Days Overdue*

Dear ${customerName} Accounts,
Please note that ${agencyName} is a registered MSME${udyamNumber ? ` (${udyamNumber})` : ''}. Under Section 43B(h) of the Income Tax Act, overdue payments past 45 days face income tax deduction disallowance for the buyer.

Kindly expedite clearance:
${upiId ? `UPI: *${upiId}*` : ''}
Please reply with UTR upon transfer. Thank you.`;

  return {
    gentle: {
      tone: 'gentle',
      subject: gentleSubject,
      body: gentleEmail,
      whatsappMessage: gentleWhatsApp,
      toneDescription: 'Warm, collaborative inquiry focusing on client satisfaction and milestone delivery.',
      recommendedWhen: 'Invoices 1 to 15 days overdue or VIP clients with high ongoing retainer value.',
      isStatutoryNotice: false,
    },
    firm: {
      tone: 'firm',
      subject: firmSubject,
      body: firmEmail,
      whatsappMessage: firmWhatsApp,
      toneDescription: 'Direct accounting statement requesting UTR reference and payment date.',
      recommendedWhen: 'Invoices 16 to 30 days overdue.',
      isStatutoryNotice: false,
    },
    statutory_43b: {
      tone: 'statutory_43b',
      subject: statSubject,
      body: statEmail,
      whatsappMessage: statWhatsApp,
      toneDescription: 'Regulatory compliance notice highlighting buyer Section 43B(h) tax deduction implications.',
      recommendedWhen: 'Invoices 31+ days overdue approaching or exceeding the 45-day MSMED Act threshold.',
      isStatutoryNotice: true,
    },
  };
}

/**
 * Validates whether a phone number is usable for WhatsApp.
 * Must contain at least 10 digits.
 */
export function validatePhoneForWhatsApp(phone: string | undefined | null): { isValid: boolean; cleanPhone: string; error?: string } {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, cleanPhone: '', error: 'Phone number is missing' };
  }
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.length < 10) {
    return { isValid: false, cleanPhone: '', error: 'Phone number must have at least 10 digits' };
  }
  // If 10 digits (standard Indian mobile without country code), prepend 91
  const cleanPhone = digitsOnly.length === 10 ? `91${digitsOnly}` : digitsOnly;
  return { isValid: true, cleanPhone };
}

/**
 * Validates whether an email address is usable.
 */
export function validateEmail(email: string | undefined | null): { isValid: boolean; error?: string } {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: 'Email address is missing' };
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    return { isValid: false, error: 'Invalid email address format' };
  }
  return { isValid: true };
}

/**
 * Builds a valid WhatsApp Web URI with URL-encoded text.
 */
export function buildWhatsAppWebUrl(phone: string, text: string): string {
  const { cleanPhone } = validatePhoneForWhatsApp(phone);
  const encodedText = encodeURIComponent(text);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}

/**
 * Builds a mailto: link with subject and body.
 */
export function buildMailtoUrl(email: string, subject: string, body: string): string {
  const encSubj = encodeURIComponent(subject);
  const encBody = encodeURIComponent(body);
  return `mailto:${email.trim()}?subject=${encSubj}&body=${encBody}`;
}
