/**
 * ============================================================================
 * RecoverOS AI - Production Data Models & Domain Types
 * ============================================================================
 * Strict types for invoices, deterministic aging, CSV validation, partial payments,
 * dispute tracking, and multi-tenant isolation.
 */

export type InvoiceAgingCategory = 
  | 'current'            // Not yet overdue (due in future or today)
  | 'overdue_0_30'       // 1 to 30 days past due date
  | 'overdue_31_44'      // 31 to 44 days past due (Section 43B(h) buffer window)
  | 'overdue_45_plus'    // 45+ days past due (Statutory threshold breach per MSMED Act)
  | 'paid'               // Paid in full (balance <= 0.009)
  | 'disputed';          // Marked in commercial dispute (pauses standard collection)

export type MsmeStatutoryStatus =
  | 'not_applicable'         // Supplier not MSME or invoice not eligible
  | 'within_statutory_limit' // Within 15/45-day window
  | 'approaching_deadline'   // 31-44 days: estimate nearing statutory cliff
  | 'statutory_breach';      // >45 days: statutory breach estimate

export interface Invoice {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  issueDate: string;        // YYYY-MM-DD
  dueDate: string;          // YYYY-MM-DD
  totalAmount: number;      // Exact INR value (> 0)
  paidAmount: number;       // Exact INR received (>= 0 and <= totalAmount)
  balanceAmount: number;    // totalAmount - paidAmount
  status: InvoiceAgingCategory;
  daysOverdue: number;      // Deterministic calendar days
  isMsmeEligible: boolean;  // Subject to MSMED Act 45-day rule
  msmeStatutoryStatus: MsmeStatutoryStatus;
  projectMilestone?: string;
  notes?: string;
  disputeReason?: string;
  followUpCount?: number;
  lastFollowUpDate?: string;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AgingSummary {
  totalReceivables: number;    // All unpaid open balances
  totalOverdueAmount: number;  // Balances on overdue invoices
  totalRecoveredPeriod: number;// Confirmed payments recorded in the selected period
  activeInvoicesCount: number;
  overdueInvoicesCount: number;
  disputedInvoicesCount: number;
  
  // Deterministic Buckets
  currentAmount: number;
  currentCount: number;
  
  overdue0to30Amount: number;
  overdue0to30Count: number;
  
  overdue31to44Amount: number;
  overdue31to44Count: number;
  
  overdue45PlusAmount: number;
  overdue45PlusCount: number;
  
  // Section 43B(h) exposure tracking
  statutory43BAtRiskAmount: number;
  statutory43BAtRiskCount: number;
}

export interface CsvColumnMapping {
  invoiceNumber: string;
  customerName: string;
  totalAmount: string;
  paidAmount?: string;
  dueDate: string;
  issueDate?: string;
  phone?: string;
  email?: string;
  notes?: string;
  milestone?: string;
}

export interface CsvRowValidation {
  rowIndex: number;
  raw: Record<string, string>;
  parsed?: Invoice;
  isValid: boolean;
  isDuplicate: boolean;
  duplicateReason?: string;
  errors: string[];
  warnings: string[];
}

export type FollowUpTone = 'gentle' | 'firm' | 'statutory_43b';

export interface RecoveryAction {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  balanceAmount: number;
  daysOverdue: number;
  priorityScore: number;     // 1-100 deterministic calculation
  urgency: 'low' | 'medium' | 'high' | 'critical';
  recommendedChannel: 'whatsapp' | 'email';
  reason: string;
  riskFactor: string;
  defaultTone: FollowUpTone;
  isApproved: boolean;
  approvalStatus: 'pending' | 'approved' | 'dispatched' | 'snoozed';
  lastDraft?: string;
}

export interface PaymentRecord {
  id: string;
  workspaceId: string;
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  amount: number;
  paymentDate: string;       // YYYY-MM-DD
  referenceNumber: string;   // UTR / Transaction Ref
  paymentMethod: 'neft_rtgs' | 'upi' | 'cheque' | 'imps' | 'other';
  verificationStatus: 'user_recorded_pending_verification' | 'bank_feed_verified';
  notes: string;
  recordedAt: string;
}

export interface AuditEvent {
  id: string;
  workspaceId: string;
  invoiceNumber: string;
  eventType: 
    | 'draft_created' 
    | 'draft_edited' 
    | 'channel_opened' 
    | 'payment_recorded' 
    | 'invoice_created' 
    | 'invoice_updated'
    | 'invoice_deleted'
    | 'dispute_marked'
    | 'dispute_cleared'
    | 'status_changed';
  description: string;
  timestamp: string;
}

export interface BusinessProfile {
  id: string;
  workspaceId: string;
  businessName: string;
  entityType: string;
  gstin: string;
  msmeRegistrationNumber: string;
  isMsmeRegistered: boolean;
  standardPaymentTermDays: number;
  upiId: string;
  contactPerson: string;
  email: string;
  phone: string;
}

// Backwards compatibility alias
export type RecoveryLogItem = PaymentRecord;
