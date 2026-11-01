/**
 * ============================================================================
 * RecoverOS AI - Production SaaS Application Root
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Top-level application orchestrator for RecoverOS AI.
 * Coordinates:
 * - Multi-tenant workspace data state (invoices, payments, profile, audit trail).
 * - Synchronization across the REST backend (`/api/*`) and local browser storage.
 * - Navigation routing between Dashboard, Invoices Table, CSV Ingestion,
 *   Action Queue, Payment Receipts, and Settings.
 * - Modals for follow-up drafting, partial/full payment reconciliation, manual invoice entry,
 *   dispute tracking, and statutory compliance assistance.
 * 
 * DESIGN INTEGRITY:
 * - Zero fake data: production begins in a clean zero-state unless test fixtures are seeded.
 * - Human-in-the-loop: Follow-up messages require user confirmation before opening WhatsApp or email.
 * - Deterministic financial math: All metrics are derived from underlying invoice and payment records.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, NavigationTab } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { InvoiceTableView } from './components/InvoiceTableView';
import { CsvImportView } from './components/CsvImportView';
import { ActionQueueView } from './components/ActionQueueView';
import { RecoveryLogView } from './components/RecoveryLogView';
import { SettingsView } from './components/SettingsView';
import { ResearchView } from './components/ResearchView';
import { DraftModal } from './components/DraftModal';
import { MarkPaidModal } from './components/MarkPaidModal';
import { AddInvoiceModal } from './components/AddInvoiceModal';
import { ComplianceHelpModal } from './components/ComplianceHelpModal';

import { 
  Invoice, 
  BusinessProfile, 
  PaymentRecord, 
  RecoveryAction,
  AuditEvent 
} from './types';
import { storage } from './services/storageService';
import { api } from './services/apiService';
import { 
  computeAgingSummary, 
  generatePrioritizedActions,
  categorizeInvoiceAging,
  calculateDaysOverdue,
  evaluateMsmeStatutoryStatus,
  PeriodFilter
} from './utils/agingEngine';

export default function App() {
  const [initialLoaded, setInitialLoaded] = useState<boolean>(false);
  const [profile, setProfile] = useState<BusinessProfile>(() => storage.loadState().profile);
  const [invoices, setInvoices] = useState<Invoice[]>(() => storage.loadState().invoices);
  const [payments, setPayments] = useState<PaymentRecord[]>(() => storage.loadState().payments);
  const [auditLogs, setAuditLogs] = useState<AuditEvent[]>(() => storage.loadState().auditLogs);

  // Navigation & Filtering States
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [invoiceFilter, setInvoiceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [period, setPeriod] = useState<PeriodFilter>('mtd');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Active Modals
  const [draftTarget, setDraftTarget] = useState<{ invoice: Invoice; action?: RecoveryAction } | null>(null);
  const [markPaidTarget, setMarkPaidTarget] = useState<Invoice | null>(null);
  const [isAddInvoiceOpen, setIsAddInvoiceOpen] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Hydrate from backend API if available, else use storage
  useEffect(() => {
    async function hydrate() {
      const state = await api.loadWorkspace(storage.getWorkspaceId());
      if (state) {
        setProfile(state.profile);
        setInvoices(state.invoices);
        setPayments(state.payments);
        setAuditLogs(state.auditLogs);
      }
      setInitialLoaded(true);
    }
    hydrate();
  }, []);

  // Synchronize state with persistent storage on updates
  useEffect(() => {
    if (initialLoaded) {
      storage.saveInvoices(invoices);
    }
  }, [invoices, initialLoaded]);

  useEffect(() => {
    if (initialLoaded) {
      storage.savePayments(payments);
    }
  }, [payments, initialLoaded]);

  useEffect(() => {
    if (initialLoaded) {
      storage.saveProfile(profile);
    }
  }, [profile, initialLoaded]);

  // Compute deterministic summary and prioritized actions
  const summary = useMemo(() => computeAgingSummary(invoices, payments, period), [invoices, payments, period]);
  const prioritizedActions = useMemo(() => generatePrioritizedActions(invoices), [invoices]);

  const handleNavigateToInvoices = (filterName?: string) => {
    if (filterName) {
      setInvoiceFilter(filterName);
    }
    setCurrentTab('invoices');
  };

  // CSV Import Commit Handler
  const handleImportComplete = (importedInvoices: Invoice[], replaceExisting: boolean) => {
    let updatedInvoices: Invoice[];
    if (replaceExisting) {
      updatedInvoices = importedInvoices;
    } else {
      const existingMap = new Map(invoices.map((inv) => [inv.invoiceNumber.toUpperCase(), inv]));
      importedInvoices.forEach((inv) => existingMap.set(inv.invoiceNumber.toUpperCase(), inv));
      updatedInvoices = Array.from(existingMap.values());
    }

    setInvoices(updatedInvoices);
    api.bulkImportInvoices(storage.getWorkspaceId(), importedInvoices, replaceExisting);
    storage.recordAudit('invoice_created', `Imported ${importedInvoices.length} invoices via CSV engine`);
    setCurrentTab('invoices');
    setInvoiceFilter('all');
    showNotification(`Successfully ingested ${importedInvoices.length} invoices into active workspace.`);
  };

  // Payment Recording with Partial Payment Support
  const handleConfirmPayment = (record: PaymentRecord, paymentAmount: number) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === record.invoiceId || inv.invoiceNumber === record.invoiceNumber) {
          const newPaid = Math.round((inv.paidAmount + paymentAmount) * 100) / 100;
          const newBalance = Math.max(0, Math.round((inv.totalAmount - newPaid) * 100) / 100);
          const daysOverdue = calculateDaysOverdue(inv.dueDate);
          const status = categorizeInvoiceAging(inv.totalAmount, newPaid, daysOverdue, inv.status === 'disputed');
          const msmeStatus = evaluateMsmeStatutoryStatus(
            profile.isMsmeRegistered, 
            inv.isMsmeEligible, 
            daysOverdue, 
            status === 'paid',
            status === 'disputed'
          );

          return {
            ...inv,
            paidAmount: newPaid,
            balanceAmount: newBalance,
            status,
            msmeStatutoryStatus: msmeStatus,
          };
        }
        return inv;
      })
    );

    setPayments((prev) => [record, ...prev]);
    api.recordPayment(storage.getWorkspaceId(), record, paymentAmount);
    storage.recordAudit(
      'payment_recorded',
      `Recorded payment of ₹${paymentAmount.toLocaleString('en-IN')} (Ref: ${record.referenceNumber})`,
      record.invoiceNumber
    );
    setMarkPaidTarget(null);
    showNotification(`Payment recorded for ${record.customerName} (${record.invoiceNumber})`);
  };

  // Action Dispatched Handler (with contact update and follow-up tracking)
  const handleRecordActionDispatched = (
    invoice: Invoice, 
    channel: 'whatsapp' | 'email',
    updatedContact?: { phone?: string; email?: string }
  ) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          return {
            ...inv,
            customerPhone: updatedContact?.phone || inv.customerPhone,
            customerEmail: updatedContact?.email || inv.customerEmail,
            followUpCount: (inv.followUpCount || 0) + 1,
            lastFollowUpDate: new Date().toISOString().split('T')[0],
          };
        }
        return inv;
      })
    );

    storage.recordAudit(
      'channel_opened',
      `Opened ${channel === 'whatsapp' ? 'WhatsApp Web' : 'Email Client'} for follow-up draft`,
      invoice.invoiceNumber
    );
    showNotification(`Follow-up draft opened in ${channel === 'whatsapp' ? 'WhatsApp Web' : 'Email Client'}`);
    setDraftTarget(null);
  };

  // Update Invoice Details (Milestone, Due Date, Contacts, Notes)
  const handleSaveInvoice = (updated: Invoice) => {
    setInvoices((prev) => prev.map((inv) => (inv.id === updated.id ? updated : inv)));
    api.updateInvoice(storage.getWorkspaceId(), updated);
    storage.recordAudit('invoice_updated', `Updated invoice #${updated.invoiceNumber}`, updated.invoiceNumber);
    showNotification(`Invoice #${updated.invoiceNumber} updated.`);
  };

  // Dispute Management (Apply or Clear)
  const handleConfirmDispute = (invoice: Invoice, isDisputed: boolean, reason?: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invoice.id) {
          const daysOverdue = calculateDaysOverdue(inv.dueDate);
          const newStatus = isDisputed 
            ? 'disputed' 
            : categorizeInvoiceAging(inv.totalAmount, inv.paidAmount, daysOverdue, false);
          const newMsmeStatus = evaluateMsmeStatutoryStatus(
            profile.isMsmeRegistered,
            inv.isMsmeEligible,
            daysOverdue,
            newStatus === 'paid',
            isDisputed
          );
          return {
            ...inv,
            status: newStatus,
            msmeStatutoryStatus: newMsmeStatus,
            disputeReason: isDisputed ? reason : undefined,
          };
        }
        return inv;
      })
    );

    const auditType = isDisputed ? 'dispute_marked' : 'dispute_cleared';
    const desc = isDisputed 
      ? `Marked invoice #${invoice.invoiceNumber} in commercial dispute: ${reason}`
      : `Cleared commercial dispute on invoice #${invoice.invoiceNumber}`;
    storage.recordAudit(auditType, desc, invoice.invoiceNumber);
    showNotification(desc);
  };

  // Delete Invoice
  const handleDeleteInvoice = (invoice: Invoice) => {
    setInvoices((prev) => prev.filter((i) => i.id !== invoice.id));
    api.deleteInvoice(storage.getWorkspaceId(), invoice.id);
    storage.recordAudit('invoice_deleted', `Deleted invoice #${invoice.invoiceNumber}`, invoice.invoiceNumber);
    showNotification(`Invoice #${invoice.invoiceNumber} deleted.`);
  };

  // Add Single Invoice
  const handleAddInvoice = (newInv: Invoice) => {
    const exists = invoices.some((i) => i.invoiceNumber.toUpperCase() === newInv.invoiceNumber.toUpperCase());
    if (exists) {
      showNotification(`Invoice #${newInv.invoiceNumber} already exists in your workspace.`);
      return;
    }

    setInvoices((prev) => [newInv, ...prev]);
    api.createInvoice(storage.getWorkspaceId(), newInv);
    storage.recordAudit('invoice_created', `Created invoice #${newInv.invoiceNumber}`, newInv.invoiceNumber);
    setIsAddInvoiceOpen(false);
    showNotification(`Invoice ${newInv.invoiceNumber} added successfully.`);
  };

  // Save Profile
  const handleSaveProfile = (updated: BusinessProfile) => {
    setProfile(updated);
    api.saveProfile(storage.getWorkspaceId(), updated);

    // Recompute MSME statutory status across open invoices
    setInvoices((prev) =>
      prev.map((inv) => ({
        ...inv,
        isMsmeEligible: updated.isMsmeRegistered,
        msmeStatutoryStatus: evaluateMsmeStatutoryStatus(
          updated.isMsmeRegistered,
          updated.isMsmeRegistered,
          inv.daysOverdue,
          inv.status === 'paid',
          inv.status === 'disputed'
        ),
      }))
    );
    showNotification('Workspace profile and compliance settings updated.');
  };

  // Seed Demo Data for Testing
  const handleSeedDemoData = () => {
    const seeded = storage.seedDemoDataset();
    setProfile(seeded.profile);
    setInvoices(seeded.invoices);
    setPayments(seeded.payments);
    setAuditLogs(seeded.auditLogs);
    api.bulkImportInvoices(storage.getWorkspaceId(), seeded.invoices, true);
    api.saveProfile(storage.getWorkspaceId(), seeded.profile);
    showNotification('Loaded sample digital agency test fixtures (Studio Artix Pvt Ltd).');
  };

  // Clear All Workspace Data
  const handleClearAllData = () => {
    api.resetWorkspace(storage.getWorkspaceId());
    setInvoices([]);
    setPayments([]);
    setAuditLogs([]);
    showNotification('Workspace reset to clean zero-state.');
  };

  const activeViewTitleMap: Record<NavigationTab, string> = {
    dashboard: 'Dashboard',
    invoices: 'Invoices & Receivables',
    csv_import: 'CSV Ingestion Engine',
    actions: 'Action Queue',
    recovery_log: 'Payment Records',
    research: 'Legal & Market Dossier',
    settings: 'Settings & Profile',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 antialiased">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed top-20 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        profile={profile}
        activeViewTitle={activeViewTitleMap[currentTab]}
        searchQuery={searchQuery}
        onSearchChange={(q) => {
          setSearchQuery(q);
          if (currentTab !== 'invoices' && q.trim()) {
            setCurrentTab('invoices');
          }
        }}
        onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
        onOpenCsvImport={() => setCurrentTab('csv_import')}
        onOpenHelp={() => setIsHelpOpen(true)}
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      <div className="flex-1 flex">
        {/* Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={setCurrentTab}
          summary={summary}
          profile={profile}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <DashboardView
              summary={summary}
              profile={profile}
              prioritizedActions={prioritizedActions}
              invoices={invoices}
              period={period}
              onPeriodChange={setPeriod}
              onOpenDraft={(inv, act) => setDraftTarget({ invoice: inv, action: act })}
              onOpenMarkPaid={(inv) => setMarkPaidTarget(inv)}
              onNavigateToInvoices={handleNavigateToInvoices}
              onNavigateToCsv={() => setCurrentTab('csv_import')}
              onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
              onSeedDemoData={handleSeedDemoData}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          )}

          {currentTab === 'invoices' && (
            <InvoiceTableView
              invoices={invoices}
              payments={payments}
              profile={profile}
              initialFilter={invoiceFilter}
              searchQuery={searchQuery}
              onOpenDraft={(inv) => setDraftTarget({ invoice: inv })}
              onOpenMarkPaid={(inv) => setMarkPaidTarget(inv)}
              onOpenAddInvoice={() => setIsAddInvoiceOpen(true)}
              onOpenCsvImport={() => setCurrentTab('csv_import')}
              onSaveInvoice={handleSaveInvoice}
              onConfirmDispute={handleConfirmDispute}
              onDeleteInvoice={handleDeleteInvoice}
            />
          )}

          {currentTab === 'csv_import' && (
            <CsvImportView
              profile={profile}
              existingInvoices={invoices}
              onImportComplete={handleImportComplete}
              onCancel={() => setCurrentTab('dashboard')}
            />
          )}

          {currentTab === 'actions' && (
            <ActionQueueView
              actions={prioritizedActions}
              invoices={invoices}
              onOpenDraft={(inv, act) => setDraftTarget({ invoice: inv, action: act })}
              onOpenMarkPaid={(inv) => setMarkPaidTarget(inv)}
            />
          )}

          {currentTab === 'recovery_log' && (
            <RecoveryLogView
              logs={payments}
              onNavigateToInvoices={() => setCurrentTab('invoices')}
            />
          )}

          {currentTab === 'research' && (
            <ResearchView />
          )}

          {currentTab === 'settings' && (
            <SettingsView
              profile={profile}
              onSaveProfile={handleSaveProfile}
              onSeedDemoData={handleSeedDemoData}
              onClearAllData={handleClearAllData}
              onOpenHelp={() => setIsHelpOpen(true)}
            />
          )}
        </main>
      </div>

      {/* Global Modals */}
      {draftTarget && (
        <DraftModal
          invoice={draftTarget.invoice}
          profile={profile}
          initialAction={draftTarget.action}
          onClose={() => setDraftTarget(null)}
          onRecordActionDispatched={handleRecordActionDispatched}
        />
      )}

      {markPaidTarget && (
        <MarkPaidModal
          invoice={markPaidTarget}
          onClose={() => setMarkPaidTarget(null)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {isAddInvoiceOpen && (
        <AddInvoiceModal
          profile={profile}
          onClose={() => setIsAddInvoiceOpen(false)}
          onAddInvoice={handleAddInvoice}
        />
      )}

      {isHelpOpen && (
        <ComplianceHelpModal
          onClose={() => setIsHelpOpen(false)}
        />
      )}
    </div>
  );
}
