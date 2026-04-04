# Offertio Exit Data Room Checklist

## 1. Purpose

This checklist separates what is already present in the repository from what would still need to be assembled for a serious diligence or acquisition process.

## 2. Already present in repo

### Product and technical

- product logic
- implementation spec
- product doctrine
- architecture notes
- operations notes
- technical due diligence summary
- go-to-market planning materials
- launch checklist
- migrations and test suite

### Why that matters

This means a buyer can already review:

- what the product is supposed to do
- how it is built
- where the important dependencies live
- what commercial story the founder intended

## 3. Must-add data room items outside repo

### Corporate / legal

- company formation documents
- cap table
- shareholder agreements
- IP assignment / contractor assignment documents
- privacy policy / terms as actually in force
- trademark or domain ownership evidence

### Commercial

- current pricing sheet
- pilot and paying customer list
- pipeline snapshot
- revenue and billing history
- churn / retention history if any
- customer references or case notes

### Financial

- bank statements or accounting exports
- historical P&L / management reporting
- runway / cash position summary
- tax filings where relevant

### Operational

- vendor contract list
- monthly SaaS cost summary
- hosting and infra bills
- support / incident history
- owner access matrix

### Technical operations

- secrets inventory
- environment matrix per environment
- Supabase project export / admin transfer plan
- webhook endpoint inventory
- DNS/domain transfer plan

## 4. Suggested folder structure for a real data room

```text
01-corporate/
02-financial/
03-commercial/
04-product/
05-technical/
06-security-and-compliance/
07-operations/
08-customer-and-pipeline/
09-transaction-specific/
```

## 5. Suggested mapping from repo docs into that structure

- `docs/product/*` -> `04-product/`
- `docs/ARCHITECTURE.md` -> `05-technical/`
- `docs/OPERATIONS.md` -> `07-operations/`
- `docs/DUE_DILIGENCE.md` -> `05-technical/`
- `docs/go-to-market/*` -> `03-commercial/`
- `docs/launch/*` -> `07-operations/`
- `docs/exit/*` -> transaction prep / diligence briefing layer

## 6. Red flags a buyer would ask about

- who owns all IP?
- what is actually deployed and where?
- who controls production credentials?
- are there active paying users?
- what would break if one vendor disappeared?
- what undocumented founder knowledge still exists?
- how easy is a post-close transition?

## 7. Exit-readiness scorecard

### Product documentation

**Strong**

### Technical documentation

**Strong for stage**

### Commercial evidence

**Needs packaging**

### Legal/compliance pack

**Not represented in repo**

### Transfer package completeness

**Partial**

## 8. Highest-priority next actions

1. create a secrets and environment inventory
2. create a vendor ownership matrix
3. assemble customer/pilot and revenue evidence
4. preserve canonical Git history and deployment ownership
5. prepare a founder handover memo and recorded walkthrough
