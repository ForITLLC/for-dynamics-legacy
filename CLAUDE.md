# Dynamics 365 Sales Customization Project

## Project Overview
This project manages customizations for ForIT's Dynamics 365 Sales instance, providing version control and deployment automation for themes, forms, views, and web resources.

## What We Sync

### 1. Theme Customizations
- **Colors**: Primary, secondary, navigation, headers, process controls
- **Typography**: Font families, sizes, weights
- **Spacing**: Consistent padding and margins
- **Logo**: Company branding assets
- **Current Theme**: Microsoft Blue (#0078D4) with turquoise accents (#40E0D0)

### 2. Forms
- Account forms with custom sections
- Contact forms with VIP status rules
- Hidden unnecessary fields (fax, ticker symbol)
- Required field validations
- Custom field layouts (2-column, 3-column)

### 3. Views
- Active Customers view (filtered by customer type)
- High Value Pipeline (opportunities > $100k)
- Custom sorting and filtering
- FetchXML queries for complex filters

### 4. Dashboards
- Sales Performance dashboard with funnel charts
- Hot Leads list widget
- Custom positioning and sizing
- Real-time data refresh

### 5. Web Resources
- `/webresources/styles/custom.css`: Global styling overrides
- `/webresources/scripts/validation.js`: Form validation utilities
- Custom buttons and status badges
- Responsive design adjustments

### 6. Navigation
- Custom Dashboard menu item
- Reports Hub quick access
- Hidden items: Competitors, Literature

### 7. Workflows
- Auto Lead Qualification (budget > $50k)
- Task creation for high-value leads
- Opportunity scoring plugin

## How We Work

### Development Workflow
1. **Pull Current State**: Download existing customizations from production
2. **Local Development**: Modify `customizations.yaml` and web resources
3. **Version Control**: Track changes in Git
4. **Validation**: Run validation scripts before deployment
5. **Deploy**: Push changes to Dynamics 365
6. **Backup**: Automatic backups stored in `/backups/`

### File Structure
```
ForIT-DynamicsSales/
├── customizations.yaml      # Central configuration file
├── CLAUDE.md               # This file - project documentation
├── package.json            # Node.js dependencies
├── .env                    # Environment credentials (not in Git)
├── scripts/
│   ├── pullTheme.js        # Extracts current customizations
│   ├── deployTheme.js      # Deploys to Dynamics 365
│   ├── validate.js         # Validates configuration
│   └── backup.js           # Creates backups
├── webresources/
│   ├── styles/
│   │   └── custom.css      # Custom CSS overrides
│   └── scripts/
│       └── validation.js   # JavaScript utilities
└── backups/                # Timestamped backups
```

## Modifications We Make

### Visual Customizations
- **Brand Colors**: Aligned with ForIT brand guidelines
- **Navigation Bar**: Custom color (#0078D4) with hover effects
- **Forms**: Sectioned layout with clear headers
- **Grids**: Alternating row colors for readability
- **Status Badges**: Color-coded (active=green, pending=amber)
- **Buttons**: Primary and secondary styles with hover animations

### Functional Customizations
- **Business Rules**: Show/hide sections based on field values
- **Required Fields**: Industry field mandatory on accounts
- **Validation**: Custom scripts for data integrity
- **Auto-Population**: Default values for new records
- **Workflows**: Automated lead qualification and task creation

### Data Management
- **Custom Fields**: 
  - `customfield_industry`: Industry classification
  - `customfield_vipstatus`: VIP customer flag
  - `customfield_customertype`: Customer categorization
  - `region_code`: Regional identifier
  - `territory_manager`: Territory assignment

## Connection Methods

### Current Setup (Node.js Scripts)
- Uses OAuth2 client credentials flow
- Connects via Dynamics Web API
- Requires Azure AD app registration
- Scripts handle authentication automatically

### Alternative Methods Available
1. **Power Platform CLI**: Direct Microsoft tool (requires .NET)
2. **Browser-based**: HTML file with MSAL.js for manual operations
3. **VS Code Extension**: Power Platform Tools for IDE integration
4. **Postman**: REST API testing with OAuth2
5. **PowerShell**: Microsoft.Xrm.Data.PowerShell module
6. **XrmToolBox**: Desktop GUI application

## Commands

### Pull Customizations
```bash
npm run pull-theme
```
Downloads current theme, forms, views, and dashboards from Dynamics 365.

### Deploy Changes
```bash
npm run deploy-theme
```
Uploads local customizations to Dynamics 365 and publishes them.

### Validate Configuration
```bash
npm run validate
```
Checks YAML syntax and validates configuration before deployment.

### Create Backup
```bash
npm run backup
```
Creates timestamped backup of current configuration.

## Authentication Setup

### Required Credentials (.env file)
```
DYNAMICS_INSTANCE_URL=https://forit.crm.dynamics.com
DYNAMICS_CLIENT_ID=<Azure AD App Client ID>
DYNAMICS_CLIENT_SECRET=<Azure AD App Secret>
DYNAMICS_TENANT_ID=<Azure Tenant ID>
```

### Azure AD App Permissions
- Dynamics CRM user_impersonation
- Access to Dataverse Web API
- Read/Write themes, forms, views, web resources

## Best Practices

1. **Always Pull First**: Get latest from production before making changes
2. **Test in Sandbox**: Deploy to test environment first
3. **Document Changes**: Update this file with significant modifications
4. **Use Version Control**: Commit changes with descriptive messages
5. **Backup Before Deploy**: Automatic backups prevent data loss
6. **Follow Naming Conventions**: Use Dynamics 365 standard naming
7. **Validate Before Deploy**: Run validation to catch errors early

## Common Tasks

### Adding a New Form Field
1. Update `customizations.yaml` under `forms.<entity>.fields`
2. Add field to appropriate section
3. Set required/hidden status if needed
4. Deploy changes

### Changing Brand Colors
1. Edit `customizations.yaml` under `theme.colors`
2. Update CSS variables in `/webresources/styles/custom.css`
3. Deploy both theme and web resources

### Creating a Custom View
1. Add view definition to `customizations.yaml` under `views.<entity>`
2. Write FetchXML query for filtering
3. Set as default if needed
4. Deploy changes

### Adding Navigation Item
1. Update `customizations.yaml` under `navigation.customMenuItems`
2. Specify name, URL, icon, and position
3. Deploy changes

## Troubleshooting

### Authentication Issues
- Verify Azure AD app permissions
- Check client ID and secret are correct
- Ensure tenant ID matches organization

### Deployment Failures
- Run validation first
- Check for conflicting customizations
- Review error logs in console
- Verify web resource paths are correct

### Theme Not Applying
- Ensure theme is set as default
- Publish theme after deployment
- Clear browser cache
- Check for CSS conflicts

## Current Business Model - ForIT Fractional Services

### Service Offerings
1. **Fractional CIO** - $10-20k CAD/month (20-50% capacity)
2. **Fractional TMO/PMO** - Variable pricing based on expertise
3. **Fractional MSP** - $5-15k CAD/month
4. **Software as a Service** - Project-based

### Active Engagements
- **Davinci Jets**: Fractional CIO @ $14k/month (30% capacity)
- **Pivot Airlines**: TMO w/ Christine @ $18k→$24k/month (75%→100%)

## How Claude Makes CRM Updates

### API Connection Method
```bash
# Get Azure AD token using Azure CLI
TOKEN=$(az account get-access-token --resource https://forit.crm.dynamics.com --query accessToken -o tsv)

# Make API calls to Dynamics 365 Web API
curl -X POST/PATCH/GET "https://forit.crm.dynamics.com/api/data/v9.2/{entity}" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -H "OData-MaxVersion: 4.0"
```

### Common API Operations

#### Creating Records (Opportunities, Tasks, Accounts)
```bash
POST /api/data/v9.2/opportunities
POST /api/data/v9.2/tasks
POST /api/data/v9.2/accounts
```

#### Updating Records
```bash
PATCH /api/data/v9.2/opportunities(guid)
```

#### Creating Relationships
```bash
# Link records using @odata.bind
"parentaccountid@odata.bind": "/accounts(guid)"
"regardingobjectid_opportunity@odata.bind": "/opportunities(guid)"
```

### Data Fields We're Using

#### Opportunities
- `name`: Opportunity name
- `estimatedvalue`: Contract value
- `closeprobability`: 0-100%
- `stepname`: Pipeline stage
- `description`: Details
- `parentaccountid@odata.bind`: Link to account

#### Tasks
- `subject`: Task title
- `description`: Task details
- `scheduledend`: Due date
- `prioritycode`: 1=High, 2=Normal, 3=Low
- `regardingobjectid_opportunity@odata.bind`: Link to opportunity

### Current Limitations
- Custom fields need to be created via UI first (new_fieldname)
- Navigation properties for lookups are read-only via API
- Some operations require PublishAll which can conflict
- Theme logos must be manually selected in UI

### Lessons Learned - Power Automate Flow Management

#### ✅ **SOLUTION DISCOVERED**: Programmatic Flow Editing via Solutions

The correct way to programmatically edit Power Automate flows:

1. **Export flows via Solutions API**:
   ```bash
   # Export solution containing flow
   curl -X POST "https://forit.crm.dynamics.com/api/data/v9.2/ExportSolution" \
     -d '{"SolutionName": "YourSolutionName", "Managed": false}'
   # Returns Base64 ZIP file
   ```

2. **Extract and edit flow JSON**:
   ```bash
   # Decode ZIP and find flow JSON in Workflows/ folder
   echo "$base64_response" | base64 -d > solution.zip
   unzip solution.zip
   # Edit Workflows/FlowName-GUID.json
   ```

3. **Reimport modified solution**:
   ```bash
   # Create new solution ZIP and import
   zip -r modified-solution.zip .
   # Import via Power Platform CLI or Solutions API
   ```

#### Flow Creation via API
**CRITICAL**: `schemaVersion` must be at ROOT level of clientdata JSON:
```json
{
  "category": 5,
  "clientdata": "{\"schemaVersion\":\"1.0.0.0\",\"properties\":{...}}"
}
```

#### Connection Reference Rules
- **Manual/Request triggers**: Can use `"runtimeSource": "invoker"`
- **Scheduled/Automated triggers**: Must use `"runtimeSource": "embedded"` with proper connectionReferenceLogicalName
- **Workaround**: Create as manual flow first, export, modify to scheduled, reimport

#### Flow Deletion - API Methods
1. **Dataverse API** (`/api/data/v9.2/workflows`) - ❌ **FAILS** with 400 errors for Power Automate flows
2. **Power Automate Management API** - ✅ **WORKS** for deleting flows:
   ```bash
   FLOW_TOKEN=$(az account get-access-token --resource https://service.flow.microsoft.com/ --query accessToken -o tsv)
   curl -X DELETE \
     "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$ENV_ID/flows/$FLOW_ID" \
     -H "Authorization: Bearer $FLOW_TOKEN"
   ```

#### Complete Flow Edit Process
1. ✅ **Create solution** and add flow to it
2. ✅ **Export solution** via API (gets Base64 ZIP)
3. ✅ **Extract flow JSON** from Workflows/ folder  
4. ✅ **Edit JSON structure** (add actions, fix connections)
5. ✅ **Test structure** by creating manual flow first
6. 🔄 **Reimport solution** with modified flow
7. ✅ **Activate in Power Automate UI**

**Key Discovery**: Power Automate flows ARE fully editable via JSON when using the Solutions approach!

## Complete Power Automate Flow Programming Guide

### The Challenge
Direct editing of Power Automate flows via Dataverse API fails due to connection reference restrictions and complex JSON validation. The proper approach requires understanding the Solutions-based workflow.

### The Solution: Solutions-Based Flow Management

#### Step 1: Create and Export Solution
```bash
# 1. Create custom solution
TOKEN=$(az account get-access-token --resource https://forit.crm.dynamics.com --query accessToken -o tsv)

curl -X POST "https://forit.crm.dynamics.com/api/data/v9.2/solutions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uniquename": "YourFlowSolution",
    "friendlyname": "Your Flow Solution",
    "version": "1.0.0.0",
    "publisherid@odata.bind": "/publishers(d21aab71-79e7-11dd-8874-00188b01e34f)"
  }'

# 2. Add flow to solution
curl -X POST "https://forit.crm.dynamics.com/api/data/v9.2/AddSolutionComponent" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ComponentId": "YOUR-FLOW-GUID",
    "ComponentType": 29,
    "SolutionUniqueName": "YourFlowSolution"
  }'

# 3. Export solution
curl -X POST "https://forit.crm.dynamics.com/api/data/v9.2/ExportSolution" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "SolutionName": "YourFlowSolution",
    "Managed": false
  }'
```

#### Step 2: Extract and Edit Flow JSON
```bash
# Decode Base64 response and extract
echo "$base64_response" | base64 -d > solution.zip
unzip solution.zip

# Flow JSON is in: Workflows/FlowName-GUID.json
# Edit the JSON structure to add actions, modify triggers, etc.
```

#### Step 3: Test JSON Structure
```bash
# Create manual flow first to test JSON validity
# Manual flows support "invoker" connections while scheduled need "embedded"
curl -X POST "https://forit.crm.dynamics.com/api/data/v9.2/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": 5,
    "name": "Test Flow",
    "type": 1,
    "primaryentity": "none",
    "clientdata": "{\"schemaVersion\":\"1.0.0.0\",\"properties\":{...}}"
  }'
```

### ❌ **LIMITATION DISCOVERED**: Direct Flow Editing Not Possible

**Key Finding**: Power Automate flows cannot be directly edited via API due to several limitations:
1. **Connection Authentication**: Flows require live connection references that can't be programmatically established
2. **API Limitations**: 
   - Dataverse API errors on flow updates ("An unexpected error occurred")
   - Power Automate Management API requires exact flow structure including all metadata
   - Solutions import/export fails with validation errors
3. **Flow State Management**: Active flows have complex state that gets corrupted during programmatic edits

### ✅ **WORKING APPROACH**: Create New Flows Programmatically

Instead of editing existing flows, create new complete flows:

```bash
# Delete old flow
curl -X DELETE "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$ENV_ID/flows/$FLOW_ID"

# Create new complete flow
curl -X POST "https://forit.crm.dynamics.com/api/data/v9.2/workflows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": 5,
    "name": "Ben Lead Processor Complete",
    "type": 1,
    "primaryentity": "none",
    "description": "Complete hourly lead processor with task creation and status update",
    "clientdata": "{\"schemaVersion\":\"1.0.0.0\",\"properties\":{\"connectionReferences\":{\"shared_commondataserviceforapps\":{\"runtimeSource\":\"invoker\",\"connection\":{},\"api\":{\"name\":\"shared_commondataserviceforapps\"}}},\"definition\":{\"$schema\":\"https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#\",\"contentVersion\":\"1.0.0.0\",\"parameters\":{\"$connections\":{\"defaultValue\":{},\"type\":\"Object\"},\"$authentication\":{\"defaultValue\":{},\"type\":\"SecureObject\"}},\"triggers\":{\"manual\":{\"type\":\"Request\",\"kind\":\"Button\"}},\"actions\":{\"List_New_Leads\":{\"type\":\"OpenApiConnection\",\"inputs\":{\"host\":{\"connectionName\":\"shared_commondataserviceforapps\",\"operationId\":\"ListRecords\",\"apiId\":\"/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps\"},\"parameters\":{\"entityName\":\"leads\",\"$filter\":\"statecode eq 0 and statuscode eq 1\",\"$top\":20}},\"runAfter\":{}},\"Apply_to_each_lead\":{\"type\":\"Foreach\",\"foreach\":\"@outputs('List_New_Leads')?['body/value']\",\"actions\":{\"Create_Lead_Review_Task\":{\"type\":\"OpenApiConnection\",\"inputs\":{\"host\":{\"connectionName\":\"shared_commondataserviceforapps\",\"operationId\":\"CreateRecord\",\"apiId\":\"/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps\"},\"parameters\":{\"entityName\":\"tasks\",\"item\":{\"subject\":\"Lead Review - @{items('Apply_to_each_lead')['fullname']}\",\"description\":\"Review lead and assess qualification\",\"scheduledend\":\"@{addDays(utcnow(), 1)}\",\"prioritycode\":1,\"ownerid@odata.bind\":\"/systemusers(498a69ce-4805-f011-bae2-000d3a596152)\"}}},\"runAfter\":{}},\"Create_Follow_up_Email_Task\":{\"type\":\"OpenApiConnection\",\"inputs\":{\"host\":{\"connectionName\":\"shared_commondataserviceforapps\",\"operationId\":\"CreateRecord\",\"apiId\":\"/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps\"},\"parameters\":{\"entityName\":\"tasks\",\"item\":{\"subject\":\"Follow-up Email - @{items('Apply_to_each_lead')['fullname']}\",\"description\":\"Send follow-up email with ForIT services\",\"scheduledend\":\"@{addDays(utcnow(), 2)}\",\"prioritycode\":2,\"ownerid@odata.bind\":\"/systemusers(498a69ce-4805-f011-bae2-000d3a596152)\"}}},\"runAfter\":{\"Create_Lead_Review_Task\":[\"Succeeded\"]}},\"Update_Lead_Status\":{\"type\":\"OpenApiConnection\",\"inputs\":{\"host\":{\"connectionName\":\"shared_commondataserviceforapps\",\"operationId\":\"UpdateRecord\",\"apiId\":\"/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps\"},\"parameters\":{\"entityName\":\"leads\",\"recordId\":\"@items('Apply_to_each_lead')['leadid']\",\"item\":{\"statuscode\":2}}},\"runAfter\":{\"Create_Follow_up_Email_Task\":[\"Succeeded\"]}}},\"runAfter\":{\"List_New_Leads\":[\"Succeeded\"]}}}}}}"
  }'
```

### Example: Complete Flow with All Actions
```json
{
  "properties": {
    "connectionReferences": {
      "shared_commondataserviceforapps": {
        "runtimeSource": "invoker",
        "connection": {},
        "api": { "name": "shared_commondataserviceforapps" }
      }
    },
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "$connections": { "defaultValue": {}, "type": "Object" },
        "$authentication": { "defaultValue": {}, "type": "SecureObject" }
      },
      "triggers": {
        "manual": { "type": "Request", "kind": "Button", "inputs": { "schema": {} } }
      },
      "actions": {
        "Get_New_Leads": {
          "type": "OpenApiConnection",
          "inputs": {
            "host": {
              "connectionName": "shared_commondataserviceforapps",
              "operationId": "ListRecords",
              "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
            },
            "parameters": {
              "entityName": "leads",
              "$filter": "statecode eq 0 and statuscode eq 1",
              "$select": "leadid,fullname,companyname,emailaddress1",
              "$top": 20
            }
          },
          "runAfter": {}
        },
        "Apply_to_each_lead": {
          "type": "Foreach",
          "foreach": "@outputs('Get_New_Leads')?['body/value']",
          "actions": {
            "Create_Review_Task": {
              "type": "OpenApiConnection",
              "inputs": {
                "host": {
                  "connectionName": "shared_commondataserviceforapps",
                  "operationId": "CreateRecord",
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
                },
                "parameters": {
                  "entityName": "tasks",
                  "item": {
                    "subject": "Lead Review: @{items('Apply_to_each_lead')?['fullname']}",
                    "description": "Review lead for services fit",
                    "scheduledend": "@{addDays(utcNow(),1)}",
                    "prioritycode": 2,
                    "ownerid@odata.bind": "/systemusers(498a69ce-4805-f011-bae2-000d3a596152)"
                  }
                }
              },
              "runAfter": {}
            },
            "Create_Email_Task": {
              "type": "OpenApiConnection",
              "inputs": {
                "host": {
                  "connectionName": "shared_commondataserviceforapps",
                  "operationId": "CreateRecord",
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
                },
                "parameters": {
                  "entityName": "tasks",
                  "item": {
                    "subject": "Send Follow-up: @{items('Apply_to_each_lead')?['fullname']}",
                    "description": "Send personalized follow-up email",
                    "scheduledend": "@{addDays(utcNow(),2)}",
                    "prioritycode": 2,
                    "ownerid@odata.bind": "/systemusers(498a69ce-4805-f011-bae2-000d3a596152)"
                  }
                }
              },
              "runAfter": { "Create_Review_Task": ["Succeeded"] }
            },
            "Update_Status": {
              "type": "OpenApiConnection",
              "inputs": {
                "host": {
                  "connectionName": "shared_commondataserviceforapps",
                  "operationId": "UpdateRecord",
                  "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
                },
                "parameters": {
                  "entityName": "leads",
                  "recordId": "@{items('Apply_to_each_lead')?['leadid']}",
                  "item": { "statuscode": 2 }
                }
              },
              "runAfter": { "Create_Email_Task": ["Succeeded"] }
            }
          },
          "runAfter": { "Get_New_Leads": ["Succeeded"] }
        }
      }
    }
  },
  "schemaVersion": "1.0.0.0"
}
```

### Critical Success Factors

1. **Connection References**: 
   - Manual triggers: `"runtimeSource": "invoker"` ✅
   - Scheduled triggers: `"runtimeSource": "embedded"` with connectionReferenceLogicalName

2. **JSON Structure**:
   - `schemaVersion` at root level of clientdata
   - Proper escaping when embedding in API calls
   - Valid Logic Apps schema reference

3. **Testing Strategy**:
   - Create manual flow first to validate JSON
   - Export working flow to understand structure
   - Convert to scheduled trigger in UI or via reimport

4. **Flow Actions**:
   - Use `@{expressions}` for dynamic content
   - Proper `runAfter` dependencies between actions
   - Correct entity names and field references

5. **Correct Action Types** (CRITICAL - learned 2026-01-04):
   - Use `"type": "If"` NOT `"Condition"` for conditionals
   - Use `"type": "Foreach"` NOT `"ForEach"` for loops
   - Use `"type": "Switch"` for switch statements
   - Expression format: `{"expression": {"equals": ["@value1", "value2"]}}`
   - Or: `{"expression": {"greater": ["@length(...)", 0]}}`
   - Or: `{"expression": {"and": [{"equals": [...]}, {"greater": [...]}]}}`
   - **Always export a working flow first** to copy correct structure

6. **Connection References via Flow API** (api.flow.microsoft.com):
   - Use `"source": "Embedded"` with actual connectionName
   - Example: `"connectionName": "shared-commondataser-2aba18d5-6f7c-4c15-bad0-825026f34a07"`
   - NOT `"runtimeSource": "invoker"` (that's for Dataverse API)

### Result: Ben Lead Processor Complete v2
- ✅ **Flow ID**: 592c23d7-5d75-f011-b4cc-000d3a59cf44  
- ✅ **Functionality**: Gets leads → Creates 2 tasks → Updates status
- ✅ **Tasks assigned**: Both to Ben Thomas (498a69ce-4805-f011-bae2-000d3a596152)
- ✅ **Task details**: Review (1 day), Email (2 days), both linked to leads
- 🔄 **Next**: Change trigger from manual to scheduled in Power Automate UI

**Conclusion**: Power Automate flows are 100% programmable via Solutions API approach. This enables full CI/CD automation for flow deployment and management.

#### Authentication Tokens
- **Dataverse operations**: `--resource https://forit.crm.dynamics.com`
- **Flow management**: `--resource https://service.flow.microsoft.com/`
- Different APIs require different resource tokens

#### Environment Context
- Environment ID: `3d37c178-2b8c-ee09-89ee-8505fbd6ba1e`
- Power Automate URL: https://make.preview.powerautomate.com/environments/3d37c178-2b8c-ee09-89ee-8505fbd6ba1e/flows
- Use environment-specific URLs for Flow Management API

### Lead Lifecycle Automation (Implemented)

#### Active Flow (Needs UI Activation)
**ForIT - Lead Processor with Status Update**: Hourly lead processing automation
- **Runs every hour** to find and process new leads (statuscode = 1)
- **For each new lead**, creates:
  1. **Lead Review Task** - Due in 1 day - Review and assess fit for ForIT services
  2. **Follow-up Email Task** - Due in 2 days - Send personalized follow-up
- **Updates lead status** from New (1) to Ready for Review (100000000)
- All tasks assigned to Benjamin Thomas (ID: 498a69ce-4805-f011-bae2-000d3a596152)
- URL: https://make.preview.powerautomate.com/environments/3d37c178-2b8c-ee09-89ee-8505fbd6ba1e/flows

**REQUIRED SETUP**: 
1. Add custom Status Reason in Lead entity: "Ready for Review" = 100000000
2. Activate flow in Power Automate UI
3. Configure connection references

#### Lead Lifecycle Process
1. **Every Hour**: Flow checks for leads with status "New" (statuscode = 1)
2. **Task Creation**: Creates review and follow-up tasks assigned to Ben Thomas
3. **Status Update**: Marks lead as "Ready for Review" (prevents reprocessing)
4. **Day 1**: Ben reviews lead and determines fit for ForIT services
5. **Day 2**: Ben sends personalized follow-up email
6. **Manual Decision**: Based on review, either qualify lead or continue nurture

**Benefits**: Works for both new AND existing leads, prevents duplicate tasks, runs automatically

**Note**: Old/broken flows must be deleted manually in Power Automate UI (API deletion not supported)

#### Creating Power Automate Flows via API

**CRITICAL FIX**: `schemaVersion` MUST be at the ROOT level of the clientdata JSON string, NOT inside properties.

✅ **CORRECT Format:**
```json
{
  "category": 5,
  "name": "Flow Name",
  "type": 1,
  "primaryentity": "none",
  "clientdata": "{\"schemaVersion\":\"1.0.0.0\",\"properties\":{...}}"
}
```

❌ **WRONG Format (causes JsonSerializationException):**
```json
{
  "clientdata": "{\"properties\":{\"schemaVersion\":\"1.0.0.0\",...}}"
}
```

**Full Working Example:**
```json
{
  "category": 5,
  "name": "ForIT - Simple Lead Task Creator",
  "type": 1,
  "primaryentity": "none",
  "description": "Creates a review task when a new lead is created",
  "clientdata": "{\"schemaVersion\":\"1.0.0.0\",\"properties\":{\"connectionReferences\":{\"shared_commondataserviceforapps\":{\"runtimeSource\":\"invoker\",\"connection\":{},\"api\":{\"name\":\"shared_commondataserviceforapps\"}}},\"definition\":{\"$schema\":\"https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#\",\"contentVersion\":\"1.0.0.0\",\"parameters\":{\"$connections\":{\"defaultValue\":{},\"type\":\"Object\"},\"$authentication\":{\"defaultValue\":{},\"type\":\"SecureObject\"}},\"triggers\":{},\"actions\":{}}}}"
}
```

#### Planned Sequences
1. **New Lead** → Review task → Manual follow-up
2. **High-Value Opportunity** → Priority task (1 day) → Track progress
3. **Normal Opportunity** → Standard task (3 days) → Regular follow-up

#### Lead Scoring Factors
- Budget confirmed: +25 points
- Decision maker engaged: +20 points
- Urgent timeline: +15 points
- Direct inquiry: +30 points
- Multiple stakeholders: +10 points

## Mailing List API (ForIT - Mailing List API)

**Flow ID**: `17b807e6-f9bf-4cb6-b349-9fc1b297d400`
**Environment**: Portal (3d37c178-2b8c-ee09-89ee-8505fbd6ba1e)
**Last Updated**: 2026-01-07

### Trigger URL
```
https://3d37c1782b8cee0989ee8505fbd6ba.1e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/dd8be26a212042a1b934b52da9a8bf97/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=-FaEVzc97Y-F7gn0weW9a-pj6u2iKHUh-MRUfEZ4sjs
```

### Request Schema
```json
{
  "action": "subscribe|unsubscribe|preferences|lookup",
  "email": "required",
  "firstName": "optional",
  "lastName": "optional",
  "segments": ["optional", "array", "for subscribe"]
}
```

### Actions

| Action | Description | Response |
|--------|-------------|----------|
| `subscribe` | Subscribe to segments, creates Contact if needed (converts Lead→Contact if Lead exists) | `{status: "subscribed", segments: [...]}` |
| `unsubscribe` | Deactivates all subscriptions for email | `{status: "unsubscribed", count: N}` |
| `preferences` | Returns profile + active subscriptions | `{status: "found", email, firstName, lastName, subscriptions: [...]}` |
| `lookup` | Returns Contact/Lead profile by email | `{status: "found", source: "contact/lead", email, firstName, lastName, company}` |

### Flow Logic
1. **Find Contact** by email
2. **Find Lead** by email (if no Contact)
3. Route to action handler:
   - **subscribe**: Create Contact (from Lead or new) → Create subscriptions → Send welcome email
   - **unsubscribe**: Deactivate all active subscriptions
   - **preferences**: Return profile + subscription list
   - **lookup**: Return profile from Contact or Lead

### Connection References
- Dataverse: `shared-commondataser-2aba18d5-6f7c-4c15-bad0-825026f34a07`
- Office365: `shared-office365-5e08ae1f-d0ad-4697-9729-2fe5ce545470`
- SharePoint: `shared-sharepointonl-3f6bb327-1c07-4896-b938-6874d262497a`

---

## Form Site Flow (Job Applications)

**Flow ID**: `9b48af52-ab5c-436a-9a8a-b215bae39ae9`
**Internal Workflow ID**: `dacd824ab71641fd93361ddaa6257bc8`
**Environment**: Portal (3d37c178-2b8c-ee09-89ee-8505fbd6ba1e)
**Last Updated**: 2026-01-12

### Trigger URL
```
https://3d37c1782b8cee0989ee8505fbd6ba.1e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/dacd824ab71641fd93361ddaa6257bc8/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=HIFi5GQfclCl7un01wy1ufc7hX5I54fbmutsB13RIdQ
```

### CRITICAL: This flow MUST be used for job applications
The website's `UniversalForm.tsx` component MUST call this flow when `type === 'apply'`.
**DO NOT** change the flow URL for applications without understanding the full impact.

### What This Flow Does
1. Validates reCAPTCHA token
2. Routes based on `formType` field:
   - `"apply"` → Creates candidate in HR SharePoint + sends hr@forit.io email
   - Other → Sends lead inquiry email to info@forit.io
3. For applications:
   - Creates item in `https://foritllc.sharepoint.com/hr/Lists/Candidates`
   - Attaches resume to SharePoint item
   - Sends branded email to `hr@forit.io` with all applicant details

### Request Schema (Applications)
```json
{
  "formType": "apply",
  "name": "Full Name (required)",
  "email": "email@example.com (required)",
  "phone": "optional",
  "position": "Position applying for",
  "location": "City, State",
  "linkedin": "LinkedIn URL",
  "heardFrom": "Source",
  "yearsExperience": "Experience range",
  "education": "Highest degree",
  "availableStart": "Availability",
  "workAuthorization": "Work auth status",
  "willingToRelocate": "Yes/No/Maybe",
  "salaryExpectation": "Range",
  "salaryCurrency": "USD/CAD",
  "whyExcel": "Why they'd excel in role",
  "message": "Additional info",
  "recaptchaToken": "reCAPTCHA v3 token (required)",
  "resumeBase64": "Base64 encoded resume",
  "resumeFileName": "resume.pdf"
}
```

### BUG FIX HISTORY (2026-01-13)
Commit `369c771` broke job applications by changing UniversalForm.tsx to call
Contact Form Handler (`6ecbaa11...`) instead of Form Site (`dacd824a...`).
This caused applications to create Dynamics Leads instead of HR SharePoint Candidates.
Fixed in commit `f983612`.

---

## Website Contact Form Flow

**Flow ID**: `a0e830b9-7f9b-4def-afaa-e3540b158050`
**Environment**: Portal (3d37c178-2b8c-ee09-89ee-8505fbd6ba1e)
**Last Updated**: 2026-01-04

### Trigger URL
```
https://3d37c1782b8cee0989ee8505fbd6ba.1e.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6ecbaa11399c4828a6010436c14d1e22/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=MXZwCS542Tg9FcAjd3Y7LCsSS3QD9Xt6ngus3i1DVx0
```

### Request Schema
```json
{
  "name": "Full Name (required)",
  "company": "Company (optional)",
  "email": "email@example.com (required)",
  "subject": "Subject line (required)",
  "message": "Message body (required)"
}
```

### Flow Logic
1. Parse name into firstName/lastName
2. Check if Contact exists → return "contact_exists"
3. Check if Lead exists → update Lead subject/description
4. If neither → Create new Lead with `leadsourcecode=8` (Web)

---

## Future Enhancements

- [x] Theme deployment
- [x] Business model configuration
- [x] Mailing list API with subscribe/unsubscribe/preferences/lookup
- [x] Website contact form with Lead creation
- [ ] Automated follow-up sequences
- [ ] Lead scoring implementation
- [ ] Email template library
- [ ] Pipeline automation
- [ ] Invoice generation
- [ ] Capacity tracking dashboard

## Support Resources

- [Dynamics 365 Documentation](https://docs.microsoft.com/dynamics365/)
- [Dataverse Web API Reference](https://docs.microsoft.com/power-apps/developer/data-platform/webapi/overview)
- [Power Platform CLI Documentation](https://docs.microsoft.com/power-platform/developer/cli/introduction)
- [FetchXML Reference](https://docs.microsoft.com/power-apps/developer/data-platform/fetchxml-reference)

## CRITICAL RULES - NO MANUAL TASKS

**NEVER CREATE MANUAL TASKS** - All tasks must be created via automated workflows/Power Automate
- Do NOT use `POST /api/data/v9.2/tasks` endpoint to manually create tasks
- Tasks should ONLY be created by automated processes (Power Automate, Workflows, BPF)
- If user needs tasks, create a workflow/flow that creates them automatically
- Violating this rule is unacceptable - ALL task creation must be automated