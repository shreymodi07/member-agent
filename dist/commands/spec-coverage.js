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
const child_process_1 = require("child_process");
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
            .option('--diff', 'Analyze only files changed in git diff')
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
        let targetPaths = [];
        if (this.options.diff) {
            // Get files from git diff
            try {
                const diffOutput = (0, child_process_1.execSync)('git diff --name-only', { encoding: 'utf-8' });
                targetPaths = diffOutput.trim().split('\n').filter((file) => file.length > 0);
                if (targetPaths.length === 0) {
                    console.log('No files changed in git diff.');
                    return;
                }
                console.log(`🔍 Analyzing spec coverage for ${targetPaths.length} changed files...\n`);
            }
            catch (error) {
                console.error('Error getting git diff files. Make sure you are in a git repository.');
                return;
            }
        }
        else {
            targetPaths = [this.options.file || this.options.directory || '.'];
            console.log('🔍 Analyzing spec coverage...\n');
        }
        // Analyze each target path
        const allResults = [];
        for (const targetPath of targetPaths) {
            const options = {
                targetPath,
                format: this.options.format || 'text',
                outputFile: this.options.output,
                includeParameterCombinations: !this.options.skipCombinations,
                generateSuggestions: !this.options.skipSuggestions,
                framework: this.options.framework || 'auto-detect'
            };
            const results = await agent.analyzeSpecCoverage(options);
            allResults.push(results);
        }
        // Combine results if multiple files
        const combinedResults = this.combineResults(allResults);
        if (this.options.output) {
            await this.writeOutput(combinedResults.formatted, this.options.output);
            console.log(`\n📄 Coverage analysis written to: ${this.options.output}`);
        }
        else {
            console.log(combinedResults.formatted);
        }
        // Summary
        console.log('\n📊 Coverage Summary:');
        console.log(`• Files analyzed: ${combinedResults.summary.filesAnalyzed}`);
        console.log(`• Functions found: ${combinedResults.summary.functionsFound}`);
        console.log(`• Test files found: ${combinedResults.summary.testFilesFound}`);
        console.log(`• Missing scenarios: ${combinedResults.summary.missingScenariosCount}`);
        console.log(`• Parameter combinations: ${combinedResults.summary.parameterCombinations}`);
        // QA Testing Guidance
        console.log('\n🧪 QA Testing Guidance:');
        if (combinedResults.summary.missingScenariosCount > 0) {
            console.log('• Missing test scenarios identified - test edge cases and error conditions');
            console.log('• Focus on parameter combinations and boundary value testing');
            console.log('• Verify new functionality works with various inputs and scenarios');
            console.log('• Test integration points and data flow between components');
        }
        else {
            console.log('• Good test coverage detected - validate existing test cases still pass');
            console.log('• Test any new features or code changes for expected behavior');
            console.log('• Perform regression testing to ensure no functionality was broken');
        }
        if (combinedResults.summary.missingScenariosCount > 0) {
            console.log('\n💡 Use --generate-tests to create test templates');
        }
    }
    combineResults(results) {
        if (results.length === 1) {
            return results[0];
        }
        return {
            functions: results.flatMap(r => r.functions),
            existingTests: results.flatMap(r => r.existingTests),
            missingScenarios: results.flatMap(r => r.missingScenarios),
            parameterCombinations: results.flatMap(r => r.parameterCombinations),
            summary: {
                filesAnalyzed: results.reduce((sum, r) => sum + r.summary.filesAnalyzed, 0),
                functionsFound: results.reduce((sum, r) => sum + r.summary.functionsFound, 0),
                testFilesFound: results.reduce((sum, r) => sum + r.summary.testFilesFound, 0),
                missingScenariosCount: results.reduce((sum, r) => sum + r.summary.missingScenariosCount, 0),
                parameterCombinations: results.reduce((sum, r) => sum + r.summary.parameterCombinations, 0),
                coveragePercentage: results.reduce((sum, r) => sum + r.summary.coveragePercentage, 0) / results.length
            },
            formatted: results.map((r, i) => `=== File ${i + 1} ===\n${r.formatted}`).join('\n\n')
        };
    }
    async writeOutput(content, filePath) {
        await fs.writeFile(filePath, content, 'utf8');
    }
}
exports.SpecCoverageCommand = SpecCoverageCommand;
//# sourceMappingURL=spec-coverage.js.map