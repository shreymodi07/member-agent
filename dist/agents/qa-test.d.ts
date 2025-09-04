import { AIProvider } from '../providers/ai-provider';
export interface QATestAnalysis {
    testingInstructions: string;
    whatChanged: string;
}
export declare class QATestAgent {
    private aiProvider;
    constructor(aiProvider: AIProvider);
    analyzeChanges(options: {
        targetPath?: string;
        useGitDiff?: boolean;
        format?: string;
    }): Promise<QATestAnalysis>;
    private getCodeChanges;
    private discoverFiles;
    private generateQATestingInstructions;
}
//# sourceMappingURL=qa-test.d.ts.map