# ForIT Power Automate Flows

## Overview

This document catalogs all custom ForIT Power Automate flows in Dynamics 365, their purposes, and current status.

---

## Active Flows

### Lead Automation

| Flow | ID | Status | Trigger | Action |
|------|-----|--------|---------|--------|
| ForIT - New Lead Email Notification | `9487cfd1-572d-466c-8909-24abb4a36ef1` | **Active** | On Lead create (non-web only) | Emails b.thomas@forit.io - skips web leads (leadsourcecode=8) |
| ForIT Lead Processor - Complete v3 | `9dad0cfe-6475-f011-b4cc-000d3a59cf44` | Active | Scheduled | Processes leads hourly |

### Opportunity Automation

| Flow | ID | Status | Trigger | Action |
|------|-----|--------|---------|--------|
| ForIT - Opportunity Follow-up Email | `c5d31373-4b75-f011-b4cc-6045bd01a7b1` | Active | On Opportunity create/update | Creates follow-up tasks |

---

## Inactive Flows (Available for Use)

### Lead Flows

| Flow | ID | Description |
|------|-----|-------------|
| ForIT - Lead Review Email (on create) | `c5b7cd5c-4b75-f011-b4cc-000d3a59cf44` | Creates review TASKS on lead creation - **TURNED OFF** |
| ForIT - Lead Review Email (hourly) | `c2535224-4875-f011-b4cc-6045bd01a7b1` | Scheduled task creation with duplicate prevention |
| ForIT - Lead Lifecycle Processor v2 | `3cbd5bd0-4775-f011-b4cc-000d3a59cf44` | Intelligent processor handling all stages |
| ForIT - Lead Nurture Email (3-day) | `f13c22f3-4675-f011-b4cc-000d3a5a5a88` | 3-day follow-up sequence |

### Mailing List Flows (Deprecated - Use Form Site)

| Flow | ID | Description |
|------|-----|-------------|
| ForIT - Mailing List API | `0c9286fa-ffe8-f011-8406-7ced8d3b5021` | Original API handler |
| ForIT - Mailing List API v2 | `b1115548-00e9-f011-8406-7ced8d3b5021` | Updated handler |
| ForIT - Mailing List API v3 | `3a53e3bd-01e9-f011-8406-7ced8d3b5021` | Latest version |

**Note:** Mailing list functionality is now consolidated into Form Site universal flow.

---

## Website Flows

### Form Site (Universal Handler)

| Flow | ID | Status | Purpose |
|------|-----|--------|---------|
| Form Site | `9b48af52-ab5c-436a-9a8a-b215bae39ae9` | Active | Universal form handler |

**Handles:**
- `formType: "apply"` - Job applications → HR SharePoint + hr@forit.io
- `formType: "contact"` - Contact form → Dynamics Lead + info@forit.io
- `formType: "subscribe"` - Newsletter → Dynamics Contact + Subscriptions
- `formType: "unsubscribe"` - Deactivate subscriptions

**Trigger URL:**
```
https://3d37c1782b8cee0989ee8505fbd6ba.1e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/dacd824ab71641fd93361ddaa6257bc8/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=HIFi5GQfclCl7un01wy1ufc7hX5I54fbmutsB13RIdQ
```

### Dolores (Chat Widget)

| Flow | ID | Status | Purpose |
|------|-----|--------|---------|
| ForIT Website \| Dolores \| Chat Assistant | `e92e3be8-8622-4dfd-8bfa-c22bf5d17378` | Active | AI chat responses |
| ForIT Website \| Dolores \| Booking Availability | `d58ccee4-bac7-4746-9056-2a6f67e9458a` | Active | Get available slots |
| ForIT Website \| Dolores \| Create Booking | `618ff607-16f3-4d2e-9348-b7b98ee36ff9` | Active | Book appointment |
| ForIT Website \| Dolores \| Escalation | `05cd8425-3e60-4b9a-8748-40b519a60de7` | Active | Escalate to human |
| ForIT Website \| Dolores \| Team Members | `d6fcda7a-73b6-4644-8395-c530ba7d7f90` | Active | Get team info |

### Portal Flows (Authenticated)

| Flow | ID | Status | Purpose |
|------|-----|--------|---------|
| ForIT Portal \| Customer \| Account Summary | `883f4c06-20c2-4992-a986-9b6f3fca364e` | Active | Customer account overview |
| ForIT Portal \| Customer \| Data API | `079e36d8-8c8d-4f65-b85c-494e84c37eca` | Active | Customer data operations |
| ForIT Portal \| Employee \| Data API | `9c6a6727-4002-4edb-80a7-de5da2ec62af` | Active | Employee internal operations |

---

## Critical Rules

### NO MANUAL TASK CREATION

**All tasks must be created via automated workflows.** Never use `POST /api/data/v9.2/tasks` directly.

If tasks are needed:
1. Use an existing flow that creates tasks
2. Or create a new automated flow

### Lead Processing Behavior

When a **Lead is created** (via contact form, API, or manually):
1. ~~"ForIT - Lead Review Email (on create)" creates a task~~ **DISABLED**
2. "ForIT - Lead Email Reminders" sends email to Ben **NEEDS ACTIVATION**
3. "ForIT Lead Processor - Complete v3" picks up on hourly schedule

### Preferred Flow: Email Reminders

Use **ForIT - Lead Email Reminders** instead of task-creating flows because:
- Emails don't clutter the task list
- Ben gets notified immediately
- No duplicate task issues

---

## Change Log

| Date | Change |
|------|--------|
| 2026-01-14 | Turned OFF "Lead Review Email (on create)" - was creating tasks |
| 2026-01-14 | Documented all ForIT flows |
| 2026-01-14 | Consolidated website forms to Form Site |
| 2026-01-15 | Created "New Lead Email Notification" - sends email on lead create (no tasks) |
| 2026-01-15 | Added filter: skips web leads (leadsourcecode=8) to avoid duplicate emails |
