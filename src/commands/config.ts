import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager';

interface ConfigOptions extends BaseCommandOptions {
  get?: string;
  set?: string;
  value?: string;
  list?: boolean;
  reset?: boolean;
}

export class ConfigCommand extends BaseCommand {
  constructor() {
    super('config', 'Manage agent configuration');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('--get <key>', 'Get configuration value')
      .option('--set <key>', 'Set configuration key')
      .option('--value <value>', 'Configuration value (used with --set)')
      .option('--list', 'List all configuration')
      .option('--reset', 'Reset configuration to defaults');
  }

  protected setupAction(): void {
    this.command.action(async (options: ConfigOptions) => {
      try {
        const configManager = new ConfigManager();

        if (options.reset) {
          const { confirm } = await inquirer.prompt([
            {
              type: 'confirm',
              name: 'confirm',
              message: 'Are you sure you want to reset all configuration to defaults?',
              default: false
            }
          ]);

          if (confirm) {
            await configManager.reset();
            console.log(chalk.green('✅ Configuration reset to defaults'));
          }
          return;
        }

        if (options.list) {
          const config = await configManager.getAll();
          console.log(chalk.blue('📋 Current Configuration:'));
          console.log(JSON.stringify(config, null, 2));
          return;
        }

        if (options.get) {
          const value = await configManager.get(options.get);
          if (value !== undefined) {
            console.log(chalk.green(`${options.get}: ${value}`));
          } else {
            console.log(chalk.yellow(`Configuration key '${options.get}' not found`));
          }
          return;
        }

        if (options.set) {
          if (!options.value) {
            const { value } = await inquirer.prompt([
              {
                type: 'input',
                name: 'value',
                message: `Enter value for '${options.set}':`,
                validate: (input: string) => input.length > 0 || 'Value is required'
              }
            ]);
            options.value = value;
          }

          await configManager.set(options.set, options.value);
          console.log(chalk.green(`✅ Set ${options.set} = ${options.value}`));
          return;
        }

        // Interactive configuration setup
        console.log(chalk.blue('🔧 Interactive Configuration Setup'));
        
        const { action } = await inquirer.prompt([
          {
            type: 'list',
            name: 'action',
            message: 'What would you like to do?',
            choices: [
              { name: 'Set API Configuration', value: 'api' },
              { name: 'Configure AI Provider', value: 'provider' },
              { name: 'Set Project Defaults', value: 'project' },
              { name: 'View Current Config', value: 'view' }
            ]
          }
        ]);

        switch (action) {
          case 'api':
            await this.setupApiConfig(configManager);
            break;
          case 'provider':
            await this.setupProviderConfig(configManager);
            break;
          case 'project':
            await this.setupProjectConfig(configManager);
            break;
          case 'view':
            const config = await configManager.getAll();
            console.log(chalk.blue('📋 Current Configuration:'));
            console.log(JSON.stringify(config, null, 2));
            break;
        }

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }

  private async setupApiConfig(configManager: ConfigManager): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Enter your API key:',
        mask: '*'
      },
      {
        type: 'input',
        name: 'baseUrl',
        message: 'Enter base URL (optional):',
        default: ''
      }
    ]);

    if (answers.apiKey) {
      await configManager.set('apiKey', answers.apiKey);
    }
    if (answers.baseUrl) {
      await configManager.set('baseUrl', answers.baseUrl);
    }

    console.log(chalk.green('✅ API configuration saved'));
  }

  private async setupProviderConfig(configManager: ConfigManager): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'list',
        name: 'provider',
        message: 'Select AI provider:',
        choices: [
          { name: 'OpenAI', value: 'openai' },
          { name: 'Anthropic', value: 'anthropic' }
        ]
      },
      {
        type: 'input',
        name: 'model',
        message: 'Enter model name:',
        default: 'gpt-4'
      }
    ]);

    await configManager.set('provider', answers.provider);
    await configManager.set('model', answers.model);

    console.log(chalk.green('✅ Provider configuration saved'));
  }

  private async setupProjectConfig(configManager: ConfigManager): Promise<void> {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'defaultLanguage',
        message: 'Default programming language:',
        default: 'typescript'
      },
      {
        type: 'list',
        name: 'packageManager',
        message: 'Default package manager:',
        choices: ['npm', 'yarn', 'pnpm'],
        default: 'npm'
      }
    ]);

    await configManager.set('defaultLanguage', answers.defaultLanguage);
    await configManager.set('packageManager', answers.packageManager);

    console.log(chalk.green('✅ Project defaults saved'));
  }
}
