import { AgentConfig } from '../types';
export interface RubocopFixerOptions {
    projectPath: string;
    maxIterations?: number;
    diffOnly?: boolean;
    staged?: boolean;
    rubyRoot?: string;
    preview?: boolean;
}
export interface RubocopFixerResult {
    totalIterations: number;
    totalFixes: number;
    totalDisables: number;
    disabledRules: string[];
    summary: string;
}
export declare class RubocopFixerAgent {
    private aiProvider;
    private firstCommit;
    constructor(config?: AgentConfig);
    fixRubocop(options: RubocopFixerOptions): Promise<RubocopFixerResult>;
    private runRubyGardenerCheck;
    private runRubocopAutoCorrectOnChangedFiles;
    private findRubyRoot;
    private getChangedLines;
    private parseIssues;
    private shouldDisableRule;
    private isSignificantRefactor;
    private fixIssue;
    private disableRule;
    private commitChanges;
    private generateSummary;
}
//# sourceMappingURL=rubocop-fixer.d.ts.map