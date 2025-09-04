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
exports.QATestAgent = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
class QATestAgent {
    constructor(aiProvider) {
        this.aiProvider = aiProvider;
    }
    async analyzeChanges(options) {
        let changes = '';
        if (options.useGitDiff) {
            try {
                changes = (0, child_process_1.execSync)('git diff --no-color', { encoding: 'utf-8' });
                if (!changes.trim()) {
                    return {
                        testingInstructions: 'No code changes detected - no testing needed at this time.',
                        whatChanged: 'No changes found in the codebase'
                    };
                }
            }
            catch (error) {
                throw new Error('Failed to get git diff. Make sure you are in a git repository.');
            }
        }
        else {
            // Analyze files in target path
            const targetPath = options.targetPath || '.';
            changes = await this.getCodeChanges(targetPath);
        }
        // Generate QA testing instructions using AI
        const analysis = await this.generateQATestingInstructions(changes);
        return analysis;
    }
    async getCodeChanges(targetPath) {
        const files = await this.discoverFiles(targetPath);
        const changes = [];
        for (const file of files) {
            try {
                const content = await fs.readFile(file, 'utf8');
                changes.push(`File: ${path.relative(process.cwd(), file)}\n${content}\n`);
            }
            catch (error) {
                console.warn(`Could not read file ${file}: ${error.message}`);
            }
        }
        return changes.join('\n---\n');
    }
    async discoverFiles(targetPath) {
        const files = [];
        const extensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs'];
        const traverse = async (dir) => {
            try {
                const items = await fs.readdir(dir);
                for (const item of items) {
                    const fullPath = path.join(dir, item);
                    try {
                        const stat = await fs.stat(fullPath);
                        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                            await traverse(fullPath);
                        }
                        else if (extensions.some(ext => item.endsWith(ext))) {
                            files.push(fullPath);
                        }
                    }
                    catch (error) {
                        // Skip files that can't be accessed
                    }
                }
            }
            catch (error) {
                // Skip directories that can't be read
            }
        };
        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
            await traverse(targetPath);
        }
        else {
            files.push(targetPath);
        }
        return files;
    }
    async generateQATestingInstructions(changes) {
        const prompt = `
You are a QA testing expert. Analyze the following code changes and provide a simple explanation for QA testers.

Code changes:
${changes}

Provide a response in this exact JSON format:
{
  "testingInstructions": "1-2 simple sentences explaining what QA should test in non-technical terms",
  "whatChanged": "1 simple sentence describing what changed in plain English"
}

Keep the testingInstructions to 1-2 sentences maximum, written for non-technical QA testers.
Keep the whatChanged to 1 sentence maximum.
`;
        try {
            const response = await this.aiProvider.generateText(prompt);
            const parsed = JSON.parse(response);
            // Validate the response structure
            if (!parsed.testingInstructions || !parsed.whatChanged) {
                throw new Error('Invalid response structure');
            }
            return {
                testingInstructions: parsed.testingInstructions,
                whatChanged: parsed.whatChanged
            };
        }
        catch (error) {
            // Fallback response if AI fails
            return {
                testingInstructions: 'Please test the new features and make sure existing functionality still works correctly.',
                whatChanged: 'Some code changes were made to the system'
            };
        }
    }
}
exports.QATestAgent = QATestAgent;
//# sourceMappingURL=qa-test.js.map