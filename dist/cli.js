#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const spec_writer_1 = require("./commands/spec-writer");
const code_review_1 = require("./commands/code-review");
const security_compliance_1 = require("./commands/security-compliance");
const config_1 = require("./commands/config");
const package_json_1 = require("../package.json");
const program = new commander_1.Command();
program
    .name('teladoc-agent')
    .description('AI-powered development agents for Teladoc member team')
    .version(package_json_1.version);
// Add commands
program.addCommand(new spec_writer_1.SpecWriterCommand().getCommand());
program.addCommand(new code_review_1.CodeReviewCommand().getCommand());
program.addCommand(new security_compliance_1.SecurityComplianceCommand().getCommand());
program.addCommand(new config_1.ConfigCommand().getCommand());
// Global options
program
    .option('-v, --verbose', 'Enable verbose output')
    .option('--debug', 'Enable debug mode');
// Handle unknown commands
program.on('command:*', (operands) => {
    console.error(chalk_1.default.red(`Unknown command: ${operands[0]}`));
    console.log(chalk_1.default.yellow('Run --help to see available commands'));
    process.exit(1);
});
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
program.parse(process.argv);
//# sourceMappingURL=cli.js.map