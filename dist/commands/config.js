import { BaseCommand } from './base.js';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { ConfigManager } from '../config/manager.js';
export class ConfigCommand extends BaseCommand {
    constructor() {
        super('config', 'Manage agent configuration');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('--get <key>', 'Get configuration value')
            .option('--set <key>', 'Set configuration key')
            .option('--value <value>', 'Configuration value (used with --set)')
            .option('--list', 'List all configuration')
            .option('--reset', 'Reset configuration to defaults');
    }
    setupAction() {
        this.command.action(async (options) => {
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
                    }
                    else {
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
                                validate: (input) => input.length > 0 || 'Value is required'
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
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
    async setupApiConfig(configManager) {
        const currentConfig = await configManager.getAll();
        const isAzure = true; // Simplified: only Azure supported now
        const questions = [
            {
                type: 'password',
                name: 'apiKey',
                message: `Enter your ${isAzure ? 'Azure OpenAI' : 'API'} key:`,
                mask: '*'
            }
        ];
        // baseUrl input removed (non-Azure providers disabled)
        const answers = await inquirer.prompt(questions);
        if (answers.apiKey) {
            await configManager.set('apiKey', answers.apiKey);
        }
        // baseUrl skipped in simplified mode
        console.log(chalk.green('✅ API configuration saved'));
    }
    async setupProviderConfig(configManager) {
        console.log(chalk.yellow('Provider selection disabled. Using Azure OpenAI only.'));
        await configManager.set('provider', 'azure-openai');
        await configManager.set('model', 'gpt-4.1');
        await this.setupAzureConfig(configManager);
        console.log(chalk.green('✅ Azure provider configuration saved'));
    }
    async setupProjectConfig(configManager) {
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
    async setupAzureConfig(configManager) {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'azureEndpoint',
                message: 'Azure OpenAI endpoint URL:',
                default: 'https://member-agents-resource.cognitiveservices.azure.com'
            },
            {
                type: 'input',
                name: 'azureDeployment',
                message: 'Azure deployment name:',
                default: 'gpt-4.1-mini'
            },
            {
                type: 'input',
                name: 'azureApiVersion',
                message: 'Azure API version:',
                default: '2025-01-01-preview'
            }
        ]);
        await configManager.set('azureEndpoint', answers.azureEndpoint);
        await configManager.set('azureDeployment', answers.azureDeployment);
        await configManager.set('azureApiVersion', answers.azureApiVersion);
        console.log(chalk.green('✅ Azure OpenAI configuration saved'));
    }
}
//# sourceMappingURL=config.js.map