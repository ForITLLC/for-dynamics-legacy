import fs from 'fs/promises';
import yaml from 'js-yaml';
import chalk from 'chalk';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CustomizationValidator {
    constructor() {
        this.errors = [];
        this.warnings = [];
    }

    async loadCustomizations() {
        try {
            const customizationsPath = path.join(__dirname, '..', 'customizations.yaml');
            const content = await fs.readFile(customizationsPath, 'utf8');
            return yaml.load(content);
        } catch (error) {
            this.errors.push(`Failed to load customizations.yaml: ${error.message}`);
            return null;
        }
    }

    validateMetadata(customizations) {
        console.log(chalk.blue('📋 Validating metadata...'));
        
        if (!customizations.metadata) {
            this.errors.push('Missing metadata section');
            return;
        }

        const required = ['instance', 'environment', 'version'];
        for (const field of required) {
            if (!customizations.metadata[field]) {
                this.errors.push(`Missing required metadata field: ${field}`);
            }
        }

        if (customizations.metadata.instance && !customizations.metadata.instance.includes('.dynamics.com')) {
            this.warnings.push('Instance URL should be a valid Dynamics 365 URL');
        }

        console.log(chalk.green('  ✅ Metadata validation complete'));
    }

    validateTheme(customizations) {
        console.log(chalk.blue('🎨 Validating theme...'));
        
        if (!customizations.theme) {
            this.warnings.push('No theme section defined');
            return;
        }

        // Validate colors
        if (customizations.theme.colors) {
            const colorPattern = /^#[0-9A-Fa-f]{6}$/;
            for (const [key, value] of Object.entries(customizations.theme.colors)) {
                if (typeof value === 'string' && value.startsWith('#') && !colorPattern.test(value)) {
                    this.errors.push(`Invalid color format for theme.colors.${key}: ${value}`);
                }
            }
        }

        // Validate typography
        if (customizations.theme.typography?.fontSizes) {
            for (const [key, value] of Object.entries(customizations.theme.typography.fontSizes)) {
                if (!value.match(/^\d+px$/)) {
                    this.warnings.push(`Font size should be in pixels for theme.typography.fontSizes.${key}: ${value}`);
                }
            }
        }

        console.log(chalk.green('  ✅ Theme validation complete'));
    }

    validateForms(customizations) {
        console.log(chalk.blue('📝 Validating forms...'));
        
        if (!customizations.forms) {
            console.log(chalk.yellow('  ⚠️ No forms defined'));
            return;
        }

        for (const [entity, forms] of Object.entries(customizations.forms)) {
            for (const form of forms) {
                if (!form.formId) {
                    this.errors.push(`Missing formId for ${entity} form`);
                }

                // Validate sections
                if (form.sections) {
                    for (const section of form.sections) {
                        if (!section.name) {
                            this.errors.push(`Missing section name in ${entity} form`);
                        }
                        if (!section.fields || section.fields.length === 0) {
                            this.warnings.push(`Empty fields in section ${section.name} of ${entity} form`);
                        }
                        if (section.layout && !['1-column', '2-column', '3-column', '4-column'].includes(section.layout)) {
                            this.warnings.push(`Invalid layout ${section.layout} in ${entity} form`);
                        }
                    }
                }

                // Check for duplicate fields
                const allFields = [];
                if (form.sections) {
                    form.sections.forEach(s => allFields.push(...(s.fields || [])));
                }
                const duplicates = allFields.filter((item, index) => allFields.indexOf(item) !== index);
                if (duplicates.length > 0) {
                    this.warnings.push(`Duplicate fields in ${entity} form: ${duplicates.join(', ')}`);
                }
            }
        }

        console.log(chalk.green('  ✅ Forms validation complete'));
    }

    validateViews(customizations) {
        console.log(chalk.blue('👁️ Validating views...'));
        
        if (!customizations.views) {
            console.log(chalk.yellow('  ⚠️ No views defined'));
            return;
        }

        for (const [entity, views] of Object.entries(customizations.views)) {
            for (const view of views) {
                if (!view.viewId) {
                    this.errors.push(`Missing viewId for ${entity} view`);
                }
                if (!view.name) {
                    this.errors.push(`Missing name for ${entity} view`);
                }
                if (!view.fetchXml) {
                    this.errors.push(`Missing fetchXml for ${entity} view ${view.name}`);
                } else {
                    // Basic FetchXML validation
                    if (!view.fetchXml.includes('<fetch>')) {
                        this.errors.push(`Invalid fetchXml for ${entity} view ${view.name}: missing <fetch> tag`);
                    }
                    if (!view.fetchXml.includes('<entity')) {
                        this.errors.push(`Invalid fetchXml for ${entity} view ${view.name}: missing <entity> tag`);
                    }
                }
            }
        }

        console.log(chalk.green('  ✅ Views validation complete'));
    }

    validateWebResources(customizations) {
        console.log(chalk.blue('📦 Validating web resources...'));
        
        if (!customizations.webResources) {
            console.log(chalk.yellow('  ⚠️ No web resources defined'));
            return;
        }

        for (const resource of customizations.webResources) {
            if (!resource.name) {
                this.errors.push('Web resource missing name');
            }
            if (!resource.type) {
                this.errors.push(`Web resource ${resource.name} missing type`);
            } else if (!['css', 'javascript', 'html', 'xml', 'png', 'jpg', 'gif', 'xsl', 'ico', 'svg'].includes(resource.type)) {
                this.warnings.push(`Web resource ${resource.name} has unusual type: ${resource.type}`);
            }
            if (!resource.path) {
                this.errors.push(`Web resource ${resource.name} missing path`);
            } else {
                // Check if file exists
                this.checkFileExists(resource.path, resource.name);
            }
        }

        console.log(chalk.green('  ✅ Web resources validation complete'));
    }

    async checkFileExists(filePath, resourceName) {
        const fullPath = path.join(__dirname, '..', filePath);
        try {
            await fs.access(fullPath);
        } catch {
            this.warnings.push(`Web resource file not found: ${filePath} (${resourceName})`);
        }
    }

    validateWorkflows(customizations) {
        console.log(chalk.blue('⚙️ Validating workflows...'));
        
        if (!customizations.workflows) {
            console.log(chalk.yellow('  ⚠️ No workflows defined'));
            return;
        }

        for (const workflow of customizations.workflows) {
            if (!workflow.workflowId) {
                this.errors.push('Workflow missing ID');
            }
            if (!workflow.name) {
                this.errors.push('Workflow missing name');
            }
            if (!workflow.entity) {
                this.errors.push(`Workflow ${workflow.name} missing entity`);
            }
            if (!workflow.trigger) {
                this.errors.push(`Workflow ${workflow.name} missing trigger`);
            } else if (!['onCreate', 'onUpdate', 'onDelete', 'manual', 'scheduled'].includes(workflow.trigger)) {
                this.warnings.push(`Workflow ${workflow.name} has unusual trigger: ${workflow.trigger}`);
            }
        }

        console.log(chalk.green('  ✅ Workflows validation complete'));
    }

    validateDashboards(customizations) {
        console.log(chalk.blue('📊 Validating dashboards...'));
        
        if (!customizations.dashboards) {
            console.log(chalk.yellow('  ⚠️ No dashboards defined'));
            return;
        }

        for (const dashboard of customizations.dashboards) {
            if (!dashboard.dashboardId) {
                this.errors.push('Dashboard missing ID');
            }
            if (!dashboard.name) {
                this.errors.push('Dashboard missing name');
            }
            if (dashboard.components) {
                for (const component of dashboard.components) {
                    if (!component.type) {
                        this.errors.push(`Dashboard component missing type in ${dashboard.name}`);
                    }
                    if (!component.position) {
                        this.warnings.push(`Dashboard component missing position in ${dashboard.name}`);
                    }
                }
            }
        }

        console.log(chalk.green('  ✅ Dashboards validation complete'));
    }

    async run() {
        console.log(chalk.bold.cyan('\n🔍 Dynamics 365 Customization Validator\n'));

        const customizations = await this.loadCustomizations();
        if (!customizations) {
            console.error(chalk.red('❌ Failed to load customizations file'));
            process.exit(1);
        }

        // Run all validations
        this.validateMetadata(customizations);
        this.validateTheme(customizations);
        this.validateForms(customizations);
        this.validateViews(customizations);
        this.validateWebResources(customizations);
        this.validateWorkflows(customizations);
        this.validateDashboards(customizations);

        // Report results
        console.log(chalk.bold('\n📊 Validation Summary\n'));

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log(chalk.bold.green('✨ All validations passed!\n'));
        } else {
            if (this.errors.length > 0) {
                console.log(chalk.red(`❌ Errors (${this.errors.length}):`));
                this.errors.forEach(error => {
                    console.log(chalk.red(`  • ${error}`));
                });
                console.log();
            }

            if (this.warnings.length > 0) {
                console.log(chalk.yellow(`⚠️ Warnings (${this.warnings.length}):`));
                this.warnings.forEach(warning => {
                    console.log(chalk.yellow(`  • ${warning}`));
                });
                console.log();
            }

            if (this.errors.length > 0) {
                console.log(chalk.red('❌ Validation failed with errors. Please fix before deploying.\n'));
                process.exit(1);
            } else {
                console.log(chalk.yellow('⚠️ Validation completed with warnings. Review before deploying.\n'));
            }
        }
    }
}

// Run validator
const validator = new CustomizationValidator();
validator.run();