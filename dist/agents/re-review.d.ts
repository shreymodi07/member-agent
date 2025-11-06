import { AgentConfig } from '../types';
import { ReReviewResult } from '../types/review-storage';
export interface ReReviewOptions {
    projectPath: string;
    reviewId?: string;
}
export declare class ReReviewAgent {
    private aiProvider;
    private codeReviewAgent;
    constructor(config?: AgentConfig);
    reReview(options: ReReviewOptions): Promise<ReReviewResult>;
    private verifyIssueFixed;
    private getCurrentGitCommit;
    private getFileAtCommit;
    private hasCodeChangedAroundLine;
    private filterNewIssues;
    private generateReReviewSummary;
}
//# sourceMappingURL=re-review.d.ts.map