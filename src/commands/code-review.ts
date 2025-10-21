import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { CodeReviewAgent } from '../agents/code-review';
import { ConfigManager } from '../config/manager';

interface CodeReviewOptions extends BaseCommandOptions {
  file?: string;
  format?: 'console' | 'json' | 'markdown';
  output?: string;
  changes?: boolean;
  tiered?: boolean;
}

export class CodeReviewCommand extends BaseCommand {
  constructor() {
    super('review', 'AI-powered code review');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-f, --file <path>', 'File or directory to review')
      .option('--format <format>', 'Output format (console|json|markdown)', 'console')
      .option('-o, --output <path>', 'Output file path')
      .option('--changes', 'Review git changes automatically')
      .option('--tiered', 'Use tiered Senior→Staff→Principal prompt');
  }

  protected setupAction(): void {
    this.command.action(async (options: CodeReviewOptions) => {
      try {
        const separator = '='.repeat(80);
        const thinSeparator = '-'.repeat(80);
        
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold('CODE REVIEW - Principal Engineer Assessment'));
        console.log(chalk.cyan(separator));
        console.log('');

        // Smart detection: check for git changes first
        if (!options.file) {
          const configManager = new ConfigManager();
          const agentConfig = await configManager.getAgentConfig();
          const agent = new CodeReviewAgent(agentConfig);
          const changedFiles = await agent.detectChangedFiles();
          
          if (changedFiles.length > 0) {
            console.log(chalk.bold('FILES CHANGED:'), changedFiles.length);
            changedFiles.forEach((file: string) => console.log(chalk.gray(`  ${file}`)));
            console.log('');
            
            if (options.changes) {
              options.file = '.';
            } else {
              const { useChanges } = await inquirer.prompt([
                {
                  type: 'confirm',
                  name: 'useChanges',
                  message: 'Review these changed files?',
                  default: true
                }
              ]);

              if (useChanges) {
                options.file = '.';
              }
            }
          } else if (options.changes) {
            console.log('No git changes detected.');
            return;
          }
          
          if (!options.file) {
            const { file } = await inquirer.prompt([
              {
                type: 'input',
                name: 'file',
                message: 'Enter file or directory to review:',
                validate: (input: string) => input.length > 0 || 'Path is required'
              }
            ]);
            options.file = file;
          }
        }

        const spinner = ora('Analyzing code...').start();

        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new CodeReviewAgent(agentConfig);
        
        // Get project context for header
        const context = await agent['analyzeProjectContext'](options.file!);
        
        spinner.stop();
        
        // Print project info
        console.log(chalk.bold('PROJECT:'), context.rootPath.split('/').pop() || 'Unknown');
        if (context.language) console.log(chalk.bold('LANGUAGE:'), context.language);
        if (context.framework) console.log(chalk.bold('FRAMEWORK:'), context.framework);
        console.log(chalk.bold('SEVERITY THRESHOLD:'), 'medium');
        console.log('');

        spinner.start('Running analysis...');

        const result = await agent.reviewCode({
          filePath: options.file!,
          severity: 'medium',
          format: options.format || 'console',
          outputPath: options.output,
          tiered: !!options.tiered
        });

        spinner.stop();

        if (options.format === 'console') {
          console.log(result.review);
        } else {
          console.log(`Review saved: ${result.outputPath}`);
        }

        // Summary section
        console.log('');
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold('SUMMARY'));
        console.log(chalk.cyan(separator));
        console.log('');
        console.log(chalk.bold('Total Issues:'), result.issueCount);
        console.log(thinSeparator.substring(0, 40));
        
        if (result.criticalCount > 0) {
          console.log(chalk.red('Critical:'), result.criticalCount);
        } else {
          console.log(chalk.gray('Critical:'), result.criticalCount);
        }
        
        if (result.highCount > 0) {
          console.log(chalk.yellow('High:    '), result.highCount);
        } else {
          console.log(chalk.gray('High:    '), result.highCount);
        }
        
        if (result.mediumCount > 0) {
          console.log(chalk.blue('Medium:  '), result.mediumCount);
        } else {
          console.log(chalk.gray('Medium:  '), result.mediumCount);
        }
        
        console.log(chalk.gray('Low:     '), result.lowCount);
        console.log('');
        
        // Status message
        if (result.criticalCount > 0) {
          console.log(chalk.red.bold('Status: ✗ Critical issues must be fixed before merge'));
        } else if (result.highCount > 0) {
          console.log(chalk.yellow.bold('Status: ⚠ High priority issues should be addressed'));
        } else if (result.mediumCount > 0) {
          console.log(chalk.blue.bold('Status: ✓ Safe to merge with recommended improvements'));
        } else {
          console.log(chalk.green.bold('Status: ✓ All clear - no issues found'));
        }
        console.log('');

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }
}
