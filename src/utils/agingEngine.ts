/**
 * ============================================================================
 * RecoverOS AI - Deterministic Invoice Aging & Financial Engine
 * ============================================================================
 * 
 * PURPOSE OF THIS FILE:
 * This module is the financial and mathematical backbone of RecoverOS AI.
 * It is responsible for all monetary calculations, calendar date comparisons,
 * aging bucket classifications (0-30d, 31-44d, 45d+), and Section 43B(h)
 * statutory compliance evaluations.
 * 
 * WHY DETERMINISTIC CODE IS MANDATORY HERE:
 * Large Language Models (LLMs) can be creative, but financial software demands
 * 100% mathematical certainty. An LLM must NEVER calculate invoice balances,
 * change due dates, or invent days overdue. All numbers and dates are computed
 * here using pure, deterministic TypeScript arithmetic.
 * 
 * ARCHITECTURAL CONNECTIONS:
 * - Imported by `src/utils/csvParser.ts` to validate rows during CSV imports.
 * - Imported by `src/components/DashboardView.tsx` to render the 4 metric cards
 *   and the visual aging distribution bar.
 * - Imported by `src/components/InvoiceTableView.tsx` to display balances and
 *   days overdue for each invoice row.
 * - Tested comprehensively in `src/test/suite.test.ts`.
 */

import { 
  Invoice, 
  InvoiceAgingCategory, 
  MsmeStatutoryStatus, 
  AgingSummary, 
  RecoveryAction, 
  PaymentRecord 
} from '../types';

// ============================================================================
// SECTION 1: STRICT CALENDAR DATE PARSING & VALIDATION
// ============================================================================

/**
 * Strict calendar date parser.
 * 
 * WHAT IT RECEIVES:
 * A date string in YYYY-MM-DD or DD/MM/YYYY format (e.g., "2026-10-29" or "29/10/2026").
 * 
 * WHAT IT DOES:
 * 1. Checks that the input is a valid non-empty string.
 * 2. Uses regular expressions to extract Year, Month, and Day.
 * 3. Enforces calendar reality: rejects Year < 2000, Month > 12, or Day > 31.
 * 4. Protects against the JavaScript Date Rollover Bug:
 *    In standard JavaScript, `new Date(2026, 1, 31)` does NOT return an error.
 *    Instead, it quietly "rolls over" into March 3rd! We check whether
 *    `date.getUTCDate() === day`. If it does not match, the date was impossible
 *    (e.g., Feb 31, or Feb 29 in a non-leap year like 2025).
 * 
 * WHAT IT RETURNS:
 * A normalized `Date` object set to UTC midnight, or `null` if the date is invalid.
 */
export function parseStrictDateOnly(dateStr: string | undefined | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean) return null;

  let year: number;
  let month: number; // 0-indexed: 0 = January, 11 = December
  let day: number;

  // Pattern 1: ISO Format (YYYY-MM-DD or YYYY/MM/DD)
  const isoMatch = clean.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10) - 1;
    day = parseInt(isoMatch[3], 10);
  } else {
    // Pattern 2: Indian / British Standard Format (DD/MM/YYYY or DD-MM-YYYY)
    const indMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (indMatch) {
      day = parseInt(indMatch[1], 10);
      month = parseInt(indMatch[2], 10) - 1;
      year = parseInt(indMatch[3], 10);
    } else {
      // Unrecognized format
      return null;
    }
  }

  // Basic boundary checks
  if (year < 2000 || year > 2099) return null;
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;

  // Construct date at UTC midnight to avoid local daylight savings / timezone skews
  const dateObj = new Date(Date.UTC(year, month, day));

  // CRITICAL CHECK: Detect JS Date Rollover
  // If we passed Feb 31, dateObj will be March 3. Thus getUTCDate() !== 31.
  if (
    dateObj.getUTCFullYear() !== year ||
    dateObj.getUTCMonth() !== month ||
    dateObj.getUTCDate() !== day
  ) {
    return null; // Date does not actually exist on the calendar!
  }

  return dateObj;
}

/**
 * Formats a Date object into a standardized ISO date string: "YYYY-MM-DD".
 */
export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Returns today's calendar date normalized to UTC midnight.
 * This guarantees consistent day-boundary calculations across all client machines.
 */
export function getTodayDateOnly(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/**
 * Calculates the exact integer number of calendar days between today and the due date.
 * 
 * FORMULA: (ReferenceDate - DueDate) in milliseconds / (1000 * 60 * 60 * 24)
 * 
 * RESULTS:
 * - Positive integer (e.g., +15): Overdue by 15 days.
 * - Zero (0): Due today.
 * - Negative integer (e.g., -5): Due in 5 days in the future (not overdue).
 */
export function calculateDaysOverdue(dueDateStr: string, referenceDate: Date = getTodayDateOnly()): number {
  const dueDate = parseStrictDateOnly(dueDateStr);
  if (!dueDate) return 0;

  const diffMs = referenceDate.getTime() - dueDate.getTime();
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.round(diffMs / MS_PER_DAY);
}

// ============================================================================
// SECTION 2: STRICT CURRENCY PARSING & FORMATTING (INR)
// ============================================================================

/**
 * Strict currency parser designed for Indian commercial invoicing.
 * 
 * WHAT IT RECEIVES:
 * Raw user input or CSV string, such as "₹1,00,000", "Rs. 25000", "1500.50", etc.
 * 
 * WHY WE DO NOT SILENTLY CONVERT BAD INPUT TO ZERO:
 * In a real financial SaaS, if a user uploads an invoice amount with a typo like
 * "1OOO" (with capital O instead of zeros) or "-5000", converting it to ₹0 would
 * cause the business to lose track of real debt. We must explicitly return an error.
 * 
 * WHAT IT RETURNS:
 * An object: `{ value: number | null, error: string | null }`
 */
export function parseStrictCurrency(raw: string | number | undefined | null): { value: number | null; error: string | null } {
  if (raw === undefined || raw === null) {
    return { value: null, error: 'Amount is required' };
  }

  // If already a valid number
  if (typeof raw === 'number') {
    if (isNaN(raw)) return { value: null, error: 'Amount is not a valid number' };
    if (raw < 0) return { value: null, error: 'Negative invoice amounts are not allowed' };
    return { value: Math.round(raw * 100) / 100, error: null };
  }

  const str = String(raw).trim();
  if (!str) {
    return { value: null, error: 'Amount cannot be blank' };
  }

  // Reject negative symbols
  if (str.includes('-') || str.includes('(')) {
    return { value: null, error: 'Negative invoice amounts are not allowed' };
  }

  // Remove accepted currency symbols/prefixes: ₹, Rs, Rs., INR (case-insensitive)
  let cleaned = str.replace(/^(₹|rs\.?|inr)\s*/i, '').trim();

  // Validate format: only allow digits, commas, and at most one decimal point
  if (!/^[\d,]+(\.\d{1,4})?$/.test(cleaned)) {
    return { value: null, error: `Invalid currency format: "${str}"` };
  }

  // Remove digit grouping commas (e.g. "1,00,000" -> "100000")
  cleaned = cleaned.replace(/,/g, '');
  const parsed = parseFloat(cleaned);

  if (isNaN(parsed) || !isFinite(parsed)) {
    return { value: null, error: `Unable to parse amount: "${str}"` };
  }

  if (parsed < 0) {
    return { value: null, error: 'Negative invoice amounts are not allowed' };
  }

  // Round to 2 decimal places (paise precision)
  const rounded = Math.round(parsed * 100) / 100;
  return { value: rounded, error: null };
}

/**
 * Formats numbers into standard Indian Currency representation.
 * In India, large numbers are grouped into Thousands, Lakhs, and Crores:
 * e.g., 2480000 becomes "₹24,80,000" rather than the Western "₹2,480,000".
 * Uses the browser's native `Intl.NumberFormat('en-IN')`.
 */
export function formatINR(amount: number, includeDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';

  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  });

  return formatter.format(amount);
}

// ============================================================================
// SECTION 3: DETERMINISTIC AGING BUCKET CLASSIFICATION
// ============================================================================

/**
 * Categorizes an invoice into its exact aging lifecycle bucket.
 * 
 * BUSINESS RULES:
 * 1. Balance <= 0.009 (less than 1 paisa): Treated as fully Paid.
 * 2. Marked in dispute: Treated as Disputed (pauses standard collection automation).
 * 3. Days Overdue <= 0: Current (due in the future or today).
 * 4. Days Overdue 1 to 30: Early overdue (friendly follow-up).
 * 5. Days Overdue 31 to 44: Approaching 45-day cliff under Section 43B(h).
 * 6. Days Overdue >= 45: Statutory Breach (exceeds the 45-day maximum credit limit).
 */
export function categorizeInvoiceAging(
  totalAmount: number,
  paidAmount: number,
  daysOverdue: number,
  isDisputed: boolean = false
): InvoiceAgingCategory {
  const balance = totalAmount - paidAmount;
  if (totalAmount > 0 && balance <= 0.009) {
    return 'paid';
  }
  if (isDisputed) {
    return 'disputed';
  }
  if (daysOverdue <= 0) {
    return 'current';
  }
  if (daysOverdue <= 30) {
    return 'overdue_0_30';
  }
  if (daysOverdue <= 44) {
    return 'overdue_31_44';
  }
  return 'overdue_45_plus';
}

/**
 * Evaluates Section 43B(h) compliance exposure.
 * 
 * LEGAL CONTEXT (Income Tax Act & MSMED Act 2006):
 * - Applies ONLY when the supplier is an active registered Micro or Small enterprise.
 * - Invoices under active commercial dispute pause deemed acceptance.
 * - Outputs are marked as compliance estimates requiring contract confirmation.
 */
export function evaluateMsmeStatutoryStatus(
  isSupplierMsme: boolean,
  isInvoiceEligible: boolean,
  daysOverdue: number,
  isPaid: boolean,
  isDisputed: boolean = false
): MsmeStatutoryStatus {
  if (!isSupplierMsme || !isInvoiceEligible || isPaid || isDisputed) {
    return 'not_applicable';
  }
  if (daysOverdue <= 30) {
    return 'within_statutory_limit';
  }
  if (daysOverdue <= 44) {
    return 'approaching_deadline'; // Alert: 31-44 days past due
  }
  return 'statutory_breach'; // Exceeded statutory 45-day limit
}

// ============================================================================
// SECTION 4: PERIOD FILTERING & AGING SUMMARY AGGREGATION
// ============================================================================

export type PeriodFilter = 'mtd' | 'last_30_days' | 'qtd' | 'ytd' | 'all';

/**
 * Filters verified payment records by calendar period.
 * This ensures that "Recovered Revenue" reflects actual money collected during
 * the selected window (e.g. this month), rather than an all-time historical total.
 */
export function filterPaymentsByPeriod(
  payments: PaymentRecord[],
  period: PeriodFilter,
  referenceDate: Date = getTodayDateOnly()
): PaymentRecord[] {
  if (period === 'all') return payments;

  const refYear = referenceDate.getUTCFullYear();
  const refMonth = referenceDate.getUTCMonth();

  let startDate: Date;

  if (period === 'mtd') {
    // 1st day of current month (e.g. 2026-10-01)
    startDate = new Date(Date.UTC(refYear, refMonth, 1));
  } else if (period === 'last_30_days') {
    // Exactly 30 days prior to today
    startDate = new Date(referenceDate.getTime() - 30 * 86400000);
  } else if (period === 'qtd') {
    // 1st day of current fiscal quarter (Jan/Apr/Jul/Oct)
    const quarterMonth = Math.floor(refMonth / 3) * 3;
    startDate = new Date(Date.UTC(refYear, quarterMonth, 1));
  } else if (period === 'ytd') {
    // 1st day of current calendar year (Jan 1)
    startDate = new Date(Date.UTC(refYear, 0, 1));
  } else {
    return payments;
  }

  return payments.filter((p) => {
    const pDate = parseStrictDateOnly(p.paymentDate);
    if (!pDate) return false;
    return pDate.getTime() >= startDate.getTime() && pDate.getTime() <= referenceDate.getTime();
  });
}

/**
 * Aggregates high-level dashboard metrics across all invoices in the workspace.
 * Recomputes open balances, overdue totals, and period-specific recovery figures.
 */
export function computeAgingSummary(
  invoices: Invoice[],
  payments: PaymentRecord[] = [],
  period: PeriodFilter = 'mtd'
): AgingSummary {
  const summary: AgingSummary = {
    totalReceivables: 0,
    totalOverdueAmount: 0,
    totalRecoveredPeriod: 0,
    activeInvoicesCount: 0,
    overdueInvoicesCount: 0,
    disputedInvoicesCount: 0,
    currentAmount: 0,
    currentCount: 0,
    overdue0to30Amount: 0,
    overdue0to30Count: 0,
    overdue31to44Amount: 0,
    overdue31to44Count: 0,
    overdue45PlusAmount: 0,
    overdue45PlusCount: 0,
    statutory43BAtRiskAmount: 0,
    statutory43BAtRiskCount: 0,
  };

  // 1. Calculate recovered revenue strictly from payments matching the selected period
  const periodPayments = filterPaymentsByPeriod(payments, period);
  summary.totalRecoveredPeriod = periodPayments.reduce((acc, p) => acc + p.amount, 0);

  // 2. Iterate through invoices to calculate open receivables & aging buckets
  for (const inv of invoices) {
    const balance = Math.max(0, inv.totalAmount - inv.paidAmount);

    // Skip fully paid invoices from open receivables
    if (inv.status === 'paid' || balance <= 0.009) {
      continue;
    }

    // Isolate disputed items
    if (inv.status === 'disputed') {
      summary.disputedInvoicesCount += 1;
      summary.totalReceivables += balance;
      continue;
    }

    summary.totalReceivables += balance;
    summary.activeInvoicesCount += 1;

    if (inv.daysOverdue > 0) {
      summary.totalOverdueAmount += balance;
      summary.overdueInvoicesCount += 1;
    }

    switch (inv.status) {
      case 'current':
        summary.currentAmount += balance;
        summary.currentCount += 1;
        break;
      case 'overdue_0_30':
        summary.overdue0to30Amount += balance;
        summary.overdue0to30Count += 1;
        break;
      case 'overdue_31_44':
        summary.overdue31to44Amount += balance;
        summary.overdue31to44Count += 1;
        break;
      case 'overdue_45_plus':
        summary.overdue45PlusAmount += balance;
        summary.overdue45PlusCount += 1;
        break;
      default:
        break;
    }

    // Section 43B(h) exposure tracking (MSME eligible invoices in 31+ days overdue)
    if (inv.isMsmeEligible && inv.daysOverdue >= 31) {
      summary.statutory43BAtRiskAmount += balance;
      summary.statutory43BAtRiskCount += 1;
    }
  }

  return summary;
}

// ============================================================================
// SECTION 5: DETERMINISTIC PRIORITY ACTION QUEUE SCORING
// ============================================================================

/**
 * Calculates a priority score (1 to 100) for every actionable invoice.
 * 
 * SCORING FACTORS:
 * 1. Urgency Window: Invoices in days 31-44 receive maximum priority (score 90+)
 *    because Section 43B(h) gives MSME suppliers legal leverage to collect before
 *    the buyer loses their corporate tax deduction.
 * 2. Exposure Size: Higher balance amounts add proportional weighting.
 * 3. Commercial Disputes: Deprioritized from automated collection outreach
 *    to prevent alienating the customer before deliverable issues are resolved.
 */
export function generatePrioritizedActions(invoices: Invoice[]): RecoveryAction[] {
  const actionable = invoices.filter(
    (i) => i.status !== 'paid' && (i.totalAmount - i.paidAmount) > 0.009
  );

  const actions: RecoveryAction[] = actionable.map((inv) => {
    const balance = inv.totalAmount - inv.paidAmount;
    let score = 30;
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let defaultTone: 'gentle' | 'firm' | 'statutory_43b' = 'gentle';
    let reason = 'Scheduled invoice check-in';
    let riskFactor = 'Standard collection cycle';

    if (inv.status === 'disputed') {
      score = 15;
      urgency = 'low';
      defaultTone = 'gentle';
      reason = 'Invoice marked in commercial dispute. Resolve deliverable/pricing questions before billing follow-up.';
      riskFactor = 'Disputed item · Commercial resolution required';
    } else if (inv.daysOverdue <= 0) {
      score = 25;
      urgency = 'low';
      defaultTone = 'gentle';
      reason = `Due in ${Math.abs(inv.daysOverdue)} days. Gentle advance reminder.`;
      riskFactor = 'Upcoming due date';
    } else if (inv.daysOverdue <= 15) {
      score = 50 + Math.min(20, Math.floor(balance / 50000));
      urgency = 'medium';
      defaultTone = 'gentle';
      reason = `Overdue by ${inv.daysOverdue} days. Polite milestone check-in recommended.`;
      riskFactor = 'Early overdue · Focus on relationship preservation';
    } else if (inv.daysOverdue <= 30) {
      score = 65 + Math.min(20, Math.floor(balance / 50000));
      urgency = 'high';
      defaultTone = 'firm';
      reason = `Overdue by ${inv.daysOverdue} days. Send formal statement and request transaction UTR.`;
      riskFactor = 'Over 15 days past due · Accounting escalation';
    } else if (inv.daysOverdue <= 44) {
      score = 90 + Math.min(10, Math.floor(balance / 100000));
      urgency = 'critical';
      defaultTone = inv.isMsmeEligible ? 'statutory_43b' : 'firm';
      reason = inv.isMsmeEligible
        ? `Approaching 45d limit (${inv.daysOverdue}d overdue). Buyer may lose Section 43B(h) tax deduction if crossing 45 days.`
        : `Overdue by ${inv.daysOverdue} days. Senior executive contact recommended.`;
      riskFactor = inv.isMsmeEligible
        ? 'Section 43B(h) statutory deadline estimate · High settlement priority'
        : 'Substantial overdue aging';
    } else {
      score = 85 + Math.min(10, Math.floor(balance / 100000));
      urgency = 'critical';
      defaultTone = inv.isMsmeEligible ? 'statutory_43b' : 'firm';
      reason = `Exceeded 45-day statutory credit threshold (${inv.daysOverdue}d overdue). Subject to MSMED Act interest provisions.`;
      riskFactor = 'Exceeded statutory term · Formal notice or reconciliation review required';
    }

    return {
      id: `act_${inv.id}`,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      balanceAmount: balance,
      daysOverdue: inv.daysOverdue,
      priorityScore: Math.min(100, Math.max(1, score)),
      urgency,
      recommendedChannel: inv.customerPhone ? 'whatsapp' : 'email',
      reason,
      riskFactor,
      defaultTone,
      isApproved: false,
      approvalStatus: 'pending',
    };
  });

  return actions.sort((a, b) => b.priorityScore - a.priorityScore || b.balanceAmount - a.balanceAmount);
}
