"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeReviewCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const code_review_1 = require("../agents/code-review");
const manager_1 = require("../config/manager");
class CodeReviewCommand extends base_1.BaseCommand {
    constructor() {
        super('review', 'AI-powered code review');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-f, --file <path>', 'File or directory to review')
            .option('--format <format>', 'Output format (console|json|markdown)', 'console')
            .option('-o, --output <path>', 'Output file path')
            .option('--changes', 'Review git changes automatically');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔍 Teladoc Code Review'));
                // Smart detection: check for git changes first
                if (!options.file) {
                    const configManager = new manager_1.ConfigManager();
                    const agentConfig = await configManager.getAgentConfig();
                    const agent = new code_review_1.CodeReviewAgent(agentConfig);
                    const changedFiles = await agent.detectChangedFiles();
                    if (changedFiles.length > 0) {
                        console.log(chalk_1.default.green(`✨ Found ${changedFiles.length} changed files:`));
                        changedFiles.forEach((file) => console.log(chalk_1.default.gray(`  • ${file}`)));
                        if (options.changes) {
                            console.log(chalk_1.default.blue('🚀 Reviewing changes automatically...'));
                            options.file = '.';
                        }
                        else {
                            const { useChanges } = await inquirer_1.default.prompt([
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
                    }
                    else if (options.changes) {
                        console.log(chalk_1.default.yellow('⚠️  No git changes detected.'));
                        return;
                    }
                    if (!options.file) {
                        const { file } = await inquirer_1.default.prompt([
                            {
                                type: 'input',
                                name: 'file',
                                message: 'Enter file or directory to review:',
                                validate: (input) => input.length > 0 || 'Path is required'
                            }
                        ]);
                        options.file = file;
                    }
                }
                const spinner = (0, ora_1.default)('Analyzing code...').start();
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new code_review_1.CodeReviewAgent(agentConfig);
                const result = await agent.reviewCode({
                    filePath: options.file,
                    severity: 'medium',
                    format: options.format || 'console',
                    outputPath: options.output
                });
                spinner.succeed('Code review completed!');
                if (options.format === 'console') {
                    console.log(result.review);
                }
                else {
                    console.log(chalk_1.default.green(`✅ Review saved to: ${result.outputPath}`));
                }
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`📊 Found ${result.issueCount} issues`));
                    console.log(chalk_1.default.gray(`⚠️  ${result.criticalCount} critical, ${result.highCount} high priority`));
                }
                // QA Testing Guidance
                console.log('\n🧪 QA Testing Guidance:');
                if (result.criticalCount > 0) {
                    console.log('• Critical code issues found - test error handling and edge cases thoroughly');
                    console.log('• Verify fixes for potential crashes, data corruption, or system failures');
                    console.log('• Test recovery mechanisms and error recovery scenarios');
                }
                else if (result.highCount > 0) {
                    console.log('• Code improvements needed - test functionality with various inputs');
                    console.log('• Focus on performance, reliability, and user experience validation');
                    console.log('• Test integration with other system components');
                }
                else {
                    console.log('• Code quality looks good - test new features and integration points');
                    console.log('• Verify existing functionality remains unaffected by changes');
                    console.log('• Perform end-to-end testing of the complete user workflow');
                }
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.CodeReviewCommand = CodeReviewCommand;
//# sourceMappingURL=code-review.js.map