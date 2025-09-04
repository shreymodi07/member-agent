import { AIProvider } from '../providers/ai-provider';
import * as fs from 'fs-extra';
import * as path from 'path';
import { execSync } from 'child_process';

export interface QATestAnalysis {
  testingInstructions: string;
  whatChanged: string;
}

export class QATestAgent {
  constructor(private aiProvider: AIProvider) {}

  async analyzeChanges(options: {
    targetPath?: string;
    useGitDiff?: boolean;
    format?: string;
  }): Promise<QATestAnalysis> {
    let changes = '';

    if (options.useGitDiff) {
      try {
        changes = execSync('git diff --no-color', { encoding: 'utf-8' });
        if (!changes.trim()) {
          return {
            testingInstructions: 'No code changes detected - no testing needed at this time.',
            whatChanged: 'No changes found in the codebase'
          };
        }
      } catch (error) {
        throw new Error('Failed to get git diff. Make sure you are in a git repository.');
      }
    } else {
      // Analyze files in target path
      const targetPath = options.targetPath || '.';
      changes = await this.getCodeChanges(targetPath);
    }

    // Generate QA testing instructions using AI
    const analysis = await this.generateQATestingInstructions(changes);

    return analysis;
  }

  private async getCodeChanges(targetPath: string): Promise<string> {
    const files = await this.discoverFiles(targetPath);
    const changes: string[] = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf8');
        changes.push(`File: ${path.relative(process.cwd(), file)}\n${content}\n`);
      } catch (error) {
        console.warn(`Could not read file ${file}: ${(error as Error).message}`);
      }
    }

    return changes.join('\n---\n');
  }

  private async discoverFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs'];

    const traverse = async (dir: string) => {
      try {
        const items = await fs.readdir(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          try {
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
              await traverse(fullPath);
            } else if (extensions.some(ext => item.endsWith(ext))) {
              files.push(fullPath);
            }
          } catch (error) {
            // Skip files that can't be accessed
          }
        }
      } catch (error) {
        // Skip directories that can't be read
      }
    };

    const stat = await fs.stat(targetPath);
    if (stat.isDirectory()) {
      await traverse(targetPath);
    } else {
      files.push(targetPath);
    }

    return files;
  }

  private async generateQATestingInstructions(changes: string): Promise<QATestAnalysis> {
    const prompt = `
You are a QA testing expert. Analyze the following code changes and provide a simple explanation for QA testers.

Code changes:
${changes}

Provide a response in this exact JSON format:
{
  "testingInstructions": "1-2 simple sentences explaining what QA should test in non-technical terms",
  "whatChanged": "1 simple sentence describing what changed in plain English"
}

Keep the testingInstructions to 1-2 sentences maximum, written for non-technical QA testers.
Keep the whatChanged to 1 sentence maximum.
`;

    try {
      const response = await this.aiProvider.generateText(prompt);
      const parsed = JSON.parse(response);

      // Validate the response structure
      if (!parsed.testingInstructions || !parsed.whatChanged) {
        throw new Error('Invalid response structure');
      }

      return {
        testingInstructions: parsed.testingInstructions,
        whatChanged: parsed.whatChanged
      };
    } catch (error) {
      // Fallback response if AI fails
      return {
        testingInstructions: 'Please test the new features and make sure existing functionality still works correctly.',
        whatChanged: 'Some code changes were made to the system'
      };
    }
  }
}
