import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { execSync } from 'child_process';
import { SecurityComplianceAgent } from '../agents/security-compliance';
import { ConfigManager } from '../config/manager';

interface SecurityOptions extends BaseCommandOptions {
  file?: string;
  diff?: boolean;
  format?: 'console' | 'json';
  output?: string;
  tiered?: boolean;
}

export class SecurityCommand extends BaseCommand {
  constructor() {
    super('security', 'Find security vulnerabilities and compliance issues');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-f, --file <path>', 'File or directory to scan (default: current directory)')
      .option('--diff', 'Scan only files changed in git diff')
      .option('--format <format>', 'Output format (console|json)', 'console')
      .option('-o, --output <path>', 'Output file path')
      .option('--tiered', 'Use tiered Senior→Staff→Principal security prompt');
  }

  protected setupAction(): void {
    this.command.action(async (options: SecurityOptions) => {
      try {
        console.log(chalk.blue('🔒 Teladoc Security Scanner'));

        let filePaths: string[] = [];

        if (options.diff) {
          // Get actual diff content, not just file names
          try {
            const diffOutput = execSync('git diff HEAD', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            if (!diffOutput.trim()) {
              console.log(chalk.yellow('No changes in git diff.'));
              return;
            }
            // Pass diff content as a special marker
            filePaths = ['__GIT_DIFF__'];
          } catch (error) {
            console.error(chalk.red('Error getting git diff. Make sure you are in a git repository.'));
            return;
          }
        } else {
          // Default to current directory if no file specified
          filePaths = options.file ? [options.file] : ['.'];
        }

        const spinner = ora('Scanning for security vulnerabilities...').start();

        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new SecurityComplianceAgent(agentConfig);
        const result = await agent.scanSecurity({
          filePaths: filePaths,
          scanType: 'all',
          standard: 'gdpr',
          format: options.format || 'console',
          outputPath: options.output,
          tiered: !!options.tiered
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

        // QA Testing Guidance
        console.log('\n🧪 QA Testing Guidance:');
        if (result.criticalCount > 0) {
          console.log('• Critical security issues found - test authentication and access controls');
          console.log('• Verify data handling and input validation thoroughly');
          console.log('• Test error scenarios and edge cases that could expose vulnerabilities');
        } else if (result.highCount > 0) {
          console.log('• Security improvements needed - test input validation and sanitization');
          console.log('• Review authorization checks and data protection measures');
          console.log('• Validate secure coding practices and potential attack vectors');
        } else {
          console.log('• Code appears secure - focus testing on new functionality');
          console.log('• Verify existing security measures remain intact');
          console.log('• Test integration points and data flow between components');
        }

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }
}
