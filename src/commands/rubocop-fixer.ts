import { BaseCommand } from './base.js';
import { BaseCommandOptions } from '../types/index.js';
import chalk from 'chalk';
import ora from 'ora';
import { RubocopFixerAgent } from '../agents/rubocop-fixer.js';
import { ConfigManager } from '../config/manager.js';

interface RubocopFixerOptions extends BaseCommandOptions {
  path?: string;
  maxIterations?: number;
}

export class RubocopFixerCommand extends BaseCommand {
  constructor() {
    super('rubocop-fix', 'Fix Rubocop issues using ruby_gardener');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-p, --path <path>', 'Path to the Ruby project', process.cwd())
      .option('-m, --max-iterations <number>', 'Maximum number of fix iterations', '10');
  }

  protected setupAction(): void {
    this.command.action(async (options: RubocopFixerOptions) => {
      try {
        console.log(chalk.blue('🔧 Teladoc Rubocop Fixer'));

        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new RubocopFixerAgent(agentConfig);

        const spinner = ora('Starting Rubocop fix process...').start();

        const result = await agent.fixRubocop({
          projectPath: options.path || process.cwd(),
          maxIterations: parseInt(options.maxIterations?.toString() || '10')
        });

        spinner.stop();

        console.log(chalk.green('✅ Rubocop fixing completed!'));
        console.log(chalk.blue(result.summary));

        if (result.disabledRules.length > 0) {
          console.log(chalk.yellow('Disabled rules:'));
          result.disabledRules.forEach(rule => console.log(chalk.gray(`  • ${rule}`)));
        }

      } catch (error: any) {
        console.error(chalk.red('❌ Error during Rubocop fixing:'), error.message);
        process.exit(1);
      }
    });
  }
}
