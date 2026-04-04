# Offertio Executive Summary

_Prepared for exit-style review on April 4, 2026_

## 1. What Offertio is

Offertio is a DACH-focused SaaS product for small tradespeople and service businesses that need to create offers and invoices quickly after customer appointments.

The product thesis is deliberately narrow:

- not a heavy CRM
- not a bookkeeping suite
- not a backoffice ERP
- not a workflow maze

Instead, Offertio focuses on one high-value moment:

> turn a field visit, call, or appointment into a professional offer or invoice with minimal friction.

## 2. Why the product can matter

The product is designed around a common small-business pain point:

- paperwork is often delayed until the evening
- quote/invoice turnaround slows down
- professionalism suffers
- owners lose time and energy
- legacy CRM/ERP tools feel too heavy for the actual task

Offertio’s value proposition is therefore speed + simplicity + professional output:

- fast onboarding
- workspace-first activation
- one-page document editing
- DACH-aware invoice logic
- customer-linked document history
- branded PDF output

## 3. Current product maturity

As of April 4, 2026, the repository represents a strong MVP / launch-hardening stage product rather than a concept-only prototype.

### Present and working

- landing page and conversion path
- authentication and onboarding
- protected application workspace
- offer and invoice creation
- PDF generation
- customer folders and grouped document history
- CSV export for bookkeeping handoff
- country-aware logic for CH / DE / AT
- Swiss QR-bill support for Switzerland
- ZUGFeRD-compatible e-invoice generation for Germany
- free-plan gating and paid-plan hooks

### Recently hardened

- inline required-data handling inside the document flow
- customer data reuse hints
- offer-to-invoice relationship visibility
- stronger preview behavior with desktop live-preview support

## 4. Technical quality summary

Current verification baseline in this workspace:

- `181` passing tests
- successful TypeScript no-emit validation
- successful production build via `next build`

The codebase already contains:

- migration-versioned Supabase schema
- row-level security
- server/browser/admin Supabase separation
- origin checks and payload limits on mutation routes
- rate limiting abstraction
- payment webhook handling

## 5. Exit relevance

Offertio is interesting for an acquirer or strategic operator if they value one or more of the following:

- a DACH-ready quoting/invoicing product for small service businesses
- a focused workflow product that can sit between CRM-lite and ERP-heavy tools
- a codebase with a coherent product opinion instead of a feature pile
- a launch-near product with differentiated positioning and country-specific depth

The strongest exit narrative is likely **strategic tuck-in**, not standalone scale proof at this stage.

Examples of logical buyer profiles:

- vertical SaaS operators for trades and field services
- invoicing / payments platforms expanding into DACH SMB workflows
- CRM-lite vendors seeking a lighter execution workflow
- founder-led rollups of small business software tools

## 6. What would increase exit quality further

The biggest upgrades from “strong software asset” to “cleaner exit package” are not mainly engineering features. They are evidence layers:

- real customer usage proof
- funnel / activation metrics
- payment conversion evidence
- operating playbooks
- contractual / legal / data room completeness

## 7. Current headline risks

- no audited business performance included in repo
- no browser-level E2E suite yet
- no visible proof in repo of repeatable paying customer traction
- vendor dependence on Supabase and external SaaS services
- local repo currently not managed as a Git checkout in this folder snapshot

## 8. Overall assessment

Offertio is not “just an idea.” It is a coherent, technically credible product asset with clear product logic, real implementation depth, and a plausible strategic story.

For exit-style preparation, the software is now in reasonable shape.

The remaining work is primarily:

- evidence packaging
- operating rigor
- commercial proof
- legal/data-room completeness
