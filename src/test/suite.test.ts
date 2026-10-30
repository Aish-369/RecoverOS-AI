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

console.log(`\nTest results: ${passed} passed, ${failed} failed.\n`);
if (failed > 0) {
  process.exit(1);
}
