# Teams Meeting & Granola Note Sync — Design

**Date:** 2026-03-08
**Status:** In Progress
**Owner:** Ben Thomas

## Problem

Meeting data is scattered: Teams calendar has meetings and attendees, Granola has AI meeting summaries and transcripts, but neither feeds into the CRM. Sales conversations with contacts aren't tracked in the activity timeline.

## Solution

Two sync functions in `forit-CRM/api/` that feed meeting data into `crm_activities`:

1. **meeting-sync** — Graph API calendar delta sync for Teams meetings
2. **granola-sync** — Granola API poll for AI meeting notes

Both use the same `crm_activities` table with `graph_event_id` as the dedup key. Teams creates the meeting record; Granola enriches it with AI summary. They can also operate independently.

## Architecture

```
Teams Calendar ─── meeting-sync ──┐
                                  ├──→ crm_activities (activity_type='meeting')
Granola Notes ──── granola-sync ──┘    crm_activity_participants (junction)
```

### meeting-sync (POST /api/meeting-sync)

Follows the exact pattern of `email-sync`:

1. Get Graph token (client_credentials, same app registration)
2. Build contact cache from `crm_contacts` (email → contact_id map)
3. For each user in tenant:
   - Call `/users/{id}/calendarView/delta` (or stored delta token)
   - Filter events where `isOnlineMeeting = true`
   - MERGE into `crm_activities` (keyed on `graph_event_id`)
   - MERGE into `crm_activity_participants` (keyed on activity_id + email)
   - Match participant emails to CRM contacts
   - Update `last_activity_at` on matched contacts/accounts
4. Store delta token in `crm_sync_state`
5. Return sync summary

### granola-sync (POST /api/granola-sync)

Rewires existing `forit-dynamics-functions/granola-sync` logic:

1. Fetch notes from Granola API (`https://public-api.granola.ai/v1`)
2. Filter for notes created since last sync
3. For each note:
   - Look up existing activity by `graph_event_id` (Granola provides `calendarEventId`)
   - If found: UPDATE with AI summary + transcript
   - If not found: INSERT new activity (for non-Teams meetings)
   - Extract external attendees → MERGE into `crm_activity_participants`
   - Match emails to CRM contacts
4. Store last sync timestamp in `crm_sync_state`

### Dedup Strategy

```
Calendar Event ID = universal dedup key

Teams meeting-sync:  graph_event_id = event.id
Granola granola-sync: graph_event_id = note.calendarEventId (same Graph event)

Result: Both sources enrich the SAME crm_activities row
```

## Database Changes (Migration 006)

### Add to crm_activities
```sql
ALTER TABLE crm_activities ADD graph_event_id NVARCHAR(500) NULL;
CREATE UNIQUE INDEX ... ON crm_activities(graph_event_id) WHERE graph_event_id IS NOT NULL;
```

### New: crm_activity_participants
```sql
CREATE TABLE crm_activity_participants (
    id              INT IDENTITY(1,1) PRIMARY KEY,
    activity_id     INT NOT NULL REFERENCES crm_activities(id),
    contact_id      INT NULL REFERENCES crm_contacts(id),
    email           NVARCHAR(255) NOT NULL,
    display_name    NVARCHAR(255) NULL,
    role            VARCHAR(20) NULL,       -- organizer | required | optional
    rsvp_status     VARCHAR(20) NULL,       -- accepted | declined | tentative | none
    attended        BIT NULL,
    duration_seconds INT NULL
);
```

### New: crm_sync_state
```sql
CREATE TABLE crm_sync_state (
    id          INT IDENTITY(1,1) PRIMARY KEY,
    sync_type   VARCHAR(50) NOT NULL,       -- meeting_sync | granola_sync
    user_id     NVARCHAR(255) NOT NULL,
    delta_token NVARCHAR(MAX) NULL,
    last_sync   DATETIME2 NULL,
    metadata    NVARCHAR(MAX) NULL
);
```

## Permissions Required

Same Azure AD app registration as email-sync (`ef356976-d7ab-4f92-9d3f-4c0d0985b273`):

| Scope | Purpose | Already granted? |
|-------|---------|-----------------|
| `Calendars.Read` | Calendar delta sync | Likely yes (email-sync reads mail) |
| `OnlineMeetings.Read.All` | Meeting details | Needs admin consent |
| `OnlineMeetingArtifact.Read.All` | Attendance reports | Needs admin consent + access policy |

Calendar delta sync only needs `Calendars.Read` — the rest is for future enrichment (attendance reports, transcripts).

## Data Flow Example

```
1. Ben has a Teams call with Jane (jane@pivot.com) at 2pm

2. meeting-sync runs at 2:15pm:
   → Graph delta returns new event: "Weekly Sync with Pivot"
   → Creates crm_activities row (graph_event_id = "AAMk...")
   → Creates 2 participants: ben@forit.io, jane@pivot.com
   → jane@pivot.com matches crm_contacts.email → links contact_id
   → Updates Jane's last_activity_at

3. granola-sync runs at 2:30pm:
   → Granola API returns note with calendarEventId = "AAMk..."
   → Finds existing activity by graph_event_id
   → UPDATEs summary with Granola AI summary
   → UPDATEs raw_data with transcript reference

4. CRM timeline for Jane now shows:
   "Meeting: Weekly Sync with Pivot — 2:00 PM"
   "AI Summary: Discussed Q2 capacity planning, action items..."
```

## Full Feature Set

### Phase 1 (Built)
- Teams calendar delta sync → `crm_activities` + `crm_activity_participants`
- Granola note sync → enriches Teams meetings or creates standalone activities
- Contact matching by email
- Dedup via `graph_event_id` across both sources
- Transcript + AI summary storage in `crm_meeting_transcripts`

### Phase 2 (Planned)
- Attendance reports — actual join/leave times from Graph API
- Teams transcripts — VTT format from Graph API `getAllTranscripts/delta`
- Meeting chat messages — from `/chats/{threadId}/messages`
- Recording metadata — duration and URL (not binary content)
- Competitor/opportunity linking — auto-link meetings to deals when participant's account matches
