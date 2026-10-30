/**
 * RecoverOS AI - Seed Demo Dataset for Studio Artix Pvt Ltd
 * 
 * Target Persona: Indian Digital Agency & B2B IT Consultancy
 * Location: Indiranagar, Bengaluru, Karnataka
 * Registered MSME: UDYAM-KR-03-0098412 (Micro Enterprise)
 * GSTIN: 29AABCU9603R1ZX
 * 
 * Every record is explicitly tagged with `isDemoData: true`.
 */

import { Invoice, BusinessProfile, RecoveryLogItem } from '../types';
import { calculateDaysOverdue, categorizeInvoiceAging, evaluateMsmeStatutoryStatus } from '../utils/agingEngine';

export const DEMO_PROFILE: BusinessProfile = {
  id: 'prof_demo',
  workspaceId: 'ws_demo',
  businessName: 'Studio Artix Pvt Ltd',
  entityType: 'Private Limited Company (B2B Digital Agency)',
  gstin: '29AABCU9603R1ZX',
  msmeRegistrationNumber: 'UDYAM-KR-03-0098412',
  isMsmeRegistered: true,
  standardPaymentTermDays: 30,
  upiId: 'studioartix@icici',
  contactPerson: 'Amitabh Sen (Director - Finance & Ops)',
  email: 'amit@studioartix.design',
  phone: '+91 98450 11223'
};

const rawDemoInvoices = [
  {
    id: 'demo_inv_01',
    invoiceNumber: 'ARTX-2024-089',
    customerName: 'Apex Retail Solutions Pvt Ltd',
    customerEmail: 'finance@apexretail.in',
    customerPhone: '+91 98201 12345',
    issueDate: '2026-08-18',
    dueDate: '2026-09-17', // ~42 days overdue as of late Oct 2026 -> Approaching 45d 43B(h) cliff!
    totalAmount: 340000,
    paidAmount: 0,
    projectMilestone: 'D2C E-commerce Mobile App Redesign & Design System',
    notes: 'PO #APX-PO-881. Client accounts team requested minor GST reconciliation.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_02',
    invoiceNumber: 'ARTX-2024-094',
    customerName: 'Zenora Health Labs',
    customerEmail: 'payments@zenorahealth.com',
    customerPhone: '+91 98450 67890',
    issueDate: '2026-09-11',
    dueDate: '2026-10-11', // ~18 days overdue -> 0-30 day bucket
    totalAmount: 185000,
    paidAmount: 0,
    projectMilestone: 'Diagnostic Portal UI/UX & Web Accessibility Audit',
    notes: 'Deliverables accepted by Product Head. Awaiting VP sign-off.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_03',
    invoiceNumber: 'ARTX-2024-071',
    customerName: 'Horizon FinTech India Ltd',
    customerEmail: 'vendor.desk@horizonfintech.io',
    customerPhone: '+91 99001 54321',
    issueDate: '2026-07-15',
    dueDate: '2026-08-14', // ~76 days overdue -> 45+ days Statutory Breach
    totalAmount: 620000,
    paidAmount: 120000, // partially paid, balance 500,000
    projectMilestone: 'Wealth Management Mobile App Front-end Architecture',
    notes: 'Initial milestone cleared. Final milestone delayed due to client restructuring.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_04',
    invoiceNumber: 'ARTX-2024-102',
    customerName: 'CloudForge Technologies LLP',
    customerEmail: 'billing@cloudforge.tech',
    customerPhone: '+91 97110 99887',
    issueDate: '2026-09-24',
    dueDate: '2026-10-24', // ~5 days overdue -> 0-30 day bucket
    totalAmount: 275000,
    paidAmount: 0,
    projectMilestone: 'Kubernetes Monitoring Dashboard Design & Prototypes',
    notes: 'First invoice under new master services agreement.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_05',
    invoiceNumber: 'ARTX-2024-110',
    customerName: 'Vivid Brands Marketing',
    customerEmail: 'admin@vividbrands.in',
    customerPhone: '+91 98112 33445',
    issueDate: '2026-10-15',
    dueDate: '2026-11-15', // Due in future -> Current (not overdue)
    totalAmount: 120000,
    paidAmount: 0,
    projectMilestone: 'Brand Identity Guidelines & 3D Interactive Assets',
    notes: 'Advance 50% paid earlier; this is balance on delivery.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_06',
    invoiceNumber: 'ARTX-2024-114',
    customerName: 'Kaveri Industrial Components',
    customerEmail: 'accounts@kaveri-ind.com',
    customerPhone: '+91 94480 11990',
    issueDate: '2026-10-20',
    dueDate: '2026-11-20', // Due in future -> Current
    totalAmount: 490000,
    paidAmount: 0,
    projectMilestone: 'B2B Wholesale Catalog Web Portal Development',
    notes: 'SOW signed Oct 10. Sprint 1 completed.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_07',
    invoiceNumber: 'ARTX-2024-065',
    customerName: 'Orbit Logistics India',
    customerEmail: 'payments@orbitlogistics.in',
    customerPhone: '+91 98765 00001',
    issueDate: '2026-07-01',
    dueDate: '2026-08-01',
    totalAmount: 450000,
    paidAmount: 450000, // Fully Paid!
    projectMilestone: 'Fleet Tracking Telemetry Dashboard Frontend',
    notes: 'Recovered via RecoverOS AI WhatsApp follow-up. UTR #HDFC00981726.',
    isMsmeEligible: true,
  },
  {
    id: 'demo_inv_08',
    invoiceNumber: 'ARTX-2024-058',
    customerName: 'Starlight Media Studios',
    customerEmail: 'billing@starlightmedia.tv',
    customerPhone: '+91 98330 44556',
    issueDate: '2026-06-20',
    dueDate: '2026-07-20',
    totalAmount: 170000,
    paidAmount: 170000, // Fully Paid!
    projectMilestone: 'OTT Streaming Video Player Component Suite',
    notes: 'Recovered after Section 43B(h) tax disallowance reminder. Ref #AXIS77123.',
    isMsmeEligible: true,
  }
];

export function getInitialDemoInvoices(): Invoice[] {
  return rawDemoInvoices.map((item, idx) => {
    const daysOverdue = calculateDaysOverdue(item.dueDate);
    const balanceAmount = Math.max(0, item.totalAmount - item.paidAmount);
    const status = categorizeInvoiceAging(item.totalAmount, item.paidAmount, daysOverdue);
    const msmeStatus = evaluateMsmeStatutoryStatus(DEMO_PROFILE.isMsmeRegistered, item.isMsmeEligible, daysOverdue, status === 'paid', false);

    return {
      id: item.id,
      workspaceId: 'ws_demo',
      invoiceNumber: item.invoiceNumber,
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      customerPhone: item.customerPhone,
      issueDate: item.issueDate,
      dueDate: item.dueDate,
      totalAmount: item.totalAmount,
      paidAmount: item.paidAmount,
      balanceAmount,
      status,
      daysOverdue,
      isMsmeEligible: item.isMsmeEligible,
      msmeStatutoryStatus: msmeStatus,
      projectMilestone: item.projectMilestone,
      notes: item.notes,
      isDemoData: true,
      createdAt: new Date(Date.now() - (idx * 3) * 86400000).toISOString(),
    };
  });
}

export const INITIAL_RECOVERY_LOG: RecoveryLogItem[] = [
  {
    id: 'log_01',
    workspaceId: 'ws_demo',
    invoiceId: 'demo_inv_07',
    invoiceNumber: 'ARTX-2024-065',
    customerName: 'Orbit Logistics India',
    amount: 450000,
    paymentDate: '2026-10-04',
    referenceNumber: 'HDFC0098172648',
    paymentMethod: 'neft_rtgs',
    verificationStatus: 'user_recorded_pending_verification',
    notes: 'Payment credited to HDFC Current A/c after WhatsApp check-in with CFO.',
    recordedAt: '2026-10-04T14:30:00Z',
  },
  {
    id: 'log_02',
    workspaceId: 'ws_demo',
    invoiceId: 'demo_inv_08',
    invoiceNumber: 'ARTX-2024-058',
    customerName: 'Starlight Media Studios',
    amount: 170000,
    paymentDate: '2026-10-18',
    referenceNumber: 'AXIS7712399012',
    paymentMethod: 'upi',
    verificationStatus: 'user_recorded_pending_verification',
    notes: 'Settled via ICICI UPI handle after Section 43B(h) reminder.',
    recordedAt: '2026-10-18T11:15:00Z',
  }
];
