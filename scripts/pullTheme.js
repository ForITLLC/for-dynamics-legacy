import axios from 'axios';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

class DynamicsThemePuller {
    constructor() {
        this.instanceUrl = process.env.DYNAMICS_INSTANCE_URL;
        this.clientId = process.env.DYNAMICS_CLIENT_ID;
        this.clientSecret = process.env.DYNAMICS_CLIENT_SECRET;
        this.tenantId = process.env.DYNAMICS_TENANT_ID;
        this.accessToken = null;
    }

    async authenticate() {
        try {
            console.log(chalk.blue('🔐 Authenticating with Dynamics 365...'));
            
            const tokenEndpoint = `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`;
            
            const params = new URLSearchParams({
                client_id: this.clientId,
                client_secret: this.clientSecret,
                scope: `${this.instanceUrl}/.default`,
                grant_type: 'client_credentials'
            });

            const response = await axios.post(tokenEndpoint, params);
            this.accessToken = response.data.access_token;
            
            console.log(chalk.green('✅ Authentication successful'));
            return true;
        } catch (error) {
            console.error(chalk.red('❌ Authentication failed:'), error.message);
            return false;
        }
    }

    async pullThemeSettings() {
        try {
            console.log(chalk.blue('🎨 Pulling theme settings...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // Pull organization settings
            const orgResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/organizations?$select=name,basecurrencyid`,
                { headers }
            );

            // Pull theme data
            const themeResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/themes?$select=name,logoid,isdefaulttheme,globallinkcolor,selectedlinkeffect,hoverlinkeffect,navbarbackgroundcolor,navbarshelfcolor,headercolor,processcontrolcolor,defaultentitycolor`,
                { headers }
            );

            // Pull web resources for custom styling
            const webResourcesResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/webresources?$select=name,displayname,content,webresourcetype&$filter=webresourcetype eq 2 or webresourcetype eq 3`,
                { headers }
            );

            return {
                organization: orgResponse.data.value[0],
                themes: themeResponse.data.value,
                webResources: webResourcesResponse.data.value
            };
        } catch (error) {
            console.error(chalk.red('❌ Failed to pull theme settings:'), error.message);
            throw error;
        }
    }

    async pullFormCustomizations() {
        try {
            console.log(chalk.blue('📋 Pulling form customizations...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            };

            // Pull system forms
            const formsResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/systemforms?$select=name,objecttypecode,formxml,description&$filter=type eq 2`,
                { headers }
            );

            return formsResponse.data.value;
        } catch (error) {
            console.error(chalk.red('❌ Failed to pull form customizations:'), error.message);
            throw error;
        }
    }

    async pullViews() {
        try {
            console.log(chalk.blue('👁️ Pulling custom views...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            };

            // Pull saved queries (system views)
            const viewsResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/savedqueries?$select=name,returnedtypecode,fetchxml,layoutxml,isdefault&$filter=querytype eq 0`,
                { headers }
            );

            return viewsResponse.data.value;
        } catch (error) {
            console.error(chalk.red('❌ Failed to pull views:'), error.message);
            throw error;
        }
    }

    async pullDashboards() {
        try {
            console.log(chalk.blue('📊 Pulling dashboards...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json'
            };

            const dashboardsResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/systemforms?$select=name,formxml,description&$filter=type eq 0`,
                { headers }
            );

            return dashboardsResponse.data.value;
        } catch (error) {
            console.error(chalk.red('❌ Failed to pull dashboards:'), error.message);
            throw error;
        }
    }

    async saveToLocal(data) {
        try {
            console.log(chalk.blue('💾 Saving customizations locally...'));
            
            // Load existing customizations
            const customizationsPath = path.join(__dirname, '..', 'customizations.yaml');
            const existingContent = await fs.readFile(customizationsPath, 'utf8');
            const customizations = yaml.load(existingContent);
            
            // Update with pulled data
            customizations.metadata.lastSync = new Date().toISOString();
            
            if (data.themes && data.themes.length > 0) {
                const activeTheme = data.themes.find(t => t.isdefaulttheme) || data.themes[0];
                
                customizations.theme.colors = {
                    ...customizations.theme.colors,
                    primary: activeTheme.globallinkcolor || customizations.theme.colors.primary,
                    navbarBackground: activeTheme.navbarbackgroundcolor || customizations.theme.colors.primary,
                    header: activeTheme.headercolor || customizations.theme.colors.primary,
                    process: activeTheme.processcontrolcolor || customizations.theme.colors.primary
                };
            }
            
            // Save web resources
            if (data.webResources && data.webResources.length > 0) {
                for (const resource of data.webResources) {
                    const resourcePath = path.join(__dirname, '..', 'webresources', resource.name);
                    await fs.mkdir(path.dirname(resourcePath), { recursive: true });
                    
                    // Decode base64 content
                    if (resource.content) {
                        const content = Buffer.from(resource.content, 'base64').toString('utf-8');
                        await fs.writeFile(resourcePath, content);
                        console.log(chalk.green(`  ✅ Saved ${resource.name}`));
                    }
                }
            }
            
            // Save updated customizations
            const updatedYaml = yaml.dump(customizations, { indent: 2 });
            await fs.writeFile(customizationsPath, updatedYaml);
            
            // Save raw data for reference
            const backupPath = path.join(__dirname, '..', 'backups', `pull-${Date.now()}.json`);
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            await fs.writeFile(backupPath, JSON.stringify(data, null, 2));
            
            console.log(chalk.green('✅ Customizations saved successfully'));
            console.log(chalk.cyan(`📁 Backup saved to: ${backupPath}`));
        } catch (error) {
            console.error(chalk.red('❌ Failed to save customizations:'), error.message);
            throw error;
        }
    }

    async run() {
        try {
            console.log(chalk.bold.cyan('\n🚀 Dynamics 365 Theme Puller\n'));
            
            if (!this.instanceUrl || !this.clientId || !this.clientSecret || !this.tenantId) {
                console.error(chalk.red('❌ Missing environment variables. Please check your .env file'));
                process.exit(1);
            }
            
            // Authenticate
            const authenticated = await this.authenticate();
            if (!authenticated) {
                process.exit(1);
            }
            
            // Pull all customizations
            const [themeData, forms, views, dashboards] = await Promise.all([
                this.pullThemeSettings(),
                this.pullFormCustomizations(),
                this.pullViews(),
                this.pullDashboards()
            ]);
            
            // Combine all data
            const allData = {
                ...themeData,
                forms,
                views,
                dashboards,
                timestamp: new Date().toISOString()
            };
            
            // Save locally
            await this.saveToLocal(allData);
            
            console.log(chalk.bold.green('\n✨ Theme pull completed successfully!\n'));
            
            // Summary
            console.log(chalk.cyan('Summary:'));
            console.log(`  • Themes: ${themeData.themes?.length || 0}`);
            console.log(`  • Web Resources: ${themeData.webResources?.length || 0}`);
            console.log(`  • Forms: ${forms?.length || 0}`);
            console.log(`  • Views: ${views?.length || 0}`);
            console.log(`  • Dashboards: ${dashboards?.length || 0}`);
            
        } catch (error) {
            console.error(chalk.red('\n❌ Pull operation failed:'), error.message);
            process.exit(1);
        }
    }
}

// Run the puller
const puller = new DynamicsThemePuller();
puller.run();