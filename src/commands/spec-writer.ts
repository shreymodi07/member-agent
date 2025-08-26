import { BaseCommand } from './base';
import { BaseCommandOptions } from '../types';
import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { SpecWriterAgent } from '../agents/spec-writer';

interface SpecWriterOptions extends BaseCommandOptions {
  file?: string;
  type?: 'api' | 'feature' | 'component';
  template?: string;
  output?: string;
}

export class SpecWriterCommand extends BaseCommand {
  constructor() {
    super('spec', 'Generate technical specifications using AI');
  }

  protected setupOptions(): void {
    super.setupOptions();
    this.command
      .option('-f, --file <path>', 'Input file or directory to analyze')
      .option('-t, --type <type>', 'Type of specification (api|feature|component)', 'feature')
      .option('--template <template>', 'Custom template to use')
      .option('-o, --output <path>', 'Output file path');
  }

  protected setupAction(): void {
    this.command.action(async (options: SpecWriterOptions) => {
      try {
        console.log(chalk.blue('🔍 Teladoc Spec Writer Agent'));
        
        if (!options.file) {
          const { file } = await inquirer.prompt([
            {
              type: 'input',
              name: 'file',
              message: 'Enter the file or directory path to analyze:',
              validate: (input) => input.length > 0 || 'File path is required'
            }
          ]);
          options.file = file;
        }

        if (!options.type) {
          const { type } = await inquirer.prompt([
            {
              type: 'list',
              name: 'type',
              message: 'What type of specification do you want to generate?',
              choices: [
                { name: 'API Specification', value: 'api' },
                { name: 'Feature Specification', value: 'feature' },
                { name: 'Component Specification', value: 'component' }
              ]
            }
          ]);
          options.type = type;
        }

        const spinner = ora('Analyzing code and generating specification...').start();
        
        const agent = new SpecWriterAgent();
        const result = await agent.generateSpec({
          filePath: options.file!,
          type: options.type!,
          template: options.template,
          outputPath: options.output
        });

        spinner.succeed('Specification generated successfully!');
        console.log(chalk.green(`✅ Specification saved to: ${result.outputPath}`));
        
        if (options.verbose) {
          console.log(chalk.gray(`📊 Analysis completed in ${result.duration}ms`));
          console.log(chalk.gray(`📝 Generated ${result.lineCount} lines of specification`));
        }

      } catch (error) {
        this.handleError(error as Error, options);
      }
    });
  }
}
