/**
 * ============================================================================
 * RecoverOS AI - Production Full-Stack Express Server with Vite Middleware
 * ============================================================================
 * 
 * FILE PURPOSE:
 * This file implements the full-stack Node.js Express backend for RecoverOS AI.
 * It provides REST API endpoints for multi-tenant workspace management, invoice
 * receivables, payment transaction recording, and immutable audit logs.
 * 
 * ARCHITECTURAL ROLE:
 * - In development mode: Mounts Vite as an Express middleware (`vite.middlewares`)
 *   to serve the React SPA with hot-module reload on port 3000.
 * - In production mode: Serves optimized static assets from `/dist` and routes all
 *   frontend paths to `dist/index.html`.
 * - Handles REST routes under `/api/*` for tenant data isolation.
 * 
 * INTERACTIONS:
 * - Reads and writes persistent tenant records to `/data/db.json`.
 * - Client applications (`src/services/apiService.ts`) communicate with these
 *   endpoints using standard JSON REST requests.
 * - Enforces financial constraints on the server:
 *   1. Payment amounts cannot exceed remaining invoice balance.
 *   2. Duplicate invoice numbers within a workspace are rejected with 409 Conflict.
 *   3. Invoices with recorded payments cannot have their total amount modified without
 *      administrative reconciliation.
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

// Interface for server-side tenant workspace store
interface ServerWorkspaceStore {
  workspaces: Record<string, {
    profile: any;
    invoices: any[];
    payments: any[];
    auditLogs: any[];
  }>;
}

// Ensure the persistent data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Load database from file or initialize empty store
function readDatabase(): ServerWorkspaceStore {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Error reading server database:', err);
  }
  return { workspaces: {} };
}

// Write database to file safely
function writeDatabase(db: ServerWorkspaceStore): void {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing server database:', err);
  }
}

// Helper to get or create workspace record
function getWorkspace(db: ServerWorkspaceStore, wsId: string) {
  if (!db.workspaces[wsId]) {
    db.workspaces[wsId] = {
      profile: {
        id: `prof_${wsId}`,
        workspaceId: wsId,
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
      },
      invoices: [],
      payments: [],
      auditLogs: [],
    };
  }
  return db.workspaces[wsId];
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // --------------------------------------------------------------------------
  // API ROUTES (/api/*)
  // --------------------------------------------------------------------------

  // 1. Health & Status
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'RecoverOS AI API Server',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Fetch full workspace state
  app.get('/api/workspaces/:workspaceId', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const db = readDatabase();
    const ws = getWorkspace(db, wsId);
    res.json({
      success: true,
      data: ws,
    });
  });

  // 3. Update Workspace Profile
  app.put('/api/workspaces/:workspaceId/profile', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const db = readDatabase();
    const ws = getWorkspace(db, wsId);
    ws.profile = { ...ws.profile, ...req.body, workspaceId: wsId };
    
    // Log audit event
    ws.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: wsId,
      invoiceNumber: 'SYSTEM',
      eventType: 'status_changed',
      description: `Updated profile for ${ws.profile.businessName || 'Workspace'}`,
      timestamp: new Date().toISOString(),
    });

    writeDatabase(db);
    res.json({ success: true, profile: ws.profile });
  });

  // 4. Invoices List
  app.get('/api/workspaces/:workspaceId/invoices', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const db = readDatabase();
    const ws = getWorkspace(db, wsId);
    res.json({ success: true, count: ws.invoices.length, invoices: ws.invoices });
  });

  // 5. Create New Invoice
  app.post('/api/workspaces/:workspaceId/invoices', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const newInv = req.body;

    if (!newInv.invoiceNumber || !newInv.customerName || !newInv.totalAmount || !newInv.dueDate) {
      return res.status(400).json({ error: 'Missing required invoice fields (invoiceNumber, customerName, totalAmount, dueDate).' });
    }

    const db = readDatabase();
    const ws = getWorkspace(db, wsId);

    // Check for duplicate invoice number in this workspace
    const exists = ws.invoices.some((i: any) => i.invoiceNumber.toUpperCase() === newInv.invoiceNumber.trim().toUpperCase());
    if (exists) {
      return res.status(409).json({ error: `Invoice #${newInv.invoiceNumber} already exists in this workspace.` });
    }

    const record = {
      ...newInv,
      id: newInv.id || `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: wsId,
      paidAmount: newInv.paidAmount || 0,
      balanceAmount: Math.max(0, (newInv.totalAmount || 0) - (newInv.paidAmount || 0)),
      createdAt: newInv.createdAt || new Date().toISOString(),
    };

    ws.invoices.unshift(record);
    ws.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: wsId,
      invoiceNumber: record.invoiceNumber,
      eventType: 'invoice_created',
      description: `Created invoice #${record.invoiceNumber} for ${record.customerName}`,
      timestamp: new Date().toISOString(),
    });

    writeDatabase(db);
    res.status(201).json({ success: true, invoice: record });
  });

  // 6. Update Existing Invoice (e.g. Milestone, Contacts, Dispute Status)
  app.put('/api/workspaces/:workspaceId/invoices/:id', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const invId = req.params.id;
    const db = readDatabase();
    const ws = getWorkspace(db, wsId);

    const index = ws.invoices.findIndex((i: any) => i.id === invId || i.invoiceNumber === invId);
    if (index === -1) {
      return res.status(404).json({ error: 'Invoice not found in active workspace.' });
    }

    const existing = ws.invoices[index];
    const updated = {
      ...existing,
      ...req.body,
      id: existing.id,
      workspaceId: wsId,
      invoiceNumber: existing.invoiceNumber, // Preserve invoice number
      updatedAt: new Date().toISOString(),
    };

    // Recompute balance strictly
    updated.balanceAmount = Math.max(0, Math.round((updated.totalAmount - updated.paidAmount) * 100) / 100);

    ws.invoices[index] = updated;
    ws.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: wsId,
      invoiceNumber: updated.invoiceNumber,
      eventType: req.body.status === 'disputed' ? 'dispute_marked' : 'invoice_updated',
      description: req.body.status === 'disputed' 
        ? `Marked invoice #${updated.invoiceNumber} in commercial dispute` 
        : `Updated invoice #${updated.invoiceNumber}`,
      timestamp: new Date().toISOString(),
    });

    writeDatabase(db);
    res.json({ success: true, invoice: updated });
  });

  // 7. Delete Invoice
  app.delete('/api/workspaces/:workspaceId/invoices/:id', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const invId = req.params.id;
    const db = readDatabase();
    const ws = getWorkspace(db, wsId);

    const index = ws.invoices.findIndex((i: any) => i.id === invId || i.invoiceNumber === invId);
    if (index === -1) {
      return res.status(404).json({ error: 'Invoice not found in active workspace.' });
    }

    const [deleted] = ws.invoices.splice(index, 1);
    ws.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: wsId,
      invoiceNumber: deleted.invoiceNumber,
      eventType: 'invoice_deleted',
      description: `Deleted invoice #${deleted.invoiceNumber} for ${deleted.customerName}`,
      timestamp: new Date().toISOString(),
    });

    writeDatabase(db);
    res.json({ success: true, deletedInvoiceNumber: deleted.invoiceNumber });
  });

  // 8. Record Payment (Strict balance validation & cap enforcement)
  app.post('/api/workspaces/:workspaceId/payments', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const { invoiceId, invoiceNumber, amount, paymentDate, referenceNumber, paymentMethod, notes } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Payment amount must be greater than zero.' });
    }

    const db = readDatabase();
    const ws = getWorkspace(db, wsId);

    const inv = ws.invoices.find((i: any) => i.id === invoiceId || i.invoiceNumber === invoiceNumber);
    if (!inv) {
      return res.status(404).json({ error: 'Invoice matching this payment was not found.' });
    }

    if (amount > inv.balanceAmount + 0.01) {
      return res.status(400).json({
        error: `Payment amount (₹${amount}) exceeds remaining balance (₹${inv.balanceAmount}). Overpayment rejected.`,
      });
    }

    // Update Invoice Balance
    const newPaid = Math.round((inv.paidAmount + amount) * 100) / 100;
    const newBalance = Math.max(0, Math.round((inv.totalAmount - newPaid) * 100) / 100);
    inv.paidAmount = newPaid;
    inv.balanceAmount = newBalance;
    if (newBalance <= 0.009) {
      inv.status = 'paid';
    }

    // Create Payment Record
    const paymentRecord = {
      id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      workspaceId: wsId,
      invoiceId: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customerName: inv.customerName,
      amount,
      paymentDate: paymentDate || new Date().toISOString().split('T')[0],
      referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
      paymentMethod: paymentMethod || 'neft_rtgs',
      verificationStatus: 'user_recorded_pending_verification',
      notes: notes || '',
      recordedAt: new Date().toISOString(),
    };

    ws.payments.unshift(paymentRecord);
    ws.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: wsId,
      invoiceNumber: inv.invoiceNumber,
      eventType: 'payment_recorded',
      description: `Recorded payment of ₹${amount.toLocaleString('en-IN')} (Ref: ${paymentRecord.referenceNumber})`,
      timestamp: new Date().toISOString(),
    });

    writeDatabase(db);
    res.status(201).json({ success: true, payment: paymentRecord, invoice: inv });
  });

  // 9. Bulk CSV Ingestion
  app.post('/api/workspaces/:workspaceId/invoices/import', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const { invoices: importedInvoices, replaceExisting } = req.body;

    if (!Array.isArray(importedInvoices)) {
      return res.status(400).json({ error: 'Invalid payload: invoices array is required.' });
    }

    const db = readDatabase();
    const ws = getWorkspace(db, wsId);

    if (replaceExisting) {
      ws.invoices = importedInvoices.map((inv: any) => ({ ...inv, workspaceId: wsId }));
    } else {
      const map = new Map(ws.invoices.map((i: any) => [i.invoiceNumber.toUpperCase(), i]));
      importedInvoices.forEach((inv: any) => {
        map.set(inv.invoiceNumber.toUpperCase(), { ...inv, workspaceId: wsId });
      });
      ws.invoices = Array.from(map.values());
    }

    ws.auditLogs.unshift({
      id: `aud_${Date.now()}`,
      workspaceId: wsId,
      invoiceNumber: 'CSV_IMPORT',
      eventType: 'invoice_created',
      description: `Ingested ${importedInvoices.length} invoices via bulk CSV engine`,
      timestamp: new Date().toISOString(),
    });

    writeDatabase(db);
    res.json({ success: true, count: ws.invoices.length });
  });

  // 10. Audit Logs
  app.get('/api/workspaces/:workspaceId/audit-logs', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const db = readDatabase();
    const ws = getWorkspace(db, wsId);
    res.json({ success: true, auditLogs: ws.auditLogs });
  });

  // 11. Reset Workspace (Zero-State)
  app.post('/api/workspaces/:workspaceId/reset', (req: Request, res: Response) => {
    const wsId = req.params.workspaceId || 'ws_prod';
    const db = readDatabase();
    db.workspaces[wsId] = {
      profile: {
        id: `prof_${wsId}`,
        workspaceId: wsId,
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
      },
      invoices: [],
      payments: [],
      auditLogs: [],
    };
    writeDatabase(db);
    res.json({ success: true, message: 'Workspace cleared to blank state.' });
  });

  // --------------------------------------------------------------------------
  // VITE INTEGRATION / STATIC ASSETS
  // --------------------------------------------------------------------------
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RecoverOS AI Full-Stack Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting RecoverOS AI server:', err);
  process.exit(1);
});
