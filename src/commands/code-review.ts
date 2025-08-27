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
      .option('--changes', 'Review git changes automatically');
  }

  protected setupAction(): void {
    this.command.action(async (options: CodeReviewOptions) => {
      try {
        console.log(chalk.blue('🔍 Teladoc Code Review'));

        // Smart detection: check for git changes first
        if (!options.file) {
          const configManager = new ConfigManager();
          const agentConfig = await configManager.getAgentConfig();
          const agent = new CodeReviewAgent(agentConfig);
          const changedFiles = await agent.detectChangedFiles();
          
          if (changedFiles.length > 0) {
            console.log(chalk.green(`✨ Found ${changedFiles.length} changed files:`));
            changedFiles.forEach((file: string) => console.log(chalk.gray(`  • ${file}`)));
            
            if (options.changes) {
              console.log(chalk.blue('🚀 Reviewing changes automatically...'));
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
            console.log(chalk.yellow('⚠️  No git changes detected.'));
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
        const result = await agent.reviewCode({
          filePath: options.file!,
          severity: 'medium',
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
