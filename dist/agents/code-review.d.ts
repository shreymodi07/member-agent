import { AgentConfig } from '../types';
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
export declare class CodeReviewAgent {
    private aiProvider;
    constructor(config?: AgentConfig);
    reviewCode(options: CodeReviewOptions): Promise<CodeReviewResult>;
    private readCodeContent;
    private getCodeFiles;
    private isCodeFile;
    private analyzeProjectContext;
    private findProjectRoot;
    private detectLanguage;
    private detectFramework;
    private detectPackageManager;
    private generateCodeReview;
    private parseReviewIssues;
    private formatReview;
    private getDefaultOutputPath;
    detectChangedFiles(): Promise<string[]>;
    private getGitFiles;
    readChangedFilesContent(files: string[]): Promise<string>;
    private getFileDiff;
}
//# sourceMappingURL=code-review.d.ts.map