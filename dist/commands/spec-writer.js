"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecWriterCommand = void 0;
const base_1 = require("./base");
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
const spec_writer_1 = require("../agents/spec-writer");
const manager_1 = require("../config/manager");
class SpecWriterCommand extends base_1.BaseCommand {
    constructor() {
        super('spec', 'Generate technical specifications using AI');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .option('-f, --file <path>', 'Input file or directory to analyze')
            .option('-t, --type <type>', 'Type of specification (api|feature|component)', 'feature')
            .option('--template <template>', 'Custom template to use')
            .option('-o, --output <path>', 'Output file path');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log(chalk_1.default.blue('🔍 Teladoc Spec Writer Agent'));
                if (!options.file) {
                    const { file } = await inquirer_1.default.prompt([
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
                    const { type } = await inquirer_1.default.prompt([
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
                const spinner = (0, ora_1.default)('Analyzing code and generating specification...').start();
                const configManager = new manager_1.ConfigManager();
                const agentConfig = await configManager.getAgentConfig();
                const agent = new spec_writer_1.SpecWriterAgent(agentConfig);
                const result = await agent.generateSpec({
                    filePath: options.file,
                    type: options.type,
                    template: options.template,
                    outputPath: options.output
                });
                spinner.succeed('Specification generated successfully!');
                console.log(chalk_1.default.green(`✅ Specification saved to: ${result.outputPath}`));
                if (options.verbose) {
                    console.log(chalk_1.default.gray(`📊 Analysis completed in ${result.duration}ms`));
                    console.log(chalk_1.default.gray(`📝 Generated ${result.lineCount} lines of specification`));
                }
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.SpecWriterCommand = SpecWriterCommand;
//# sourceMappingURL=spec-writer.js.map