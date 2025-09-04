"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecCoverageCommand = void 0;
const base_1 = require("./base");
const spec_coverage_1 = require("../agents/spec-coverage");
const ai_provider_1 = require("../providers/ai-provider");
const manager_1 = require("../config/manager");
const fs = __importStar(require("fs-extra"));
class SpecCoverageCommand extends base_1.BaseCommand {
    constructor() {
        super('spec-coverage', 'Analyze spec coverage and suggest missing test scenarios');
    }
    setupOptions() {
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
    setupAction() {
        this.command.action(async (options) => {
            try {
                this.options = options;
                await this.initializeProvider();
                await this.execute();
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
    async initializeProvider() {
        const configManager = new manager_1.ConfigManager();
        const config = await configManager.getAgentConfig();
        this.aiProvider = new ai_provider_1.AIProvider(config);
    }
    async execute() {
        const agent = new spec_coverage_1.SpecCoverageAgent(this.aiProvider);
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
        }
        else {
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
    async writeOutput(content, filePath) {
        await fs.writeFile(filePath, content, 'utf8');
    }
}
exports.SpecCoverageCommand = SpecCoverageCommand;
//# sourceMappingURL=spec-coverage.js.map