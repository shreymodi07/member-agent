export interface StoredReview {
    id: string;
    timestamp: string;
    filesChanged: string[];
    issues: StoredIssue[];
    summary: {
        total: number;
        critical: number;
        high: number;
        medium: number;
        low: number;
    };
    gitCommit?: string;
    fullReview: string;
}
export interface StoredIssue {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    file: string;
    line: number;
    category: string;
    message: string;
    suggestion: string;
    codeSnippet?: string;
}
export interface ReReviewResult {
    previousReview: StoredReview;
    fixedIssues: StoredIssue[];
    unfixedIssues: StoredIssue[];
    newIssues: StoredIssue[];
    summary: string;
}
//# sourceMappingURL=review-storage.d.ts.map