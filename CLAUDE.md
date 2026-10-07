# Dynamics 365 Sales Customization Project

Version control and deployment automation for ForIT's Dynamics 365 Sales instance (`https://forit.crm.dynamics.com`): themes, forms, views, dashboards, web resources, navigation, workflows and Power Automate flows.

This file is the rules. The long form (history, worked examples, API payloads, schemas, reference tables) is kept verbatim in [docs/claude-md-reference.md](docs/claude-md-reference.md); "Ref: <heading>" names the section there. Flow inventory: [docs/power-automate-flows.md](docs/power-automate-flows.md).

## CRITICAL RULES - NO MANUAL TASKS

**NEVER CREATE MANUAL TASKS** - All tasks must be created via automated workflows/Power Automate
- Do NOT use `POST /api/data/v9.2/tasks` endpoint to manually create tasks
- Tasks should ONLY be created by automated processes (Power Automate, Workflows, BPF)
- If user needs tasks, create a workflow/flow that creates them automatically
- Violating this rule is unacceptable - ALL task creation must be automated

## What We Sync

- **Theme**: Microsoft Blue (#0078D4) with turquoise accents (#40E0D0); brand colors aligned with ForIT brand guidelines; typography, spacing, logo.
- **Forms**: Account custom sections; Contact VIP status rules; hidden fax and ticker symbol; required field validations (Industry mandatory on accounts); 2- and 3-column layouts.
- **Views**: Active Customers (by customer type), High Value Pipeline (opportunities > $100k); FetchXML for complex filters.
- **Dashboards**: Sales Performance (funnel charts), Hot Leads widget.
- **Web resources**: `webresources/styles/custom.css` (global styling overrides), `webresources/scripts/validation.js` (form validation utilities).
- **Navigation**: custom Dashboard item, Reports Hub; hidden Competitors, Literature.
- **Workflows**: Auto Lead Qualification (budget > $50k), task creation for high-value leads, opportunity scoring plugin.
- **Custom fields**: `customfield_industry`, `customfield_vipstatus`, `customfield_customertype`, `region_code`, `territory_manager`.

Ref: What We Sync, Modifications We Make, File Structure.

## How We Work

1. **Pull Current State** from production (`npm run pull-theme`: theme, forms, views, dashboards).
2. **Local Development**: modify `customizations.yaml` and web resources.
3. **Version Control**: track changes in Git.
4. **Validation**: `npm run validate` (YAML syntax and configuration) before deployment.
5. **Deploy**: `npm run deploy-theme` uploads and publishes.
6. **Backup**: `npm run backup`; automatic timestamped backups go to `/backups/`.

### Best Practices
1. **Always Pull First**: Get latest from production before making changes
2. **Test in Sandbox**: Deploy to test environment first
3. **Document Changes**: Update this file with significant modifications (rule here, long form in docs/claude-md-reference.md)
4. **Use Version Control**: Commit changes with descriptive messages
5. **Backup Before Deploy**: Automatic backups prevent data loss
6. **Follow Naming Conventions**: Use Dynamics 365 standard naming
7. **Validate Before Deploy**: Run validation to catch errors early

### Common Tasks (Ref: Common Tasks)
- **Form field**: `customizations.yaml` → `forms.<entity>.fields`, add to a section, set required/hidden, deploy.
- **Brand colors**: `theme.colors` AND the CSS variables in `webresources/styles/custom.css`; deploy both theme and web resources.
- **Custom view**: `views.<entity>` with a FetchXML query, set default if needed, deploy.
- **Navigation item**: `navigation.customMenuItems` with name, URL, icon, position; deploy.

Troubleshooting (auth, deployment failures, theme not applying): Ref: Troubleshooting.

## Authentication

`.env` (not in Git): `DYNAMICS_INSTANCE_URL=https://forit.crm.dynamics.com`, `DYNAMICS_CLIENT_ID`, `DYNAMICS_CLIENT_SECRET`, `DYNAMICS_TENANT_ID`. The Node scripts use the OAuth2 client credentials flow against the Dynamics Web API through an Azure AD app registration; the scripts handle authentication automatically (Dynamics CRM user_impersonation; Dataverse Web API access; read/write themes, forms, views, web resources). Other connection methods: Ref: Connection Methods.

## How Claude Makes CRM Updates

- **Token**: `az account get-access-token --resource <resource> --query accessToken -o tsv`. Different APIs require different resource tokens: Dataverse operations `https://forit.crm.dynamics.com`; flow management `https://service.flow.microsoft.com/`.
- **Calls**: `https://forit.crm.dynamics.com/api/data/v9.2/{entity}` with `Authorization: Bearer $TOKEN`, `Content-Type: application/json`, `OData-MaxVersion: 4.0`. POST creates (opportunities, accounts; never tasks, see above), `PATCH {entity}(guid)` updates. Link records with `@odata.bind`: `"parentaccountid@odata.bind": "/accounts(guid)"`, `"regardingobjectid_opportunity@odata.bind": "/opportunities(guid)"`. Field lists and task `prioritycode` (1=High, 2=Normal, 3=Low): Ref: Data Fields We're Using.
- **Limitations**: custom fields need to be created via UI first (new_fieldname); navigation properties for lookups are read-only via API; some operations require PublishAll, which can conflict; theme logos must be manually selected in UI.
- **Context**: environment ID `3d37c178-2b8c-ee09-89ee-8505fbd6ba1e` (Portal); flows UI https://make.preview.powerautomate.com/environments/3d37c178-2b8c-ee09-89ee-8505fbd6ba1e/flows; use environment-specific URLs for the Flow Management API. Ben Thomas's systemuser ID is `498a69ce-4805-f011-bae2-000d3a596152`.
- **Business model and engagements**: Ref: Current Business Model - ForIT Fractional Services.

## Power Automate Flows

Payloads and worked examples: Ref: Lessons Learned - Power Automate Flow Management, Complete Power Automate Flow Programming Guide, Creating Power Automate Flows via API.

- **CRITICAL**: `schemaVersion` MUST be at the ROOT level of the clientdata JSON string, NOT inside properties (that causes JsonSerializationException). Correct: `"clientdata": "{\"schemaVersion\":\"1.0.0.0\",\"properties\":{...}}"`. Create with `POST /api/data/v9.2/workflows`, `"category": 5`, `"type": 1`, `"primaryentity": "none"`.
- **Connection references (Dataverse API)**: manual/Request triggers can use `"runtimeSource": "invoker"`; scheduled/automated triggers must use `"runtimeSource": "embedded"` with a proper connectionReferenceLogicalName. Workaround: create as manual flow first, export, modify to scheduled, reimport.
- **Connection references via the Flow API** (api.flow.microsoft.com): use `"source": "Embedded"` with the actual connectionName (e.g. `shared-commondataser-2aba18d5-6f7c-4c15-bad0-825026f34a07`), NOT `"runtimeSource": "invoker"` (that's for the Dataverse API).
- **Correct action types** (CRITICAL, learned 2026-01-04): use `"type": "If"` NOT `"Condition"`; `"type": "Foreach"` NOT `"ForEach"`; `"type": "Switch"` for switch statements. Expressions: `{"expression": {"equals": ["@value1", "value2"]}}`, `{"expression": {"greater": ["@length(...)", 0]}}`, `{"expression": {"and": [{"equals": [...]}, {"greater": [...]}]}}`. **Always export a working flow first** to copy correct structure.
- **JSON structure**: proper escaping when embedding in API calls; valid Logic Apps schema reference; `@{expressions}` for dynamic content; proper `runAfter` dependencies between actions; correct entity names and field references.
- **Testing**: create a manual flow first to validate JSON; export a working flow to understand structure; convert to a scheduled trigger in the UI or via reimport.
- **Editing**: the Solutions route is create solution (publisher `d21aab71-79e7-11dd-8874-00188b01e34f`) → `AddSolutionComponent` (`ComponentType: 29`) → `ExportSolution` (`"Managed": false`, Base64 ZIP) → edit `Workflows/FlowName-GUID.json` → reimport (Power Platform CLI or Solutions API) → activate in Power Automate UI; the record calls flows "fully editable via JSON when using the Solutions approach", but its reimport step is marked 🔄 (unconfirmed). A later finding says direct editing of an existing flow via API is not possible (connection references can't be established programmatically; Dataverse updates fail with "An unexpected error occurred"; the Management API needs the exact full structure and metadata; solution import fails validation; active flow state gets corrupted), so the working approach is to create new complete flows instead of editing existing ones: delete the old flow, create the new one.
- **Deletion**: the Dataverse API (`/api/data/v9.2/workflows`) FAILS with 400 for Power Automate flows. The Power Automate Management API works: `DELETE https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$ENV_ID/flows/$FLOW_ID` with a `https://service.flow.microsoft.com/` token. The Lead Lifecycle section also says: "Old/broken flows must be deleted manually in Power Automate UI (API deletion not supported)"; the two notes conflict, so check before relying on either.
- **Trigger URLs**: the `sig=` values were rotated 2026-10-03; get the live URL from the flow owner, never commit it. URL shape (host, path, query): Ref: Trigger URL (under each flow).

### Flows

| Flow | Flow ID | Ref section |
|---|---|---|
| Ben Lead Processor Complete v2 | `592c23d7-5d75-f011-b4cc-000d3a59cf44`; manual trigger, next: change to scheduled in Power Automate UI | Result: Ben Lead Processor Complete v2 |
| ForIT - Lead Processor with Status Update (hourly) | needs UI activation | Lead Lifecycle Automation (Implemented) |
| ForIT - Mailing List API | `17b807e6-f9bf-4cb6-b349-9fc1b297d400` (workflow `dd8be26a212042a1b934b52da9a8bf97`) | Mailing List API (ForIT - Mailing List API) |
| Form Site (job applications) | `9b48af52-ab5c-436a-9a8a-b215bae39ae9` (internal `dacd824ab71641fd93361ddaa6257bc8`) | Form Site Flow (Job Applications) |
| Website Contact Form | `a0e830b9-7f9b-4def-afaa-e3540b158050` (workflow `6ecbaa11399c4828a6010436c14d1e22`) | Website Contact Form Flow |

- **Lead lifecycle**: every hour, leads with statuscode = 1 (New) get a Lead Review task (due 1 day) and a Follow-up Email task (due 2 days), both assigned to Ben Thomas, then status moves to Ready for Review (100000000) so they are not reprocessed. **REQUIRED SETUP**: add custom Status Reason "Ready for Review" = 100000000 on Lead; activate the flow in Power Automate UI; configure connection references.
- **Mailing List API**: actions `subscribe` (creates a Contact if needed, converting Lead→Contact if a Lead exists, creates subscriptions, sends a welcome email), `unsubscribe` (deactivates all active subscriptions for the email), `preferences`, `lookup`. Connection references: Dataverse `shared-commondataser-2aba18d5-6f7c-4c15-bad0-825026f34a07`, Office365 `shared-office365-5e08ae1f-d0ad-4697-9729-2fe5ce545470`, SharePoint `shared-sharepointonl-3f6bb327-1c07-4896-b938-6874d262497a`.
- **Form Site: CRITICAL, this flow MUST be used for job applications.** The website's `UniversalForm.tsx` component MUST call this flow when `type === 'apply'`. **DO NOT** change the flow URL for applications without understanding the full impact. It validates the reCAPTCHA token and routes on `formType`: `"apply"` creates a candidate in `https://foritllc.sharepoint.com/hr/Lists/Candidates`, attaches the resume and emails `hr@forit.io`; anything else sends a lead inquiry email to `info@forit.io`. Calling the Contact Form Handler (`6ecbaa11...`) for applications creates Dynamics Leads instead of HR candidates (broken in `369c771`, fixed in `f983612`; Ref: BUG FIX HISTORY (2026-01-13)).
- **Website Contact Form**: parse name into firstName/lastName; Contact exists → return "contact_exists"; Lead exists → update Lead subject/description; neither → create a new Lead with `leadsourcecode=8` (Web).

Planned sequences, lead scoring factors, future enhancements and support links: Ref: Planned Sequences, Lead Scoring Factors, Future Enhancements, Support Resources.
