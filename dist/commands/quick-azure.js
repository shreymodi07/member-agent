"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuickAzureCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const manager_1 = require("../config/manager");
class QuickAzureCommand extends base_1.BaseCommand {
    constructor() {
        super('quick-azure', 'One-step setup: just provide Azure OpenAI API key');
    }
    setupOptions() {
        super.setupOptions();
        this.command.option('-k, --key <apiKey>', 'Azure OpenAI API key (optional; else prompted)');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                const configManager = new manager_1.ConfigManager();
                let apiKey = options.key || process.env.AZURE_OPENAI_API_KEY;
                if (!apiKey) {
                    const ans = await inquirer_1.default.prompt([
                        {
                            type: 'password',
                            name: 'apiKey',
                            message: 'Enter your Azure OpenAI API Key:',
                            mask: '*',
                            validate: (v) => v.trim().length > 0 || 'API key required'
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
                };
                await configManager.set('provider', defaults.provider);
                await configManager.set('model', defaults.model);
                await configManager.set('azureEndpoint', defaults.azureEndpoint);
                await configManager.set('azureDeployment', defaults.azureDeployment);
                await configManager.set('azureApiVersion', defaults.azureApiVersion);
                await configManager.set('apiKey', apiKey);
                console.log(chalk_1.default.green('✅ Azure OpenAI quick setup complete.'));
                console.log(chalk_1.default.blue('You can now run: teladoc-agent review -f someFile.js'));
                console.log(chalk_1.default.gray('To adjust settings later use: teladoc-agent config --list'));
            }
            catch (err) {
                console.error(chalk_1.default.red('❌ Quick Azure setup failed:'), err.message);
                process.exit(1);
            }
        });
    }
}
exports.QuickAzureCommand = QuickAzureCommand;
//# sourceMappingURL=quick-azure.js.map