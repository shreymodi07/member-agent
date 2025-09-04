"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const security_compliance_1 = require("../agents/security-compliance");
const manager_1 = require("../config/manager");
class SecurityCommand extends base_1.BaseCommand {
    constructor() {
        super('security', 'Find security vulnerabilities and compliance issues');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-f, --file <path>', 'File or directory to scan')
            .option('--scan <type>', 'Type of scan (vulnerabilities|secrets|compliance|all)', 'all')
            .option('--standard <standard>', 'Compliance standard (hipaa|sox|pci|gdpr)', 'hipaa')
            .option('--format <format>', 'Output format (console|json|sarif)', 'console')
            .option('-o, --output <path>', 'Output file path');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔒 Teladoc Security & Compliance Agent'));
                if (!options.file) {
                    const { file } = await inquirer_1.default.prompt([
                        {
                            type: 'input',
                            name: 'file',
                            message: 'Enter the file or directory path to scan:',
                            validate: (input) => input.length > 0 || 'Path is required'
                        }
                    ]);
                    options.file = file;
                }
                const spinner = (0, ora_1.default)('Scanning for security vulnerabilities and compliance issues...').start();
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new security_compliance_1.SecurityComplianceAgent(agentConfig);
                const result = await agent.scanSecurity({
                    filePath: options.file,
                    scanType: options.scan || 'all',
                    standard: options.standard || 'hipaa',
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
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.SecurityCommand = SecurityCommand;
//# sourceMappingURL=security-compliance.js.map