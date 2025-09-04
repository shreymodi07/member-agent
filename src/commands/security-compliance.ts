import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { SecurityComplianceAgent } from '../agents/security-compliance';
import { ConfigManager } from '../config/manager';

interface SecurityOptions extends BaseCommandOptions {
  file?: string;
  scan?: 'vulnerabilities' | 'secrets' | 'compliance' | 'all';
  standard?: 'hipaa' | 'sox' | 'pci' | 'gdpr';
  format?: 'console' | 'json' | 'sarif';
  output?: string;
}

export class SecurityCommand extends BaseCommand {
  constructor() {
    super('security', 'Find security vulnerabilities and compliance issues');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-f, --file <path>', 'File or directory to scan')
      .option('--scan <type>', 'Type of scan (vulnerabilities|secrets|compliance|all)', 'all')
      .option('--standard <standard>', 'Compliance standard (hipaa|sox|pci|gdpr)', 'gdpr')
      .option('--format <format>', 'Output format (console|json|sarif)', 'console')
      .option('-o, --output <path>', 'Output file path');
  }

  protected setupAction(): void {
    this.command.action(async (options: SecurityOptions) => {
      try {
        console.log(chalk.blue('🔒 Teladoc Security & Compliance Agent'));

        if (!options.file) {
          const { file } = await inquirer.prompt([
            {
              type: 'input',
              name: 'file',
              message: 'Enter the file or directory path to scan:',
              validate: (input: string) => input.length > 0 || 'Path is required'
            }
          ]);
          options.file = file;
        }

        const spinner = ora('Scanning for security vulnerabilities and compliance issues...').start();

        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new SecurityComplianceAgent(agentConfig);
        const result = await agent.scanSecurity({
          filePaths: options.file ? [options.file] : ['.'],
          scanType: options.scan || 'all',
          standard: options.standard || 'gdpr',
          format: options.format || 'console',
          outputPath: options.output
        });

        spinner.succeed('Security scan completed!');

        if (options.format === 'console') {
          console.log(result.report);
        } else {
          console.log(chalk.green(`✅ Security report saved to: ${result.outputPath}`));
        }

        // Show summary
        if (result.criticalCount > 0) {
          console.log(chalk.red(`🚨 ${result.criticalCount} critical security issues found!`));
        } else if (result.highCount > 0) {
          console.log(chalk.yellow(`⚠️  ${result.highCount} high priority security issues found`));
        } else {
          console.log(chalk.green('✅ No critical security issues found'));
        }

        if (options.verbose) {
          console.log(chalk.gray(`📊 Total issues: ${result.totalIssues}`));
          console.log(chalk.gray(`🔍 Scanned ${result.filesScanned} files`));
          console.log(chalk.gray(`⏱️  Scan completed in ${result.duration}ms`));
        }

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }
}
