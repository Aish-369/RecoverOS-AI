/**
 * ============================================================================
 * RecoverOS AI - Client API Integration Service
 * ============================================================================
 * 
 * FILE PURPOSE:
 * Bridges the React frontend with the Express REST API (`/server.ts`).
 * Ensures dual-tier resilience:
 * 1. Primary Tier: Real REST API calls to `/api/workspaces/:workspaceId/*`.
 * 2. Secondary Tier (Offline / Browser Cache): Falls back gracefully to `storageService.ts`
 *    if the network or server process is unreachable.
 * 
 * ARCHITECTURAL ROLE:
 * - Abstract data transport so UI components don't deal with HTTP status codes or serialization.
 * - Enforces zero fake-data policy: All responses reflect persisted disk or local storage state.
 */

import { Invoice, BusinessProfile, PaymentRecord, AuditEvent } from '../types';
import { storage, WorkspaceState } from './storageService';

class ApiService {
  private isServerHealthy: boolean = false;

  constructor() {
    this.checkHealth();
  }

  /**
   * Pings the server health endpoint to determine if backend REST API is available.
   */
  public async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        this.isServerHealthy = true;
        return true;
      }
    } catch {
      this.isServerHealthy = false;
    }
    return false;
  }

  public getServerStatus(): boolean {
    return this.isServerHealthy;
  }

  /**
   * Loads initial workspace state.
   */
  public async loadWorkspace(workspaceId: string = 'ws_prod'): Promise<WorkspaceState> {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          this.isServerHealthy = true;
          // Synchronize to localStorage for offline cache
          storage.saveProfile(json.data.profile);
          storage.saveInvoices(json.data.invoices);
          storage.savePayments(json.data.payments);
          return {
            workspaceId,
            profile: json.data.profile,
            invoices: json.data.invoices,
            payments: json.data.payments,
            auditLogs: json.data.auditLogs || [],
          };
        }
      }
    } catch (err) {
      console.warn('Backend server unreachable, using local persistent storage tier.', err);
    }

    // Graceful offline fallback
    this.isServerHealthy = false;
    return storage.loadState();
  }

  /**
   * Persists updated business profile.
   */
  public async saveProfile(workspaceId: string, profile: BusinessProfile): Promise<void> {
    storage.saveProfile(profile);
    try {
      await fetch(`/api/workspaces/${workspaceId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile),
      });
    } catch (err) {
      console.warn('Could not sync profile to backend:', err);
    }
  }

  /**
   * Creates a single invoice record.
   */
  public async createInvoice(workspaceId: string, invoice: Invoice): Promise<void> {
    try {
      await fetch(`/api/workspaces/${workspaceId}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });
    } catch (err) {
      console.warn('Could not sync created invoice to backend:', err);
    }
  }

  /**
   * Updates an invoice record.
   */
  public async updateInvoice(workspaceId: string, invoice: Invoice): Promise<void> {
    try {
      await fetch(`/api/workspaces/${workspaceId}/invoices/${invoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice),
      });
    } catch (err) {
      console.warn('Could not sync updated invoice to backend:', err);
    }
  }

  /**
   * Deletes an invoice record.
   */
  public async deleteInvoice(workspaceId: string, invoiceId: string): Promise<void> {
    try {
      await fetch(`/api/workspaces/${workspaceId}/invoices/${invoiceId}`, {
        method: 'DELETE',
      });
    } catch (err) {
      console.warn('Could not sync deleted invoice to backend:', err);
    }
  }

  /**
   * Records a payment remittance.
   */
  public async recordPayment(
    workspaceId: string, 
    record: PaymentRecord, 
    amount: number
  ): Promise<void> {
    try {
      await fetch(`/api/workspaces/${workspaceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...record,
          amount,
        }),
      });
    } catch (err) {
      console.warn('Could not sync payment to backend:', err);
    }
  }

  /**
   * Bulk imports invoices from CSV parsing.
   */
  public async bulkImportInvoices(
    workspaceId: string, 
    invoices: Invoice[], 
    replaceExisting: boolean
  ): Promise<void> {
    try {
      await fetch(`/api/workspaces/${workspaceId}/invoices/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoices, replaceExisting }),
      });
    } catch (err) {
      console.warn('Could not sync CSV import to backend:', err);
    }
  }

  /**
   * Clears workspace to zero state.
   */
  public async resetWorkspace(workspaceId: string): Promise<void> {
    storage.clearWorkspace();
    try {
      await fetch(`/api/workspaces/${workspaceId}/reset`, {
        method: 'POST',
      });
    } catch (err) {
      console.warn('Could not sync reset to backend:', err);
    }
  }
}

export const api = new ApiService();
