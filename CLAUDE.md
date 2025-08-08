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

## Future Enhancements

- [ ] Automated testing of customizations
- [ ] CI/CD pipeline integration
- [ ] Multi-environment support (dev/test/prod)
- [ ] Rollback functionality
- [ ] Change tracking and audit log
- [ ] Performance monitoring
- [ ] A/B testing for UI changes

## Support Resources

- [Dynamics 365 Documentation](https://docs.microsoft.com/dynamics365/)
- [Dataverse Web API Reference](https://docs.microsoft.com/power-apps/developer/data-platform/webapi/overview)
- [Power Platform CLI Documentation](https://docs.microsoft.com/power-platform/developer/cli/introduction)
- [FetchXML Reference](https://docs.microsoft.com/power-apps/developer/data-platform/fetchxml-reference)