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
exports.QATestCommand = void 0;
const base_1 = require("./base");
const qa_test_1 = require("../agents/qa-test");
const ai_provider_1 = require("../providers/ai-provider");
const manager_1 = require("../config/manager");
const fs = __importStar(require("fs-extra"));
class QATestCommand extends base_1.BaseCommand {
    constructor() {
        super('qa-test', 'Generate QA testing instructions for code changes');
    }
    setupOptions() {
        super.setupOptions();
        this.command
            .alias('qa')
            .option('-f, --file <path>', 'Analyze specific file')
            .option('-d, --directory <path>', 'Analyze specific directory (default: current)')
            .option('--diff', 'Analyze only files changed in git diff')
            .option('--format <format>', 'Output format (text|json)', 'text')
            .option('-o, --output <file>', 'Write results to file');
    }
    setupAction() {
        this.command.action(async (options) => {
            try {
                console.log('🧪 Analyzing code changes for QA testing...\n');
                const configManager = new manager_1.ConfigManager();
                const config = await configManager.getAgentConfig();
                const aiProvider = new ai_provider_1.AIProvider(config);
                const agent = new qa_test_1.QATestAgent(aiProvider);
                const analysisOptions = {
                    targetPath: options.file || options.directory || '.',
                    useGitDiff: options.diff || false,
                    format: options.format || 'text'
                };
                const analysis = await agent.analyzeChanges(analysisOptions);
                // Display results
                console.log('📋 QA Testing Instructions:');
                console.log(`What changed: ${analysis.whatChanged}`);
                console.log(`Testing needed: ${analysis.testingInstructions}`);
                // Save to file if requested
                if (options.output) {
                    const output = {
                        whatChanged: analysis.whatChanged,
                        testingInstructions: analysis.testingInstructions,
                        generatedAt: new Date().toISOString()
                    };
                    await fs.writeFile(options.output, JSON.stringify(output, null, 2), 'utf8');
                    console.log(`\n📄 QA instructions saved to: ${options.output}`);
                }
            }
            catch (error) {
                this.handleError(error, options);
            }
        });
    }
}
exports.QATestCommand = QATestCommand;
//# sourceMappingURL=qa-test.js.map