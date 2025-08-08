# Dynamics 365 Sales Customization Manager

A comprehensive solution for managing and deploying Dynamics 365 Sales customizations, including themes, forms, views, dashboards, and web resources.

## Features

- **Theme Management**: Pull and deploy custom themes with color mappings
- **Form Customizations**: Track and deploy form modifications
- **View Management**: Manage custom views and filters
- **Dashboard Configuration**: Deploy custom dashboards and components
- **Web Resources**: Manage CSS, JavaScript, and HTML resources
- **Version Control**: Track all customizations in YAML format
- **Backup System**: Automatic backups before deployments

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   - Copy `.env.example` to `.env`
   - Add your Dynamics 365 credentials:
     - `DYNAMICS_INSTANCE_URL`: Your ForIT instance (https://forit.crm.dynamics.com)
     - `DYNAMICS_CLIENT_ID`: Azure AD app client ID
     - `DYNAMICS_CLIENT_SECRET`: Azure AD app secret
     - `DYNAMICS_TENANT_ID`: Azure tenant ID

3. **Azure AD App Setup**:
   - Register an app in Azure Active Directory
   - Grant Dynamics 365 API permissions
   - Create a client secret

## Usage

### Pull Current Theme
Download existing customizations from Dynamics 365:
```bash
npm run pull-theme
```

### Deploy Customizations
Deploy local customizations to Dynamics 365:
```bash
npm run deploy-theme
```

### Validate Configuration
Check customization file syntax:
```bash
npm run validate
```

### Create Backup
Manually create a backup:
```bash
npm run backup
```

## Customization Structure

### `customizations.yaml`
The main configuration file tracking all customizations:

- **metadata**: Instance information and sync status
- **theme**: Colors, typography, spacing, and branding
- **navigation**: Custom menu items and hidden elements
- **forms**: Entity form customizations
- **views**: Custom views and filters
- **dashboards**: Dashboard configurations
- **workflows**: Automated processes
- **webResources**: Custom CSS/JS files
- **securityRoles**: Role modifications
- **plugins**: Custom business logic

### Web Resources
Custom styles and scripts stored in:
- `/webresources/styles/` - CSS files
- `/webresources/scripts/` - JavaScript files

## Workflow

1. **Initial Setup**: Configure environment and credentials
2. **Pull Existing**: Download current customizations
3. **Modify Locally**: Edit `customizations.yaml` and web resources
4. **Test Changes**: Validate configuration
5. **Deploy**: Push changes to Dynamics 365
6. **Verify**: Check changes in the Dynamics 365 interface

## Best Practices

- Always pull before making changes
- Create backups before deployments
- Test in a sandbox environment first
- Use version control for tracking changes
- Document significant customizations
- Follow Dynamics 365 naming conventions

## File Structure

```
ForIT-DynamicsSales/
├── customizations.yaml     # Main customization mapping
├── package.json            # Project configuration
├── .env                    # Environment variables (not in git)
├── .env.example           # Environment template
├── scripts/
│   ├── pullTheme.js       # Pull customizations
│   ├── deployTheme.js     # Deploy customizations
│   ├── validate.js        # Validation utilities
│   └── backup.js          # Backup utilities
├── webresources/
│   ├── styles/
│   │   └── custom.css     # Custom styles
│   └── scripts/
│       └── validation.js  # Custom scripts
└── backups/               # Automatic backups
```

## Security

- Never commit `.env` files
- Use Azure Key Vault for production secrets
- Implement proper RBAC in Dynamics 365
- Regular security audits of customizations

## Support

For issues or questions about Dynamics 365 customizations, consult:
- [Microsoft Dynamics 365 Documentation](https://docs.microsoft.com/dynamics365/)
- [Power Platform Developer Center](https://powerapps.microsoft.com/developers/)