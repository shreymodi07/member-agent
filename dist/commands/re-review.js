"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReReviewCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const re_review_1 = require("../agents/re-review");
const manager_1 = require("../config/manager");
class ReReviewCommand extends base_1.BaseCommand {
    constructor() {
        super('re-review', 'Verify if previous review issues are fixed and detect new issues');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-r, --review-id <id>', 'Specific review ID to compare against (default: latest)');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                const separator = '='.repeat(80);
                const thinSeparator = '-'.repeat(80);
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold('RE-REVIEW - Verification & Progress Check'));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                const spinner = (0, ora_1.default)('Loading previous review...').start();
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new re_review_1.ReReviewAgent(agentConfig);
                const result = await agent.reReview({
                    projectPath: process.cwd(),
                    reviewId: options.reviewId
                });
                spinner.stop();
                // Display previous review info
                console.log(chalk_1.default.bold('PREVIOUS REVIEW:'));
                console.log(chalk_1.default.gray(`  ID: ${result.previousReview.id}`));
                console.log(chalk_1.default.gray(`  Date: ${new Date(result.previousReview.timestamp).toLocaleString()}`));
                console.log(chalk_1.default.gray(`  Files: ${result.previousReview.filesChanged.length}`));
                console.log(chalk_1.default.gray(`  Issues Found: ${result.previousReview.summary.total}`));
                console.log('');
                // Fixed Issues Section
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold(`✓ FIXED ISSUES: ${result.fixedIssues.length}`));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                if (result.fixedIssues.length > 0) {
                    result.fixedIssues.forEach(issue => {
                        console.log(chalk_1.default.green(`✓ [${issue.id}] ${issue.file}:${issue.line}`));
                        console.log(chalk_1.default.gray(`  ${issue.message}`));
                        console.log('');
                    });
                }
                else {
                    console.log(chalk_1.default.gray('No issues have been fixed yet.'));
                    console.log('');
                }
                // Unfixed Issues Section
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold(`✗ STILL PRESENT: ${result.unfixedIssues.length}`));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                if (result.unfixedIssues.length > 0) {
                    result.unfixedIssues.forEach(issue => {
                        const severityColor = this.getSeverityColor(issue.severity);
                        console.log(severityColor(`✗ [${issue.id}] [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`));
                        console.log(chalk_1.default.gray(`  Issue: ${issue.message}`));
                        console.log(chalk_1.default.gray(`  Fix: ${issue.suggestion}`));
                        console.log(thinSeparator.substring(0, 60));
                        console.log('');
                    });
                }
                else {
                    console.log(chalk_1.default.green('All previous issues have been fixed!'));
                    console.log('');
                }
                // New Issues Section
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold(`⚠ NEW ISSUES: ${result.newIssues.length}`));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                if (result.newIssues.length > 0) {
                    result.newIssues.forEach(issue => {
                        const severityColor = this.getSeverityColor(issue.severity);
                        console.log(severityColor(`⚠ [${issue.id}] [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`));
                        console.log(chalk_1.default.gray(`  Issue: ${issue.message}`));
                        console.log(chalk_1.default.gray(`  Fix: ${issue.suggestion}`));
                        console.log(thinSeparator.substring(0, 60));
                        console.log('');
                    });
                }
                else {
                    console.log(chalk_1.default.green('No new issues introduced!'));
                    console.log('');
                }
                // Summary Section
                console.log(chalk_1.default.cyan(separator));
                console.log(chalk_1.default.cyan.bold('SUMMARY'));
                console.log(chalk_1.default.cyan(separator));
                console.log('');
                const totalPrevious = result.previousReview.summary.total;
                const fixed = result.fixedIssues.length;
                const unfixed = result.unfixedIssues.length;
                const newIssuesCount = result.newIssues.length;
                const progressPercent = totalPrevious > 0 ? Math.round((fixed / totalPrevious) * 100) : 0;
                console.log(chalk_1.default.bold('Progress:'));
                console.log(`  Previous Issues: ${totalPrevious}`);
                console.log(chalk_1.default.green(`  Fixed: ${fixed} (${progressPercent}%)`));
                console.log(unfixed > 0 ? chalk_1.default.red(`  Unfixed: ${unfixed}`) : chalk_1.default.gray(`  Unfixed: ${unfixed}`));
                console.log(newIssuesCount > 0 ? chalk_1.default.yellow(`  New: ${newIssuesCount}`) : chalk_1.default.gray(`  New: ${newIssuesCount}`));
                console.log('');
                // Progress bar
                const barLength = 40;
                const filledLength = Math.round((fixed / totalPrevious) * barLength);
                const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
                console.log(chalk_1.default.green(`Progress: [${bar}] ${progressPercent}%`));
                console.log('');
                // AI Summary
                console.log(chalk_1.default.bold('Assessment:'));
                console.log(result.summary);
                console.log('');
                // Final Status
                if (unfixed === 0 && newIssuesCount === 0) {
                    console.log(chalk_1.default.green.bold('Status: ✓ All issues resolved! Ready to merge.'));
                }
                else if (unfixed > 0 && newIssuesCount === 0) {
                    console.log(chalk_1.default.yellow.bold(`Status: ⚠ ${unfixed} issue(s) still need attention.`));
                }
                else if (unfixed === 0 && newIssuesCount > 0) {
                    console.log(chalk_1.default.yellow.bold(`Status: ⚠ Previous issues fixed, but ${newIssuesCount} new issue(s) introduced.`));
                }
                else {
                    console.log(chalk_1.default.red.bold(`Status: ✗ ${unfixed} unfixed + ${newIssuesCount} new issues need attention.`));
                }
                console.log('');
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
    getSeverityColor(severity) {
        switch (severity) {
            case 'critical':
                return chalk_1.default.red.bold;
            case 'high':
                return chalk_1.default.red;
            case 'medium':
                return chalk_1.default.yellow;
            case 'low':
                return chalk_1.default.blue;
            default:
                return chalk_1.default.gray;
        }
    }
}
exports.ReReviewCommand = ReReviewCommand;
//# sourceMappingURL=re-review.js.map