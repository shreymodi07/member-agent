"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RubocopFixerDiffCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const rubocop_fixer_1 = require("../agents/rubocop-fixer");
const manager_1 = require("../config/manager");
class RubocopFixerDiffCommand extends base_1.BaseCommand {
    constructor() {
        super('rubocop-fix-diff', 'Fix Rubocop issues only in changed (diff) lines');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-p, --path <path>', 'Path to the Ruby project', process.cwd())
            .option('-m, --max-iterations <number>', 'Maximum number of fix iterations', '5')
            .option('--staged', 'Use staged changes (git diff --cached) instead of working tree vs HEAD', false)
            .option('--rubocop-only', 'Run rubocop -A on changed files and keep only corrected lines within diff', false)
            .option('--ruby-root <dir>', 'Explicit Ruby project root (directory containing Gemfile)', '')
            .option('--preview', 'Preview roots/files & changed lines without executing RuboCop', false);
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔧 Teladoc Rubocop Diff Fixer'));
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new rubocop_fixer_1.RubocopFixerAgent(agentConfig);
                const spinner = (0, ora_1.default)('Starting diff-only Rubocop fix process...').start();
                const result = await agent.fixRubocop({
                    projectPath: options.path || process.cwd(),
                    maxIterations: parseInt(options.maxIterations?.toString() || '5'),
                    diffOnly: true,
                    staged: !!options.staged,
                    rubocopOnly: !!options.rubocopOnly,
                    rubyRoot: options.rubyRoot || undefined,
                    preview: !!options.preview
                });
                spinner.stop();
                console.log(chalk_1.default.green('✅ Diff-only Rubocop fixing completed!'));
                console.log(chalk_1.default.blue(result.summary));
                if (result.disabledRules.length > 0) {
                    console.log(chalk_1.default.yellow('Disabled rules:'));
                    result.disabledRules.forEach(rule => console.log(chalk_1.default.gray(`  • ${rule}`)));
                }
            }
            catch (error) {
                console.error(chalk_1.default.red('❌ Error during diff-only Rubocop fixing:'), error.message);
                process.exit(1);
            }
        });
    }
}
exports.RubocopFixerDiffCommand = RubocopFixerDiffCommand;
//# sourceMappingURL=rubocop-fix-diff.js.map