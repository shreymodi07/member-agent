import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import ora from 'ora';
import { RubocopFixerAgent } from '../agents/rubocop-fixer';
import { ConfigManager } from '../config/manager';

interface RubocopFixerDiffOptions extends BaseCommandOptions {
  path?: string;
  maxIterations?: number;
  staged?: boolean;
  rubocopOnly?: boolean;
  rubyRoot?: string;
}

export class RubocopFixerDiffCommand extends BaseCommand {
  constructor() {
    super('rubocop-fix-diff', 'Fix Rubocop issues only in changed (diff) lines');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-p, --path <path>', 'Path to the Ruby project', process.cwd())
      .option('-m, --max-iterations <number>', 'Maximum number of fix iterations', '5')
      .option('--staged', 'Use staged changes (git diff --cached) instead of working tree vs HEAD', false)
  .option('--rubocop-only', 'Run rubocop -A on changed files and keep only corrected lines within diff', false)
  .option('--ruby-root <dir>', 'Explicit Ruby project root (directory containing Gemfile)', '');
  }

  protected setupAction(): void {
    this.command.action(async (options: RubocopFixerDiffOptions) => {
      try {
        console.log(chalk.blue('🔧 Teladoc Rubocop Diff Fixer'));

        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new RubocopFixerAgent(agentConfig);

        const spinner = ora('Starting diff-only Rubocop fix process...').start();

        const result = await agent.fixRubocop({
          projectPath: options.path || process.cwd(),
          maxIterations: parseInt(options.maxIterations?.toString() || '5'),
          diffOnly: true,
          staged: !!options.staged,
          rubocopOnly: !!options.rubocopOnly,
          rubyRoot: options.rubyRoot || undefined
        } as any);

        spinner.stop();

        console.log(chalk.green('✅ Diff-only Rubocop fixing completed!'));
        console.log(chalk.blue(result.summary));

        if (result.disabledRules.length > 0) {
          console.log(chalk.yellow('Disabled rules:'));
          result.disabledRules.forEach(rule => console.log(chalk.gray(`  • ${rule}`)));
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Error during diff-only Rubocop fixing:'), error.message);
        process.exit(1);
      }
    });
  }
}
