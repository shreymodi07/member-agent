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
class CodeReviewCommand extends base_1.BaseCommand {
    constructor() {
        super('review', 'Perform AI-powered code review');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-f, --file <path>', 'File or directory to review')
            .option('--pr <number>', 'Pull request number to review')
            .option('-s, --severity <level>', 'Minimum severity level (low|medium|high|critical)', 'medium')
            .option('--format <format>', 'Output format (console|json|markdown)', 'console')
            .option('-o, --output <path>', 'Output file path');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔍 Teladoc Code Review Agent'));
                if (!options.file && !options.pr) {
                    const { reviewType } = await inquirer_1.default.prompt([
                        {
                            type: 'list',
                            name: 'reviewType',
                            message: 'What would you like to review?',
                            choices: [
                                { name: 'Local files/directory', value: 'file' },
                                { name: 'Pull request', value: 'pr' }
                            ]
                        }
                    ]);
                    if (reviewType === 'file') {
                        const { file } = await inquirer_1.default.prompt([
                            {
                                type: 'input',
                                name: 'file',
                                message: 'Enter the file or directory path:',
                                validate: (input) => input.length > 0 || 'Path is required'
                            }
                        ]);
                        options.file = file;
                    }
                    else {
                        const { pr } = await inquirer_1.default.prompt([
                            {
                                type: 'input',
                                name: 'pr',
                                message: 'Enter the pull request number:',
                                validate: (input) => /^\d+$/.test(input) || 'Please enter a valid PR number'
                            }
                        ]);
                        options.pr = pr;
                    }
                }
                const spinner = (0, ora_1.default)('Analyzing code and generating review...').start();
                const agent = new code_review_1.CodeReviewAgent();
                const result = await agent.reviewCode({
                    filePath: options.file,
                    prNumber: options.pr,
                    severity: options.severity || 'medium',
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
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.CodeReviewCommand = CodeReviewCommand;
//# sourceMappingURL=code-review.js.map