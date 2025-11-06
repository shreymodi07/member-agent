import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import ora from 'ora';
import { ReReviewAgent } from '../agents/re-review';
import { ConfigManager } from '../config/manager';

interface ReReviewOptions extends BaseCommandOptions {
  reviewId?: string;
}

export class ReReviewCommand extends BaseCommand {
  constructor() {
    super('re-review', 'Verify if previous review issues are fixed and detect new issues');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-r, --review-id <id>', 'Specific review ID to compare against (default: latest)');
  }

  protected setupAction(): void {
    this.command.action(async (options: ReReviewOptions) => {
      try {
        const separator = '='.repeat(80);
        const thinSeparator = '-'.repeat(80);
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold('RE-REVIEW - Verification & Progress Check'));
        console.log(chalk.cyan(separator));
        console.log('');

        const spinner = ora('Loading previous review...').start();
        const configManager = new ConfigManager();
        const agentConfig = await configManager.getAgentConfig();
        const agent = new ReReviewAgent(agentConfig);
        const result = await agent.reReview({
          projectPath: process.cwd(),
          reviewId: options.reviewId
        });
        spinner.stop();

        // Display previous review info
        console.log(chalk.bold('PREVIOUS REVIEW:'));
        console.log(chalk.gray(`  ID: ${result.previousReview.id}`));
        console.log(chalk.gray(`  Date: ${new Date(result.previousReview.timestamp).toLocaleString()}`));
        console.log(chalk.gray(`  Files: ${result.previousReview.filesChanged.length}`));
        console.log(chalk.gray(`  Issues Found: ${result.previousReview.summary.total}`));
        console.log('');

        // Fixed Issues Section
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold(`✓ FIXED ISSUES: ${result.fixedIssues.length}`));
        console.log(chalk.cyan(separator));
        console.log('');
        if (result.fixedIssues.length > 0) {
          result.fixedIssues.forEach(issue => {
            console.log(chalk.green(`✓ [${issue.id}] ${issue.file}:${issue.line}`));
            console.log(chalk.gray(`  ${issue.message}`));
            console.log('');
          });
        } else {
          console.log(chalk.gray('No issues have been fixed yet.'));
          console.log('');
        }

        // Unfixed Issues Section
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold(`✗ STILL PRESENT: ${result.unfixedIssues.length}`));
        console.log(chalk.cyan(separator));
        console.log('');
        if (result.unfixedIssues.length > 0) {
          result.unfixedIssues.forEach(issue => {
            const severityColor = this.getSeverityColor(issue.severity);
            console.log(severityColor(`✗ [${issue.id}] [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`));
            console.log(chalk.gray(`  Issue: ${issue.message}`));
            console.log(chalk.gray(`  Fix: ${issue.suggestion}`));
            console.log(thinSeparator.substring(0, 60));
            console.log('');
          });
        } else {
          console.log(chalk.green('All previous issues have been fixed!'));
          console.log('');
        }

        // New Issues Section
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold(`⚠ NEW ISSUES: ${result.newIssues.length}`));
        console.log(chalk.cyan(separator));
        console.log('');
        if (result.newIssues.length > 0) {
          result.newIssues.forEach(issue => {
            const severityColor = this.getSeverityColor(issue.severity);
            console.log(severityColor(`⚠ [${issue.id}] [${issue.severity.toUpperCase()}] ${issue.file}:${issue.line}`));
            console.log(chalk.gray(`  Issue: ${issue.message}`));
            console.log(chalk.gray(`  Fix: ${issue.suggestion}`));
            console.log(thinSeparator.substring(0, 60));
            console.log('');
          });
        } else {
          console.log(chalk.green('No new issues introduced!'));
          console.log('');
        }

        // Summary Section
        console.log(chalk.cyan(separator));
        console.log(chalk.cyan.bold('SUMMARY'));
        console.log(chalk.cyan(separator));
        console.log('');
        const totalPrevious = result.previousReview.summary.total;
        const fixed = result.fixedIssues.length;
        const unfixed = result.unfixedIssues.length;
        const newIssuesCount = result.newIssues.length;
        const progressPercent = totalPrevious > 0 ? Math.round((fixed / totalPrevious) * 100) : 0;
        console.log(chalk.bold('Progress:'));
        console.log(`  Previous Issues: ${totalPrevious}`);
        console.log(chalk.green(`  Fixed: ${fixed} (${progressPercent}%)`));
        console.log(unfixed > 0 ? chalk.red(`  Unfixed: ${unfixed}`) : chalk.gray(`  Unfixed: ${unfixed}`));
        console.log(newIssuesCount > 0 ? chalk.yellow(`  New: ${newIssuesCount}`) : chalk.gray(`  New: ${newIssuesCount}`));
        console.log('');

        // Progress bar
        const barLength = 40;
        const filledLength = Math.round((fixed / totalPrevious) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        console.log(chalk.green(`Progress: [${bar}] ${progressPercent}%`));
        console.log('');

        // AI Summary
        console.log(chalk.bold('Assessment:'));
        console.log(result.summary);
        console.log('');

        // Final Status
        if (unfixed === 0 && newIssuesCount === 0) {
          console.log(chalk.green.bold('Status: ✓ All issues resolved! Ready to merge.'));
        } else if (unfixed > 0 && newIssuesCount === 0) {
          console.log(chalk.yellow.bold(`Status: ⚠ ${unfixed} issue(s) still need attention.`));
        } else if (unfixed === 0 && newIssuesCount > 0) {
          console.log(chalk.yellow.bold(`Status: ⚠ Previous issues fixed, but ${newIssuesCount} new issue(s) introduced.`));
        } else {
          console.log(chalk.red.bold(`Status: ✗ ${unfixed} unfixed + ${newIssuesCount} new issues need attention.`));
        }
        console.log('');
      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }

  private getSeverityColor(severity: string) {
    switch (severity) {
      case 'critical':
        return chalk.red.bold;
      case 'high':
        return chalk.red;
      case 'medium':
        return chalk.yellow;
      case 'low':
        return chalk.blue;
      default:
        return chalk.gray;
    }
  }
}









