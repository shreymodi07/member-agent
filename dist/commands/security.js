"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const child_process_1 = require("child_process");
const security_compliance_1 = require("../agents/security-compliance");
const manager_1 = require("../config/manager");
class SecurityCommand extends base_1.BaseCommand {
    constructor() {
        super('security', 'Find security vulnerabilities and compliance issues');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-f, --file <path>', 'File or directory to scan (default: current directory)')
            .option('--diff', 'Scan only files changed in git diff')
            .option('--format <format>', 'Output format (console|json)', 'console')
            .option('-o, --output <path>', 'Output file path');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔒 Teladoc Security Scanner'));
                let filePaths = [];
                if (options.diff) {
                    // Get files from git diff
                    try {
                        const diffOutput = (0, child_process_1.execSync)('git diff --name-only', { encoding: 'utf-8' });
                        filePaths = diffOutput.trim().split('\n').filter((file) => file.length > 0);
                        if (filePaths.length === 0) {
                            console.log(chalk_1.default.yellow('No files changed in git diff.'));
                            return;
                        }
                    }
                    catch (error) {
                        console.error(chalk_1.default.red('Error getting git diff files. Make sure you are in a git repository.'));
                        return;
                    }
                }
                else {
                    // Default to current directory if no file specified
                    filePaths = options.file ? [options.file] : ['.'];
                }
                const spinner = (0, ora_1.default)('Scanning for security vulnerabilities...').start();
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new security_compliance_1.SecurityComplianceAgent(agentConfig);
                const result = await agent.scanSecurity({
                    filePaths: filePaths,
                    scanType: 'all',
                    standard: 'gdpr',
                    format: options.format || 'console',
                    outputPath: options.output
                });
                spinner.succeed('Security scan completed!');
                if (options.format === 'console') {
                    console.log(result.report);
                }
                else {
                    console.log(chalk_1.default.green(`✅ Security report saved to: ${result.outputPath}`));
                }
                // Show summary
                if (result.criticalCount > 0) {
                    console.log(chalk_1.default.red(`🚨 ${result.criticalCount} critical security issues found!`));
                }
                else if (result.highCount > 0) {
                    console.log(chalk_1.default.yellow(`⚠️  ${result.highCount} high priority security issues found`));
                }
                else {
                    console.log(chalk_1.default.green('✅ No critical security issues found'));
                }
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`📊 Total issues: ${result.totalIssues}`));
                    console.log(chalk_1.default.gray(`🔍 Scanned ${result.filesScanned} files`));
                    console.log(chalk_1.default.gray(`⏱️  Scan completed in ${result.duration}ms`));
                }
                // QA Testing Guidance
                console.log('\n🧪 QA Testing Guidance:');
                if (result.criticalCount > 0) {
                    console.log('• Critical security issues found - test authentication and access controls');
                    console.log('• Verify data handling and input validation thoroughly');
                    console.log('• Test error scenarios and edge cases that could expose vulnerabilities');
                }
                else if (result.highCount > 0) {
                    console.log('• Security improvements needed - test input validation and sanitization');
                    console.log('• Review authorization checks and data protection measures');
                    console.log('• Validate secure coding practices and potential attack vectors');
                }
                else {
                    console.log('• Code appears secure - focus testing on new functionality');
                    console.log('• Verify existing security measures remain intact');
                    console.log('• Test integration points and data flow between components');
                }
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.SecurityCommand = SecurityCommand;
//# sourceMappingURL=security.js.map