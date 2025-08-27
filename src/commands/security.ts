import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { SecurityComplianceAgent } from '../agents/security-compliance';
import { ConfigManager } from '../config/manager';

interface SecurityOptions extends BaseCommandOptions {
  file?: string;
  format?: 'console' | 'json';
  output?: string;
}

export class SecurityCommand extends BaseCommand {
  constructor() {
    super('security', 'Find security vulnerabilities and compliance issues');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-f, --file <path>', 'File or directory to scan (default: current directory)')
      .option('--format <format>', 'Output format (console|json)', 'console')
      .option('-o, --output <path>', 'Output file path');
  }

  protected setupAction(): void {
    this.command.action(async (options: SecurityOptions) => {
      try {
        console.log(chalk.blue('🔒 Teladoc Security Scanner'));

        // Default to current directory if no file specified
        if (!options.file) {
          options.file = '.';
        }

        const spinner = ora('Scanning for security vulnerabilities...').start();

        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new SecurityComplianceAgent(agentConfig);
        const result = await agent.scanSecurity({
          filePath: options.file!,
          scanType: 'all',
          standard: 'hipaa',
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
