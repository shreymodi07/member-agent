import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { CodeReviewAgent } from '../agents/code-review';

interface CodeReviewOptions extends BaseCommandOptions {
  file?: string;
  pr?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  format?: 'console' | 'json' | 'markdown';
  output?: string;
  changes?: boolean;
}

export class CodeReviewCommand extends BaseCommand {
  constructor() {
    super('review', 'Perform AI-powered code review');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-f, --file <path>', 'File or directory to review')
      .option('--pr <number>', 'Pull request number to review')
      .option('-s, --severity <level>', 'Minimum severity level (low|medium|high|critical)', 'medium')
      .option('--format <format>', 'Output format (console|json|markdown)', 'console')
      .option('-o, --output <path>', 'Output file path')
      .option('--changes', 'Automatically review git changes (default behavior when no file specified)');
  }

  protected setupAction(): void {
    this.command.action(async (options: CodeReviewOptions) => {
      try {
        console.log(chalk.blue('🔍 Teladoc Code Review Agent'));

        // Smart detection: check for git changes first
        if (!options.file && !options.pr) {
          const agent = new CodeReviewAgent();
          const changedFiles = await agent.detectChangedFiles();
          
          if (changedFiles.length > 0) {
            console.log(chalk.green(`✨ Detected ${changedFiles.length} changed files:`));
            changedFiles.forEach((file: string) => console.log(chalk.gray(`  • ${file}`)));
            
            // If --changes flag is used, automatically review changes
            if (options.changes) {
              console.log(chalk.blue('🚀 Reviewing changed files automatically...'));
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
                options.file = '.'; // Review all changes
              }
            }
          } else if (options.changes) {
            console.log(chalk.yellow('⚠️  No git changes detected.'));
            return;
          }
          
          if (!options.file) {
            const { reviewType } = await inquirer.prompt([
              {
                type: 'list',
                name: 'reviewType',
                message: 'What would you like to review?',
                choices: [
                  { name: 'Specific file/directory', value: 'file' },
                  { name: 'Pull request', value: 'pr' }
                ]
              }
            ]);

            if (reviewType === 'file') {
              const { file } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'file',
                  message: 'Enter the file or directory path:',
                  validate: (input: string) => input.length > 0 || 'Path is required'
                }
              ]);
              options.file = file;
            } else {
              const { pr } = await inquirer.prompt([
                {
                  type: 'input',
                  name: 'pr',
                  message: 'Enter the pull request number:',
                  validate: (input: string) => /^\d+$/.test(input) || 'Please enter a valid PR number'
                }
              ]);
              options.pr = pr;
            }
          }
        }

        const spinner = ora('Analyzing code and generating review...').start();

        const agent = new CodeReviewAgent();
        const result = await agent.reviewCode({
          filePath: options.file,
          prNumber: options.pr,
          severity: options.severity || 'medium',
          format: options.format || 'console',
          outputPath: options.output
        });

        spinner.succeed('Code review completed!');

        if (options.format === 'console') {
          console.log(result.review);
        } else {
          console.log(chalk.green(`✅ Review saved to: ${result.outputPath}`));
        }

        if (options.verbose) {
          console.log(chalk.gray(`📊 Found ${result.issueCount} issues`));
          console.log(chalk.gray(`⚠️  ${result.criticalCount} critical, ${result.highCount} high priority`));
        }

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }
}
