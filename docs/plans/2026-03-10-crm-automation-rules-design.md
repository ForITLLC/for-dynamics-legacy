# CRM Automation Rules Engine — Design Document

**Date**: 2026-03-10
**Status**: Draft — pending approval

## Overview

A configurable rules engine inside ForIT CRM that watches for events (approaching dates, stale records, threshold crossings, stage changes) and fires actions (create Planner task in ForIT Agile, send notification). Ships with 8 pre-configured rules active out of the box.

## Architecture

Three layers:

```
┌─────────────────────────────────────┐
│  Layer 1: Rules Manager GUI         │
│  (Automations tab in CRM)           │
│  Create / edit / toggle rules       │
└──────────────┬──────────────────────┘
               │ CRUD via /api/automation-rules
┌──────────────▼──────────────────────┐
│  Layer 2: Rules Table               │
│  (crm_automation_rules in SQL)      │
│  Stores rule definitions            │
└──────────────┬──────────────────────┘
               │ Read rules, evaluate conditions
┌──────────────▼──────────────────────┐
│  Layer 3: Rules Evaluator           │
│  (Scheduled Azure Function, cron)   │
│  Runs every hour, checks all rules  │
│  Fires actions when conditions met  │
└─────────────────────────────────────┘
```

**Phase 1** (this design): Scheduled evaluator runs on a cron (every hour). Queries the database, checks conditions, fires actions.

**Phase 2** (future): Real-time triggers via Dataverse webhooks for instant response to record changes.

## Event Types (15)

### Date-Based (6)
| ID | Event | Entity | Field | Config |
|----|-------|--------|-------|--------|
| `opp_close_date` | Opportunity close date approaching | opportunities | `close_date` | Days before |
| `contract_expiry` | Contract expiring | contracts | `end_date` | Days before |
| `quote_expiry` | Quote expiring | quotes | `expires_at` | Days before |
| `invoice_overdue` | Invoice past due | invoices | `due_date` | Days after |
| `subscription_renewal` | Subscription renewal coming | subscriptions | `end_date` | Days before |
| `activity_sla` | Activity SLA breach | activities | `due_date` | Days after |

### Inactivity-Based (3)
| ID | Event | Entity | Field | Config |
|----|-------|--------|-------|--------|
| `stale_account` | Account with no recent activity | accounts | `last_activity_at` | Days since |
| `stale_opportunity` | Opportunity with no activity | opportunities | `updated_at` | Days since |
| `stale_contact` | Contact with no engagement | contacts | `last_activity_at` | Days since |

### Threshold-Based (2)
| ID | Event | Entity | Field | Config |
|----|-------|--------|-------|--------|
| `lead_score` | Lead score crosses threshold | contacts | `lead_score` | Value >= N |
| `deal_size` | Deal size crosses threshold | opportunities | `amount` | Value >= N |

### Stage-Based (2)
| ID | Event | Entity | Field | Config |
|----|-------|--------|-------|--------|
| `opp_stage_change` | Opportunity stage changes | opportunities | `stage` | Target stage |
| `contact_lifecycle` | Contact lifecycle stage changes | contacts | `lifecycle_stage` | Target stage |

### Recurring (1)
| ID | Event | Entity | Field | Config |
|----|-------|--------|-------|--------|
| `recurring_checkin` | Periodic client check-in | accounts | — | Every N days |

### Assignment (1)
| ID | Event | Entity | Field | Config |
|----|-------|--------|-------|--------|
| `new_lead_assigned` | New lead assigned to user | contacts | `owner_id` | Filter by owner |

## Actions (2)

### Action 1: Create Planner Task

Creates a task in ForIT Agile Master Plan via `POST /api/master-plan/tasks`.

**Configuration fields:**
- **Bucket** — dropdown loaded from Master Plan API (Sales, Operations, HR, etc.)
- **Title template** — supports `{{placeholders}}`: `{{record_name}}`, `{{account_name}}`, `{{owner_name}}`, `{{event_value}}`, `{{entity_type}}`
- **Due date offset** — number of days from trigger (e.g. "due in 3 days")
- **Description template** — optional, same placeholders

**Example:**
- Bucket: `Sales`
- Title: `Follow up: {{record_name}} close date in {{event_value}} days`
- Due: 3 days from trigger

**Integration details:**
- Endpoint: `https://api.agile.forit.io/api/master-plan/tasks`
- Auth: `x-functions-key` header (stored as `AGILE_API_KEY` env var)
- Payload: `{ "title": "...", "bucket": "Sales", "dueDate": "2026-03-13" }`

### Action 2: Send Notification

Sends an email notification to a persona.

**Configuration fields:**
- **Persona** — who receives the notification (see Personas below)
- **Subject template** — supports same `{{placeholders}}`
- **Body template** — supports same `{{placeholders}}`, rendered as plain text

**Delivery:** Via CRM's existing email infrastructure (Office 365 connector or SendGrid, depending on what's configured).

## Notification Personas (4)

| Persona | Resolves To | Use Case |
|---------|-------------|----------|
| **Record Owner** | `owner_id` on the triggering record | "Your opportunity is stale" |
| **Account Owner** | `owner_id` on the parent account | "Your client's contract is expiring" |
| **CRM Admins** | All users with `admin` role in `crm_user_roles` | "System-level alerts" |
| **Specific Person** | Configured email address on the rule | "Always notify ops@forit.io" |

Resolution logic:
1. Look up `owner_id` → join to `crm_user_roles` → get email from Azure AD (or store email in user_roles table)
2. For CRM Admins, query `crm_user_roles WHERE role = 'admin'`
3. For Specific Person, use the email stored on the rule itself

## Database Schema

```sql
CREATE TABLE crm_automation_rules (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    event_type NVARCHAR(50) NOT NULL,        -- e.g. 'opp_close_date', 'stale_account'

    -- Event configuration (JSON)
    event_config NVARCHAR(MAX) NOT NULL,      -- {"days_before": 30} or {"threshold": 80}

    -- Entity filter (optional, JSON)
    entity_filter NVARCHAR(MAX) NULL,         -- [{"field":"owner_id","op":"eq","value":"..."}]

    -- Action
    action_type NVARCHAR(20) NOT NULL,        -- 'planner_task' or 'notification'
    action_config NVARCHAR(MAX) NOT NULL,     -- JSON: bucket, title template, persona, etc.

    -- State
    enabled BIT NOT NULL DEFAULT 1,
    is_template BIT NOT NULL DEFAULT 0,       -- Template rules (not active, one-click enable)
    last_evaluated_at DATETIME2 NULL,
    last_fired_at DATETIME2 NULL,
    fire_count INT NOT NULL DEFAULT 0,

    -- Metadata
    created_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    updated_at DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- Track which records have been actioned to prevent duplicates
CREATE TABLE crm_automation_log (
    id INT IDENTITY(1,1) PRIMARY KEY,
    rule_id INT NOT NULL REFERENCES crm_automation_rules(id),
    entity_type NVARCHAR(50) NOT NULL,        -- 'opportunities', 'accounts', etc.
    entity_id INT NOT NULL,
    action_taken NVARCHAR(20) NOT NULL,       -- 'planner_task' or 'notification'
    action_result NVARCHAR(MAX) NULL,         -- JSON: task ID, email status, etc.
    fired_at DATETIME2 NOT NULL DEFAULT GETUTCDATE(),

    -- Prevent duplicate actions for same rule + record within evaluation window
    CONSTRAINT UQ_rule_entity UNIQUE (rule_id, entity_type, entity_id)
);

CREATE INDEX IX_automation_rules_enabled ON crm_automation_rules(enabled, event_type);
CREATE INDEX IX_automation_log_rule ON crm_automation_log(rule_id, fired_at);
CREATE INDEX IX_automation_log_entity ON crm_automation_log(entity_type, entity_id);
```

**Duplicate prevention:** The `crm_automation_log` table with a unique constraint on `(rule_id, entity_type, entity_id)` ensures each rule fires only once per record. For recurring rules (like quarterly check-in), the evaluator deletes old log entries when the interval has elapsed, allowing re-fire.

## Seed Rules (8 Active by Default)

These are created by the migration script with `enabled = 1, is_template = 0`:

| # | Name | Event Type | Config | Action | Action Config |
|---|------|-----------|--------|--------|---------------|
| 1 | Close date approaching | `opp_close_date` | 30 days before | Planner Task | Bucket: Sales, Title: `Review: {{record_name}} closes in {{event_value}} days` |
| 2 | Contract renewal warning | `contract_expiry` | 60 days before | Planner Task | Bucket: Operations, Title: `Renewal: {{record_name}} expires in {{event_value}} days` |
| 3 | Quote about to expire | `quote_expiry` | 7 days before | Notification | Persona: Record Owner, Subject: `Quote expiring: {{record_name}}` |
| 4 | Invoice overdue | `invoice_overdue` | 1 day after | Notification | Persona: Account Owner, Subject: `Invoice overdue: {{record_name}}` |
| 5 | Stale account check-in | `stale_account` | 90 days | Planner Task | Bucket: Operations, Title: `Check in: {{record_name}} ({{event_value}} days idle)` |
| 6 | Stale opportunity follow-up | `stale_opportunity` | 30 days | Notification | Persona: Record Owner, Subject: `Stale opportunity: {{record_name}}` |
| 7 | Hot lead alert | `lead_score` | >= 80 | Planner Task | Bucket: Sales, Title: `Hot lead: {{record_name}} (score: {{event_value}})` |
| 8 | Quarterly client check-in | `recurring_checkin` | Every 90 days | Planner Task | Bucket: Operations, Title: `Quarterly check-in: {{record_name}}` |

## Template Rules (7, One-Click Activate)

Created with `enabled = 0, is_template = 1`:

| # | Name | Event Type | Default Config |
|---|------|-----------|----------------|
| 9 | Opportunity stage change | `opp_stage_change` | Stage: "Proposal" → Planner Task |
| 10 | Contact lifecycle change | `contact_lifecycle` | Stage: "Customer" → Notification |
| 11 | Subscription renewal | `subscription_renewal` | 30 days before → Notification |
| 12 | Capacity threshold | `deal_size` | >= $100k → Notification to CRM Admins |
| 13 | New lead assigned | `new_lead_assigned` | Any → Notification to Record Owner |
| 14 | Activity SLA breach | `activity_sla` | 1 day overdue → Notification to Record Owner |
| 15 | Stale contact re-engage | `stale_contact` | 60 days → Planner Task |

## GUI — Automations Tab

New top-level tab in CRM navigation, consistent with existing tab pattern.

### Rules List View

```
┌─────────────────────────────────────────────────────────────┐
│  Automations                                    [+ New Rule]│
├─────────────────────────────────────────────────────────────┤
│  Filter: [All Events ▼]  [All Actions ▼]  [Active ▼]       │
├────┬──────────────────┬──────────────┬──────────┬───────────┤
│ ⚡ │ Name             │ Event        │ Action   │ Last Fired│
├────┼──────────────────┼──────────────┼──────────┼───────────┤
│ 🟢 │ Close date...    │ Opp close    │ Task→Sales│ 2h ago(3)│
│ 🟢 │ Contract renew...│ Contract exp │ Task→Ops │ Yesterday │
│ 🟢 │ Quote expiring...│ Quote exp    │ Notify   │ Never     │
│ ⏸️ │ Opp stage change │ Stage change │ Task→Sales│ Template  │
├────┴──────────────────┴──────────────┴──────────┴───────────┤
│  Templates (7 available)                        [Show ▼]    │
└─────────────────────────────────────────────────────────────┘
```

- Active rules show green dot, paused show pause icon
- Templates collapsed by default, expandable
- Click row to edit, toggle switch for enable/disable
- "Last Fired" shows relative time + count

### Rule Editor Modal

Single scrollable modal (consistent with blog post editor):

```
┌─────────────────────────────────────────────────────────────┐
│  Edit Rule                                           [Save] │
├─────────────────────────────────────────────────────────────┤
│  Name: [Close date approaching________________]             │
│                                                             │
│  Event Type: [Opportunity close date ▼]                     │
│    ┌─ Days before close date: [30]                          │
│                                                             │
│  Filter (optional):                                         │
│    [+ Add condition]                                        │
│    ┌ owner_id [equals ▼] [Ben Thomas ▼] [✕]                │
│                                                             │
│  Action: (●) Create Task  ( ) Send Notification             │
│    ┌─ Bucket: [Sales ▼]                                     │
│    ├─ Title:  [Review: {{record_name}} closes in {{ev...]   │
│    ├─ Due in: [3] days                                      │
│    └─ Description: [optional_______________________]        │
│                                                             │
│  Enabled: [████░░] ON                                       │
│                                                             │
│  ── History ──────────────────────────────────               │
│  Last evaluated: 2026-03-10 14:00 UTC                       │
│  Last fired: 2026-03-10 14:00 UTC (3 records)               │
│  Total fires: 47                                            │
└─────────────────────────────────────────────────────────────┘
```

Placeholder tokens shown as clickable chips below the title/description fields:
`{{record_name}}` `{{account_name}}` `{{owner_name}}` `{{event_value}}` `{{entity_type}}`

## Rules Evaluator — Scheduled Function

### Endpoint
`/api/evaluate-rules` — Azure Function on a timer trigger (every 60 minutes) or callable manually.

### Evaluation Loop (pseudocode)

```
for each rule WHERE enabled = 1 AND is_template = 0:
    records = queryMatchingRecords(rule.event_type, rule.event_config, rule.entity_filter)
    for each record:
        if NOT already in crm_automation_log(rule.id, entity_type, record.id):
            if rule.action_type == 'planner_task':
                POST to ForIT Agile Master Plan API
            else:
                send notification email to resolved persona
            INSERT into crm_automation_log
    UPDATE rule SET last_evaluated_at = NOW(), fire_count += len(new_fires)
```

### Query Builders (per event type)

Each event type has a SQL query builder:

```javascript
const EVENT_QUERIES = {
  opp_close_date: (config) => ({
    entity: 'opportunities',
    sql: `SELECT id, name, close_date, owner_id, account_id
          FROM crm_opportunities
          WHERE stage != 'Closed Won' AND stage != 'Closed Lost'
          AND close_date BETWEEN GETUTCDATE() AND DATEADD(day, @days, GETUTCDATE())`,
    params: { days: config.days_before }
  }),

  stale_account: (config) => ({
    entity: 'accounts',
    sql: `SELECT id, name, owner_id, last_activity_at
          FROM crm_accounts
          WHERE status = 'active'
          AND (last_activity_at IS NULL OR last_activity_at < DATEADD(day, -@days, GETUTCDATE()))`,
    params: { days: config.days_since }
  }),

  recurring_checkin: (config) => ({
    entity: 'accounts',
    sql: `SELECT a.id, a.name, a.owner_id
          FROM crm_accounts a
          WHERE a.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM crm_automation_log l
            WHERE l.rule_id = @rule_id AND l.entity_id = a.id
            AND l.fired_at > DATEADD(day, -@interval, GETUTCDATE())
          )`,
    params: { interval: config.every_n_days, rule_id: 'RULE_ID' }
  }),
  // ... etc for all 15 types
}
```

### Deduplication

The `crm_automation_log` unique constraint `(rule_id, entity_type, entity_id)` prevents firing twice for the same record. For recurring rules, old log entries are cleared when the interval elapses (handled in the query with `NOT EXISTS`).

## API Endpoints

### `/api/automation-rules` (CRUD)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/automation-rules` | List all rules (with last_fired stats) |
| GET | `/api/automation-rules/:id` | Get single rule with recent log entries |
| POST | `/api/automation-rules` | Create new rule |
| PATCH | `/api/automation-rules/:id` | Update rule |
| DELETE | `/api/automation-rules/:id` | Delete rule + its log entries |
| POST | `/api/automation-rules/:id/test` | Dry-run: show matching records without firing |

### `/api/evaluate-rules` (Evaluator)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/evaluate-rules` | Run evaluation cycle (timer trigger or manual) |
| GET | `/api/evaluate-rules/status` | Last run time, rules evaluated, actions fired |

### `/api/automation-rules/buckets` (Proxy)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/automation-rules/buckets` | Proxy to ForIT Agile Master Plan to list available buckets |

All endpoints require `authenticated` role + `requireWriteAccess` for mutations.

## Implementation Plan

### Phase 1: Foundation (MVP)
1. Migration script: `crm_automation_rules` + `crm_automation_log` tables + seed 15 rules
2. API: `/api/automation-rules` CRUD endpoint
3. GUI: Automations tab with rules list + editor modal
4. Evaluator: `/api/evaluate-rules` with date-based event queries only
5. Planner task action: POST to ForIT Agile Master Plan API
6. Notification action: Email via Office 365 connector

### Phase 2: Polish
7. Dry-run / test mode for rules
8. Execution history view (log entries per rule)
9. Entity filter builder in GUI
10. Placeholder chip picker in template fields

### Phase 3: Real-Time (Future)
11. Dataverse webhook integration for instant triggers
12. Stage-change events (currently polled, move to push)
13. Dashboard widget: "Rules fired today"

## Dependencies

- **ForIT Agile Master Plan API** — for creating Planner tasks and listing buckets
- **`AGILE_API_KEY`** — Azure SWA app setting for Agile API auth
- **Office 365 connector** — for sending notification emails (already available in CRM)
- **CRM user_roles table** — for resolving CRM Admins persona

## Open Questions

1. Should the evaluator run every hour or every 15 minutes?
2. Email notifications: use existing CRM email infra or dedicated SendGrid?
3. Should rule fire history be visible to non-admin users?
