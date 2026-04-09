# CTO Assessment — Offertio
_Erstellt: 9. April 2026_

---

## 1. Executive Summary

Offertio ist ein fokussiertes, technisch solides DACH-SaaS-Produkt mit einer klaren Produktvision. Die Codebase ist für ein Early-Stage-Produkt überdurchschnittlich gut: 451 Tests grün, starke Security-Architektur, saubere Trennung von Concerns, und eine durchdachte DACH-Compliance-Schicht.

Das Produkt steht an einem kritischen Punkt: **Die Kernarchitektur ist launch-ready, aber es fehlen 4-5 Schlüsselfeatures, die den Unterschied zwischen "nettes Tool" und "sticky SaaS mit Retention" machen.**

---

## 2. Was mir gefällt (Stärken)

### 2.1 Klare Produktdoktrin
Die Product Doctrine ist einer der besten Teile des Projekts. Die Frage _"Hilft dieses Feature dem User, ein professionelles Dokument schneller zu erstellen und zu versenden?"_ ist ein exzellenter Produktfilter. Diese Klarheit verhindert Feature-Bloat.

### 2.2 DACH-Compliance als Differenzierungsmerkmal
Die `dach.ts` Abstraktion ist eine der klügsten Architekturentscheidungen:
- CH: Swiss QR-Bill, MWST-Nr, CHF
- DE: ZUGFeRD/E-Rechnung, Steuernummer, Leistungsdatum-Pflicht
- AT: UID-Schwellenwerte (EUR 400/10k), FN-Nr

Das ist nicht trivial und ein echter Wettbewerbsvorteil. Die meisten Konkurrenten machen nur ein Land richtig.

### 2.3 Security-First Architektur
Für ein Early-Stage SaaS beeindruckend:
- Nonce-based CSP (nicht nur statische Header)
- Row-Level Security auf Datenbankebene
- Origin-Checks auf Mutation-Endpoints
- Rate Limiting (Upstash + In-Memory Fallback)
- HMAC Webhook-Validierung
- Input Sanitization (XSS, CSV Injection, Path Traversal)
- Payload Size Limits

### 2.4 Testabdeckung
- **451 Tests, alle grün** — das ist für ein Startup dieser Grösse ausgezeichnet
- 28 Test-Files mit guter Abdeckung der Business-Logik
- Stress-Tests für QR-Bill, ZUGFeRD, Customer Reuse
- Validierungstests für alle DACH-Regionen

### 2.5 Architektur-Qualität
- Saubere Next.js 15 App Router Struktur mit Route Groups
- Klare Trennung: `(auth)` vs `(app)` vs `api`
- Drei Supabase-Clients (Browser/Server/Admin) korrekt isoliert
- 19 inkrementelle Migrations — Schema-Evolution ist nachvollziehbar
- Zod-basierte Validierung
- PWA-Ready (Service Worker, Manifest, Offline Banner)

### 2.6 Dokumentation
Exit-ready Dokumentation ist ein ungewöhnlich professioneller Move für diese Phase. Das zeigt strategisches Denken.

---

## 3. Was mir nicht gefällt (Schwächen & Risiken)

### 3.1 KRITISCH: Kein CI/CD Pipeline
Es gibt keine `.github/workflows`, kein automatisiertes Testing oder Deployment. Das bedeutet:
- Tests laufen nur wenn jemand manuell `vitest run` ausführt
- Keine automatische Qualitätssicherung bei PRs
- Kein automatisches Deployment
- **Risiko**: Regressions werden erst in Production bemerkt

### 3.2 KRITISCH: Keine E2E Tests
Unit- und Integrationstests sind stark, aber es gibt keinen Browser-Level E2E-Test (Playwright/Cypress). Die kritischsten User-Flows (Onboarding → Dokument erstellen → PDF generieren → Senden) sind nicht automatisiert getestet.

### 3.3 HOCH: Kein Error Tracking / Monitoring
Kein Sentry, kein LogRocket, kein strukturiertes Logging in Production. Wenn in Production etwas kaputt geht, erfährt man es nur durch Userbeschwerden. Der `logger.ts` ist ein guter Anfang, aber reicht nicht für Production.

### 3.4 HOCH: Customer Folder UI fehlt
Die Implementation Spec identifiziert dies bereits als grösste Produktlücke. Die Datenbank-Schicht existiert (`customers` Table, `lookup_key`), aber die UI-Ebene fehlt:
- Kein Kunden-Ordner-View
- Keine Kunden-Suche
- Keine gruppierte Dokumenten-Historie pro Kunde
- Kein Customer-Centric Navigation

### 3.5 HOCH: Export/Bookkeeping Feature fehlt
Dies ist das stärkste Retention-Feature und existiert noch nicht. Ohne Export werden User irgendwann ihre Daten extrahieren wollen und zur Konkurrenz wechseln.

### 3.6 MITTEL: Launch Checklist unvollständig
Die Launch-Checklist vom 3. April hat noch viele offene Punkte:
- Payment Flow nicht verifiziert
- Core Workflow nicht final abgenommen
- Dashboard First Impression nicht bestätigt

### 3.7 MITTEL: Font-Dependency im Build
Der Production Build scheitert, wenn Google Fonts nicht erreichbar sind. Für Offline-Builds und CI-Environments ist das ein Problem. `next/font` sollte mit Fallbacks konfiguriert werden.

### 3.8 NIEDRIG: Keine Performance-Baseline
Kein Lighthouse-Score dokumentiert, keine Core Web Vitals Baseline, keine Bundle-Size-Analyse. Für ein mobile-first Produkt ist Performance-Monitoring wichtig.

---

## 4. Core Specs Compliance Check

| Spec-Requirement | Status | Details |
|---|---|---|
| Mobile-first | ✅ Implementiert | PWA, responsive Design, Offline-Support |
| Calm & professional | ✅ Implementiert | Clean UI, keine Feature-Überladung |
| DACH-aware | ✅ Stark | CH/DE/AT mit länderspezifischer Logik |
| Fast onboarding | ✅ Implementiert | Leicht, nicht blockierend |
| Workspace-first | ✅ Implementiert | Dashboard mit primärem CTA |
| Explicit doc-type choice | ✅ Implementiert | Offerte/Rechnung Toggle |
| One-page editor | ✅ Implementiert | Klare Sektionen |
| Real preview | ⚠️ Teilweise | Existiert, aber nicht ideal Desktop/Mobile Split |
| Customer folders | ❌ UI fehlt | Datenmodell da, UI-Surface fehlt |
| Customer search | ❌ Fehlt | Nicht implementiert |
| Customer reuse hints | ⚠️ Teilweise | Grundlogik da, UX unvollständig |
| Offer→Invoice conversion | ⚠️ Teilweise | Carryover funktioniert, Linking-UI fehlt |
| Inline validation | ⚠️ Teilweise | Regeln da, UX kann stärker sein |
| Truthful delivery labels | ✅ Implementiert | CTAs reflektieren tatsächliches Verhalten |
| Export/Bookkeeping | ❌ Fehlt | Nicht implementiert |

**Compliance Score: ~65%** — Solide Basis, aber mehrere High-Value Features fehlen.

---

## 5. Strategischer Plan — Die nächsten 90 Tage

### Phase 0: Foundation & DevOps (Woche 1-2)
_Bevor wir Features bauen, muss die Infrastruktur stehen._

| # | Task | Priorität | Aufwand |
|---|---|---|---|
| 0.1 | **CI/CD Pipeline aufsetzen** (GitHub Actions: lint, typecheck, test, build) | KRITISCH | 1 Tag |
| 0.2 | **Error Tracking einrichten** (Sentry + Source Maps) | KRITISCH | 0.5 Tage |
| 0.3 | **Font-Fallback für Builds** (lokale Fonts oder `next/font` Fallback) | HOCH | 0.5 Tage |
| 0.4 | **Performance Baseline** (Lighthouse CI, Bundle Analyzer) | MITTEL | 0.5 Tage |

### Phase 1: Launch-Stability (Woche 2-3)
_Die Launch-Checklist muss geschlossen werden._

| # | Task | Priorität | Aufwand |
|---|---|---|---|
| 1.1 | **Payment Flow End-to-End verifizieren** (Lemon Squeezy Checkout → Webhook → Pro-Status) | KRITISCH | 1 Tag |
| 1.2 | **Kompletter User Journey manuell testen** (Signup → Onboarding → Offerte → Rechnung → Send) | KRITISCH | 0.5 Tage |
| 1.3 | **Launch Checklist Items abarbeiten** (alle offenen Punkte) | HOCH | 1 Tag |
| 1.4 | **Erste E2E Tests** (Playwright: Auth Flow + Dokument erstellen) | HOCH | 2 Tage |

### Phase 2: Customer Intelligence (Woche 3-6)
_Das stärkste Stickiness-Feature. Macht aus einem Tool eine Plattform._

| # | Task | Priorität | Aufwand |
|---|---|---|---|
| 2.1 | **Customer Folder UI** — `/dokumente` erweitern mit Kunden-Gruppierung | HOCH | 3 Tage |
| 2.2 | **Customer Search** — Suche findet nur Kunden-Ordner, nicht lose Dokumente | HOCH | 2 Tage |
| 2.3 | **Offer↔Invoice Linking** — Sichtbare Verbindung in Customer-History | HOCH | 1.5 Tage |
| 2.4 | **Customer Reuse UX** — Sanfte Daten-Wiederverwendung mit Info-Hint | MITTEL | 1 Tag |

### Phase 3: Inline Smartness (Woche 6-8)
_Macht das Produkt vertrauenswürdig und reduziert Support-Anfragen._

| # | Task | Priorität | Aufwand |
|---|---|---|---|
| 3.1 | **Focus/Scroll-to-Field** bei fehlenden Pflichtfeldern | HOCH | 1 Tag |
| 3.2 | **Begründete Inline-Validierung** für alle DACH-Fälle systematisch | HOCH | 1.5 Tage |
| 3.3 | **Preview-Modell verbessern** — Desktop: persistenter Live-Preview, Mobile: Toggle | MITTEL | 2 Tage |

### Phase 4: Retention & Growth (Woche 8-12)
_Features die Churn reduzieren und Upgrade-Conversion steigern._

| # | Task | Priorität | Aufwand |
|---|---|---|---|
| 4.1 | **CSV/Excel Export** — Zeitraum + Kundenfilter + Download | HOCH | 2 Tage |
| 4.2 | **PDF Batch Export** — Alle Dokumente eines Zeitraums als ZIP | MITTEL | 1.5 Tage |
| 4.3 | **Dashboard Analytics** — Einfache Kennzahlen (Dokumente/Monat, Top-Kunden) | MITTEL | 2 Tage |
| 4.4 | **Email Notifications** — Rechnung überfällig, Offerte nicht konvertiert | NIEDRIG | 2 Tage |

---

## 6. Quick Wins (Diese Woche umsetzbar)

1. **CI/CD Pipeline** — GitHub Actions mit `vitest run`, `tsc --noEmit`, `next build`
2. **Sentry Integration** — `@sentry/nextjs` mit Source Maps
3. **Font-Fallback** — `next/font` mit `fallback` Option konfigurieren
4. **Launch-Checklist** — Offene Punkte systematisch abarbeiten

---

## 7. Technische Schulden

| Bereich | Beschreibung | Priorität |
|---|---|---|
| E2E Tests | Keine Browser-Level Tests | HOCH |
| Monitoring | Kein Error Tracking, kein APM | HOCH |
| CI/CD | Kein automatisiertes Testing/Deployment | KRITISCH |
| Bundle Size | Keine Analyse, kein Budget | MITTEL |
| API Tests | API-Routen nur indirekt getestet | MITTEL |
| Accessibility | Kein WCAG-Audit dokumentiert | NIEDRIG |
| Database Indexes | Performance-Audit bei Skalierung nötig | NIEDRIG |

---

## 8. Wettbewerbsanalyse — Positioning

Offertio positioniert sich korrekt im "Sweet Spot" zwischen:
- **Zu einfach**: Word/Excel Templates (kein DACH-Compliance)
- **Zu komplex**: Bexio, sevDesk, lexoffice (volle Buchhaltung)
- **Zu teuer**: SAP, ABACUS (Enterprise)

**Differenzierung durch**:
- Mobile-First (Konkurrenz ist Desktop-first)
- DACH-Dreifach-Compliance (Konkurrenz macht meist nur 1 Land)
- Dokument-First statt CRM-First (weniger Setup, schnellerer Wert)
- Fairer Preis (CHF 28/Monat vs. CHF 50+ bei Bexio)

---

## 9. KPIs die wir tracken sollten

### Product Metrics
- **Activation Rate**: % der Signups die innerhalb 24h ein Dokument erstellen
- **Document Velocity**: Dokumente pro aktivem User pro Monat
- **Conversion Rate**: Free → Pro Upgrade-Rate
- **Feature Adoption**: Customer Reuse, Templates, Export

### Health Metrics
- **Error Rate**: Sentry Errors / Session
- **Build Success Rate**: CI Pipeline
- **Test Coverage**: Aktuell ~451 Tests, Ziel: +E2E Coverage
- **Core Web Vitals**: LCP, FID, CLS

### Business Metrics
- **MRR**: Monthly Recurring Revenue
- **Churn Rate**: Monatliche Kündigungsrate
- **CAC**: Customer Acquisition Cost
- **LTV**: Lifetime Value

---

## 10. Gesamtbewertung

| Dimension | Note | Kommentar |
|---|---|---|
| Produktvision | A | Klar, fokussiert, differenziert |
| Code-Qualität | A- | Stark für Early-Stage, gute Patterns |
| Testabdeckung | B+ | Unit/Integration stark, E2E fehlt |
| Security | A | Überdurchschnittlich für ein Startup |
| DevOps/CI | D | Grösste Lücke — muss sofort gefixt werden |
| Feature-Completeness | C+ | Kern da, aber Key-Features fehlen |
| Dokumentation | A | Exit-ready Docs sind ungewöhnlich gut |
| Skalierbarkeit | B | Supabase ist solide, aber Monitoring fehlt |

**Gesamtnote: B+** — Starke Basis, aber operationale Lücken müssen geschlossen werden bevor wir skalieren.

---

## 11. Meine Empfehlung als CTO

**Die nächsten 2 Wochen entscheiden über den Launch-Erfolg.**

Prioritäten:
1. **CI/CD + Sentry sofort** — Wir fliegen blind ohne Monitoring
2. **Launch-Checklist schliessen** — Alles offene muss erledigt werden
3. **Customer Folders bauen** — Das ist der #1 Stickiness-Hebel
4. **Export-Feature** — Das ist der #1 Retention-Hebel

Erst wenn Phase 0-2 stehen, haben wir ein Produkt das nicht nur launched, sondern auch retained.

Auf eine gute Zusammenarbeit!
