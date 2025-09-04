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
    const review = await this.generateCodeReview(codeContent, context, options.severity);
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
    const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.php'];
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
    severity: string
  ): Promise<string> {
    const isGitChanges = codeContent.includes('// Git Changes:');
    
    const prompt = `
You are a senior software engineer at Teladoc Health conducting a comprehensive code review. 
Focus on healthcare-specific requirements and best practices.

Project Context:
- Language: ${context.language || 'Unknown'}
- Framework: ${context.framework || 'Unknown'}
- Minimum Severity: ${severity}
- Review Type: ${isGitChanges ? 'Git Changes Analysis' : 'Full Code Review'}

${isGitChanges ? 'Code changes to review (with git diffs):' : 'Code to review:'}
\`\`\`
${codeContent}
\`\`\`

${isGitChanges ? `
**FOCUS ON CHANGES**: Pay special attention to the git diff sections showing what was added (+) and removed (-). 
Review the context around changes and how they impact the overall codebase.

Please provide a change-focused code review covering:
` : 'Please provide a thorough code review covering:'}

1. **Security Issues**:
   - Authentication and authorization
   - Input validation and sanitization
   - SQL injection, XSS, and other vulnerabilities
   - Secrets management
   - Data encryption requirements

2. **Compliance Requirements**:
   - Data privacy and protection standards
   - Regulatory compliance for sensitive data
   - Data retention and deletion policies
   - Audit trail and logging requirements

3. **Performance & Scalability**:
   - Database query optimization
   - Memory usage and potential leaks
   - API response times
   - Caching strategies

4. **Code Quality & Maintainability**:
   - Code structure and organization
   - Documentation and comments
   - Error handling and logging
   - Test coverage

5. **Best Practices**:
   - Design patterns usage
   - SOLID principles
   - DRY principle adherence
   - Dependency management

${isGitChanges ? `
6. **Change Impact Analysis**:
   - Breaking changes introduced
   - Backward compatibility concerns
   - Impact on existing features
   - Migration considerations
` : ''}

For each issue found, provide:
- File and line number
- Severity level (critical, high, medium, low)
- Category (security, performance, maintainability, compliance, style)
- Clear description of the issue
- Specific recommendation for improvement
- Code example if applicable

${isGitChanges ? 'Prioritize issues in the changed code sections.' : ''}
Format the response as structured markdown with clear sections.
Only report issues at or above the requested severity level: ${severity}.
`;

    return await this.aiProvider.generateText(prompt);
  }

  private async parseReviewIssues(review: string): Promise<ReviewIssue[]> {
    // This is a simplified parser - in production, you'd want more robust parsing
    const issues: ReviewIssue[] = [];
    const lines = review.split('\n');
    
    let currentIssue: Partial<ReviewIssue> = {};
    
    for (const line of lines) {
      if (line.includes('File:') && line.includes('Line:')) {
        if (currentIssue.file) {
          issues.push(currentIssue as ReviewIssue);
        }
        const match = line.match(/File:\s*(.+)\s*Line:\s*(\d+)/);
        if (match) {
          currentIssue = {
            file: match[1].trim(),
            line: parseInt(match[2]),
            severity: 'medium',
            category: 'maintainability',
            message: '',
            suggestion: ''
          };
        }
      } else if (line.includes('Severity:')) {
        const severity = line.replace('Severity:', '').trim().toLowerCase();
        if (['low', 'medium', 'high', 'critical'].includes(severity)) {
          currentIssue.severity = severity as any;
        }
      } else if (line.includes('Category:')) {
        const category = line.replace('Category:', '').trim().toLowerCase();
        if (['security', 'performance', 'maintainability', 'compliance', 'style'].includes(category)) {
          currentIssue.category = category as any;
        }
      } else if (line.includes('Issue:')) {
        currentIssue.message = line.replace('Issue:', '').trim();
      } else if (line.includes('Suggestion:')) {
        currentIssue.suggestion = line.replace('Suggestion:', '').trim();
      }
    }
    
    if (currentIssue.file) {
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
