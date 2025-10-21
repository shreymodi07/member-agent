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
            .option('--changes', 'Review git changes automatically')
            .option('--tiered', 'Use tiered Senior→Staff→Principal prompt');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                const separator = '='.repeat(80);
                const thinSeparator = '-'.repeat(80);
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold('CODE REVIEW - Principal Engineer Assessment'));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                // Smart detection: check for git changes first
                if (!options.file) {
                    const configManager = new manager_1.ConfigManager();
                    const agentConfig = await configManager.getAgentConfig();
                    const agent = new code_review_1.CodeReviewAgent(agentConfig);
                    const changedFiles = await agent.detectChangedFiles();
                    if (changedFiles.length > 0) {
                        console.log(chalk_1.default.bold('FILES CHANGED:'), changedFiles.length);
                        changedFiles.forEach((file) => console.log(chalk_1.default.gray(`  ${file}`)));
                        console.log('');
                        if (options.changes) {
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
                        console.log('No git changes detected.');
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
                // Get project context for header
                const context = await agent['analyzeProjectContext'](options.file);
                spinner.stop();
                // Print project info
                console.log(chalk_1.default.bold('PROJECT:'), context.rootPath.split('/').pop() || 'Unknown');
                if (context.language)
                    console.log(chalk_1.default.bold('LANGUAGE:'), context.language);
                if (context.framework)
                    console.log(chalk_1.default.bold('FRAMEWORK:'), context.framework);
                console.log(chalk_1.default.bold('SEVERITY THRESHOLD:'), 'medium');
                console.log('');
                spinner.start('Running analysis...');
                const result = await agent.reviewCode({
                    filePath: options.file,
                    severity: 'medium',
                    format: options.format || 'console',
                    outputPath: options.output,
                    tiered: !!options.tiered
                });
                spinner.stop();
                if (options.format === 'console') {
                    console.log(result.review);
                }
                else {
                    console.log(`Review saved: ${result.outputPath}`);
                }
                // Summary section
                console.log('');
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold('SUMMARY'));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                console.log(chalk_1.default.bold('Total Issues:'), result.issueCount);
                console.log(thinSeparator.substring(0, 40));
                if (result.criticalCount > 0) {
                    console.log(chalk_1.default.red('Critical:'), result.criticalCount);
                }
                else {
                    console.log(chalk_1.default.gray('Critical:'), result.criticalCount);
                }
                if (result.highCount > 0) {
                    console.log(chalk_1.default.yellow('High:    '), result.highCount);
                }
                else {
                    console.log(chalk_1.default.gray('High:    '), result.highCount);
                }
                if (result.mediumCount > 0) {
                    console.log(chalk_1.default.blue('Medium:  '), result.mediumCount);
                }
                else {
                    console.log(chalk_1.default.gray('Medium:  '), result.mediumCount);
                }
                console.log(chalk_1.default.gray('Low:     '), result.lowCount);
                console.log('');
                // Status message
                if (result.criticalCount > 0) {
                    console.log(chalk_1.default.red.bold('Status: ✗ Critical issues must be fixed before merge'));
                }
                else if (result.highCount > 0) {
                    console.log(chalk_1.default.yellow.bold('Status: ⚠ High priority issues should be addressed'));
                }
                else if (result.mediumCount > 0) {
                    console.log(chalk_1.default.blue.bold('Status: ✓ Safe to merge with recommended improvements'));
                }
                else {
                    console.log(chalk_1.default.green.bold('Status: ✓ All clear - no issues found'));
                }
                console.log('');
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.CodeReviewCommand = CodeReviewCommand;
//# sourceMappingURL=code-review.js.map