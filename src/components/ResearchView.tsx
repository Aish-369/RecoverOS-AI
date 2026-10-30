/**
 * RecoverOS AI - Market Intelligence & Research Dossier View
 * Fully embedded research dossier detailing the ₹7.34L Cr Indian MSME debt data,
 * Section 43B(h) analysis, competitor teardown, and discovery playbook.
 */

import React, { useState } from 'react';
import { BookOpen, TrendingUp, AlertTriangle, Scale, Target, ShieldCheck, FileCheck } from 'lucide-react';

export const ResearchView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'macro' | 'competitors' | 'discovery' | 'architecture'>('macro');

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Strategic Dossier</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">
          Market Intelligence & Research Report
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Grounded in official GAME/FISME data, MSME Samadhaan statistics, and Section 43B(h) regulatory provisions.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg max-w-xl">
        <button
          onClick={() => setActiveTab('macro')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'macro' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Macro & Samadhaan Data
        </button>
        <button
          onClick={() => setActiveTab('competitors')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'competitors' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Competitor Teardown
        </button>
        <button
          onClick={() => setActiveTab('discovery')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'discovery' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          15 Discovery Questions
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'architecture' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Zero-Cost Architecture
        </button>
      </div>

      {/* TAB 1: MACRO & SAMADHAAN DATA */}
      {activeTab === 'macro' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Total Delayed MSME Dues</span>
              <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                ₹7.34 Lakh Cr
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Source: GAME, FISME & C2FO Delayed Payments Report 3.0 (March 2024).
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-medium text-slate-500">MSME Samadhaan Filings</span>
              <span className="text-2xl font-bold text-slate-900 font-mono mt-1 block">
                2,12,000+ Cases
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Totaling ₹47,147 Crore in disputed claims across India.
              </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
              <span className="text-xs font-medium text-slate-500">Formal Portal Disposal Rate</span>
              <span className="text-2xl font-bold text-rose-600 font-mono mt-1 block">
                20% - 26%
              </span>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Physical MSEFC hearing backlogs force digital ODR transition.
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs leading-relaxed text-slate-700">
            <h2 className="text-sm font-bold text-slate-900">
              The 2024–2026 Regulatory Paradigm Shift: Section 43B(h) of the Income Tax Act
            </h2>
            <p>
              Under Finance Act 2023, Section 43B(h) was introduced to enforce payments to Micro and Small enterprises within 15 days (or up to 45 days if governed by a written contract). If a corporate or large business fails to settle dues within 45 days, the unpaid expense is <strong>disallowed as a tax deduction</strong> in that assessment year, artificially raising the buyer's tax liability.
            </p>
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 space-y-2">
              <div className="font-semibold flex items-center gap-1.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Strategic Copilot Implication:</span>
              </div>
              <p>
                Invoices between <strong>31 and 44 days past due</strong> represent the highest-converting recovery window. Corporate finance teams actively scan for MSME suppliers nearing 45 days to avoid losing tax deductions. RecoverOS AI directly flags this countdown to the user.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPETITORS */}
      {activeTab === 'competitors' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Platform</th>
                <th className="py-3 px-4">Target User</th>
                <th className="py-3 px-4">Pricing Model</th>
                <th className="py-3 px-4">Key Limitation</th>
                <th className="py-3 px-4">RecoverOS AI Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">CredFlow</td>
                <td className="py-3 px-4">Tally & Busy mid-market</td>
                <td className="py-3 px-4 font-mono">₹999 - ₹19,999/yr</td>
                <td className="py-3 px-4 text-slate-500">Automated spam messages damage client relationships</td>
                <td className="py-3 px-4 text-indigo-700 font-semibold">Human-in-the-loop tone calibration & review</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">Recordent</td>
                <td className="py-3 px-4">SMEs & credit managers</td>
                <td className="py-3 px-4 font-mono">₹1,499 - ₹2,700/qtr</td>
                <td className="py-3 px-4 text-slate-500">Bureau reporting feels excessively aggressive</td>
                <td className="py-3 px-4 text-indigo-700 font-semibold">Collaborative reconciliation & 43B(h) compliance</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">KredX</td>
                <td className="py-3 px-4">Enterprise suppliers</td>
                <td className="py-3 px-4 font-mono">1.2% - 2% fee/invoice</td>
                <td className="py-3 px-4 text-slate-500">Requires high-credit buyers; 12-24% annual capital cost</td>
                <td className="py-3 px-4 text-indigo-700 font-semibold">Recovers existing funds with zero capital discount</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-bold text-slate-900">Zoho / Tally</td>
                <td className="py-3 px-4">Universal SMEs</td>
                <td className="py-3 px-4 font-mono">₹749/mo or ₹22,500 perp</td>
                <td className="py-3 px-4 text-slate-500">Static reminders ignored; no prioritization</td>
                <td className="py-3 px-4 text-indigo-700 font-semibold">Dynamic risk scoring + multi-channel drafted copy</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 3: DISCOVERY QUESTIONS */}
      {activeTab === 'discovery' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            Standardized 15-Question Customer Discovery Framework
          </h2>
          <p className="text-xs text-slate-500">
            Field-tested questions to diagnose accounts receivable bottlenecks in Indian B2B digital agencies and consultancies.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {[
              "1. Walk me through your current process when an invoice crosses its due date.",
              "2. Who in your company is responsible for noticing that payment hasn't arrived?",
              "3. What accounting software or spreadsheets do you use to issue and track bills?",
              "4. How many days typically pass between project delivery and money in the bank?",
              "5. How do you choose between sending a WhatsApp, an email, or making a phone call?",
              "6. Have you ever delayed following up because you feared damaging client goodwill?",
              "7. How has Section 43B(h) of the Income Tax Act changed how your clients pay you?",
              "8. Have you ever filed a dispute on the MSME Samadhaan portal? What happened?",
              "9. What percentage of your invoices end up in write-offs or heavy delays each year?",
              "10. When was the last time a client claimed they didn't pay because of an unresolved dispute?",
              "11. If an automated tool messaged your clients directly without you checking it, how would you feel?",
              "12. How much time per week does your team spend drafting follow-up messages?",
              "13. What happens to unaccepted quotes or stale estimates in your pipeline?",
              "14. If software recovered ₹2,00,000 for you 15 days faster, what would that be worth to your business?",
              "15. What would make you cancel an accounts receivable tool within 30 days?"
            ].map((q, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800">
                <span className="font-semibold text-slate-900">{q}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: ARCHITECTURE */}
      {activeTab === 'architecture' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4 text-xs text-slate-700 leading-relaxed">
          <h2 className="text-sm font-bold text-slate-900">
            Zero-Cost Architecture & Local AI Model Strategy
          </h2>
          <p>
            To honor the ₹0 initial development budget constraint, RecoverOS AI separates deterministic financial truth from generative language modeling:
          </p>

          <div className="p-4 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-800 space-y-2 border border-slate-200">
            <div>• Deterministic Logic (TypeScript/Python): Calculates exact dates, balances, 43B(h) thresholds. Zero hallucinations.</div>
            <div>• Local Model Option: Ollama running Qwen2.5-Coder-7B or Llama-3.2-3B on 8GB unified RAM for offline air-gapped SMEs.</div>
            <div>• Data Privacy: Client-side CSV parsing ensures confidential financial data remains on the business device.</div>
            <div>• Human Gate: Every draft requires human verification before opening external WhatsApp Web or Mail links.</div>
          </div>
        </div>
      )}
    </div>
  );
};
