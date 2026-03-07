# ForIT CRM — Custom Build Design

**Date:** 2026-03-07
**Status:** Approved
**Owner:** Ben Thomas

## Problem Statement

ForIT uses Dynamics 365 Sales as its CRM, but interacts with it exclusively via API — never through the UI. Contact and lead data is fragmented across four systems (Dynamics 365, SQL `leads` table, Apple Contacts, `newsletter_subscribers`). Power Automate flows act as expensive middleware between our code and a database we're paying enterprise prices for.

**Decision:** Build a custom, AI-native CRM at `crm.forit.io` that unifies all contact/deal data, replaces Dynamics 365, and eliminates the Microsoft licensing dependency.

## Architecture

### Repository & Infrastructure

- **Repo:** `forit-CRM` (new, standalone)
- **Backend:** Azure Functions (Node.js) — matches existing forit stack
- **Frontend:** Next.js + Tailwind CSS
- **Hosting:** Azure Static Web Apps at `crm.forit.io`
- **Database:** `forit-saas-db` on `forit-saas-sql.database.windows.net` (shared with existing SaaS platform)
- **File Storage:** Azure Blob Storage (contracts, document attachments)
- **Auth:** Microsoft SSO for employees via `@forit/graph` package

### Shared Packages (from forit-Website)

- `@forit/graph` — Microsoft Graph API + token acquisition
- `@forit/sql` — Azure SQL connection pools
- `@forit/azure-func` — CORS, auth middleware, notification helpers

## Data Model

All tables prefixed with `crm_` in `forit-saas-db`.

### crm_contacts

Single source of truth for every person. No separate leads table — a lead is a contact at an early lifecycle stage.

```sql
CREATE TABLE crm_contacts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    type VARCHAR(20) NOT NULL DEFAULT 'lead',        -- lead | contact | partner | employee
    lifecycle_stage VARCHAR(20) DEFAULT 'new',        -- new | qualified | customer | churned
    first_name NVARCHAR(100),
    last_name NVARCHAR(100),
    email NVARCHAR(255),
    phone NVARCHAR(50),
    title NVARCHAR(200),
    account_id INT REFERENCES crm_accounts(id),
    owner_id NVARCHAR(255),                           -- employee email who owns this contact
    source VARCHAR(50),                                -- web | card | booking | import | manual | referral
    lead_score INT DEFAULT 0,

    -- Enrichment fields (from Lusha)
    linkedin_url NVARCHAR(500),
    company_size VARCHAR(50),
    revenue_range VARCHAR(50),
    industry NVARCHAR(200),
    technologies NVARCHAR(MAX),                        -- JSON array

    -- Metadata
    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    converted_at DATETIME2,                            -- when lead became contact
    last_activity_at DATETIME2,

    -- Migration reference
    dynamics_id NVARCHAR(50),                          -- original Dynamics GUID for migration
    legacy_lead_id INT                                 -- original SQL leads table ID
);
```

### crm_accounts

Companies and organizations.

```sql
CREATE TABLE crm_accounts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    domain NVARCHAR(255),
    industry NVARCHAR(200),
    employee_count INT,
    annual_revenue DECIMAL(18,2),
    account_type VARCHAR(20) DEFAULT 'prospect',       -- prospect | customer | partner | vendor
    owner_id NVARCHAR(255),
    website NVARCHAR(500),
    phone NVARCHAR(50),
    address_line1 NVARCHAR(255),
    address_city NVARCHAR(100),
    address_state NVARCHAR(100),
    address_country NVARCHAR(100),
    address_postal NVARCHAR(20),

    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    last_activity_at DATETIME2,
    dynamics_id NVARCHAR(50)
);
```

### crm_opportunities

Deals in the pipeline.

```sql
CREATE TABLE crm_opportunities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(200) NOT NULL,
    account_id INT REFERENCES crm_accounts(id),
    contact_id INT REFERENCES crm_contacts(id),
    stage VARCHAR(30) NOT NULL DEFAULT 'discovery',    -- discovery | proposal | negotiation | won | lost
    service_type VARCHAR(50),                           -- fractional_cio | fractional_tmo | msp | project | licenses
    value DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'CAD',
    monthly_value DECIMAL(18,2),                        -- for recurring engagements
    close_date DATE,
    probability INT DEFAULT 0,                          -- 0-100
    lost_reason NVARCHAR(500),
    owner_id NVARCHAR(255),
    description NVARCHAR(MAX),

    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    closed_at DATETIME2,
    dynamics_id NVARCHAR(50)
);
```

### crm_activities

Unified timeline — the core feature. Every interaction with a contact in one chronological feed.

```sql
CREATE TABLE crm_activities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    contact_id INT REFERENCES crm_contacts(id),
    account_id INT REFERENCES crm_accounts(id),
    opportunity_id INT REFERENCES crm_opportunities(id),
    activity_type VARCHAR(30) NOT NULL,                 -- email | meeting | call | note | task | quote | invoice | contract
    source VARCHAR(30),                                 -- granola | outlook | booking | manual | dolores | xero | web_form
    subject NVARCHAR(500),
    summary NVARCHAR(MAX),
    raw_data NVARCHAR(MAX),                             -- JSON for source-specific data
    occurred_at DATETIME2 NOT NULL,
    created_by NVARCHAR(255),

    created_at DATETIME2 DEFAULT GETUTCDATE()
);

CREATE INDEX IX_crm_activities_contact ON crm_activities(contact_id, occurred_at DESC);
CREATE INDEX IX_crm_activities_account ON crm_activities(account_id, occurred_at DESC);
```

### crm_quotes

Synced from Xero. Read-only in CRM — Xero remains the system of record for quote document generation.

```sql
CREATE TABLE crm_quotes (
    id INT IDENTITY(1,1) PRIMARY KEY,
    xero_quote_id NVARCHAR(50) NOT NULL,
    opportunity_id INT REFERENCES crm_opportunities(id),
    account_id INT REFERENCES crm_accounts(id),
    contact_id INT REFERENCES crm_contacts(id),
    quote_number NVARCHAR(50),
    status VARCHAR(20),                                 -- draft | sent | accepted | declined | expired
    total DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'CAD',
    sent_at DATETIME2,
    expires_at DATETIME2,

    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);
```

### crm_invoices

Synced from Xero. Linked to the deal lifecycle.

```sql
CREATE TABLE crm_invoices (
    id INT IDENTITY(1,1) PRIMARY KEY,
    xero_invoice_id NVARCHAR(50) NOT NULL,
    account_id INT REFERENCES crm_accounts(id),
    contact_id INT REFERENCES crm_contacts(id),
    opportunity_id INT REFERENCES crm_opportunities(id),
    quote_id INT REFERENCES crm_quotes(id),
    invoice_number NVARCHAR(50),
    status VARCHAR(20),                                 -- draft | submitted | paid | overdue | voided
    total DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'CAD',
    due_date DATE,
    paid_at DATETIME2,

    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE()
);
```

### crm_contracts

Contracts tied to deals. Documents stored in Azure Blob Storage.

```sql
CREATE TABLE crm_contracts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    account_id INT REFERENCES crm_accounts(id),
    contact_id INT REFERENCES crm_contacts(id),
    opportunity_id INT REFERENCES crm_opportunities(id),
    quote_id INT REFERENCES crm_quotes(id),
    contract_type VARCHAR(20),                          -- msa | sow | nda | amendment
    status VARCHAR(20) DEFAULT 'draft',                 -- draft | sent | signed | active | expired | terminated
    title NVARCHAR(300),
    start_date DATE,
    end_date DATE,
    monthly_value DECIMAL(18,2),
    total_value DECIMAL(18,2),
    currency VARCHAR(3) DEFAULT 'CAD',
    document_url NVARCHAR(500),                         -- current signed version in blob storage
    template_used NVARCHAR(200),

    created_at DATETIME2 DEFAULT GETUTCDATE(),
    updated_at DATETIME2 DEFAULT GETUTCDATE(),
    signed_at DATETIME2
);
```

### crm_contract_documents

Version history for contract revisions.

```sql
CREATE TABLE crm_contract_documents (
    id INT IDENTITY(1,1) PRIMARY KEY,
    contract_id INT REFERENCES crm_contracts(id),
    version INT NOT NULL,
    document_url NVARCHAR(500),                         -- blob storage URL
    generated_at DATETIME2 DEFAULT GETUTCDATE(),
    generated_by NVARCHAR(255),
    template_used NVARCHAR(200),
    notes NVARCHAR(500)
);
```

### crm_subscriptions

Communication preferences per contact.

```sql
CREATE TABLE crm_subscriptions (
    id INT IDENTITY(1,1) PRIMARY KEY,
    contact_id INT REFERENCES crm_contacts(id),
    subscription_type VARCHAR(30),                      -- newsletter | product_updates | service_alerts
    status VARCHAR(20) DEFAULT 'active',                -- active | unsubscribed
    subscribed_at DATETIME2 DEFAULT GETUTCDATE(),
    unsubscribed_at DATETIME2
);
```

### Entity Relationship Summary

```
crm_accounts (1) ──── (N) crm_contacts
crm_accounts (1) ──── (N) crm_opportunities
crm_contacts (1) ──── (N) crm_activities
crm_accounts (1) ──── (N) crm_activities
crm_opportunities (1) ── (N) crm_activities
crm_opportunities (1) ── (N) crm_quotes
crm_opportunities (1) ── (N) crm_invoices
crm_opportunities (1) ── (N) crm_contracts
crm_quotes (1) ──────── (N) crm_invoices
crm_contracts (1) ────── (N) crm_contract_documents
crm_contacts (1) ──────── (N) crm_subscriptions
```

### Deal Lifecycle Chain

```
Contact (lead) → Qualified → Opportunity → Quote (Xero) → Contract → Invoice (Xero)
```

Each link is optional. A retainer client gets monthly invoices with no quote. A project gets quote → accepted → contract → invoice.

## API Endpoints

### Contacts
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/contacts` | List with filters (type, stage, owner, search) |
| GET | `/api/contacts/:id` | Single contact with account info |
| POST | `/api/contacts` | Create contact |
| PATCH | `/api/contacts/:id` | Update contact |
| GET | `/api/contacts/:id/timeline` | Unified activity feed |
| POST | `/api/contacts/:id/enrich` | Trigger Lusha enrichment |
| POST | `/api/contacts/:id/convert` | Convert lead to contact |

### Accounts
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/accounts` | List with filters |
| GET | `/api/accounts/:id` | Single account with contacts, deal summary |
| POST | `/api/accounts` | Create account |
| PATCH | `/api/accounts/:id` | Update account |
| GET | `/api/accounts/:id/timeline` | Account-level activity roll-up |

### Opportunities (Pipeline)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/opportunities` | List with stage/owner filters |
| GET | `/api/opportunities/:id` | Single deal with quotes, invoices, contracts |
| POST | `/api/opportunities` | Create deal |
| PATCH | `/api/opportunities/:id` | Update deal (including stage changes) |
| GET | `/api/pipeline` | Grouped by stage with totals |

### Activities
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/activities` | Log an activity (used by integrations) |
| GET | `/api/activities/recent` | Recent across all contacts |

### Contracts
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/contracts` | List with status filters |
| POST | `/api/contracts` | Create contract record |
| PATCH | `/api/contracts/:id` | Update status |
| POST | `/api/contracts/generate` | Generate document from template + opportunity data |
| GET | `/api/contracts/expiring` | Contracts expiring within N days |

### Quotes & Invoices
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/quotes` | List (synced from Xero) |
| GET | `/api/invoices` | List (synced from Xero) |
| POST | `/api/xero/sync` | Trigger Xero sync |

### Dashboard
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/dashboard` | Pipeline totals, recent activities, stale leads, expiring contracts |

## Integration Architecture

### Inbound (data flows INTO CRM)

| Source | Current Target | New Target | Mechanism |
|--------|---------------|------------|-----------|
| Website contact form | Dynamics via PA flow | `POST /api/contacts` | Direct API call |
| Digital card scan | Dynamics + SQL leads | `POST /api/contacts` | Direct API call |
| Booking flow | Graph + SQL leads | `POST /api/contacts` + `POST /api/activities` | Direct API call |
| Granola meeting sync | Dynamics via PA flow | `POST /api/activities` | Direct API call |
| Email tracking | forit-Productivity | `POST /api/activities` | Direct API call |
| Lusha enrichment | SQL lead_enrichments + Dynamics | `PATCH /api/contacts/:id` | Direct API call |
| Xero quotes/invoices | N/A | `POST /api/xero/sync` | Xero webhook |
| Mailing list subscribe | Dataverse forit_subscriptions | `POST /api/contacts` + subscription | Direct API call |

### Outbound (CRM data consumed by other systems)

| Consumer | Current Source | New Source | Mechanism |
|----------|--------------|------------|-----------|
| Daily digest email | Dynamics via PA flow | `GET /api/pipeline` + `GET /api/activities/recent` | Direct API call |
| Dolores AI | Dynamics via PA flow | MCP tools querying CRM API | Direct API call |
| Mailing list flow | Dataverse | `GET /api/contacts` with subscription filter | Direct API call |
| Daily build monitor | Dynamics pipeline | `GET /api/dashboard` | Direct API call |

### What We Keep

- **Microsoft Graph API** — Calendar, email, Teams (this is M365, not Dynamics)
- **Xero** — Quote/invoice document generation and financial records
- **Lusha** — Contact/company enrichment
- **Stripe** — SaaS billing (separate from CRM invoices)
- **Pax8** — License reselling

### What We Eliminate

- **Dynamics 365 Sales** — Entirely replaced
- **Power Automate flows** — All Dynamics-related flows decommissioned
- **Dataverse** — No longer needed for subscriptions or contact data

## UI Design — crm.forit.io

### Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Azure Static Web Apps
- Microsoft SSO (employee-only access)

### Views

**Dashboard (home)**
- Pipeline summary: horizontal stacked bar by stage with dollar totals
- Recent activity feed (last 20 activities across all contacts)
- Action items: stale leads (no activity in 7/14/30 days), expiring contracts, overdue invoices
- Quick stats: total pipeline value, deals won this month, new leads this week

**Contacts**
- Searchable, sortable table
- Filters: type (lead/contact/partner), lifecycle stage, owner, source
- Bulk actions: assign owner, change type
- Click into contact → detail view:
  - Header: name, company, email, phone, lifecycle badge
  - Tabs: Timeline | Deals | Quotes/Invoices | Subscriptions
  - Timeline: chronological feed of all activities (emails, meetings, notes, quotes, invoices, contracts)

**Accounts**
- Company list with columns: name, industry, deal count, total revenue, last activity
- Click into account → detail view:
  - Header: company name, domain, industry, type badge
  - Tabs: Contacts | Timeline | Deals | Contracts | Invoices
  - Contacts: people at this company
  - Timeline: roll-up of all contact activities at this account

**Pipeline**
- Kanban board: columns = stages (Discovery, Proposal, Negotiation, Won, Lost)
- Cards show: deal name, account, value, probability, days in stage
- Drag to move between stages
- Click into deal → detail view with linked quote, contract, invoice status

**Contracts**
- Table view: title, account, status, start/end dates, monthly value
- Status filters: draft, sent, signed, active, expiring soon, expired
- Click into → document download, version history, linked deal

**Quotes & Invoices**
- Table view synced from Xero
- Links open in Xero for editing
- Status badges: paid (green), overdue (red), pending (amber)

### Dolores Integration
- Chat widget (bottom-right corner) on every page
- Natural language queries: "What's our history with Pivot Airlines?"
- Actions: "Create a follow-up task for the Great North deal"
- Context-aware: knows which contact/account you're viewing

## Migration Strategy

### Phase 1 — Foundation (Week 1-2)
- Create `forit-CRM` repo
- Set up Azure Functions + Next.js project structure
- Database migrations: create all `crm_*` tables
- Core CRUD APIs: contacts, accounts, opportunities, activities
- Auth: Microsoft SSO for employees
- Basic health check and deployment pipeline

### Phase 2 — Data Migration (Week 2-3)
- One-time migration script:
  - Dynamics 365 contacts → `crm_contacts` (type=contact)
  - Dynamics 365 leads → `crm_contacts` (type=lead)
  - Dynamics 365 accounts → `crm_accounts`
  - Dynamics 365 opportunities → `crm_opportunities`
  - SQL `leads` table → merge into `crm_contacts` (dedupe by email)
  - SQL `lead_enrichments` → populate enrichment fields on `crm_contacts`
  - SQL `newsletter_subscribers` → `crm_contacts` + `crm_subscriptions`
  - SharePoint contracts → blob storage + `crm_contracts`
- Deduplication: match by email (primary), then phone, then name+company
- Preserve Dynamics GUIDs in `dynamics_id` for reference

### Phase 3 — Rewire Integrations (Week 3-4)
- `forit-Website/lead-create` → POST to CRM API
- `forit-Website/card-lead` → POST to CRM API
- `forit-Website/booking-create` → POST to CRM API
- `forit-dynamics-functions/granola-sync` → POST activities to CRM API
- `forit-dynamics-functions/daily-digest` → query CRM API for pipeline data
- `forit-Website/email-preferences` → query CRM subscriptions
- Xero webhook → sync quotes/invoices to CRM
- Mailing list flow → query CRM contacts/subscriptions

### Phase 4 — UI (Week 4-6)
- Deploy `crm.forit.io` SWA
- Build all views: dashboard, contacts, accounts, pipeline, contracts, quotes/invoices
- Dolores chat widget integration
- Contract document generation from templates

### Phase 5 — Decommission Dynamics (Week 6+)
- Verify all data present and integrations working
- Run parallel for 1-2 weeks (both systems receiving data)
- Turn off Power Automate flows that talk to Dynamics
- Cancel Dynamics 365 Sales license
- Archive this repo (forit-DynamicsSales)

## Cost Comparison

### Current (Dynamics 365)
- Dynamics 365 Sales license: ~$65-95 USD/user/month
- Power Automate premium connectors: included but limited
- Hidden costs: time spent debugging PA flows, connection reference issues, API limitations

### After (Custom CRM)
- Azure SQL: already paid for (shared database)
- Azure Functions: consumption plan, likely < $5/month
- Azure SWA: free tier or ~$9/month for custom domain
- Blob Storage: pennies for contract documents
- **Total incremental cost: ~$10-15/month**

## Dolores MCP Tools (Future)

Once the CRM API exists, Dolores gets these MCP tools:

- `crm_search_contacts` — Find contacts by name, email, company
- `crm_get_timeline` — Get activity history for a contact or account
- `crm_get_pipeline` — Current pipeline status
- `crm_create_activity` — Log a note, task, or interaction
- `crm_update_opportunity` — Move deals through stages
- `crm_relationship_summary` — AI-generated summary of full relationship history

This makes Dolores the primary interface for quick CRM queries and updates, with `crm.forit.io` for visual pipeline management and detailed views.
