import { BaseCommand } from './base';
import { SpecCoverageAgent } from '../agents/spec-coverage';
import { AIProvider } from '../providers/ai-provider';
import { ConfigManager } from '../config/manager';
import * as fs from 'fs-extra';

export class SpecCoverageCommand extends BaseCommand {
  private aiProvider!: AIProvider;
  private options: any;

  constructor() {
    super('spec-coverage', 'Analyze spec coverage and suggest missing test scenarios');
  }

  protected setupOptions(): void {
    super.setupOptions();
    
    this.command
      .alias('spec')
      .option('-f, --file <path>', 'Analyze specific file')
      .option('-d, --directory <path>', 'Analyze specific directory (default: current)')
      .option('--format <format>', 'Output format (text|json|markdown)', 'text')
      .option('-o, --output <file>', 'Write results to file')
      .option('--skip-combinations', 'Skip parameter combination analysis')
      .option('--skip-suggestions', 'Skip missing scenario suggestions')
      .option('--framework <name>', 'Test framework (jest|vitest|mocha|auto-detect)', 'auto-detect')
      .option('--generate-tests', 'Generate test file templates');
  }

  protected setupAction(): void {
    this.command.action(async (options) => {
      try {
        this.options = options;
        await this.initializeProvider();
        await this.execute();
      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }

  private async initializeProvider(): Promise<void> {
    const configManager = new ConfigManager();
    const config = await configManager.getAgentConfig();
    this.aiProvider = new AIProvider(config);
  }

  private async execute() {
    const agent = new SpecCoverageAgent(this.aiProvider);
    
    const options = {
      targetPath: this.options.file || this.options.directory || '.',
      format: this.options.format || 'text',
      outputFile: this.options.output,
      includeParameterCombinations: !this.options.skipCombinations,
      generateSuggestions: !this.options.skipSuggestions,
      framework: this.options.framework || 'auto-detect'
    };

    console.log('🔍 Analyzing spec coverage...\n');
    
    const results = await agent.analyzeSpecCoverage(options);
    
    if (options.outputFile) {
      await this.writeOutput(results.formatted, options.outputFile);
      console.log(`\n📄 Coverage analysis written to: ${options.outputFile}`);
    } else {
      console.log(results.formatted);
    }

    // Summary
    console.log('\n📊 Coverage Summary:');
    console.log(`• Files analyzed: ${results.summary.filesAnalyzed}`);
    console.log(`• Functions found: ${results.summary.functionsFound}`);
    console.log(`• Test files found: ${results.summary.testFilesFound}`);
    console.log(`• Missing scenarios: ${results.summary.missingScenariosCount}`);
    console.log(`• Parameter combinations: ${results.summary.parameterCombinations}`);
    
    if (results.summary.missingScenariosCount > 0) {
      console.log('\n💡 Use --generate-tests to create test templates');
    }
  }

  private async writeOutput(content: string, filePath: string): Promise<void> {
    await fs.writeFile(filePath, content, 'utf8');
  }
}