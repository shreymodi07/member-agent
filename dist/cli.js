#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import { CodeReviewCommand } from './commands/code-review.js';
import { SecurityCommand } from './commands/security.js';
import { ConfigCommand } from './commands/config.js';
import { SpecCoverageCommand } from './commands/spec-coverage.js';
import { QATestCommand } from './commands/qa-test.js';
import { RubocopFixerCommand } from './commands/rubocop-fixer.js';
import { RubocopFixerDiffCommand } from './commands/rubocop-fix-diff.js';
import { QuickAzureCommand } from './commands/quick-azure.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));
const version = packageJson.version;
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
//# sourceMappingURL=cli.js.map