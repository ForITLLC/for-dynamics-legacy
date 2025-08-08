# Direct Connection Methods to Dynamics 365

## Method 1: Power Platform CLI (pac)

### Installation
```bash
# Install Power Platform CLI
npm install -g @microsoft/powerplatform-cli

# Or via .NET
dotnet tool install -g Microsoft.PowerApps.CLI.Tool
```

### Direct Connection
```bash
# Authenticate to your environment
pac auth create --url https://forit.crm.dynamics.com

# List available connections
pac auth list

# Select active connection
pac auth select --index 0

# Pull solution
pac solution export --path ./solution.zip --name YourSolutionName --managed false

# Push changes
pac solution import --path ./solution.zip
```

## Method 2: Dataverse Web API (Browser-Based)

Create an HTML file that connects directly from your browser:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Dynamics 365 Direct Connect</title>
    <script src="https://alcdn.msauth.net/browser/2.32.0/js/msal-browser.min.js"></script>
</head>
<body>
    <h1>Dynamics 365 Theme Manager</h1>
    <button onclick="login()">Connect to Dynamics</button>
    <button onclick="pullTheme()" disabled id="pullBtn">Pull Theme</button>
    <button onclick="pushTheme()" disabled id="pushBtn">Push Theme</button>
    <div id="output"></div>

    <script>
        const msalConfig = {
            auth: {
                clientId: "YOUR_CLIENT_ID",
                authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
                redirectUri: window.location.origin
            }
        };

        const msalInstance = new msal.PublicClientApplication(msalConfig);
        let accessToken = null;

        async function login() {
            try {
                const loginRequest = {
                    scopes: ["https://forit.crm.dynamics.com/user_impersonation"]
                };
                
                const response = await msalInstance.loginPopup(loginRequest);
                accessToken = response.accessToken;
                
                document.getElementById('pullBtn').disabled = false;
                document.getElementById('pushBtn').disabled = false;
                document.getElementById('output').innerHTML = "✅ Connected!";
            } catch (error) {
                console.error(error);
            }
        }

        async function pullTheme() {
            const response = await fetch('https://forit.crm.dynamics.com/api/data/v9.2/themes', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/json'
                }
            });
            
            const data = await response.json();
            document.getElementById('output').innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
            
            // Save to local storage
            localStorage.setItem('dynamics-theme', JSON.stringify(data));
        }

        async function pushTheme() {
            const themeData = JSON.parse(localStorage.getItem('dynamics-theme'));
            // Modify and push back
        }
    </script>
</body>
</html>
```

## Method 3: VS Code Extension

Use the Power Platform Tools extension:

1. Install "Power Platform Tools" extension in VS Code
2. Open Command Palette (Ctrl+Shift+P)
3. Run "Power Platform: Create Auth Profile"
4. Enter: https://forit.crm.dynamics.com
5. Authenticate via browser
6. Use integrated terminal:
   ```bash
   pac solution list
   pac solution export
   ```

## Method 4: PowerShell Module

```powershell
# Install module
Install-Module -Name Microsoft.Xrm.Data.PowerShell

# Connect
$conn = Connect-CrmOnline -ServerUrl https://forit.crm.dynamics.com -ForceOAuth

# Get themes
$themes = Get-CrmRecords -conn $conn -EntityLogicalName theme -Fields name,isdefaulttheme,globallinkcolor

# Update theme
Set-CrmRecord -conn $conn -EntityLogicalName theme -Id $themeId -Fields @{
    "globallinkcolor" = "#0078D4"
    "navbarbackgroundcolor" = "#0078D4"
}
```

## Method 5: Postman/REST Client

### Setup in Postman:
1. Create new collection
2. Set up OAuth 2.0 authentication:
   - Auth URL: https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/authorize
   - Token URL: https://login.microsoftonline.com/YOUR_TENANT_ID/oauth2/v2.0/token
   - Client ID: YOUR_CLIENT_ID
   - Scope: https://forit.crm.dynamics.com/.default

### Example Requests:
```http
GET https://forit.crm.dynamics.com/api/data/v9.2/themes
Authorization: Bearer {{access_token}}
Accept: application/json

PATCH https://forit.crm.dynamics.com/api/data/v9.2/themes(THEME_ID)
Authorization: Bearer {{access_token}}
Content-Type: application/json

{
    "globallinkcolor": "#0078D4",
    "navbarbackgroundcolor": "#0078D4"
}
```

## Method 6: XrmToolBox

Desktop application with GUI:
1. Download XrmToolBox
2. Install "Theme Editor" plugin
3. Connect to https://forit.crm.dynamics.com
4. Visually edit themes
5. Export/Import configurations

## Recommended Approach

For direct connection without scripts, I recommend:

1. **Development**: Power Platform CLI (pac) - Most integrated
2. **Quick Changes**: Browser-based HTML file - No installation needed
3. **Team Collaboration**: VS Code Extension - Best IDE integration
4. **Automation**: PowerShell Module - Good for CI/CD

## Authentication Setup

For any method, you need:
1. Azure AD App Registration
2. API Permissions: Dynamics CRM user_impersonation
3. Authentication method (interactive/service principal)

Would you like me to help set up any specific method?