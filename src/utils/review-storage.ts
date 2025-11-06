import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';
import { StoredReview, StoredIssue } from '../types/review-storage';
import { ReviewIssue } from '../agents/code-review';

export class ReviewStorage {
  private storageDir: string;

  constructor(projectRoot: string) {
    this.storageDir = path.join(projectRoot, '.teladoc-reviews');
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.storageDir);
    
    // Add to .gitignore if not already there
    const gitignorePath = path.join(path.dirname(this.storageDir), '.gitignore');
    if (await fs.pathExists(gitignorePath)) {
      const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
      if (!gitignoreContent.includes('.teladoc-reviews')) {
        await fs.appendFile(gitignorePath, '\n.teladoc-reviews/\n');
      }
    }
  }

  async saveReview(
    filesChanged: string[],
    issues: ReviewIssue[],
    fullReview: string
  ): Promise<string> {
    await this.initialize();

    const timestamp = new Date().toISOString();
    const id = this.generateReviewId(timestamp);
    
    // Get current git commit if available
    let gitCommit: string | undefined;
    try {
      gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      // Not a git repo or git not available
    }

    // Convert issues to stored format with IDs
    const storedIssues: StoredIssue[] = issues.map((issue, index) => ({
      id: `S${index + 1}`,
      severity: issue.severity,
      file: issue.file,
      line: issue.line,
      category: issue.category,
      message: issue.message,
      suggestion: issue.suggestion,
      codeSnippet: undefined // Could extract from file if needed
    }));

    const review: StoredReview = {
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

    const filePath = path.join(this.storageDir, `${id}.json`);
    await fs.writeJson(filePath, review, { spaces: 2 });

    // Update latest pointer
    await fs.writeFile(path.join(this.storageDir, 'latest'), id);

    return id;
  }

  async getLatestReview(): Promise<StoredReview | null> {
    const latestPath = path.join(this.storageDir, 'latest');
    
    if (!await fs.pathExists(latestPath)) {
      return null;
    }

    const latestId = (await fs.readFile(latestPath, 'utf-8')).trim();
    return this.getReview(latestId);
  }

  async getReview(id: string): Promise<StoredReview | null> {
    const filePath = path.join(this.storageDir, `${id}.json`);
    
    if (!await fs.pathExists(filePath)) {
      return null;
    }

    return await fs.readJson(filePath);
  }

  async listReviews(): Promise<StoredReview[]> {
    if (!await fs.pathExists(this.storageDir)) {
      return [];
    }

    const files = await fs.readdir(this.storageDir);
    const reviewFiles = files.filter(f => f.endsWith('.json'));
    
    const reviews: StoredReview[] = [];
    for (const file of reviewFiles) {
      const review = await fs.readJson(path.join(this.storageDir, file));
      reviews.push(review);
    }

    // Sort by timestamp descending
    return reviews.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  private generateReviewId(timestamp: string): string {
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


