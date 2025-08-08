import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

class BackupManager {
    constructor() {
        this.backupDir = path.join(__dirname, '..', 'backups');
        this.timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    }

    async ensureBackupDirectory() {
        try {
            await fs.mkdir(this.backupDir, { recursive: true });
            return true;
        } catch (error) {
            console.error(chalk.red(`Failed to create backup directory: ${error.message}`));
            return false;
        }
    }

    async backupFile(filePath, backupName) {
        try {
            const sourcePath = path.join(__dirname, '..', filePath);
            const destPath = path.join(this.backupDir, `${this.timestamp}-${backupName}`);
            
            const content = await fs.readFile(sourcePath, 'utf8');
            await fs.writeFile(destPath, content);
            
            return destPath;
        } catch (error) {
            console.error(chalk.yellow(`  ⚠️ Failed to backup ${filePath}: ${error.message}`));
            return null;
        }
    }

    async backupDirectory(dirPath, backupName) {
        try {
            const sourcePath = path.join(__dirname, '..', dirPath);
            const destPath = path.join(this.backupDir, `${this.timestamp}-${backupName}`);
            
            await this.copyDirectory(sourcePath, destPath);
            
            return destPath;
        } catch (error) {
            console.error(chalk.yellow(`  ⚠️ Failed to backup ${dirPath}: ${error.message}`));
            return null;
        }
    }

    async copyDirectory(source, destination) {
        await fs.mkdir(destination, { recursive: true });
        const entries = await fs.readdir(source, { withFileTypes: true });

        for (const entry of entries) {
            const sourcePath = path.join(source, entry.name);
            const destPath = path.join(destination, entry.name);

            if (entry.isDirectory()) {
                await this.copyDirectory(sourcePath, destPath);
            } else {
                await fs.copyFile(sourcePath, destPath);
            }
        }
    }

    async createGitBackup() {
        try {
            console.log(chalk.blue('📸 Creating Git snapshot...'));
            
            const gitBackupPath = path.join(this.backupDir, `git-snapshot-${this.timestamp}.txt`);
            
            // Get current git status
            const { stdout: status } = await execAsync('git status --porcelain', {
                cwd: path.join(__dirname, '..')
            });
            
            // Get current commit hash
            const { stdout: commitHash } = await execAsync('git rev-parse HEAD 2>/dev/null || echo "no-commits"', {
                cwd: path.join(__dirname, '..')
            });
            
            // Get current branch
            const { stdout: branch } = await execAsync('git branch --show-current 2>/dev/null || echo "no-branch"', {
                cwd: path.join(__dirname, '..')
            });
            
            const gitInfo = `Git Backup - ${new Date().toISOString()}
=====================================
Branch: ${branch.trim()}
Commit: ${commitHash.trim()}

Working Directory Status:
${status || 'Clean - no changes'}
`;
            
            await fs.writeFile(gitBackupPath, gitInfo);
            console.log(chalk.green('  ✅ Git snapshot saved'));
            
            return gitBackupPath;
        } catch (error) {
            console.log(chalk.yellow('  ⚠️ Not a git repository or git not available'));
            return null;
        }
    }

    async getBackupStats() {
        try {
            const files = await fs.readdir(this.backupDir);
            const stats = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(this.backupDir, file);
                    const stat = await fs.stat(filePath);
                    return {
                        name: file,
                        size: stat.size,
                        created: stat.birthtime
                    };
                })
            );
            
            const totalSize = stats.reduce((acc, file) => acc + file.size, 0);
            
            return {
                count: files.length,
                totalSize: totalSize,
                files: stats.sort((a, b) => b.created - a.created)
            };
        } catch (error) {
            return {
                count: 0,
                totalSize: 0,
                files: []
            };
        }
    }

    async cleanOldBackups(daysToKeep = 30) {
        try {
            console.log(chalk.blue(`🧹 Cleaning backups older than ${daysToKeep} days...`));
            
            const files = await fs.readdir(this.backupDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
            
            let deletedCount = 0;
            let freedSpace = 0;
            
            for (const file of files) {
                const filePath = path.join(this.backupDir, file);
                const stat = await fs.stat(filePath);
                
                if (stat.birthtime < cutoffDate) {
                    freedSpace += stat.size;
                    await fs.unlink(filePath);
                    deletedCount++;
                }
            }
            
            if (deletedCount > 0) {
                console.log(chalk.green(`  ✅ Deleted ${deletedCount} old backups (freed ${this.formatBytes(freedSpace)})`));
            } else {
                console.log(chalk.green('  ✅ No old backups to clean'));
            }
            
            return { deletedCount, freedSpace };
        } catch (error) {
            console.error(chalk.yellow(`  ⚠️ Failed to clean old backups: ${error.message}`));
            return { deletedCount: 0, freedSpace: 0 };
        }
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async run(options = {}) {
        console.log(chalk.bold.cyan('\n💾 Dynamics 365 Backup Manager\n'));

        // Ensure backup directory exists
        const dirCreated = await this.ensureBackupDirectory();
        if (!dirCreated) {
            process.exit(1);
        }

        // Create backups
        console.log(chalk.blue('📦 Creating backups...'));
        
        const backups = [];
        
        // Backup main configuration
        const configBackup = await this.backupFile('customizations.yaml', 'customizations.yaml');
        if (configBackup) {
            backups.push(configBackup);
            console.log(chalk.green('  ✅ Configuration backed up'));
        }

        // Backup package.json
        const packageBackup = await this.backupFile('package.json', 'package.json');
        if (packageBackup) {
            backups.push(packageBackup);
            console.log(chalk.green('  ✅ Package.json backed up'));
        }

        // Backup web resources
        try {
            const webResourcesPath = path.join(__dirname, '..', 'webresources');
            await fs.access(webResourcesPath);
            const webBackup = await this.backupDirectory('webresources', 'webresources');
            if (webBackup) {
                backups.push(webBackup);
                console.log(chalk.green('  ✅ Web resources backed up'));
            }
        } catch {
            console.log(chalk.yellow('  ⚠️ No web resources to backup'));
        }

        // Create git snapshot if available
        await this.createGitBackup();

        // Clean old backups if requested
        if (options.clean) {
            await this.cleanOldBackups(options.daysToKeep || 30);
        }

        // Get backup statistics
        const stats = await this.getBackupStats();

        // Summary
        console.log(chalk.bold('\n📊 Backup Summary\n'));
        console.log(chalk.cyan(`  • Timestamp: ${this.timestamp}`));
        console.log(chalk.cyan(`  • Files backed up: ${backups.length}`));
        console.log(chalk.cyan(`  • Total backups: ${stats.count}`));
        console.log(chalk.cyan(`  • Total backup size: ${this.formatBytes(stats.totalSize)}`));
        
        if (stats.files.length > 0) {
            console.log(chalk.cyan('\n  Recent backups:'));
            stats.files.slice(0, 5).forEach(file => {
                console.log(chalk.gray(`    - ${file.name} (${this.formatBytes(file.size)})`));
            });
        }

        console.log(chalk.bold.green('\n✨ Backup completed successfully!\n'));
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {};

if (args.includes('--clean')) {
    options.clean = true;
    const daysIndex = args.indexOf('--days');
    if (daysIndex !== -1 && args[daysIndex + 1]) {
        options.daysToKeep = parseInt(args[daysIndex + 1]);
    }
}

// Run backup manager
const manager = new BackupManager();
manager.run(options);