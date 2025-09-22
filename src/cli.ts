#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { CodeReviewCommand } from './commands/code-review';
import { SecurityCommand } from './commands/security';
import { ConfigCommand } from './commands/config';
import { SpecCoverageCommand } from './commands/spec-coverage';
import { QATestCommand } from './commands/qa-test';
import { RubocopFixerCommand } from './commands/rubocop-fixer';
import { RubocopFixerDiffCommand } from './commands/rubocop-fix-diff';
import { QuickAzureCommand } from './commands/quick-azure';
import { version } from '../package.json';

const program = new Command();

program
  .name('teladoc-agent')
  .description('AI-powered code review and security scanning for Teladoc')
  .version(version);

// Add commands
program.addCommand(new CodeReviewCommand().getCommand());
program.addCommand(new SecurityCommand().getCommand());
program.addCommand(new ConfigCommand().getCommand());
program.addCommand(new SpecCoverageCommand().getCommand());
program.addCommand(new QATestCommand().getCommand());
program.addCommand(new RubocopFixerCommand().getCommand());
program.addCommand(new RubocopFixerDiffCommand().getCommand());
program.addCommand(new QuickAzureCommand().getCommand());

// Global options
program
  .option('-v, --verbose', 'Enable verbose output')
  .option('--debug', 'Enable debug mode');

// Handle unknown commands
program.on('command:*', (operands) => {
  console.error(chalk.red(`Unknown command: ${operands[0]}`));
  console.log(chalk.yellow('Run --help to see available commands'));
  process.exit(1);
});

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse(process.argv);
