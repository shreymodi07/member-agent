"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReReviewAgent = void 0;
const ai_provider_1 = require("../providers/ai-provider");
const review_storage_1 = require("../utils/review-storage");
const code_review_1 = require("./code-review");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class ReReviewAgent {
    constructor(config) {
        this.aiProvider = new ai_provider_1.AIProvider(config);
        this.codeReviewAgent = new code_review_1.CodeReviewAgent(config);
    }
    async reReview(options) {
        const storage = new review_storage_1.ReviewStorage(options.projectPath);
        // Get previous review
        const previousReview = options.reviewId
            ? await storage.getReview(options.reviewId)
            : await storage.getLatestReview();
        if (!previousReview) {
            throw new Error('No previous review found. Run a review first with: teladoc-agent review --changes');
        }
        // Get current git commit for comparison
        const currentGitCommit = this.getCurrentGitCommit(options.projectPath);
        // Get current code for the files that were reviewed
        const currentCodeMap = new Map();
        const previousCodeMap = new Map();
        for (const file of previousReview.filesChanged) {
            const filePath = path_1.default.join(options.projectPath, file);
            if (await fs_extra_1.default.pathExists(filePath)) {
                const content = await fs_extra_1.default.readFile(filePath, 'utf-8');
                currentCodeMap.set(file, content);
                // Try to get previous version from git if available
                if (previousReview.gitCommit && currentGitCommit) {
                    try {
                        const previousContent = this.getFileAtCommit(options.projectPath, file, previousReview.gitCommit);
                        if (previousContent) {
                            previousCodeMap.set(file, previousContent);
                        }
                    }
                    catch {
                        // Git command failed, will use current code comparison
                    }
                }
            }
        }
        // Use AI to verify each issue
        const fixedIssues = [];
        const unfixedIssues = [];
        for (const issue of previousReview.issues) {
            const currentCode = currentCodeMap.get(issue.file);
            if (!currentCode) {
                // File was deleted or moved - consider issue as fixed
                fixedIssues.push(issue);
                continue;
            }
            // First check if the code around the issue line has changed
            const previousCode = previousCodeMap.get(issue.file);
            if (previousCode) {
                // We have previous code - compare directly
                const hasCodeChanged = this.hasCodeChangedAroundLine(previousCode, currentCode, issue.line);
                if (!hasCodeChanged) {
                    // Code hasn't changed at this location, issue is still unfixed
                    unfixedIssues.push(issue);
                    continue;
                }
            }
            else if (previousReview.gitCommit && currentGitCommit && previousReview.gitCommit === currentGitCommit) {
                // Git commit hasn't changed and we couldn't get previous code from git
                // This means the code likely hasn't changed (no uncommitted changes affecting this file)
                // Mark as unfixed to be safe
                unfixedIssues.push(issue);
                continue;
            }
            // Code has changed or we can't determine - use AI to verify
            const isFixed = await this.verifyIssueFixed(issue, currentCode, previousCode);
            if (isFixed) {
                fixedIssues.push(issue);
            }
            else {
                unfixedIssues.push(issue);
            }
        }
        // Detect new issues in the current code
        const newReviewResult = await this.codeReviewAgent.reviewCode({
            filePath: '.',
            severity: 'medium',
            format: 'console'
        });
        // Filter out issues that match previous issues (by file and line proximity)
        const newIssues = this.filterNewIssues(newReviewResult.issues.map((issue, idx) => ({
            id: `N${idx + 1}`,
            severity: issue.severity,
            file: issue.file,
            line: issue.line,
            category: issue.category,
            message: issue.message,
            suggestion: issue.suggestion
        })), previousReview.issues);
        // Generate summary
        const summary = await this.generateReReviewSummary(previousReview, fixedIssues, unfixedIssues, newIssues);
        return {
            previousReview,
            fixedIssues,
            unfixedIssues,
            newIssues,
            summary
        };
    }
    async verifyIssueFixed(issue, currentCode, previousCode) {
        // Extract code context around the issue line
        const contextLines = 10;
        const currentLines = currentCode.split('\n');
        const startLine = Math.max(0, issue.line - contextLines);
        const endLine = Math.min(currentLines.length, issue.line + contextLines);
        const currentContext = currentLines.slice(startLine, endLine).join('\n');
        const actualLineNumber = issue.line - startLine;
        let previousContext = '';
        if (previousCode) {
            const prevLines = previousCode.split('\n');
            const prevStartLine = Math.max(0, issue.line - contextLines);
            const prevEndLine = Math.min(prevLines.length, issue.line + contextLines);
            previousContext = prevLines.slice(prevStartLine, prevEndLine).join('\n');
        }
        const prompt = `
You are verifying if a code review issue has been fixed.

CRITICAL: Only mark as FIXED if the code has been CHANGED to address the issue. If the code is identical or the issue still exists, mark as UNFIXED.

PREVIOUS ISSUE:
File: ${issue.file}
Line: ${issue.line}
Severity: ${issue.severity}
Issue: ${issue.message}
Suggested Fix: ${issue.suggestion}

${previousCode ? `PREVIOUS CODE (at line ${issue.line}):
\`\`\`
${previousContext}
\`\`\`

CURRENT CODE (at line ${issue.line}):
\`\`\`
${currentContext}
\`\`\`

COMPARISON: Compare the code around line ${actualLineNumber + 1} in the current context. Has the code been modified to address the issue?` : `CURRENT CODE (at line ${issue.line}):
\`\`\`
${currentContext}
\`\`\`

ANALYSIS: Look at line ${actualLineNumber + 1} in the current context. Does the code still have the issue described above?`}

TASK:
1. Examine the code at the issue line
2. Check if the specific problem mentioned in the issue still exists
3. Only mark as FIXED if the code has been CHANGED to resolve the issue
4. If code is unchanged or issue persists, mark as UNFIXED

Respond with ONLY one word:
- "FIXED" only if the code has been changed to resolve the issue
- "UNFIXED" if the code is unchanged or the issue still exists

Response:`;
        const response = await this.aiProvider.generateText(prompt);
        const result = response.trim().toUpperCase();
        // Be more strict - only accept explicit "FIXED" response
        return result === 'FIXED' || (result.includes('FIXED') && !result.includes('UNFIXED'));
    }
    getCurrentGitCommit(projectPath) {
        try {
            return (0, child_process_1.execSync)('git rev-parse HEAD', {
                cwd: projectPath,
                encoding: 'utf-8'
            }).trim();
        }
        catch {
            return null;
        }
    }
    getFileAtCommit(projectPath, filePath, commit) {
        try {
            return (0, child_process_1.execSync)(`git show ${commit}:${filePath}`, {
                cwd: projectPath,
                encoding: 'utf-8'
            });
        }
        catch {
            return null;
        }
    }
    hasCodeChangedAroundLine(previousCode, currentCode, lineNumber) {
        const contextLines = 5; // Check 5 lines before and after
        const prevLines = previousCode.split('\n');
        const currLines = currentCode.split('\n');
        const startLine = Math.max(0, lineNumber - contextLines);
        const endLine = Math.min(Math.max(prevLines.length, currLines.length), lineNumber + contextLines);
        // Extract the relevant sections
        const prevSection = prevLines.slice(startLine, endLine).join('\n');
        const currSection = currLines.slice(startLine, endLine).join('\n');
        // Compare - if identical, code hasn't changed
        return prevSection !== currSection;
    }
    filterNewIssues(currentIssues, previousIssues) {
        return currentIssues.filter(current => {
            // Check if this issue is similar to any previous issue
            const isSimilar = previousIssues.some(prev => {
                // Same file and within 5 lines
                if (prev.file === current.file &&
                    Math.abs(prev.line - current.line) <= 5) {
                    // Check if messages are similar
                    const prevWords = prev.message.toLowerCase().split(' ');
                    const currentWords = current.message.toLowerCase().split(' ');
                    const commonWords = prevWords.filter(w => currentWords.includes(w));
                    // If more than 50% words match, consider it the same issue
                    return commonWords.length > prevWords.length * 0.5;
                }
                return false;
            });
            return !isSimilar;
        });
    }
    async generateReReviewSummary(previousReview, fixedIssues, unfixedIssues, newIssues) {
        const prompt = `
Generate a concise re-review summary.

PREVIOUS REVIEW:
- Total Issues: ${previousReview.summary.total}
- Critical: ${previousReview.summary.critical}
- High: ${previousReview.summary.high}
- Medium: ${previousReview.summary.medium}
- Low: ${previousReview.summary.low}

CURRENT STATUS:
- Fixed: ${fixedIssues.length}
- Still Unfixed: ${unfixedIssues.length}
- New Issues: ${newIssues.length}

Generate a 2-3 sentence summary of the progress and recommendations.
Be direct and actionable.`;
        return await this.aiProvider.generateText(prompt);
    }
}
exports.ReReviewAgent = ReReviewAgent;
//# sourceMappingURL=re-review.js.map