/**
 * ============================================================================
 * RecoverOS AI - Production CSV Ingestion & Schema Normalization Engine
 * ============================================================================
 * 
 * PURPOSE OF THIS FILE:
 * This module ingests raw CSV text from billing software (Tally Prime, Zoho Books,
 * QuickBooks, Excel), parses it reliably according to RFC 4180 standards, maps
 * varying column headers automatically, detects duplicate invoices, and validates
 * each row deterministically before allowing it into the database.
 * 
 * WHY SIMPLE `.split(',')` CRASHES ON REAL FINANCIAL CSVs:
 * In the real world, invoice descriptions and customer names often contain commas
 * (e.g. "Apex Retail, Mumbai" or "Design System, Phase 2"). If you simply split
 * by commas, a single row splits into too many columns and corrupts your database.
 * This parser implements a state machine that tracks whether a comma is inside
 * quotes or separating fields.
 * 
 * ARCHITECTURAL CONNECTIONS:
 * - Imported by `src/components/CsvImportView.tsx` to handle file uploads.
 * - Uses `src/utils/agingEngine.ts` for strict currency and calendar validation.
 * - Generates typed `Invoice` objects stored in `src/services/storageService.ts`.
 * - Tested in `src/test/suite.test.ts`.
 */

import { CsvColumnMapping, CsvRowValidation, Invoice } from '../types';
import { 
  calculateDaysOverdue, 
  categorizeInvoiceAging, 
  evaluateMsmeStatutoryStatus, 
  parseStrictDateOnly, 
  parseStrictCurrency, 
  formatDateOnly 
} from './agingEngine';

// ============================================================================
// SECTION 1: RFC 4180 COMPLIANT STATE-MACHINE CSV PARSER
// ============================================================================

/**
 * Parses raw CSV string into a 2-dimensional string array: `string[][]`.
 * 
 * HOW THE STATE MACHINE WORKS:
 * - Iterates character-by-character through the CSV text.
 * - `insideQuotes` flag: When a `"` is encountered, we toggle this flag.
 *   While `insideQuotes` is true, commas (`,`) and newlines (`\n`) are treated
 *   as regular characters inside the cell, NOT boundaries!
 * - Escaped double-quotes: When `""` appears inside quotes, it represents
 *   a literal double-quote character.
 * 
 * WHAT IT RETURNS:
 * An array of rows, where each row is an array of string field values.
 */
export function parseCSVText(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;
  
  // Normalize Windows CRLF (\r\n) and classic Mac (\r) to standard LF (\n)
  const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped double quote ("" -> ")
        currentField += '"';
        i++; // Skip the second quote character
      } else {
        // Toggle quoting state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // Unquoted comma means the field is complete
      currentRow.push(currentField.trim());
      currentField = '';
    } else if (char === '\n' && !insideQuotes) {
      // Unquoted newline means the row is complete
      currentRow.push(currentField.trim());
      // Only push rows that contain at least one non-empty value (skip trailing empty lines)
      if (currentRow.some((col) => col.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  // Flush any remaining characters after loop ends
  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((col) => col.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

// ============================================================================
// SECTION 2: AUTOMATIC COLUMN HEADER DETECTION
// ============================================================================

/**
 * Dictionary of common column aliases used across Indian accounting packages:
 * - Tally Prime: "Voucher No", "Party Name", "Gross Amount"
 * - Zoho Books: "Invoice Number", "Customer Name", "Total"
 * - QuickBooks: "Invoice No", "Client", "Amount"
 * - Excel: "Bill #", "Buyer", "Due Date"
 */
const HEADER_ALIASES: Record<keyof CsvColumnMapping, string[]> = {
  invoiceNumber: [
    'invoice number', 'invoice no', 'invoice_no', 'invoice_number', 'inv no', 'inv #', 
    'bill no', 'bill number', 'bill_no', 'voucher no', 'voucher_no', 'doc no', 'invoice_id'
  ],
  customerName: [
    'customer name', 'customer', 'client name', 'client', 'party name', 'party', 
    'buyer name', 'buyer', 'company name', 'company', 'debtor', 'account'
  ],
  totalAmount: [
    'total amount', 'total', 'amount', 'invoice amount', 'grand total', 'net amount', 
    'bill value', 'bill amount', 'invoice value', 'total_value', 'gross amount'
  ],
  paidAmount: [
    'paid amount', 'paid', 'amount paid', 'received', 'amount received', 
    'settled amount', 'collection'
  ],
  dueDate: [
    'due date', 'due_date', 'payment due', 'payment due date', 'pay by', 
    'expiry date', 'term date'
  ],
  issueDate: [
    'invoice date', 'inv date', 'date', 'bill date', 'issue date', 'dated', 
    'doc date', 'voucher date'
  ],
  phone: [
    'phone', 'mobile', 'contact', 'whatsapp', 'phone number', 'mobile no', 
    'contact no', 'tel'
  ],
  email: [
    'email', 'e-mail', 'mail', 'email id', 'contact email', 'billing email'
  ],
  notes: [
    'notes', 'remarks', 'description', 'comments', 'details'
  ],
  milestone: [
    'milestone', 'service', 'project', 'deliverable', 'scope', 'work item'
  ]
};

/**
 * Inspects header row and automatically pairs each schema field with the best CSV column.
 */
export function autoDetectColumnMapping(headers: string[]): CsvColumnMapping {
  const cleanHeaders = headers.map((h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ' '));
  const mapping: Partial<CsvColumnMapping> = {};

  const findBestMatch = (aliases: string[]): string => {
    // 1. Exact match
    for (let i = 0; i < cleanHeaders.length; i++) {
      const header = cleanHeaders[i];
      if (aliases.includes(header)) return headers[i];
    }
    // 2. Substring match
    for (let i = 0; i < cleanHeaders.length; i++) {
      const header = cleanHeaders[i];
      for (const alias of aliases) {
        if (header.includes(alias) || alias.includes(header)) return headers[i];
      }
    }
    return '';
  };

  (Object.keys(HEADER_ALIASES) as Array<keyof CsvColumnMapping>).forEach((key) => {
    mapping[key] = findBestMatch(HEADER_ALIASES[key]);
  });

  return {
    invoiceNumber: mapping.invoiceNumber || '',
    customerName: mapping.customerName || '',
    totalAmount: mapping.totalAmount || '',
    paidAmount: mapping.paidAmount || '',
    dueDate: mapping.dueDate || '',
    issueDate: mapping.issueDate || '',
    phone: mapping.phone || '',
    email: mapping.email || '',
    notes: mapping.notes || '',
    milestone: mapping.milestone || '',
  };
}

// ============================================================================
// SECTION 3: DETERMINISTIC ROW VALIDATION & DUPLICATE CHECKING
// ============================================================================

/**
 * Validates, normalizes, and checks each CSV row for errors and duplicates.
 * 
 * WHAT IT RECEIVES:
 * - `rows`: Raw string grid from `parseCSVText`.
 * - `mapping`: The confirmed column mapping object.
 * - `workspaceId`: The tenant identifier (multi-tenant boundary).
 * - `isAgencyMSME`: Whether the supplier workspace is a registered MSME.
 * - `existingWorkspaceInvoiceNumbers`: Set of already-imported invoice numbers in this workspace.
 * 
 * WHY DUPLICATE DETECTION MATTERS:
 * In accounts receivable, accidentally importing the same invoice twice inflates
 * outstanding receivables and leads to embarrassing duplicate follow-up demands
 * to clients. We check duplicates at two levels:
 * 1. Within the file (same invoice number appears in multiple rows).
 * 2. Against existing records in the workspace.
 * 
 * WHAT IT RETURNS:
 * An array of `CsvRowValidation` items containing row numbers, diagnostic errors,
 * duplicate flags, and the fully constructed `Invoice` object if valid.
 */
export function validateAndNormalizeRows(
  rows: string[][],
  mapping: CsvColumnMapping,
  workspaceId: string = 'default_ws',
  isAgencyMSME: boolean = true,
  existingWorkspaceInvoiceNumbers: Set<string> = new Set()
): CsvRowValidation[] {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const dataRows = rows.slice(1);

  // Helper to find the column index for a mapped field name
  const getColIndex = (colName: string): number => {
    if (!colName) return -1;
    return headers.findIndex((h) => h.trim().toLowerCase() === colName.trim().toLowerCase());
  };

  const invNumIdx = getColIndex(mapping.invoiceNumber);
  const custNameIdx = getColIndex(mapping.customerName);
  const totalAmtIdx = getColIndex(mapping.totalAmount);
  const paidAmtIdx = getColIndex(mapping.paidAmount || '');
  const dueDateIdx = getColIndex(mapping.dueDate);
  const issueDateIdx = getColIndex(mapping.issueDate || '');
  const phoneIdx = getColIndex(mapping.phone || '');
  const emailIdx = getColIndex(mapping.email || '');
  const notesIdx = getColIndex(mapping.notes || '');
  const milestoneIdx = getColIndex(mapping.milestone || '');

  // Map to track in-file invoice numbers: Map<InvoiceNumber, FirstRowIndexSeen>
  const seenInFileInvoiceNumbers = new Map<string, number>();

  return dataRows.map((row, index) => {
    const errors: string[] = [];
    const warnings: string[] = [];
    const rawMap: Record<string, string> = {};
    let isDuplicate = false;
    let duplicateReason: string | undefined = undefined;

    headers.forEach((h, i) => {
      rawMap[h] = row[i] || '';
    });

    const invNum = invNumIdx >= 0 ? (row[invNumIdx] || '').trim() : '';
    const custName = custNameIdx >= 0 ? (row[custNameIdx] || '').trim() : '';
    const rawTotal = totalAmtIdx >= 0 ? (row[totalAmtIdx] || '').trim() : '';
    const rawPaid = paidAmtIdx >= 0 ? (row[paidAmtIdx] || '').trim() : '';
    const rawDueDate = dueDateIdx >= 0 ? (row[dueDateIdx] || '').trim() : '';
    const rawIssueDate = issueDateIdx >= 0 ? (row[issueDateIdx] || '').trim() : '';
    const phone = phoneIdx >= 0 ? (row[phoneIdx] || '').trim() : '';
    const email = emailIdx >= 0 ? (row[emailIdx] || '').trim() : '';
    const notes = notesIdx >= 0 ? (row[notesIdx] || '').trim() : '';
    const milestone = milestoneIdx >= 0 ? (row[milestoneIdx] || '').trim() : '';

    // 1. Mandatory Validation: Invoice Number
    if (!invNum) {
      errors.push('Invoice number is missing');
    } else {
      const normalizedInv = invNum.toUpperCase();
      
      // In-file duplicate check
      if (seenInFileInvoiceNumbers.has(normalizedInv)) {
        const prevRow = seenInFileInvoiceNumbers.get(normalizedInv)!;
        isDuplicate = true;
        duplicateReason = `Duplicate invoice #${invNum} already appeared in row ${prevRow}`;
        errors.push(duplicateReason);
      } else {
        seenInFileInvoiceNumbers.set(normalizedInv, index + 2);
      }

      // Existing workspace duplicate check
      if (existingWorkspaceInvoiceNumbers.has(normalizedInv)) {
        isDuplicate = true;
        duplicateReason = `Invoice #${invNum} already exists in your active workspace`;
        warnings.push(duplicateReason);
      }
    }

    // 2. Mandatory Validation: Customer Name
    if (!custName) {
      errors.push('Customer name is missing');
    }

    // 3. Mandatory Validation: Total Amount (using strict currency parser)
    const parsedTotal = parseStrictCurrency(rawTotal);
    if (parsedTotal.error) {
      errors.push(`Invalid invoice amount: ${parsedTotal.error}`);
    } else if (parsedTotal.value === null || parsedTotal.value <= 0) {
      errors.push('Total amount must be greater than zero');
    }

    // 4. Optional Validation: Paid Amount
    let paidAmount = 0;
    if (rawPaid) {
      const parsedPaid = parseStrictCurrency(rawPaid);
      if (parsedPaid.error) {
        warnings.push(`Invalid paid amount "${rawPaid}" ignored; defaulted to 0`);
      } else if (parsedPaid.value !== null) {
        paidAmount = parsedPaid.value;
      }
    }

    const totalAmount = parsedTotal.value || 0;
    if (paidAmount > totalAmount) {
      warnings.push(`Paid amount (₹${paidAmount}) exceeds total (₹${totalAmount}). Capped to total.`);
      paidAmount = totalAmount;
    }
    const balanceAmount = Math.max(0, Math.round((totalAmount - paidAmount) * 100) / 100);

    // 5. Mandatory Validation: Calendar Due Date
    const parsedDue = parseStrictDateOnly(rawDueDate);
    if (!parsedDue) {
      errors.push(`Invalid calendar due date: "${rawDueDate}". Must be a valid date in YYYY-MM-DD or DD/MM/YYYY.`);
    }

    // 6. Optional: Invoice Issue Date
    let issueDateStr: string;
    if (rawIssueDate) {
      const parsedIssue = parseStrictDateOnly(rawIssueDate);
      if (!parsedIssue) {
        warnings.push(`Unrecognized invoice date "${rawIssueDate}". Defaulted to due date.`);
        issueDateStr = parsedDue ? formatDateOnly(parsedDue) : '';
      } else {
        issueDateStr = formatDateOnly(parsedIssue);
        if (parsedDue && parsedDue < parsedIssue) {
          warnings.push('Due date is earlier than invoice issue date');
        }
      }
    } else {
      issueDateStr = parsedDue ? formatDateOnly(parsedDue) : '';
    }

    const dueDateStr = parsedDue ? formatDateOnly(parsedDue) : '';

    // If completely free of errors, build the verified Invoice entity
    let parsedInvoice: Invoice | undefined = undefined;
    if (errors.length === 0 && dueDateStr) {
      const daysOverdue = calculateDaysOverdue(dueDateStr);
      const status = categorizeInvoiceAging(totalAmount, paidAmount, daysOverdue);
      const msmeStatus = evaluateMsmeStatutoryStatus(isAgencyMSME, true, daysOverdue, status === 'paid');

      parsedInvoice = {
        id: `inv_${workspaceId}_${Date.now()}_${index}`,
        workspaceId,
        invoiceNumber: invNum,
        customerName: custName,
        customerEmail: email || undefined, // Zero fake fallback emails!
        customerPhone: phone || undefined, // Zero fake fallback phones!
        issueDate: issueDateStr,
        dueDate: dueDateStr,
        totalAmount,
        paidAmount,
        balanceAmount,
        status,
        daysOverdue,
        isMsmeEligible: isAgencyMSME,
        msmeStatutoryStatus: msmeStatus,
        projectMilestone: milestone || undefined,
        notes: notes || undefined,
        isDemoData: false,
        createdAt: new Date().toISOString(),
      };
    }

    return {
      rowIndex: index + 2, // 1-based, accounting for header row
      raw: rawMap,
      parsed: parsedInvoice,
      isValid: errors.length === 0,
      isDuplicate,
      duplicateReason,
      errors,
      warnings,
    };
  });
}

/**
 * Downloads a generated CSV file directly in the browser via Blob URL.
 */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates sample CSV text matching real B2B digital agency billing practices.
 */
export function generateSampleAgencyCSV(): string {
  return [
    'Invoice No,Customer Name,Total Amount,Paid Amount,Due Date,Invoice Date,Phone,Email,Project Milestone',
    'ARTX-2024-089,Apex Retail Solutions,340000,0,2026-09-17,2026-08-18,+91 98201 12345,accounts@apexretail.in,E-commerce Design Phase 2',
    'ARTX-2024-094,Zenora Health Labs,185000,0,2026-10-11,2026-09-11,+91 98450 67890,payments@zenorahealth.com,Patient Portal UX & Testing',
    'ARTX-2024-071,Horizon FinTech India,620000,120000,2026-08-14,2026-07-15,+91 99001 54321,finance@horizonfintech.io,Core Wealth Management UI Kit',
    'ARTX-2024-102,CloudForge Technologies,275000,0,2026-10-24,2026-09-24,+91 97110 99887,billing@cloudforge.tech,DevOps Dashboard Revamp',
    'ARTX-2024-110,Vivid Brands Creative,120000,0,2026-11-15,2026-10-15,+91 98112 33445,admin@vividbrands.in,Brand Guidelines & 3D Assets'
  ].join('\n');
}
