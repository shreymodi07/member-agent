import { StoredReview } from '../types/review-storage';
import { ReviewIssue } from '../agents/code-review';
export declare class ReviewStorage {
    private storageDir;
    constructor(projectRoot: string);
    initialize(): Promise<void>;
    saveReview(filesChanged: string[], issues: ReviewIssue[], fullReview: string): Promise<string>;
    getLatestReview(): Promise<StoredReview | null>;
    getReview(id: string): Promise<StoredReview | null>;
    listReviews(): Promise<StoredReview[]>;
    private generateReviewId;
}
//# sourceMappingURL=review-storage.d.ts.map