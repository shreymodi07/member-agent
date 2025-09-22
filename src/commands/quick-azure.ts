import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager';

interface QuickAzureOptions extends BaseCommandOptions {
  key?: string;
}

export class QuickAzureCommand extends BaseCommand {
  constructor() {
    super('quick-azure', 'One-step setup: just provide Azure OpenAI API key');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command.option('-k, --key <apiKey>', 'Azure OpenAI API key (optional; else prompted)');
  }

  protected setupAction(): void {
    this.command.action(async (options: QuickAzureOptions) => {
      try {
        const configManager = new ConfigManager();

        let apiKey = options.key || process.env.AZURE_OPENAI_API_KEY;
        if (!apiKey) {
          const ans = await inquirer.prompt([
            {
              type: 'password',
              name: 'apiKey',
              message: 'Enter your Azure OpenAI API Key:',
              mask: '*',
              validate: (v: string) => v.trim().length > 0 || 'API key required'
            }
          ]);
          apiKey = ans.apiKey;
        }

        // Opinionated defaults (can be changed later via config command)
        const defaults = {
          provider: 'azure-openai',
          model: 'gpt-4.1',
          azureEndpoint: 'https://member-agent-resource.cognitiveservices.azure.com',
          azureDeployment: 'gpt-4.1',
          azureApiVersion: '2025-01-01-preview'
        } as const;

        await configManager.set('provider', defaults.provider);
        await configManager.set('model', defaults.model);
        await configManager.set('azureEndpoint', defaults.azureEndpoint);
        await configManager.set('azureDeployment', defaults.azureDeployment);
        await configManager.set('azureApiVersion', defaults.azureApiVersion);
        await configManager.set('apiKey', apiKey);

        console.log(chalk.green('✅ Azure OpenAI quick setup complete.'));
        console.log(chalk.blue('You can now run: teladoc-agent review -f someFile.js'));
        console.log(chalk.gray('To adjust settings later use: teladoc-agent config --list'));
      } catch (err: any) {
        console.error(chalk.red('❌ Quick Azure setup failed:'), err.message);
        process.exit(1);
      }
    });
  }
}
