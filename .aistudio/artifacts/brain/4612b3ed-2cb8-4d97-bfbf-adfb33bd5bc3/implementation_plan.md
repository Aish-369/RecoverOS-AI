# RecoverOS AI — Revenue Recovery Copilot for Indian B2B SMBs

A clean, production-grade, zero-risk revenue recovery copilot for Indian digital agencies and B2B IT consultancies. Automatically ingests invoice CSVs, computes deterministic aging intervals and MSMED Section 43B(h) tax disallowance deadlines, prioritizes actionable follow-ups, and generates tailored multi-channel drafts with mandatory human approval.

> [!IMPORTANT]
> **Confirmed User Decisions (Phase 1):**
> 1. **Immediate Focus:** Prioritize building the robust CSV Data Import Engine and Deterministic Aging Engine first, seamlessly connected with the interactive dashboard, invoice management, and prioritized recommendations.
> 2. **Target SME Cohort:** Default demo data represents an Indian Digital Agency & B2B IT Consultancy (Studio Artix Pvt Ltd, handling client retainers, UI/UX contracts, dev milestones, and enterprise overdue payments in INR).
> 3. **Design System:** Soft indigo (`#6366F1`), light background (`#F8FAFC`), crisp white cards (`#FFFFFF`), lavender accents (`#EEF2FF`), clear status badges (green, amber, rose), tabular numerals, and zero AI slop.

---

## 1. Overview & Core Concept

* **The Problem:** Indian agencies and B2B consultancies experience an average Days Sales Outstanding (DSO) of 65–85 days. Chasing clients manually feels awkward and strains relationships, while rigid automated bots spam clients and damage trust. Furthermore, the new **Section 43B(h) of the Income Tax Act** mandates that payments to registered MSMEs beyond 45 days cannot be deducted as business expenses until paid, creating an urgent regulatory clock.
* **The Solution:** RecoverOS AI acts as an intelligent, human-supervised copilot:
  - **DETECT:** Ingest CSV exports from Tally, Zoho Books, QuickBooks, or custom spreadsheets with auto-column mapping.
  - **PRIORITIZE:** Deterministically calculate invoice aging, days overdue, outstanding balance, and Section 43B(h) tax penalty proximity.
  - **RECOMMEND & DRAFT:** Formulate tone-calibrated follow-up copy (Gentle Reminder, Firm Accounting Nudge, Statutory MSME 43B(h) Notice).
  - **APPROVE & EXECUTE:** Human reviews and approves with 1-click WhatsApp Web launch or clipboard email copy.
  - **VERIFY:** Record bank-reconciled receipts and measure DSO recovery without vanity claims.

---

## 2. User Experience & Visual Design

### Design Tokens & Visual Hierarchy
* **Dominant Canvas (60%):** Off-white `#F8FAFC`, dark text `#1E293B`, muted typography `#64748B`.
* **Structural Surfaces (30%):** Pure white `#FFFFFF` surface cards with subtle hairline borders (`border border-slate-200/80`), single-level elevation, and clean divider rules.
* **Accent & Actions (10%):** Soft indigo `#6366F1` and lavender `#EEF2FF` for active states, primary CTAs, and selected tab segments.
* **Semantic States:**
  - *Current / On-time:* Soft green tint (`#DCFCE7` text `#15803D`).
  - *Approaching 45d / Warning:* Soft amber tint (`#FEF3C7` text `#B45309`).
  - *Critical Overdue (>45d):* Soft rose tint (`#FFE4E6` text `#BE123C`).
* **Typography:** `Plus Jakarta Sans` for headers and interface labels; `font-mono tabular-nums` for all invoice amounts, dates, and days overdue.
* **Anti-Slop Discipline:** No pill badge sandwiches, no fake `// 01` comment headings, no fake telemetry tickers, and no decorative animated pulsing dots.

### Screen Structure & Navigation (10 Core Views)
```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [RecoverOS AI Wordmark]      [Search invoices / buyers...]      [Bell (3)]   [Agency Profile]│
├─────────────────┬──────────────────────────────────────────────────────────────────────┤
│ 📊 Dashboard    │  Header: Welcome back, Studio Artix Pvt Ltd · ₹18.4L Receivables      │
│ 📥 CSV Import   │  Metrics: [₹24.8L Outstanding] [14 Overdue] [8 Due Today] [₹6.2L MTD]│
│ 📑 Invoices     ├──────────────────────────────────────────────────────────────────────┤
│ ⚡ AI Actions   │  PRIORITIZED ACTION QUEUE (Human Approval Required)                  │
│ 💬 Drafts       │  • Apex Retail (₹3.4L · 42d overdue) ⚠️ Section 43B(h) Deadline      │
│ 🎯 Leads/Quotes │  • Zenora Labs (₹1.8L · 18d overdue) 🔔 Milestone 2 Sign-off         │
│ 📜 Recovery Log ├──────────────────────────────────────────────────────────────────────┤
│ ⚙️ Settings     │  RECEIVABLES AGING BREAKDOWN (0-30d, 31-44d, 45d+ Statutory Limit)    │
│ 📚 Research     │  Clean tabular grid with search, status filters, and instant actions  │
└─────────────────┴──────────────────────────────────────────────────────────────────────┘
```

1. **Dashboard:** KPI summary, Section 43B(h) tax disallowance alert banner, aging bucket distribution bar, prioritized urgent actions, and quick draft review modal.
2. **CSV Import & Normalizer:** Drag-and-drop file ingestion, automatic column mapping (Invoice Number, Buyer Name, Amount, Due Date, Phone, Email), schema validation, error highlighting, and pre-packaged Indian Agency sample CSV loader.
3. **Invoices & Overdue Management:** Full-featured data grid with status filters (All, 0–30d, 31–44d, 45d+ Overdue, Disputed, Paid), search, amount sorting, and manual invoice addition modal.
4. **AI-Recommended Action Queue:** Rule-grounded priority queue ranking items by financial exposure and payment probability, displaying clear "Why this is recommended" explanations.
5. **Follow-up Drafts & Approval Center:** Multi-channel draft generator (WhatsApp / Email). Allows 3 tone switches (*Polite Check-in*, *Firm Balance Follow-up*, *MSME Statutory 43B(h) Notice*), live editing, 1-click WhatsApp Web launch, and audit record creation.
6. **Leads & Stale Quotations:** Pipeline tracker for unaccepted quotes, draft revival pitches, and proposal status.
7. **Recovery History & Audit Reports:** Real, verifiable log of payments received, date cleared, collection method used, and Days Sales Outstanding (DSO) delta.
8. **Onboarding & Business Setup:** Workspace profile, GSTIN input, MSME registration number, payment terms (15 vs 45 days), and UPI payment link configuration.
9. **Settings & Integrations:** Message templates, Section 43B(h) compliance toggle, export audited CSV/JSON, and AI model preferences.
10. **Market Intelligence & Research Dossier:** Interactive, structured report viewer rendering the verified market data (₹7.34L Cr MSME debt, Samadhaan resolution statistics, competitor teardown, 15-question discovery playbook).

---

## 3. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                           Client Architecture                          │
│                                                                        │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │   CSV Parser Engine │──▶│ Deterministic Aging & Risk Engine    │   │
│   │  (PapaParse + Map)  │   │ - 0-30d, 31-44d, 45d+ MSMED Clocks   │   │
│   └─────────────────────┘   │ - Section 43B(h) Disallowance Ranks  │   │
│                             └──────────────────┬───────────────────┘   │
│                                                │                       │
│                                                ▼                       │
│   ┌─────────────────────┐   ┌──────────────────────────────────────┐   │
│   │ Human Approval Hub  │◀──│ Contextual Draft Generator           │   │
│   │ - Edit & Approve    │   │ - Grounded Prompt Engine             │   │
│   │ - WhatsApp / Email  │   │ - 3 Calibrated Tone Presets          │   │
│   └──────────┬──────────┘   └──────────────────────────────────────┘   │
│              │                                                         │
│              ▼                                                         │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ Audited Execution & Outcome Store (LocalStorage / IndexedDB)   │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Functional Mechanics
1. **Deterministic Financial Engine:**
   - Accurate date boundary calculation (`Math.floor((today - dueDate) / 86400000)`).
   - Strict 45-day MSMED Act countdown: flags invoices between 31 and 44 days with an "Approaching 43B(h) Tax Disallowance" tag.
   - Zero-hallucination guarantee: amounts, balances, invoice IDs, and GSTINs are injected verbatim into templates.
2. **CSV Ingestion & Schema Normalizer:**
   - Detects headers like `Invoice No`, `Bill #`, `Customer`, `Party Name`, `Amount`, `Total`, `Due Date`, `Phone`, `Email`.
   - Cleans numeric formats (strips `₹`, `,`, spaces), validates ISO dates (`YYYY-MM-DD`, `DD/MM/YYYY`), and highlights malformed rows before import.
   - Includes ready-to-test **Indian Digital Agency Sample Dataset** (Apex Retail, Zenora Labs, Horizon FinTech, CloudForge Technologies).
3. **Human Approval Workflow:**
   - Draft states: `Draft` -> `Edited` -> `Approved` -> `Executed`.
   - Multi-channel dispatch: Direct WhatsApp Web link with pre-filled encoded text (`https://wa.me/<phone>?text=...`) and direct Email `mailto:` launcher.
4. **Outcome Tracking & Reconciliation:**
   - Recording a payment prompts for `Amount Received`, `Payment Date`, `Reference / UTR Number`, and updates both the Invoice Status and Recovery Audit Log.

---

## 4. Verification & Testing Plan

1. **Deterministic Calculation Validation:**
   - Test invoices with due dates in the future (negative overdue days -> "Current").
   - Test boundary conditions: exactly 0 days, 15 days, 44 days, and 45+ days overdue.
   - Verify that currency formatting preserves exact paise (`₹3,40,000.00`) using Indian numbering formatting (`en-IN`).
2. **CSV Ingestion Resilience:**
   - Test missing columns, empty rows, malformed date formats, and negative values.
   - Verify column-mapping selector allows user to re-map unaligned columns.
3. **Execution & Human Approval:**
   - Confirm draft editing reflects in the preview and execution payloads.
   - Verify WhatsApp URL encoding correctly formats line breaks and currency characters.
4. **Browser Verification:**
   - Run `compile_applet` and check for clean TypeScript compilation without warnings.
