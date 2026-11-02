/**
 * RecoverOS AI - Comprehensive Financial & Engine Automated Test Suite
 * Run with: npx tsx src/test/suite.test.ts
 */

import assert from 'node:assert/strict';
import { 
  parseStrictCurrency, 
  parseStrictDateOnly, 
  calculateDaysOverdue, 
  categorizeInvoiceAging,
  evaluateMsmeStatutoryStatus,
  filterPaymentsByPeriod,
  computeAgingSummary
} from '../utils/agingEngine';
import { validateAndNormalizeRows, parseCSVText } from '../utils/csvParser';
import { validatePhoneForWhatsApp, validateEmail } from '../utils/draftGenerator';
import { Invoice, PaymentRecord } from '../types';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

console.log('\n--- RecoverOS AI Automated Test Suite ---\n');

// 1. Currency Parsing Tests
test('Currency Parsing: Valid integer, commas, and symbol prefixes', () => {
  assert.equal(parseStrictCurrency('1000').value, 1000);
  assert.equal(parseStrictCurrency('1,000').value, 1000);
  assert.equal(parseStrictCurrency('₹1,000').value, 1000);
  assert.equal(parseStrictCurrency('Rs. 1,000').value, 1000);
  assert.equal(parseStrictCurrency('INR 1,000.50').value, 1000.5);
  assert.equal(parseStrictCurrency('24,80,000').value, 2480000);
  assert.equal(parseStrictCurrency(50000).value, 50000);
});

test('Currency Parsing: Rejects negative amounts and invalid characters', () => {
  assert.equal(parseStrictCurrency('-500').value, null);
  assert.notEqual(parseStrictCurrency('-500').error, null);

  assert.equal(parseStrictCurrency('(1000)').value, null);
  assert.notEqual(parseStrictCurrency('(1000)').error, null);

  assert.equal(parseStrictCurrency('abc').value, null);
  assert.notEqual(parseStrictCurrency('abc').error, null);

  assert.equal(parseStrictCurrency('12a34').value, null);
  assert.notEqual(parseStrictCurrency('12a34').error, null);

  assert.equal(parseStrictCurrency('').value, null);
  assert.notEqual(parseStrictCurrency('').error, null);
});

// 2. Calendar Date Validation Tests
test('Date Validation: Valid ISO and Indian DD/MM/YYYY formats', () => {
  const d1 = parseStrictDateOnly('2026-10-29');
  assert.notEqual(d1, null);
  assert.equal(d1!.getUTCFullYear(), 2026);
  assert.equal(d1!.getUTCMonth(), 9); // October is index 9
  assert.equal(d1!.getUTCDate(), 29);

  const d2 = parseStrictDateOnly('15/08/2026');
  assert.notEqual(d2, null);
  assert.equal(d2!.getUTCFullYear(), 2026);
  assert.equal(d2!.getUTCMonth(), 7); // August is index 7
  assert.equal(d2!.getUTCDate(), 15);
});

test('Date Validation: Rejects impossible calendar dates (detects JS roll-over bug)', () => {
  // February 31st does not exist!
  assert.equal(parseStrictDateOnly('31/02/2026'), null);
  assert.equal(parseStrictDateOnly('2026-02-31'), null);

  // 2025 is not a leap year -> Feb 29 does not exist!
  assert.equal(parseStrictDateOnly('29/02/2025'), null);

  // 2024 is a leap year -> Feb 29 is valid!
  assert.notEqual(parseStrictDateOnly('29/02/2024'), null);

  // April 31st does not exist (April has 30 days)
  assert.equal(parseStrictDateOnly('31/04/2026'), null);

  // Month 13 does not exist
  assert.equal(parseStrictDateOnly('15/13/2026'), null);
});

// 3. Days Overdue & Boundary Tests
test('Aging Calculation: Overdue days & boundary conditions', () => {
  const referenceToday = new Date(Date.UTC(2026, 9, 29)); // Oct 29, 2026

  // Due today (Oct 29) -> 0 days overdue
  assert.equal(calculateDaysOverdue('2026-10-29', referenceToday), 0);

  // Due in future (Nov 5) -> -7 days
  assert.equal(calculateDaysOverdue('2026-11-05', referenceToday), -7);

  // Due yesterday (Oct 28) -> +1 day overdue
  assert.equal(calculateDaysOverdue('2026-10-28', referenceToday), 1);

  // Exactly 30 days overdue (Sept 29)
  assert.equal(calculateDaysOverdue('2026-09-29', referenceToday), 30);

  // Exactly 44 days overdue (Sept 15)
  assert.equal(calculateDaysOverdue('2026-09-15', referenceToday), 44);

  // Exactly 45 days overdue (Sept 14)
  assert.equal(calculateDaysOverdue('2026-09-14', referenceToday), 45);

  // 46 days overdue (Sept 13)
  assert.equal(calculateDaysOverdue('2026-09-13', referenceToday), 46);
});

// 4. Aging Category Tests
test('Aging Categorization: Correct bucket assignment & payment states', () => {
  // Paid invoice (balance = 0)
  assert.equal(categorizeInvoiceAging(100000, 100000, 50), 'paid');

  // Disputed invoice
  assert.equal(categorizeInvoiceAging(100000, 0, 50, true), 'disputed');

  // Future due date
  assert.equal(categorizeInvoiceAging(100000, 0, -5), 'current');

  // 1-30 days
  assert.equal(categorizeInvoiceAging(100000, 0, 15), 'overdue_0_30');

  // 31-44 days (43B(h) Warning)
  assert.equal(categorizeInvoiceAging(100000, 0, 35), 'overdue_31_44');

  // 45+ days (Statutory Breach)
  assert.equal(categorizeInvoiceAging(100000, 0, 45), 'overdue_45_plus');
  assert.equal(categorizeInvoiceAging(100000, 0, 60), 'overdue_45_plus');
});

// 5. Partial Payment Reconciliation Logic
test('Payment Reconciliation: Partial payments keep invoice open, full payment marks paid', () => {
  const total = 100000;
  const partialPayment1 = 40000;
  const balance1 = total - partialPayment1;
  assert.equal(balance1, 60000);
  assert.equal(categorizeInvoiceAging(total, partialPayment1, 15), 'overdue_0_30');

  const partialPayment2 = 60000;
  const totalPaid = partialPayment1 + partialPayment2;
  const balance2 = total - totalPaid;
  assert.equal(balance2, 0);
  assert.equal(categorizeInvoiceAging(total, totalPaid, 15), 'paid');
});

// 6. CSV Duplicate Detection
test('CSV Validation: Detects in-file duplicates and workspace duplicates', () => {
  const csvContent = [
    'Invoice No,Customer Name,Total Amount,Due Date',
    'INV-001,Alpha Ltd,10000,2026-10-15',
    'INV-002,Beta LLC,20000,2026-10-18',
    'INV-001,Alpha Duplicate,15000,2026-10-20' // In-file duplicate of INV-001!
  ].join('\n');

  const rows = parseCSVText(csvContent);
  const mapping = {
    invoiceNumber: 'Invoice No',
    customerName: 'Customer Name',
    totalAmount: 'Total Amount',
    dueDate: 'Due Date',
  };

  const existingWorkspaceInvoices = new Set(['INV-EXISTING-999']);
  const validations = validateAndNormalizeRows(rows, mapping, 'ws_test', true, existingWorkspaceInvoices);

  assert.equal(validations.length, 3);
  assert.equal(validations[0].isValid, true);
  assert.equal(validations[1].isValid, true);

  // Row 3 (the duplicate INV-001) must be flagged with isDuplicate = true and invalid!
  assert.equal(validations[2].isDuplicate, true);
  assert.equal(validations[2].isValid, false);
  assert.match(validations[2].errors[0], /Duplicate invoice #INV-001/);
});

// 7. Period-Specific Recovery Calculation
test('Aging Summary: Period-specific recovery reflects actual payment dates', () => {
  const referenceDate = new Date(Date.UTC(2026, 9, 29)); // Oct 29, 2026

  const payments: PaymentRecord[] = [
    {
      id: 'p1',
      workspaceId: 'ws_test',
      invoiceId: 'i1',
      invoiceNumber: 'INV-1',
      customerName: 'A',
      amount: 50000,
      paymentDate: '2026-10-10', // October (Current MTD)
      referenceNumber: 'UTR1',
      paymentMethod: 'upi',
      verificationStatus: 'user_recorded_pending_verification',
      notes: '',
      recordedAt: '2026-10-10T10:00:00Z',
    },
    {
      id: 'p2',
      workspaceId: 'ws_test',
      invoiceId: 'i2',
      invoiceNumber: 'INV-2',
      customerName: 'B',
      amount: 80000,
      paymentDate: '2026-08-15', // August (2 months ago - NOT current MTD!)
      referenceNumber: 'UTR2',
      paymentMethod: 'neft_rtgs',
      verificationStatus: 'user_recorded_pending_verification',
      notes: '',
      recordedAt: '2026-08-15T10:00:00Z',
    }
  ];

  const mtdPayments = filterPaymentsByPeriod(payments, 'mtd', referenceDate);
  assert.equal(mtdPayments.length, 1);
  assert.equal(mtdPayments[0].amount, 50000);

  const allPayments = filterPaymentsByPeriod(payments, 'all', referenceDate);
  assert.equal(allPayments.length, 2);
  assert.equal(allPayments[0].amount + allPayments[1].amount, 130000);
});

// 8. Contact Info Validation
test('Draft Generator: Validates contact phone and email format', () => {
  assert.equal(validatePhoneForWhatsApp('+91 98765 43210').isValid, true);
  assert.equal(validatePhoneForWhatsApp('9876543210').cleanPhone, '919876543210');
  assert.equal(validatePhoneForWhatsApp('123').isValid, false);
  assert.equal(validatePhoneForWhatsApp('').isValid, false);

  assert.equal(validateEmail('finance@client.in').isValid, true);
  assert.equal(validateEmail('invalid-email').isValid, false);
  assert.equal(validateEmail('').isValid, false);
});

// 9. Commercial Dispute Status Transitions
test('Commercial Dispute: Pauses aging escalation and sets dispute status; clearing restores category', () => {
  // Invoice overdue by 50 days (normally overdue_45_plus)
  const categoryNormal = categorizeInvoiceAging(200000, 0, 50, false);
  assert.equal(categoryNormal, 'overdue_45_plus');

  // When marked in dispute, category must be 'disputed'
  const categoryDisputed = categorizeInvoiceAging(200000, 0, 50, true);
  assert.equal(categoryDisputed, 'disputed');

  // MSME status during dispute must not be breach
  const msmeDisputed = evaluateMsmeStatutoryStatus(true, true, 50, false, true);
  assert.notEqual(msmeDisputed, 'statutory_breach');

  // Clearing dispute returns it to overdue_45_plus
  const categoryCleared = categorizeInvoiceAging(200000, 0, 50, false);
  assert.equal(categoryCleared, 'overdue_45_plus');
});

// 10. Financial Overpayment Protection
test('Payment Boundaries: Validates partial payment precision and prevents overpayment overflow', () => {
  const total = 150000.75;
  const payment1 = 50000.25;
  const balance1 = Math.round((total - payment1) * 100) / 100;
  assert.equal(balance1, 100000.50);

  // Attempting to pay more than balance (e.g. 100001) should be flagged
  const isOverpayment = (payment: number, balance: number) => payment > balance + 0.01;
  assert.equal(isOverpayment(100001, balance1), true);
  assert.equal(isOverpayment(100000.50, balance1), false);
  assert.equal(isOverpayment(50000, balance1), false);
});

// 11. Leap Year Edge Cases & Day Span Calculations
test('Leap Year Edge Cases: Validates leap day dates and day spans across Feb 28/29/March 1', () => {
  // Case 1: Valid leap days in leap years
  const leap2024 = parseStrictDateOnly('2024-02-29');
  assert.notEqual(leap2024, null);
  assert.equal(leap2024!.getUTCFullYear(), 2024);
  assert.equal(leap2024!.getUTCMonth(), 1); // Feb is index 1
  assert.equal(leap2024!.getUTCDate(), 29);

  // British/Indian format for leap day
  const leap2024Ind = parseStrictDateOnly('29/02/2024');
  assert.notEqual(leap2024Ind, null);
  assert.equal(leap2024Ind!.getUTCDate(), 29);

  // Century leap year (2000 is divisible by 400)
  const leap2000 = parseStrictDateOnly('2000-02-29');
  assert.notEqual(leap2000, null);
  assert.equal(leap2000!.getUTCDate(), 29);

  // Case 2: Invalid leap days in non-leap years (must return null, never roll over to March 1)
  assert.equal(parseStrictDateOnly('2025-02-29'), null);
  assert.equal(parseStrictDateOnly('29/02/2025'), null);
  assert.equal(parseStrictDateOnly('2023-02-29'), null);
  assert.equal(parseStrictDateOnly('29/02/2023'), null);

  // Case 3: Days overdue span across February 29 in leap year 2024
  // Due: Feb 28, 2024. Reference: March 1, 2024.
  // Because 2024 has Feb 29, exactly 2 calendar days have elapsed (Feb 29 and March 1).
  const refMarch1Leap = new Date(Date.UTC(2024, 2, 1)); // March 1, 2024
  assert.equal(calculateDaysOverdue('2024-02-28', refMarch1Leap), 2);

  // Case 4: Days overdue span across February in non-leap year 2025
  // Due: Feb 28, 2025. Reference: March 1, 2025.
  // Because 2025 has NO Feb 29, exactly 1 calendar day has elapsed.
  const refMarch1NonLeap = new Date(Date.UTC(2025, 2, 1)); // March 1, 2025
  assert.equal(calculateDaysOverdue('2025-02-28', refMarch1NonLeap), 1);

  // Case 5: Invoice due ON the leap day itself (Feb 29, 2024)
  const dueLeapDay = '2024-02-29';
  // Evaluated on the same day -> 0 days overdue
  assert.equal(calculateDaysOverdue(dueLeapDay, new Date(Date.UTC(2024, 1, 29))), 0);
  assert.equal(categorizeInvoiceAging(50000, 0, 0), 'current');

  // Evaluated the day before (Feb 28, 2024) -> -1 day (future due)
  assert.equal(calculateDaysOverdue(dueLeapDay, new Date(Date.UTC(2024, 1, 28))), -1);
  assert.equal(categorizeInvoiceAging(50000, 0, -1), 'current');

  // Evaluated on March 1, 2024 -> 1 day overdue
  assert.equal(calculateDaysOverdue(dueLeapDay, new Date(Date.UTC(2024, 2, 1))), 1);
  assert.equal(categorizeInvoiceAging(50000, 0, 1), 'overdue_0_30');

  // Case 6: Spanning across leap day into future
  // Reference: Feb 27, 2024. Due: March 2, 2024.
  // Calendar days between Feb 27 and March 2 in a leap year: Feb 28, Feb 29, March 1, March 2 = 4 days until due (-4)
  assert.equal(calculateDaysOverdue('2024-03-02', new Date(Date.UTC(2024, 1, 27))), -4);
});

// 12. Exact 45-Day MSME Statutory Boundary Thresholds
test('MSME Statutory Boundaries: Exhaustive verification of days 0, 1, 30, 31, 44, 45, 46, and 90', () => {
  const isMsme = true;
  const isEligible = true;
  const unpaid = false;
  const amount = 75000;

  // Day 0: Due today
  assert.equal(categorizeInvoiceAging(amount, 0, 0), 'current');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 0, unpaid), 'within_statutory_limit');

  // Day 1: 1 day overdue
  assert.equal(categorizeInvoiceAging(amount, 0, 1), 'overdue_0_30');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 1, unpaid), 'within_statutory_limit');

  // Day 15: Mid 0-30 window
  assert.equal(categorizeInvoiceAging(amount, 0, 15), 'overdue_0_30');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 15, unpaid), 'within_statutory_limit');

  // Day 30: EXACT upper boundary of early overdue window
  assert.equal(categorizeInvoiceAging(amount, 0, 30), 'overdue_0_30');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 30, unpaid), 'within_statutory_limit');

  // Day 31: EXACT lower boundary of 43B(h) warning window (approaching 45-day cliff)
  assert.equal(categorizeInvoiceAging(amount, 0, 31), 'overdue_31_44');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 31, unpaid), 'approaching_deadline');

  // Day 44: EXACT upper boundary of 43B(h) warning window (last day before statutory breach)
  assert.equal(categorizeInvoiceAging(amount, 0, 44), 'overdue_31_44');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 44, unpaid), 'approaching_deadline');

  // Day 45: EXACT statutory maximum credit period limit under MSMED Act 2006
  // Under Section 15 of MSMED Act, payment terms cannot exceed 45 days.
  // At 45 days overdue, it enters the statutory breach category.
  assert.equal(categorizeInvoiceAging(amount, 0, 45), 'overdue_45_plus');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 45, unpaid), 'statutory_breach');

  // Day 46: 1 day past statutory breach
  assert.equal(categorizeInvoiceAging(amount, 0, 46), 'overdue_45_plus');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 46, unpaid), 'statutory_breach');

  // Day 90: Severe overdue
  assert.equal(categorizeInvoiceAging(amount, 0, 90), 'overdue_45_plus');
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 90, unpaid), 'statutory_breach');

  // Non-MSME Supplier should NEVER report statutory breach
  assert.equal(evaluateMsmeStatutoryStatus(false, isEligible, 60, unpaid), 'not_applicable');

  // Settled/Paid Invoice should NEVER report statutory breach
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 60, true), 'not_applicable');

  // Disputed Invoice pauses statutory breach evaluation
  assert.equal(evaluateMsmeStatutoryStatus(isMsme, isEligible, 60, unpaid, true), 'not_applicable');
});

// 13. Future-Dated Invoices & Negative Days Overdue
test('Future-Dated Invoices: Rigorous handling of negative days overdue and financial isolation', () => {
  const amount = 120000;

  // Due tomorrow: -1 day overdue
  assert.equal(categorizeInvoiceAging(amount, 0, -1), 'current');
  assert.equal(evaluateMsmeStatutoryStatus(true, true, -1, false), 'within_statutory_limit');

  // Due in 15 days: -15 days overdue
  assert.equal(categorizeInvoiceAging(amount, 0, -15), 'current');
  assert.equal(evaluateMsmeStatutoryStatus(true, true, -15, false), 'within_statutory_limit');

  // Due in 60 days: -60 days overdue
  assert.equal(categorizeInvoiceAging(amount, 0, -60), 'current');
  assert.equal(evaluateMsmeStatutoryStatus(true, true, -60, false), 'within_statutory_limit');

  // Future-dated invoice with partial payment remains 'current'
  assert.equal(categorizeInvoiceAging(amount, 40000, -10), 'current');

  // Future-dated invoice fully paid becomes 'paid'
  assert.equal(categorizeInvoiceAging(amount, 120000, -10), 'paid');

  // Future-dated invoice with commercial dispute becomes 'disputed'
  assert.equal(categorizeInvoiceAging(amount, 0, -10, true), 'disputed');

  // Summary Aggregation: Future-dated invoices must NOT inflate overdue metrics
  const futureInvoice: Invoice = {
    id: 'inv_future_1',
    workspaceId: 'ws_test',
    invoiceNumber: 'INV-FUT-01',
    customerName: 'Future Client Ltd',
    customerPhone: '+91 98765 43210',
    customerEmail: 'finance@futureclient.com',
    issueDate: '2026-10-01',
    dueDate: '2026-11-15',
    totalAmount: 120000,
    paidAmount: 0,
    balanceAmount: 120000,
    daysOverdue: -17,
    status: 'current',
    isMsmeEligible: true,
    msmeStatutoryStatus: 'within_statutory_limit',
    history: [],
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z'
  } as Invoice;

  const summary = computeAgingSummary([futureInvoice], [], 'mtd');
  // Total receivables includes the invoice balance
  assert.equal(summary.totalReceivables, 120000);
  // Current amount includes the invoice balance
  assert.equal(summary.currentAmount, 120000);
  assert.equal(summary.currentCount, 1);
  // Total overdue amount and count MUST be strictly zero
  assert.equal(summary.totalOverdueAmount, 0);
  assert.equal(summary.overdueInvoicesCount, 0);
  assert.equal(summary.overdue0to30Amount, 0);
  assert.equal(summary.overdue31to44Amount, 0);
  assert.equal(summary.overdue45PlusAmount, 0);
  assert.equal(summary.statutory43BAtRiskAmount, 0);
});

// 14. Time of Day and Intra-Day Clock Invariance
test('Time-of-Day Invariance: Validates that afternoon and late-night reference times do not drift calendar days', () => {
  // Due date: Oct 29, 2026
  const due = '2026-10-29';

  // Evaluated on Oct 29 at 11:59:59 PM (end of day)
  // Must STILL be 0 days overdue on Oct 29, never round up to 1 day!
  const lateNightRef = new Date(2026, 9, 29, 23, 59, 59);
  assert.equal(calculateDaysOverdue(due, lateNightRef), 0);

  // Evaluated on Oct 29 at 00:00:01 AM (start of day)
  const earlyMorningRef = new Date(2026, 9, 29, 0, 0, 1);
  assert.equal(calculateDaysOverdue(due, earlyMorningRef), 0);

  // Evaluated on Oct 30 at 00:00:01 AM (start of next day)
  const nextDayRef = new Date(2026, 9, 30, 0, 0, 1);
  assert.equal(calculateDaysOverdue(due, nextDayRef), 1);
});

console.log(`\nTest results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}

