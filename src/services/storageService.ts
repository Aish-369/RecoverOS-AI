/**
 * ============================================================================
 * RecoverOS AI - Persistent Storage & Multi-Tenant Workspace Service
 * ============================================================================
 * 
 * PURPOSE OF THIS FILE:
 * This service manages data persistence and multi-tenant partitioning for the
 * browser environment. In commercial SaaS, client data must be strictly isolated
 * by `workspaceId` so that one company never accesses another company's records.
 * 
 * MULTI-TENANT ISOLATION ARCHITECTURE:
 * Every data key in `localStorage` is scoped by the workspace identifier:
 *   `recoveros_v1_${workspaceId}_invoices`
 *   `recoveros_v1_${workspaceId}_payments`
 *   `recoveros_v1_${workspaceId}_audit`
 *   `recoveros_v1_${workspaceId}_profile`
 * When switching or provisioning workspaces, the service reads and writes only
 * within that specific tenant's key prefix.
 * 
 * WHY PRODUCTION WORKSPACES START EMPTY:
 * In a real SaaS product, when a customer signs up, their database must start
 * completely empty so they can import their own real financial records. Demo data
 * (like Studio Artix Pvt Ltd) is provided strictly as an opt-in seed method
 * (`seedDemoDataset`) for testing or sandboxing.
 * 
 * ARCHITECTURAL CONNECTIONS:
 * - Used by `src/App.tsx` on application startup to load existing records.
 * - Called automatically whenever invoices are imported or payments are recorded.
 * - Mirrors the PostgreSQL / Supabase table architecture defined in `/supabase/schema.sql`.
 */

import { Invoice, PaymentRecord, AuditEvent, BusinessProfile } from '../types';
import { calculateDaysOverdue, categorizeInvoiceAging, evaluateMsmeStatutoryStatus } from '../utils/agingEngine';

const STORAGE_PREFIX = 'recoveros_v1_';

export interface WorkspaceState {
  workspaceId: string;
  profile: BusinessProfile;
  invoices: Invoice[];
  payments: PaymentRecord[];
  auditLogs: AuditEvent[];
}

export const DEFAULT_BLANK_PROFILE: BusinessProfile = {
  id: 'profile_default',
  workspaceId: 'ws_prod',
  businessName: '',
  entityType: 'B2B Consultancy / Agency',
  gstin: '',
  msmeRegistrationNumber: '',
  isMsmeRegistered: false,
  standardPaymentTermDays: 30,
  upiId: '',
  contactPerson: '',
  email: '',
  phone: '',
};

export class StorageService {
  private workspaceId: string;

  constructor(workspaceId: string = 'ws_prod') {
    this.workspaceId = workspaceId;
  }

  public setWorkspaceId(newWsId: string) {
    this.workspaceId = newWsId;
  }

  public getWorkspaceId(): string {
    return this.workspaceId;
  }

  /**
   * Generates a tenant-scoped storage key.
   * Format: `recoveros_v1_<workspaceId>_<collection>`
   */
  private getKey(collection: string): string {
    return `${STORAGE_PREFIX}${this.workspaceId}_${collection}`;
  }

  /**
   * Loads complete workspace state from storage.
   * Recomputes aging statuses dynamically on load to reflect the current calendar day!
   */
  public loadState(): WorkspaceState {
    try {
      const profileStr = localStorage.getItem(this.getKey('profile'));
      const invoicesStr = localStorage.getItem(this.getKey('invoices'));
      const paymentsStr = localStorage.getItem(this.getKey('payments'));
      const auditStr = localStorage.getItem(this.getKey('audit'));

      const profile: BusinessProfile = profileStr 
        ? JSON.parse(profileStr) 
        : { ...DEFAULT_BLANK_PROFILE, workspaceId: this.workspaceId };

      let invoices: Invoice[] = invoicesStr ? JSON.parse(invoicesStr) : [];
      const payments: PaymentRecord[] = paymentsStr ? JSON.parse(paymentsStr) : [];
      const auditLogs: AuditEvent[] = auditStr ? JSON.parse(auditStr) : [];

      // DYNAMIC CALENDAR RE-CALCULATION:
      // If a user re-opens the app 3 days later, due dates have aged by 3 days!
      // We re-evaluate daysOverdue and aging categories on every load.
      invoices = invoices.map((inv) => {
        const daysOverdue = calculateDaysOverdue(inv.dueDate);
        const status = categorizeInvoiceAging(inv.totalAmount, inv.paidAmount, daysOverdue, inv.status === 'disputed');
        const msmeStatus = evaluateMsmeStatutoryStatus(
          profile.isMsmeRegistered, 
          inv.isMsmeEligible, 
          daysOverdue, 
          status === 'paid',
          status === 'disputed'
        );
        return {
          ...inv,
          daysOverdue,
          status,
          msmeStatutoryStatus: msmeStatus,
        };
      });

      return {
        workspaceId: this.workspaceId,
        profile,
        invoices,
        payments,
        auditLogs,
      };
    } catch (err) {
      console.error('Failed to load workspace state from storage:', err);
      return {
        workspaceId: this.workspaceId,
        profile: { ...DEFAULT_BLANK_PROFILE, workspaceId: this.workspaceId },
        invoices: [],
        payments: [],
        auditLogs: [],
      };
    }
  }

  /**
   * Saves updated company profile to storage.
   */
  public saveProfile(profile: BusinessProfile): void {
    localStorage.setItem(this.getKey('profile'), JSON.stringify(profile));
    this.recordAudit('status_changed', `Updated business profile: ${profile.businessName || 'Unnamed'}`);
  }

  /**
   * Saves active invoices array to storage.
   */
  public saveInvoices(invoices: Invoice[]): void {
    localStorage.setItem(this.getKey('invoices'), JSON.stringify(invoices));
  }

  /**
   * Saves payment records to storage.
   */
  public savePayments(payments: PaymentRecord[]): void {
    localStorage.setItem(this.getKey('payments'), JSON.stringify(payments));
  }

  /**
   * Records an immutable audit event into the tenant's audit trail.
   * In commercial SaaS, audit logs provide proof of who did what and when.
   */
  public recordAudit(
    eventType: AuditEvent['eventType'],
    description: string,
    invoiceNumber: string = 'SYSTEM'
  ): AuditEvent {
    try {
      const auditStr = localStorage.getItem(this.getKey('audit'));
      const list: AuditEvent[] = auditStr ? JSON.parse(auditStr) : [];
      const newEvent: AuditEvent = {
        id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        workspaceId: this.workspaceId,
        invoiceNumber,
        eventType,
        description,
        timestamp: new Date().toISOString(),
      };
      list.unshift(newEvent); // Place newest at beginning
      // Keep up to 500 audit entries per workspace
      if (list.length > 500) list.pop();
      localStorage.setItem(this.getKey('audit'), JSON.stringify(list));
      return newEvent;
    } catch (err) {
      console.error('Failed to record audit event:', err);
      return {
        id: 'aud_err',
        workspaceId: this.workspaceId,
        invoiceNumber,
        eventType,
        description,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clears all stored data for this workspace.
   */
  public clearWorkspace(): void {
    localStorage.removeItem(this.getKey('profile'));
    localStorage.removeItem(this.getKey('invoices'));
    localStorage.removeItem(this.getKey('payments'));
    localStorage.removeItem(this.getKey('audit'));
  }

  /**
   * Seeds realistic sample testing data for Studio Artix Pvt Ltd.
   * This is strictly user-initiated for developers/testers to evaluate the product.
   */
  public seedDemoDataset(): WorkspaceState {
    const profile: BusinessProfile = {
      id: `prof_${this.workspaceId}`,
      workspaceId: this.workspaceId,
      businessName: 'Studio Artix Pvt Ltd',
      entityType: 'B2B Digital Agency & Tech Consultancy',
      gstin: '29AABCU9603R1ZX',
      msmeRegistrationNumber: 'UDYAM-KR-03-0098412',
      isMsmeRegistered: true,
      standardPaymentTermDays: 30,
      upiId: 'studioartix@icici',
      contactPerson: 'Amitabh Sen',
      email: 'amit@studioartix.design',
      phone: '+91 98450 11223',
    };

    const invoices: Invoice[] = [
      {
        id: `inv_${this.workspaceId}_01`,
        workspaceId: this.workspaceId,
        invoiceNumber: 'ARTX-2024-089',
        customerName: 'Apex Retail Solutions Pvt Ltd',
        customerEmail: 'finance@apexretail.in',
        customerPhone: '+91 98201 12345',
        issueDate: '2026-08-18',
        dueDate: '2026-09-17',
        totalAmount: 340000,
        paidAmount: 0,
        balanceAmount: 340000,
        status: 'overdue_31_44',
        daysOverdue: calculateDaysOverdue('2026-09-17'),
        isMsmeEligible: true,
        msmeStatutoryStatus: 'approaching_deadline',
        projectMilestone: 'D2C Mobile App Redesign & Design System',
        notes: 'PO #APX-PO-881. Client accounts requested minor GST clarification.',
        isDemoData: true,
        createdAt: '2026-08-18T10:00:00Z',
      },
      {
        id: `inv_${this.workspaceId}_02`,
        workspaceId: this.workspaceId,
        invoiceNumber: 'ARTX-2024-094',
        customerName: 'Zenora Health Labs',
        customerEmail: 'payments@zenorahealth.com',
        customerPhone: '+91 98450 67890',
        issueDate: '2026-09-11',
        dueDate: '2026-10-11',
        totalAmount: 185000,
        paidAmount: 0,
        balanceAmount: 185000,
        status: 'overdue_0_30',
        daysOverdue: calculateDaysOverdue('2026-10-11'),
        isMsmeEligible: true,
        msmeStatutoryStatus: 'within_statutory_limit',
        projectMilestone: 'Diagnostic Portal UI/UX & Web Accessibility Audit',
        notes: 'Deliverables accepted by Product Head.',
        isDemoData: true,
        createdAt: '2026-09-11T11:00:00Z',
      },
      {
        id: `inv_${this.workspaceId}_03`,
        workspaceId: this.workspaceId,
        invoiceNumber: 'ARTX-2024-071',
        customerName: 'Horizon FinTech India Ltd',
        customerEmail: 'vendor.desk@horizonfintech.io',
        customerPhone: '+91 99001 54321',
        issueDate: '2026-07-15',
        dueDate: '2026-08-14',
        totalAmount: 620000,
        paidAmount: 120000,
        balanceAmount: 500000,
        status: 'overdue_45_plus',
        daysOverdue: calculateDaysOverdue('2026-08-14'),
        isMsmeEligible: true,
        msmeStatutoryStatus: 'statutory_breach',
        projectMilestone: 'Wealth Management Mobile App Front-end Architecture',
        notes: 'Partially settled. Final milestone delayed.',
        isDemoData: true,
        createdAt: '2026-07-15T09:30:00Z',
      },
      {
        id: `inv_${this.workspaceId}_04`,
        workspaceId: this.workspaceId,
        invoiceNumber: 'ARTX-2024-102',
        customerName: 'CloudForge Technologies LLP',
        customerEmail: 'billing@cloudforge.tech',
        customerPhone: '+91 97110 99887',
        issueDate: '2026-09-24',
        dueDate: '2026-10-24',
        totalAmount: 275000,
        paidAmount: 0,
        balanceAmount: 275000,
        status: 'overdue_0_30',
        daysOverdue: calculateDaysOverdue('2026-10-24'),
        isMsmeEligible: true,
        msmeStatutoryStatus: 'within_statutory_limit',
        projectMilestone: 'Kubernetes Monitoring Dashboard Design & Prototypes',
        notes: 'First invoice under new master services agreement.',
        isDemoData: true,
        createdAt: '2026-09-24T14:15:00Z',
      },
      {
        id: `inv_${this.workspaceId}_05`,
        workspaceId: this.workspaceId,
        invoiceNumber: 'ARTX-2024-110',
        customerName: 'Vivid Brands Marketing',
        customerEmail: 'admin@vividbrands.in',
        customerPhone: '+91 98112 33445',
        issueDate: '2026-10-15',
        dueDate: '2026-11-15',
        totalAmount: 120000,
        paidAmount: 0,
        balanceAmount: 120000,
        status: 'current',
        daysOverdue: calculateDaysOverdue('2026-11-15'),
        isMsmeEligible: true,
        msmeStatutoryStatus: 'within_statutory_limit',
        projectMilestone: 'Brand Identity Guidelines & 3D Interactive Assets',
        notes: 'Balance due upon final delivery.',
        isDemoData: true,
        createdAt: '2026-10-15T16:00:00Z',
      }
    ];

    const payments: PaymentRecord[] = [
      {
        id: `pay_${this.workspaceId}_01`,
        workspaceId: this.workspaceId,
        invoiceId: `inv_${this.workspaceId}_03`,
        invoiceNumber: 'ARTX-2024-071',
        customerName: 'Horizon FinTech India Ltd',
        amount: 120000,
        paymentDate: '2026-10-04',
        referenceNumber: 'HDFC0098172648',
        paymentMethod: 'neft_rtgs',
        verificationStatus: 'user_recorded_pending_verification',
        notes: 'Initial milestone partial payment received via NEFT.',
        recordedAt: '2026-10-04T14:30:00Z',
      }
    ];

    const auditLogs: AuditEvent[] = [
      {
        id: 'aud_seed_01',
        workspaceId: this.workspaceId,
        invoiceNumber: 'ARTX-2024-071',
        eventType: 'payment_recorded',
        description: 'Recorded partial payment of ₹1,20,000 (Ref: HDFC0098172648)',
        timestamp: '2026-10-04T14:30:00Z',
      },
      {
        id: 'aud_seed_02',
        workspaceId: this.workspaceId,
        invoiceNumber: 'SYSTEM',
        eventType: 'invoice_created',
        description: 'Loaded sample digital agency testing fixtures for Studio Artix Pvt Ltd',
        timestamp: new Date().toISOString(),
      }
    ];

    this.saveProfile(profile);
    this.saveInvoices(invoices);
    this.savePayments(payments);
    localStorage.setItem(this.getKey('audit'), JSON.stringify(auditLogs));

    return {
      workspaceId: this.workspaceId,
      profile,
      invoices,
      payments,
      auditLogs,
    };
  }
}

export const storage = new StorageService('ws_main');
