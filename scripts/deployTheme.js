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

class DynamicsThemeDeployer {
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

    async loadCustomizations() {
        const customizationsPath = path.join(__dirname, '..', 'customizations.yaml');
        const content = await fs.readFile(customizationsPath, 'utf8');
        return yaml.load(content);
    }

    async deployTheme(customizations) {
        try {
            console.log(chalk.blue('🎨 Deploying theme customizations...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            // Get existing theme or create new one
            const themeResponse = await axios.get(
                `${this.instanceUrl}/api/data/v9.2/themes?$filter=name eq 'Custom Theme'`,
                { headers }
            );

            const themeData = {
                name: 'Custom Theme',
                isdefaulttheme: true,
                globallinkcolor: customizations.theme.colors.primary,
                navbarbackgroundcolor: customizations.theme.colors.navbarBackground || customizations.theme.colors.primary,
                navbarshelfcolor: customizations.theme.colors.secondary,
                headercolor: customizations.theme.colors.header || customizations.theme.colors.primary,
                processcontrolcolor: customizations.theme.colors.process || customizations.theme.colors.primary,
                defaultentitycolor: customizations.theme.colors.primary,
                selectedlinkeffect: customizations.theme.colors.secondary,
                hoverlinkeffect: customizations.theme.colors.secondary
            };

            if (themeResponse.data.value.length > 0) {
                // Update existing theme
                const themeId = themeResponse.data.value[0].themeid;
                await axios.patch(
                    `${this.instanceUrl}/api/data/v9.2/themes(${themeId})`,
                    themeData,
                    { headers }
                );
                console.log(chalk.green('  ✅ Theme updated'));
            } else {
                // Create new theme
                await axios.post(
                    `${this.instanceUrl}/api/data/v9.2/themes`,
                    themeData,
                    { headers }
                );
                console.log(chalk.green('  ✅ Theme created'));
            }

            // Publish theme
            await this.publishTheme();

        } catch (error) {
            console.error(chalk.red('❌ Failed to deploy theme:'), error.message);
            throw error;
        }
    }

    async deployWebResources(customizations) {
        try {
            console.log(chalk.blue('📦 Deploying web resources...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            for (const resource of customizations.webResources || []) {
                try {
                    const filePath = path.join(__dirname, '..', resource.path);
                    const content = await fs.readFile(filePath, 'utf8');
                    const base64Content = Buffer.from(content).toString('base64');

                    // Check if resource exists
                    const existingResponse = await axios.get(
                        `${this.instanceUrl}/api/data/v9.2/webresources?$filter=name eq '${resource.name}'`,
                        { headers }
                    );

                    const webResourceData = {
                        name: resource.name,
                        displayname: resource.name,
                        content: base64Content,
                        webresourcetype: resource.type === 'css' ? 2 : 3, // 2 for CSS, 3 for JS
                        description: resource.description
                    };

                    if (existingResponse.data.value.length > 0) {
                        // Update existing
                        const resourceId = existingResponse.data.value[0].webresourceid;
                        await axios.patch(
                            `${this.instanceUrl}/api/data/v9.2/webresources(${resourceId})`,
                            webResourceData,
                            { headers }
                        );
                        console.log(chalk.green(`  ✅ Updated ${resource.name}`));
                    } else {
                        // Create new
                        await axios.post(
                            `${this.instanceUrl}/api/data/v9.2/webresources`,
                            webResourceData,
                            { headers }
                        );
                        console.log(chalk.green(`  ✅ Created ${resource.name}`));
                    }
                } catch (error) {
                    console.error(chalk.yellow(`  ⚠️ Failed to deploy ${resource.name}: ${error.message}`));
                }
            }

            // Publish web resources
            await this.publishWebResources();

        } catch (error) {
            console.error(chalk.red('❌ Failed to deploy web resources:'), error.message);
            throw error;
        }
    }

    async publishTheme() {
        try {
            console.log(chalk.blue('📢 Publishing theme...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            const publishRequest = {
                ParameterXml: '<importexportxml><themes></themes></importexportxml>'
            };

            await axios.post(
                `${this.instanceUrl}/api/data/v9.2/PublishTheme`,
                publishRequest,
                { headers }
            );

            console.log(chalk.green('  ✅ Theme published'));
        } catch (error) {
            console.error(chalk.yellow('  ⚠️ Theme publish warning: ' + error.message));
        }
    }

    async publishWebResources() {
        try {
            console.log(chalk.blue('📢 Publishing web resources...'));
            
            const headers = {
                'Authorization': `Bearer ${this.accessToken}`,
                'OData-MaxVersion': '4.0',
                'OData-Version': '4.0',
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            };

            const publishRequest = {
                ParameterXml: '<importexportxml><webresources></webresources></importexportxml>'
            };

            await axios.post(
                `${this.instanceUrl}/api/data/v9.2/PublishXml`,
                publishRequest,
                { headers }
            );

            console.log(chalk.green('  ✅ Web resources published'));
        } catch (error) {
            console.error(chalk.yellow('  ⚠️ Web resources publish warning: ' + error.message));
        }
    }

    async createBackup() {
        try {
            console.log(chalk.blue('💾 Creating deployment backup...'));
            
            const customizations = await this.loadCustomizations();
            const backupPath = path.join(__dirname, '..', 'backups', `deploy-${Date.now()}.json`);
            
            await fs.mkdir(path.dirname(backupPath), { recursive: true });
            await fs.writeFile(backupPath, JSON.stringify(customizations, null, 2));
            
            console.log(chalk.green(`  ✅ Backup created: ${backupPath}`));
            return backupPath;
        } catch (error) {
            console.error(chalk.yellow('  ⚠️ Backup creation warning: ' + error.message));
            return null;
        }
    }

    async run() {
        try {
            console.log(chalk.bold.cyan('\n🚀 Dynamics 365 Theme Deployer\n'));
            
            if (!this.instanceUrl || !this.clientId || !this.clientSecret || !this.tenantId) {
                console.error(chalk.red('❌ Missing environment variables. Please check your .env file'));
                process.exit(1);
            }
            
            // Create backup
            await this.createBackup();
            
            // Authenticate
            const authenticated = await this.authenticate();
            if (!authenticated) {
                process.exit(1);
            }
            
            // Load customizations
            const customizations = await this.loadCustomizations();
            
            // Deploy components
            await this.deployTheme(customizations);
            await this.deployWebResources(customizations);
            
            console.log(chalk.bold.green('\n✨ Deployment completed successfully!\n'));
            
            // Summary
            console.log(chalk.cyan('Deployment Summary:'));
            console.log(`  • Instance: ${customizations.metadata.instance}`);
            console.log(`  • Environment: ${customizations.metadata.environment}`);
            console.log(`  • Primary Color: ${customizations.theme.colors.primary}`);
            console.log(`  • Web Resources: ${customizations.webResources?.length || 0}`);
            
        } catch (error) {
            console.error(chalk.red('\n❌ Deployment failed:'), error.message);
            process.exit(1);
        }
    }
}

// Run the deployer
const deployer = new DynamicsThemeDeployer();
deployer.run();