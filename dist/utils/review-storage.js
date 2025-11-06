"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewStorage = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
class ReviewStorage {
    constructor(projectRoot) {
        this.storageDir = path_1.default.join(projectRoot, '.teladoc-reviews');
    }
    async initialize() {
        await fs_extra_1.default.ensureDir(this.storageDir);
        // Add to .gitignore if not already there
        const gitignorePath = path_1.default.join(path_1.default.dirname(this.storageDir), '.gitignore');
        if (await fs_extra_1.default.pathExists(gitignorePath)) {
            const gitignoreContent = await fs_extra_1.default.readFile(gitignorePath, 'utf-8');
            if (!gitignoreContent.includes('.teladoc-reviews')) {
                await fs_extra_1.default.appendFile(gitignorePath, '\n.teladoc-reviews/\n');
            }
        }
    }
    async saveReview(filesChanged, issues, fullReview) {
        await this.initialize();
        const timestamp = new Date().toISOString();
        const id = this.generateReviewId(timestamp);
        // Get current git commit if available
        let gitCommit;
        try {
            gitCommit = (0, child_process_1.execSync)('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
        }
        catch {
            // Not a git repo or git not available
        }
        // Convert issues to stored format with IDs
        const storedIssues = issues.map((issue, index) => ({
            id: `S${index + 1}`,
            severity: issue.severity,
            file: issue.file,
            line: issue.line,
            category: issue.category,
            message: issue.message,
            suggestion: issue.suggestion,
            codeSnippet: undefined // Could extract from file if needed
        }));
        const review = {
            id,
            timestamp,
            filesChanged,
            issues: storedIssues,
            summary: {
                total: issues.length,
                critical: issues.filter(i => i.severity === 'critical').length,
                high: issues.filter(i => i.severity === 'high').length,
                medium: issues.filter(i => i.severity === 'medium').length,
                low: issues.filter(i => i.severity === 'low').length
            },
            gitCommit,
            fullReview
        };
        const filePath = path_1.default.join(this.storageDir, `${id}.json`);
        await fs_extra_1.default.writeJson(filePath, review, { spaces: 2 });
        // Update latest pointer
        await fs_extra_1.default.writeFile(path_1.default.join(this.storageDir, 'latest'), id);
        return id;
    }
    async getLatestReview() {
        const latestPath = path_1.default.join(this.storageDir, 'latest');
        if (!await fs_extra_1.default.pathExists(latestPath)) {
            return null;
        }
        const latestId = (await fs_extra_1.default.readFile(latestPath, 'utf-8')).trim();
        return this.getReview(latestId);
    }
    async getReview(id) {
        const filePath = path_1.default.join(this.storageDir, `${id}.json`);
        if (!await fs_extra_1.default.pathExists(filePath)) {
            return null;
        }
        return await fs_extra_1.default.readJson(filePath);
    }
    async listReviews() {
        if (!await fs_extra_1.default.pathExists(this.storageDir)) {
            return [];
        }
        const files = await fs_extra_1.default.readdir(this.storageDir);
        const reviewFiles = files.filter(f => f.endsWith('.json'));
        const reviews = [];
        for (const file of reviewFiles) {
            const review = await fs_extra_1.default.readJson(path_1.default.join(this.storageDir, file));
            reviews.push(review);
        }
        // Sort by timestamp descending
        return reviews.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    generateReviewId(timestamp) {
        // Format: review-YYYYMMDD-HHMMSS
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `review-${year}${month}${day}-${hours}${minutes}${seconds}`;
    }
}
exports.ReviewStorage = ReviewStorage;
//# sourceMappingURL=review-storage.js.map