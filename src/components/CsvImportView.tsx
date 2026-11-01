/**
 * RecoverOS AI - Production CSV Ingestion & Validation View
 * 
 * Features:
 * - RFC 4180 parsing with quotes and escaped character handling
 * - Accurate column auto-mapping with interactive re-mapping selectors
 * - Accurate counting of Valid, Invalid, and Duplicate rows
 * - Actionable row-level diagnostic messages
 * - Zero fabricated fallback data
 */

import React, { useState, useRef, useMemo } from 'react';
import { 
  UploadCloud, 
  FileCheck2, 
  AlertTriangle, 
  CheckCircle2, 
  Download, 
  ArrowRight, 
  RefreshCw, 
  FileText,
  Copy
} from 'lucide-react';
import { CsvColumnMapping, CsvRowValidation, Invoice, BusinessProfile } from '../types';
import { 
  parseCSVText, 
  autoDetectColumnMapping, 
  validateAndNormalizeRows, 
  generateSampleAgencyCSV, 
  downloadCSV 
} from '../utils/csvParser';
import { formatINR } from '../utils/agingEngine';

interface CsvImportViewProps {
  profile: BusinessProfile;
  existingInvoices: Invoice[];
  onImportComplete: (importedInvoices: Invoice[], replaceExisting: boolean) => void;
  onCancel: () => void;
}

export const CsvImportView: React.FC<CsvImportViewProps> = ({
  profile,
  existingInvoices,
  onImportComplete,
  onCancel,
}) => {
  const [fileName, setFileName] = useState<string>('');
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [parsedRows, setParsedRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<CsvColumnMapping>({
    invoiceNumber: '',
    customerName: '',
    totalAmount: '',
    dueDate: '',
  });
  const [validationResults, setValidationResults] = useState<CsvRowValidation[]>([]);
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const existingInvoiceSet = useMemo(() => {
    return new Set(existingInvoices.map((inv) => inv.invoiceNumber.toUpperCase()));
  }, [existingInvoices]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      processCsvInput(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleLoadSampleData = () => {
    const sample = generateSampleAgencyCSV();
    processCsvInput(sample, 'sample_agency_receivables.csv');
  };

  const handleDownloadSample = () => {
    const sample = generateSampleAgencyCSV();
    downloadCSV('recoveros_sample_receivables_template.csv', sample);
  };

  const processCsvInput = (text: string, sourceName: string) => {
    setFileName(sourceName);
    const rows = parseCSVText(text);

    if (rows.length < 2) {
      setErrorMessage('The provided CSV file contains no data rows or is malformed.');
      return;
    }
    setErrorMessage(null);

    const headerRow = rows[0];
    setParsedRows(rows);
    setHeaders(headerRow);

    const detected = autoDetectColumnMapping(headerRow);
    setMapping(detected);

    const validations = validateAndNormalizeRows(
      rows, 
      detected, 
      profile.workspaceId, 
      profile.isMsmeRegistered, 
      existingInvoiceSet
    );
    setValidationResults(validations);

    setStep('mapping');
  };

  const handleMappingChange = (field: keyof CsvColumnMapping, selectedHeader: string) => {
    const updated = { ...mapping, [field]: selectedHeader };
    setMapping(updated);
    if (parsedRows.length > 1) {
      const revalidated = validateAndNormalizeRows(
        parsedRows, 
        updated, 
        profile.workspaceId, 
        profile.isMsmeRegistered, 
        existingInvoiceSet
      );
      setValidationResults(revalidated);
    }
  };

  const handleProceedToPreview = () => {
    const validations = validateAndNormalizeRows(
      parsedRows, 
      mapping, 
      profile.workspaceId, 
      profile.isMsmeRegistered, 
      existingInvoiceSet
    );
    setValidationResults(validations);
    setStep('preview');
  };

  const handleConfirmImport = () => {
    const validInvoices = validationResults
      .filter((r) => r.isValid && r.parsed)
      .map((r) => r.parsed as Invoice);

    if (validInvoices.length === 0) {
      setErrorMessage('No valid invoices found to import. Please resolve the row errors before importing.');
      return;
    }

    onImportComplete(validInvoices, replaceExisting);
  };

  const validCount = validationResults.filter((r) => r.isValid).length;
  const duplicateCount = validationResults.filter((r) => r.isDuplicate).length;
  const invalidCount = validationResults.length - validCount;
  const totalImportAmount = validationResults.reduce((acc, r) => {
    return acc + (r.parsed?.balanceAmount || 0);
  }, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Import Invoices from CSV
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Validate rows, detect duplicate numbers, and normalize amounts client-side.
          </p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 text-xs font-medium self-start sm:self-auto">
          <span className={`px-2.5 py-1 rounded-md ${step === 'upload' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-100 text-slate-600'}`}>
            1. Select
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-2.5 py-1 rounded-md ${step === 'mapping' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-100 text-slate-600'}`}>
            2. Map
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-2.5 py-1 rounded-md ${step === 'preview' ? 'bg-indigo-600 text-white font-semibold' : 'bg-slate-100 text-slate-600'}`}>
            3. Review & Import
          </span>
        </div>
      </div>

      {/* STEP 1: UPLOAD */}
      {step === 'upload' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:border-indigo-400 transition-colors">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv,text/csv"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">
              Upload your Accounts Receivable CSV
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Standard exports from Tally Prime, Zoho Books, QuickBooks, or custom Excel sheets.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                Browse CSV File
              </button>
            </div>
            <div className="mt-4 text-[11px] text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Client-side parsing · Strictly validated against Indian number formatting</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>Sample Data & Template</span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Download a clean CSV template with standard column headers, or load a realistic digital agency sample file.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleDownloadSample}
                className="w-full py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Download Sample CSV Template</span>
              </button>

              <button
                onClick={handleLoadSampleData}
                className="w-full py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Load Sample Agency File</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: MAPPING */}
      {step === 'mapping' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                <span>Loaded File:</span>
                <span className="font-semibold text-slate-800">{fileName}</span>
                <span aria-hidden="true">·</span>
                <span>{parsedRows.length - 1} Rows Detected</span>
              </div>
              <h2 className="text-sm font-semibold text-slate-900 mt-1">
                Verify Column Mappings
              </h2>
            </div>
            <button
              onClick={() => setStep('upload')}
              className="text-xs text-slate-500 hover:text-slate-800 underline"
            >
              Choose different file
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Invoice Number */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Invoice Number <span className="text-rose-600">*</span>
                </label>
                {mapping.invoiceNumber ? (
                  <span className="text-[10px] text-emerald-700 font-medium">Mapped</span>
                ) : (
                  <span className="text-[10px] text-rose-600 font-medium">Required</span>
                )}
              </div>
              <select
                value={mapping.invoiceNumber}
                onChange={(e) => handleMappingChange('invoiceNumber', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            {/* Customer Name */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Customer / Client Name <span className="text-rose-600">*</span>
                </label>
                {mapping.customerName ? (
                  <span className="text-[10px] text-emerald-700 font-medium">Mapped</span>
                ) : (
                  <span className="text-[10px] text-rose-600 font-medium">Required</span>
                )}
              </div>
              <select
                value={mapping.customerName}
                onChange={(e) => handleMappingChange('customerName', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            {/* Total Amount */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Invoice / Total Amount <span className="text-rose-600">*</span>
                </label>
                {mapping.totalAmount ? (
                  <span className="text-[10px] text-emerald-700 font-medium">Mapped</span>
                ) : (
                  <span className="text-[10px] text-rose-600 font-medium">Required</span>
                )}
              </div>
              <select
                value={mapping.totalAmount}
                onChange={(e) => handleMappingChange('totalAmount', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            {/* Due Date */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-800">
                  Payment Due Date <span className="text-rose-600">*</span>
                </label>
                {mapping.dueDate ? (
                  <span className="text-[10px] text-emerald-700 font-medium">Mapped</span>
                ) : (
                  <span className="text-[10px] text-rose-600 font-medium">Required</span>
                )}
              </div>
              <select
                value={mapping.dueDate}
                onChange={(e) => handleMappingChange('dueDate', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">-- Select Column --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            {/* Optional Fields */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Paid Amount (Optional)</label>
              <select
                value={mapping.paidAmount || ''}
                onChange={(e) => handleMappingChange('paidAmount', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="">-- None (Defaults to 0) --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Phone / WhatsApp (Optional)</label>
              <select
                value={mapping.phone || ''}
                onChange={(e) => handleMappingChange('phone', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Email Address (Optional)</label>
              <select
                value={mapping.email || ''}
                onChange={(e) => handleMappingChange('email', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Milestone / Scope (Optional)</label>
              <select
                value={mapping.milestone || ''}
                onChange={(e) => handleMappingChange('milestone', e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md"
              >
                <option value="">-- None --</option>
                {headers.map((h) => (
                  <option key={h} value={h}>CSV: {h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-xs">
              <span className="text-emerald-700 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                {validCount} valid rows ready
              </span>
              {invalidCount > 0 && (
                <span className="text-rose-600 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  {invalidCount} invalid rows
                </span>
              )}
              {duplicateCount > 0 && (
                <span className="text-amber-700 font-medium flex items-center gap-1.5">
                  <Copy className="w-4 h-4" />
                  {duplicateCount} duplicates
                </span>
              )}
            </div>

            <button
              disabled={!mapping.invoiceNumber || !mapping.customerName || !mapping.totalAmount || !mapping.dueDate}
              onClick={handleProceedToPreview}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
            >
              <span>Review Data</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: PREVIEW & CONFIRM */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 text-xs">
              <div>
                <span className="text-slate-500 block">Total Rows</span>
                <span className="text-sm font-bold text-slate-800 tabular-nums">
                  {validationResults.length}
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-500 block">Ready to Ingest</span>
                <span className="text-sm font-bold text-emerald-600 tabular-nums">
                  {validCount} Invoices
                </span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-slate-500 block">Import Value</span>
                <span className="text-sm font-bold text-indigo-600 tabular-nums">
                  {formatINR(totalImportAmount)}
                </span>
              </div>
              {invalidCount > 0 && (
                <div className="border-l border-slate-200 pl-4">
                  <span className="text-slate-500 block">Errors</span>
                  <span className="text-sm font-bold text-rose-600 tabular-nums">
                    {invalidCount}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={replaceExisting}
                  onChange={(e) => setReplaceExisting(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Replace current invoices</span>
              </label>

              <button
                onClick={() => setStep('mapping')}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white"
              >
                Back to Mapping
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={validCount === 0}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                <span>Commit {validCount} Invoices</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Row-by-Row Diagnostic Validation</span>
              <span className="text-slate-500 font-normal">
                {duplicateCount > 0 ? `${duplicateCount} duplicates detected` : 'No duplicate invoice collisions'}
              </span>
            </div>

            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-medium">
                    <th className="py-2.5 px-3">Row</th>
                    <th className="py-2.5 px-3">Invoice #</th>
                    <th className="py-2.5 px-3">Customer Name</th>
                    <th className="py-2.5 px-3 text-right">Amount (INR)</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Validation Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validationResults.map((result) => {
                    const inv = result.parsed;
                    return (
                      <tr
                        key={result.rowIndex}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          !result.isValid ? 'bg-rose-50/30' : result.isDuplicate ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 text-slate-400 tabular-nums">
                          #{result.rowIndex}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 font-mono">
                          {inv?.invoiceNumber || result.raw[mapping.invoiceNumber] || (
                            <span className="text-rose-500 font-sans">Missing #</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium max-w-xs truncate">
                          {inv?.customerName || result.raw[mapping.customerName] || (
                            <span className="text-rose-500">Missing Name</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-900">
                          {inv?.totalAmount !== undefined ? formatINR(inv.totalAmount) : (
                            <span className="text-rose-500 font-sans">
                              {result.raw[mapping.totalAmount] || 'Invalid'}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 tabular-nums">
                          {inv?.dueDate || result.raw[mapping.dueDate] || '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {inv?.status ? (
                            inv.status === 'overdue_45_plus' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-800">
                                45d+ Statutory
                              </span>
                            ) : inv.status === 'overdue_31_44' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900">
                                31-44d Cliff
                              </span>
                            ) : inv.status === 'overdue_0_30' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                                1-30d Overdue
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                                Current
                              </span>
                            )
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3">
                          {result.isValid ? (
                            <div className="flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>Valid</span>
                              {result.warnings.length > 0 && (
                                <span className="text-amber-600 font-normal ml-1">
                                  ({result.warnings[0]})
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-rose-600 text-[11px] space-y-0.5">
                              {result.errors.map((err, i) => (
                                <p key={i} className="flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 shrink-0" />
                                  <span>{err}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
