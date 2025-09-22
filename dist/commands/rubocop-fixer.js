"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RubocopFixerCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const rubocop_fixer_1 = require("../agents/rubocop-fixer");
const manager_1 = require("../config/manager");
class RubocopFixerCommand extends base_1.BaseCommand {
    constructor() {
        super('rubocop-fix', 'Fix Rubocop issues using ruby_gardener');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-p, --path <path>', 'Path to the Ruby project', process.cwd())
            .option('-m, --max-iterations <number>', 'Maximum number of fix iterations', '10');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔧 Teladoc Rubocop Fixer'));
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new rubocop_fixer_1.RubocopFixerAgent(agentConfig);
                const spinner = (0, ora_1.default)('Starting Rubocop fix process...').start();
                const result = await agent.fixRubocop({
                    projectPath: options.path || process.cwd(),
                    maxIterations: parseInt(options.maxIterations?.toString() || '10')
                });
                spinner.stop();
                console.log(chalk_1.default.green('✅ Rubocop fixing completed!'));
                console.log(chalk_1.default.blue(result.summary));
                if (result.disabledRules.length > 0) {
                    console.log(chalk_1.default.yellow('Disabled rules:'));
                    result.disabledRules.forEach(rule => console.log(chalk_1.default.gray(`  • ${rule}`)));
                }
            }
            catch (error) {
                console.error(chalk_1.default.red('❌ Error during Rubocop fixing:'), error.message);
                process.exit(1);
            }
        });
    }
}
exports.RubocopFixerCommand = RubocopFixerCommand;
//# sourceMappingURL=rubocop-fixer.js.map