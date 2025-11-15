import { BaseCommand } from './base.js';
import { QATestAgent } from '../agents/qa-test.js';
import { AIProvider } from '../providers/ai-provider.js';
import { ConfigManager } from '../config/manager.js';
import * as fs from 'fs-extra';

export class QATestCommand extends BaseCommand {
  constructor() {
    super('qa-test', 'Generate QA testing instructions for code changes');
  }

  protected setupOptions(): void {
    super.setupOptions();

    this.command
      .alias('qa')
      .option('-f, --file <path>', 'Analyze specific file')
      .option('-d, --directory <path>', 'Analyze specific directory (default: current)')
      .option('--diff', 'Analyze only files changed in git diff')
      .option('--format <format>', 'Output format (text|json)', 'text')
      .option('-o, --output <file>', 'Write results to file');
  }

  protected setupAction(): void {
    this.command.action(async (options) => {
      try {
        console.log('🧪 Analyzing code changes for QA testing...\n');

        const configManager = new ConfigManager();
        const config = await configManager.getAgentConfig();
        const aiProvider = new AIProvider(config);
        const agent = new QATestAgent(aiProvider);

        const analysisOptions = {
          targetPath: options.file || options.directory || '.',
          useGitDiff: options.diff || false,
          format: options.format || 'text'
        };

        const analysis = await agent.analyzeChanges(analysisOptions);

        // Display results
        console.log('📋 QA Testing Instructions:');
        console.log(`What changed: ${analysis.whatChanged}`);
        console.log(`Testing needed: ${analysis.testingInstructions}`);

        // Save to file if requested
        if (options.output) {
          const output = {
            whatChanged: analysis.whatChanged,
            testingInstructions: analysis.testingInstructions,
            generatedAt: new Date().toISOString()
          };

          await fs.writeFile(options.output, JSON.stringify(output, null, 2), 'utf8');
          console.log(`\n📄 QA instructions saved to: ${options.output}`);
        }

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }
}
