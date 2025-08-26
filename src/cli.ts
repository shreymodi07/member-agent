#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { SpecWriterCommand } from './commands/spec-writer';
import { CodeReviewCommand } from './commands/code-review';
import { SecurityComplianceCommand } from './commands/security-compliance';
import { ConfigCommand } from './commands/config';
import { version } from '../package.json';

const program = new Command();

program
  .name('teladoc-agent')
  .description('AI-powered development agents for Teladoc member team')
  .version(version);

// Add commands
program.addCommand(new SpecWriterCommand().getCommand());
program.addCommand(new CodeReviewCommand().getCommand());
program.addCommand(new SecurityComplianceCommand().getCommand());
program.addCommand(new ConfigCommand().getCommand());

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
