import { AgentConfig, ProjectContext } from '../types';
import { AIProvider } from '../providers/ai-provider';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

export interface CodeReviewOptions {
  filePath?: string;
  prNumber?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  format: 'console' | 'json' | 'markdown';
  outputPath?: string;
  tiered?: boolean;
}

export interface CodeReviewResult {
  review: string;
  outputPath?: string;
  issueCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  issues: ReviewIssue[];
}

export interface ReviewIssue {
  file: string;
  line: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'security' | 'performance' | 'maintainability' | 'compliance' | 'style';
  message: string;
  suggestion: string;
  rule?: string;
}

export class CodeReviewAgent {
  private aiProvider: AIProvider;

  constructor(config?: AgentConfig) {
    this.aiProvider = new AIProvider(config);
  }

  async reviewCode(options: CodeReviewOptions): Promise<CodeReviewResult> {
    let codeContent: string;
    let context: ProjectContext;

    if (options.filePath) {
      // If filePath is '.', review changed files
      if (options.filePath === '.') {
        const changedFiles = await this.detectChangedFiles();
        if (changedFiles.length === 0) {
          throw new Error('No changed files detected. Make sure you have git changes to review.');
        }
        codeContent = await this.readChangedFilesContent(changedFiles);
        context = await this.analyzeProjectContext(process.cwd());
      } else {
        codeContent = await this.readCodeContent(options.filePath);
        context = await this.analyzeProjectContext(options.filePath);
      }
    } else if (options.prNumber) {
      // In a real implementation, this would fetch PR data from Git/GitHub
      throw new Error('PR review not implemented yet. Please use file-based review.');
    } else {
      throw new Error('Either filePath or prNumber must be provided');
    }

    // Generate review using AI
    const review = await this.generateCodeReview(codeContent, context, options.severity, !!options.tiered);
    const issues = await this.parseReviewIssues(review);
    
    // Format output
    const formattedReview = await this.formatReview(review, issues, options.format);
    
    // Save to file if needed
    let outputPath: string | undefined;
    if (options.outputPath || options.format !== 'console') {
      outputPath = options.outputPath || this.getDefaultOutputPath(options.filePath!, options.format);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, formattedReview);
    }

    // Calculate counts
    const issueCount = issues.length;
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    return {
      review: formattedReview,
      outputPath,
      issueCount,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      issues
    };
  }

  private async readCodeContent(filePath: string): Promise<string> {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      const files = await this.getCodeFiles(filePath);
      const contents = await Promise.all(
        files.map(async (file) => {
          const content = await fs.readFile(file, 'utf-8');
          return `// File: ${file}\n${content}\n`;
        })
      );
      return contents.join('\n');
    } else {
      return await fs.readFile(filePath, 'utf-8');
    }
  }

  private async getCodeFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        const subFiles = await this.getCodeFiles(fullPath);
        files.push(...subFiles);
      } else if (this.isCodeFile(entry)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private isCodeFile(filename: string): boolean {
    const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.php', '.rb', '.sh'];
    return codeExtensions.some(ext => filename.endsWith(ext));
  }

  private async analyzeProjectContext(filePath: string): Promise<ProjectContext> {
    const rootPath = await this.findProjectRoot(filePath);
    
    return {
      rootPath,
      language: await this.detectLanguage(rootPath),
      framework: await this.detectFramework(rootPath),
      packageManager: await this.detectPackageManager(rootPath)
    };
  }

  private async findProjectRoot(filePath: string): Promise<string> {
    let current = path.isAbsolute(filePath) ? path.dirname(filePath) : process.cwd();
    
    while (current !== path.dirname(current)) {
      const packageJson = path.join(current, 'package.json');
      const gitDir = path.join(current, '.git');
      
      if (await fs.pathExists(packageJson) || await fs.pathExists(gitDir)) {
        return current;
      }
      
      current = path.dirname(current);
    }
    
    return process.cwd();
  }

  private async detectLanguage(rootPath: string): Promise<string | undefined> {
    if (await fs.pathExists(path.join(rootPath, 'tsconfig.json'))) return 'typescript';
    if (await fs.pathExists(path.join(rootPath, 'package.json'))) return 'javascript';
    if (await fs.pathExists(path.join(rootPath, 'requirements.txt'))) return 'python';
    return undefined;
  }

  private async detectFramework(rootPath: string): Promise<string | undefined> {
    try {
      const packageJson = await fs.readJson(path.join(rootPath, 'package.json'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies.react) return 'react';
      if (dependencies.vue) return 'vue';
      if (dependencies.next) return 'nextjs';
      if (dependencies.express) return 'express';
    } catch {
      // Ignore errors
    }
    
    return undefined;
  }

  private async detectPackageManager(rootPath: string): Promise<'npm' | 'yarn' | 'pnpm'> {
    if (await fs.pathExists(path.join(rootPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (await fs.pathExists(path.join(rootPath, 'yarn.lock'))) return 'yarn';
    return 'npm';
  }

  private async generateCodeReview(
    codeContent: string,
    context: ProjectContext,
    severity: string,
    tiered: boolean
  ): Promise<string> {
    if (tiered) {
      const prompt = this.buildTieredCodeReviewPrompt(codeContent, context, severity);
      return await this.aiProvider.generateText(prompt);
    }

    const isGitChanges = codeContent.includes('// Git Changes:');
    
    const prompt = `
You are a PRINCIPAL ENGINEER at Teladoc Health reviewing code changes. You have 15+ years of experience and your reviews are known for being insightful, practical, and catching critical issues before they reach production.

PROJECT CONTEXT:
  Language: ${context.language || 'Unknown'}
  Framework: ${context.framework || 'Unknown'}
  Min Severity: ${severity}
  Review Type: ${isGitChanges ? 'Git Changes Analysis' : 'Full Code Review'}

${isGitChanges ? 'CODE CHANGES (with git diffs):' : 'CODE TO REVIEW:'}
\`\`\`
${codeContent}
\`\`\`

${isGitChanges ? `
YOUR REVIEW APPROACH:
1. UNDERSTAND THE INTENT - What is the developer trying to accomplish? What problem are they solving?
2. EVALUATE THE APPROACH - Is this the right way to solve it? Are there better patterns or architectures?
3. CATCH ERRORS - Syntax errors, logical errors, edge cases, null pointer exceptions
4. SECURITY FIRST - Any vulnerabilities, data leaks, authentication/authorization issues
5. ARCHITECTURAL CONCERNS - Does this fit with the system design? Will it scale? Is it maintainable?
6. SUGGEST ALTERNATIVES - If they're going in the wrong direction, explain why and suggest a better approach

ANALYZE THESE ASPECTS:

1. INTENT & APPROACH
   - What is the developer trying to accomplish?
   - Is this the right approach or is there a fundamentally better way?
   - Are they reinventing the wheel when a library/pattern exists?
   - Will this solution work at scale?
   - Alternative approaches to consider

2. BUGS & ERRORS
   - Syntax errors or typos
   - Logic errors that will cause runtime failures
   - Null/undefined handling issues
   - Off-by-one errors, race conditions
   - Edge cases not handled
   - Incorrect assumptions in the code

3. SECURITY VULNERABILITIES
   - Authentication/authorization bypasses
   - SQL injection, XSS, CSRF vulnerabilities
   - Exposed secrets or credentials
   - Insecure data transmission
   - Missing input validation/sanitization
   - Privilege escalation risks

4. ARCHITECTURE & DESIGN
   - Does this belong in this module/layer?
   - Separation of concerns violations
   - Tight coupling introduced
   - Missing abstraction layers
   - Service boundaries violated
   - Database design issues

5. PERFORMANCE & SCALABILITY
   - N+1 query problems
   - Missing database indexes
   - Memory leaks or inefficient algorithms
   - Blocking operations in async contexts
   - Missing caching where needed
   - Resource contention issues

6. CODE QUALITY
   - Hard to understand or maintain
   - Missing error handling
   - Insufficient logging for debugging
   - Poor naming conventions
   - Code duplication
   - Missing tests for critical paths

7. CHANGE IMPACT (CRITICAL)
   - Breaking changes introduced
   - Backward compatibility broken
   - APIs changed without versioning
   - Database migrations needed
   - Deployment risks and rollback plan
   - Features affected by this change
   - Testing requirements before merge

` : `
ANALYZE THESE ASPECTS:

1. BUGS & ERRORS - Syntax errors, logic errors, null handling, edge cases
2. SECURITY - Vulnerabilities, authentication issues, data exposure
3. ARCHITECTURE - Design problems, separation of concerns, coupling
4. PERFORMANCE - Query optimization, caching, scalability
5. CODE QUALITY - Readability, maintainability, error handling
`}

OUTPUT FORMAT:
Use this exact structure with separators (80 characters wide):

================================================================================
OVERALL ASSESSMENT
================================================================================

[Write a concise overall assessment of the changes - 2-3 sentences maximum]

================================================================================
ISSUES FOUND: [count]
================================================================================

[SEVERITY] File:Line
Issue: [Brief one-line description]
Impact: [What could go wrong]
Fix: [Specific actionable recommendation]

--------------------------------------------------------------------------------

[Repeat for each issue]

Rules:
- Plain text only, no markdown formatting (no **, ##, ###)
- Be direct and actionable
- Each issue must have: severity tag, file:line, issue, impact, fix
- Use exactly 80 equals signs (=) for major sections
- Use exactly 80 dashes (-) between issues
- Only report ${severity} or higher severity issues
- If wrong direction: Say so directly and recommend alternative

BE HONEST AND DIRECT. If the approach is fundamentally flawed, say so and explain the right way.
`;

    return await this.aiProvider.generateText(prompt);
  }

  private buildTieredCodeReviewPrompt(
    codeContent: string,
    context: ProjectContext,
    severity: string
  ): string {
    const filesChanged = this.extractFilesFromContent(codeContent);
    const repoContext = `root: ${context.rootPath}\n` +
      `language: ${context.language || 'unknown'}\n` +
      `framework: ${context.framework || 'unknown'}\n` +
      `packageManager: ${context.packageManager || 'npm'}`;
    const diff = this.extractDiffSections(codeContent);
    const languages = context.language || 'unknown';

    return `SYSTEM\nYou are an expert code reviewer. Perform a three-stage review (Senior → Staff → Principal) on the provided changes. Be precise, concrete, and actionable. Avoid speculation. Base all findings ONLY on the provided diff and context.\n\nINPUTS\n- Repository context: ${repoContext}\n- Files changed: ${filesChanged.length > 0 ? filesChanged.join(', ') : 'N/A'}\n- Diff (unified):\n${diff || codeContent}\n- Language(s): ${languages}\n- Severity threshold: ${severity} (report items at or above)\n- Standards/Guidelines: Teladoc internal guidelines (if applicable)\n\nOUTPUT RULES\n- Produce ALL THREE sections below in order using Markdown.\n- Keep issue IDs stable across sections (e.g., S1, S2…).\n- Use concise code snippets (≤15 lines) only where needed.\n- Prefer tables for issues; keep consistent columns.\n\n# Senior Software Engineer Review\nBrief Summary (2–4 bullets)\n- …\n\nIssues (table)\n| ID | Severity | File | Line(s) | Category | Issue | Rationale | Suggested Fix |\n|----|----------|------|---------|----------|-------|-----------|---------------|\n| S1 | High | path/to/file.ts | 42–57 | Correctness | … | Why it’s a problem, concrete impact | Minimal diff or exact steps |\n| S2 | Medium | … | … | Maintainability | … | … | … |\n\nQuick Fix Snippets (optional)\n\n# Staff Software Engineer Pass\nWhat changed from Senior (bullets)\n- Merge duplicates (S2 & S4 → S2)\n- Adjust severities with rationale\n- Add architectural/performance perspective where relevant\n\nRevised Issues (table)\n| ID | Severity | File | Line(s) | Category | Consolidated Issue | Deeper Rationale | Improved Fix |\n|----|----------|------|---------|----------|--------------------|------------------|--------------|\n| S1 | High | … | … | Correctness | … | Edge cases, failure modes, tests | Concrete steps/diff |\n\nRefactor Plan (if applicable)\n- Short, incremental plan (≤5 bullets)\n\n# Principal Software Engineer Final Review\nFinal Prioritized Backlog (table)\n| Priority | ID | Decision | Final Fix Plan | Estimated Effort | Owner |\n|----------|----|----------|----------------|------------------|-------|\n| P0 | S1 | Accept | … | 0.5d | Team/Owner |\n\nRisks if Deferred\n- …\n\nFinal Verdict (2–3 sentences)`;
  }

  private extractFilesFromContent(codeContent: string): string[] {
    const files: string[] = [];
    const re = /^\/\/ File:\s*(.+)$/gm;
    let m: RegExpExecArray | null;
    while ((m = re.exec(codeContent)) !== null) {
      const f = m[1].trim();
      if (f && !files.includes(f)) files.push(f);
    }
    return files;
  }

  private extractDiffSections(codeContent: string): string {
    const lines = codeContent.split('\n');
    const chunks: string[] = [];
    let collecting = false;
    for (const line of lines) {
      if (line.startsWith('// Git Changes:')) { collecting = true; continue; }
      if (collecting && line.startsWith('// Full Content:')) { collecting = false; continue; }
      if (collecting) chunks.push(line);
    }
    return chunks.join('\n').trim();
  }

  private async parseReviewIssues(review: string): Promise<ReviewIssue[]> {
    const issues: ReviewIssue[] = [];
    const lines = review.split('\n');
    
    let currentIssue: Partial<ReviewIssue> = {};
    let inIssuesSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if we've entered the issues section
      if (line.startsWith('ISSUES FOUND:') || line.includes('ISSUES FOUND:')) {
        inIssuesSection = true;
        continue;
      }
      
      // Skip if not in issues section yet
      if (!inIssuesSection) continue;
      
      // Stop if we hit the end of review or summary
      if (line.includes('END OF REVIEW') || line.includes('====') && lines[i+1]?.includes('SUMMARY')) {
        break;
      }
      
      // Match issue header: [SEVERITY] File:Line
      const issueHeaderMatch = line.match(/^\[(CRITICAL|HIGH|MEDIUM|LOW)\]\s+(.+?):(\d+)/i);
      if (issueHeaderMatch) {
        // Save previous issue if exists
        if (currentIssue.file && currentIssue.message) {
          issues.push(currentIssue as ReviewIssue);
        }
        
        currentIssue = {
          severity: issueHeaderMatch[1].toLowerCase() as any,
          file: issueHeaderMatch[2].trim(),
          line: parseInt(issueHeaderMatch[3]),
          category: 'maintainability',
          message: '',
          suggestion: ''
        };
        continue;
      }
      
      // Parse issue details
      if (currentIssue.file) {
        if (line.startsWith('Issue:')) {
          currentIssue.message = line.replace('Issue:', '').trim();
        } else if (line.startsWith('Impact:')) {
          // Add impact to message
          const impact = line.replace('Impact:', '').trim();
          if (currentIssue.message) {
            currentIssue.message += '. Impact: ' + impact;
          }
        } else if (line.startsWith('Fix:')) {
          currentIssue.suggestion = line.replace('Fix:', '').trim();
        }
        
        // Detect category from keywords in issue or fix
        const fullText = (currentIssue.message + ' ' + currentIssue.suggestion).toLowerCase();
        if (fullText.includes('security') || fullText.includes('vulnerability') || fullText.includes('auth')) {
          currentIssue.category = 'security';
        } else if (fullText.includes('performance') || fullText.includes('optimization') || fullText.includes('cache')) {
          currentIssue.category = 'performance';
        }
      }
    }
    
    // Add the last issue
    if (currentIssue.file && currentIssue.message) {
      issues.push(currentIssue as ReviewIssue);
    }
    
    return issues;
  }

  private async formatReview(review: string, issues: ReviewIssue[], format: string): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify({ review, issues }, null, 2);
      
      case 'markdown':
        return `# Code Review Report

## Summary
- Total Issues: ${issues.length}
- Critical: ${issues.filter(i => i.severity === 'critical').length}
- High: ${issues.filter(i => i.severity === 'high').length}
- Medium: ${issues.filter(i => i.severity === 'medium').length}
- Low: ${issues.filter(i => i.severity === 'low').length}

## Detailed Review

${review}

## Issues Summary

${issues.map(issue => `
### ${issue.severity.toUpperCase()}: ${issue.message}

**File:** ${issue.file}:${issue.line}  
**Category:** ${issue.category}  
**Suggestion:** ${issue.suggestion}
`).join('\n')}
`;
      
      default: // console
        return review;
    }
  }

  private getDefaultOutputPath(inputPath: string, format: string): string {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const timestamp = new Date().toISOString().split('T')[0];
    const ext = format === 'json' ? 'json' : 'md';
    return path.join(process.cwd(), 'reviews', `${baseName}-review-${timestamp}.${ext}`);
  }

  async detectChangedFiles(): Promise<string[]> {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
      
      // Get staged and unstaged changes
      const stagedFiles = this.getGitFiles('--cached --name-only');
      const unstagedFiles = this.getGitFiles('--name-only');
      
      // Combine and deduplicate
      const allChangedFiles = [...new Set([...stagedFiles, ...unstagedFiles])];
      
      // Filter for code files only
      return allChangedFiles.filter(file => this.isCodeFile(path.basename(file)));
    } catch (error) {
      // Not a git repository or no git available
      return [];
    }
  }

  private getGitFiles(args: string): string[] {
    try {
      const output = execSync(`git diff ${args}`, { encoding: 'utf-8' });
      return output.trim().split('\n').filter(line => line.length > 0);
    } catch (error) {
      return [];
    }
  }

  async readChangedFilesContent(files: string[]): Promise<string> {
    const contents = await Promise.all(
      files.map(async (file) => {
        try {
          const fullPath = path.resolve(file);
          const content = await fs.readFile(fullPath, 'utf-8');
          const gitDiff = await this.getFileDiff(file);
          
          return `// File: ${file}
// Git Changes:
${gitDiff}

// Full Content:
${content}
`;
        } catch (error) {
          return `// File: ${file} (Error reading: ${(error as Error).message})`;
        }
      })
    );
    
    return contents.join('\n\n');
  }

  private async getFileDiff(file: string): Promise<string> {
    try {
      const diff = execSync(`git diff HEAD -- "${file}"`, { encoding: 'utf-8' });
      return diff || 'No diff available';
    } catch (error) {
      return 'Error getting diff';
    }
  }
}
