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
exports.SpecCoverageAgent = void 0;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
class SpecCoverageAgent {
    constructor(aiProvider) {
        this.aiProvider = aiProvider;
    }
    async analyzeSpecCoverage(options) {
        // 1. Discover and parse source files
        const sourceFiles = await this.discoverSourceFiles(options.targetPath);
        const functions = await this.extractFunctions(sourceFiles);
        // 2. Discover existing test files
        const testFiles = await this.discoverTestFiles(options.targetPath);
        const existingTests = await this.parseExistingTests(testFiles, options.framework);
        // 3. Analyze parameter combinations
        const parameterCombinations = options.includeParameterCombinations
            ? await this.analyzeParameterCombinations(functions, existingTests)
            : [];
        // 4. Generate missing scenario suggestions
        const missingScenarios = options.generateSuggestions
            ? await this.generateMissingScenarios(functions, existingTests, parameterCombinations)
            : [];
        // 5. Calculate coverage metrics
        const summary = this.calculateSummary(functions, testFiles, missingScenarios, parameterCombinations);
        // 6. Format results
        const formatted = this.formatResults({
            functions,
            existingTests,
            missingScenarios,
            parameterCombinations,
            summary
        }, options.format);
        return {
            functions,
            existingTests,
            missingScenarios,
            parameterCombinations,
            summary,
            formatted
        };
    }
    async discoverSourceFiles(targetPath) {
        const files = [];
        const extensions = ['.ts', '.js', '.tsx', '.jsx'];
        const traverse = async (dir) => {
            let items;
            try {
                items = await fs.readdir(dir);
            }
            catch (error) {
                console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
                return;
            }
            for (const item of items) {
                const fullPath = path.join(dir, item);
                try {
                    const stat = await fs.stat(fullPath);
                    if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
                        await traverse(fullPath);
                    }
                    else if (extensions.some(ext => item.endsWith(ext)) &&
                        !item.includes('.test.') &&
                        !item.includes('.spec.')) {
                        files.push(fullPath);
                    }
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        console.warn(`Warning: File not found, skipping ${fullPath}`);
                    }
                    else {
                        console.warn(`Warning: Could not stat ${fullPath}: ${error.message}`);
                    }
                }
            }
        };
        try {
            if (await fs.pathExists(targetPath)) {
                const stat = await fs.stat(targetPath);
                if (stat.isDirectory()) {
                    await traverse(targetPath);
                }
                else {
                    files.push(targetPath);
                }
            }
            else {
                console.warn(`Warning: Target path ${targetPath} does not exist`);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Warning: Target path ${targetPath} not found`);
            }
            else {
                throw error;
            }
        }
        return files;
    }
    async extractFunctions(sourceFiles) {
        const functions = [];
        for (const file of sourceFiles) {
            const content = await fs.readFile(file, 'utf8');
            const fileFunctions = await this.parseFunctionsFromFile(content, file);
            functions.push(...fileFunctions);
        }
        return functions;
    }
    async parseFunctionsFromFile(content, filePath) {
        // Try AI parsing first, then fallback to regex parsing
        const aiResult = await this.parseWithAI(content, filePath);
        if (aiResult.length > 0) {
            return aiResult;
        }
        // Fallback to simple regex parsing
        return this.parseWithRegex(content, filePath);
    }
    async parseWithAI(content, filePath) {
        const prompt = `
Analyze this TypeScript/JavaScript code and extract all function signatures with their parameters.
Return a JSON array of functions with this structure:
{
  "name": "functionName",
  "parameters": [{"name": "param", "type": "string", "isOptional": false, "possibleValues": ["val1", "val2"]}],
  "returnType": "string",
  "lineNumber": 10,
  "isAsync": false
}

Focus on:
- Public functions and methods
- Constructor parameters
- Function parameters with their types
- Optional vs required parameters
- Possible enum values or union types

Code:
\`\`\`
${content}
\`\`\`
`;
        try {
            const response = await this.aiProvider.generateText(prompt);
            // Try to extract JSON array from response
            const jsonMatches = [
                response.match(/\[[\s\S]*?\]/),
                response.match(/```json\s*([\s\S]*?)\s*```/),
                response.match(/```\s*([\s\S]*?)\s*```/)
            ];
            for (const match of jsonMatches) {
                if (match) {
                    try {
                        const jsonText = match[1] || match[0];
                        const parsed = JSON.parse(jsonText.trim());
                        if (Array.isArray(parsed)) {
                            return parsed.map((fn) => ({ ...fn, filePath }));
                        }
                    }
                    catch (parseError) {
                        // Continue to next match
                        continue;
                    }
                }
            }
            // If no valid JSON found, return empty array
            console.warn(`No valid JSON found in response for ${filePath}`);
            return [];
        }
        catch (error) {
            console.warn(`Failed to parse functions from ${filePath}:`, error);
        }
        return [];
    }
    parseWithRegex(content, filePath) {
        const functions = [];
        const lines = content.split('\n');
        // Regex patterns for different function types
        const patterns = [
            // Regular function: function name(params)
            /^\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
            // Method: methodName(params)
            /^\s*(?:public\s+|private\s+|protected\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)/,
            // Arrow function: const name = (params) => 
            /^\s*(?:export\s+)?const\s+(\w+)\s*=\s*(?:\([^)]*\)|[\w\s]*)\s*=>/,
            // Class method: methodName(params) {
            /^\s*(?:public\s+|private\s+|protected\s+|static\s+)?(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*[\w<>[\]|\s]+)?\s*{/
        ];
        lines.forEach((line, index) => {
            for (const pattern of patterns) {
                const match = line.match(pattern);
                if (match) {
                    const functionName = match[1];
                    const paramsString = match[2] || '';
                    // Skip constructors and common non-function matches
                    if (functionName === 'constructor' ||
                        functionName === 'if' ||
                        functionName === 'for' ||
                        functionName === 'while' ||
                        functionName.startsWith('_')) {
                        continue;
                    }
                    const parameters = this.parseParameters(paramsString);
                    functions.push({
                        name: functionName,
                        parameters,
                        filePath,
                        lineNumber: index + 1,
                        isAsync: line.includes('async'),
                        returnType: this.extractReturnType(line)
                    });
                    break;
                }
            }
        });
        return functions;
    }
    parseParameters(paramsString) {
        if (!paramsString.trim())
            return [];
        const params = paramsString.split(',').map(param => param.trim());
        return params.map(param => {
            // Remove default values for parsing
            const nameMatch = param.match(/^([^:=]+)/);
            const name = nameMatch ? nameMatch[1].trim() : param;
            // Extract type
            const typeMatch = param.match(/:\s*([^=]+)(?:=|$)/);
            const type = typeMatch ? typeMatch[1].trim() : 'any';
            // Check if optional
            const isOptional = param.includes('?') || param.includes('=');
            // Extract default value
            const defaultMatch = param.match(/=\s*(.+)$/);
            const defaultValue = defaultMatch ? defaultMatch[1].trim() : undefined;
            // Suggest possible values based on type
            const possibleValues = this.getPossibleValues(type);
            return {
                name: name.replace(/[?:].*$/, '').trim(),
                type,
                isOptional,
                defaultValue,
                possibleValues
            };
        });
    }
    extractReturnType(line) {
        const returnMatch = line.match(/\):\s*([^{]+)/);
        return returnMatch ? returnMatch[1].trim() : 'void';
    }
    getPossibleValues(type) {
        const lowerType = type.toLowerCase();
        if (lowerType.includes('boolean')) {
            return ['true', 'false'];
        }
        if (lowerType.includes('string')) {
            return ['""', '"valid-string"', '"test"'];
        }
        if (lowerType.includes('number')) {
            return ['0', '1', '-1', '100'];
        }
        if (lowerType.includes('array')) {
            return ['[]', '[1]', '[1,2,3]'];
        }
        return [];
    }
    async discoverTestFiles(targetPath) {
        const testFiles = [];
        const testPatterns = ['.test.', '.spec.', '__tests__'];
        const traverse = async (dir) => {
            let items;
            try {
                items = await fs.readdir(dir);
            }
            catch (error) {
                console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
                return;
            }
            for (const item of items) {
                const fullPath = path.join(dir, item);
                try {
                    const stat = await fs.stat(fullPath);
                    if (stat.isDirectory() && !item.includes('node_modules')) {
                        await traverse(fullPath);
                    }
                    else if (testPatterns.some(pattern => item.includes(pattern))) {
                        testFiles.push(fullPath);
                    }
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        console.warn(`Warning: File not found, skipping ${fullPath}`);
                    }
                    else {
                        console.warn(`Warning: Could not stat ${fullPath}: ${error.message}`);
                    }
                }
            }
        };
        try {
            if (await fs.pathExists(targetPath)) {
                const stat = await fs.stat(targetPath);
                if (stat.isDirectory()) {
                    await traverse(targetPath);
                }
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Warning: Target path ${targetPath} not found`);
            }
            else {
                throw error;
            }
        }
        return testFiles;
    }
    async parseExistingTests(testFiles, framework) {
        const tests = [];
        for (const file of testFiles) {
            try {
                const content = await fs.readFile(file, 'utf8');
                const fileTests = this.extractTestNames(content, framework);
                tests.push(...fileTests.map(test => `${path.basename(file)}: ${test}`));
            }
            catch (error) {
                console.warn(`Failed to read test file ${file}:`, error);
            }
        }
        return tests;
    }
    extractTestNames(content, framework) {
        const tests = [];
        // Jest/Vitest patterns
        const testRegexes = [
            /(?:test|it)\s*\(\s*['"`]([^'"`]+)['"`]/g,
            /describe\s*\(\s*['"`]([^'"`]+)['"`]/g
        ];
        for (const regex of testRegexes) {
            let match;
            while ((match = regex.exec(content)) !== null) {
                tests.push(match[1]);
            }
        }
        return tests;
    }
    async analyzeParameterCombinations(functions, existingTests) {
        const results = [];
        for (const func of functions) {
            if (func.parameters.length === 0)
                continue;
            const combinations = this.generateParameterCombinations(func.parameters);
            const testedCombinations = this.identifyTestedCombinations(func, existingTests);
            const missingCombinations = combinations.filter(combo => !this.isCombinationTested(combo, testedCombinations));
            results.push({
                functionName: func.name,
                combinations,
                testedCombinations,
                missingCombinations
            });
        }
        return results;
    }
    generateParameterCombinations(parameters) {
        const combinations = [];
        // Generate boundary value combinations
        const paramValues = parameters.map(param => {
            const values = [];
            if (param.possibleValues) {
                values.push(...param.possibleValues);
            }
            else {
                switch (param.type.toLowerCase()) {
                    case 'string':
                        values.push('', 'valid-string', 'very-long-string'.repeat(10));
                        break;
                    case 'number':
                        values.push(0, -1, 1, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER);
                        break;
                    case 'boolean':
                        values.push(true, false);
                        break;
                    case 'array':
                        values.push([], [1], [1, 2, 3]);
                        break;
                    case 'object':
                        values.push({}, { key: 'value' });
                        break;
                    default:
                        values.push(null, undefined);
                }
            }
            if (param.isOptional) {
                values.push(undefined);
            }
            return values;
        });
        // Generate cartesian product (limited to prevent explosion)
        const maxCombinations = 100;
        const generateCombos = (index, current) => {
            if (combinations.length >= maxCombinations)
                return;
            if (index >= parameters.length) {
                combinations.push({ ...current });
                return;
            }
            const param = parameters[index];
            const values = paramValues[index];
            for (const value of values) {
                if (combinations.length >= maxCombinations)
                    break;
                current[param.name] = value;
                generateCombos(index + 1, current);
            }
        };
        generateCombos(0, {});
        return combinations;
    }
    identifyTestedCombinations(func, existingTests) {
        // This would analyze test files to find what parameter combinations are already tested
        // For now, return empty array as placeholder
        return [];
    }
    isCombinationTested(combination, tested) {
        return tested.some(test => Object.keys(combination).every(key => test[key] === combination[key]));
    }
    async generateMissingScenarios(functions, existingTests, parameterCombinations) {
        const scenarios = [];
        for (const func of functions) {
            const funcScenarios = await this.generateScenariosForFunction(func, existingTests);
            scenarios.push(...funcScenarios);
        }
        return scenarios;
    }
    async generateScenariosForFunction(func, existingTests) {
        const prompt = `
Generate comprehensive test scenarios for this function:

Function: ${func.name}
Parameters: ${func.parameters.map(p => `${p.name}: ${p.type}${p.isOptional ? '?' : ''}`).join(', ')}
File: ${func.filePath}

Existing tests: ${existingTests.filter(test => test.includes(func.name)).join(', ') || 'None found'}

Generate test scenarios covering:
1. Happy path cases
2. Edge cases (boundary values, empty inputs)
3. Error handling (invalid inputs, null/undefined)
4. Parameter combinations

Return JSON array:
[{
  "description": "should handle valid input",
  "parameters": {"param1": "value", "param2": 123},
  "expectedBehavior": "returns expected result",
  "priority": "high",
  "category": "happy-path"
}]
`;
        try {
            const response = await this.aiProvider.generateText(prompt);
            // Try to extract JSON array from response
            const jsonMatches = [
                response.match(/\[[\s\S]*?\]/),
                response.match(/```json\s*([\s\S]*?)\s*```/),
                response.match(/```\s*([\s\S]*?)\s*```/)
            ];
            for (const match of jsonMatches) {
                if (match) {
                    try {
                        const jsonText = match[1] || match[0];
                        const parsed = JSON.parse(jsonText.trim());
                        if (Array.isArray(parsed)) {
                            return parsed;
                        }
                    }
                    catch (parseError) {
                        // Continue to next match
                        continue;
                    }
                }
            }
            // If no valid JSON found, return empty array
            console.warn(`No valid JSON found in AI response for ${func.name}`);
            return [];
        }
        catch (error) {
            console.warn(`Failed to generate scenarios for ${func.name}:`, error);
        }
        return [];
    }
    calculateSummary(functions, testFiles, missingScenarios, parameterCombinations) {
        const totalCombinations = parameterCombinations.reduce((sum, combo) => sum + combo.combinations.length, 0);
        const testedCombinations = parameterCombinations.reduce((sum, combo) => sum + combo.testedCombinations.length, 0);
        return {
            filesAnalyzed: new Set(functions.map(f => f.filePath)).size,
            functionsFound: functions.length,
            testFilesFound: testFiles.length,
            missingScenariosCount: missingScenarios.length,
            parameterCombinations: totalCombinations,
            coveragePercentage: totalCombinations > 0 ? Math.round((testedCombinations / totalCombinations) * 100) : 0
        };
    }
    formatResults(analysis, format) {
        if (format === 'json') {
            return JSON.stringify(analysis, null, 2);
        }
        let output = '';
        output += '# Spec Coverage Analysis\n\n';
        // Summary
        output += '## Summary\n';
        output += `- **Files Analyzed**: ${analysis.summary.filesAnalyzed}\n`;
        output += `- **Functions Found**: ${analysis.summary.functionsFound}\n`;
        output += `- **Test Files Found**: ${analysis.summary.testFilesFound}\n`;
        output += `- **Missing Scenarios**: ${analysis.summary.missingScenariosCount}\n`;
        output += `- **Parameter Combinations**: ${analysis.summary.parameterCombinations}\n`;
        output += `- **Coverage**: ${analysis.summary.coveragePercentage}%\n\n`;
        // Missing scenarios by priority
        const highPriority = analysis.missingScenarios.filter(s => s.priority === 'high');
        const mediumPriority = analysis.missingScenarios.filter(s => s.priority === 'medium');
        if (highPriority.length > 0) {
            output += '## 🔴 High Priority Missing Tests\n\n';
            highPriority.forEach(scenario => {
                output += `### ${scenario.description}\n`;
                output += `**Parameters**: ${JSON.stringify(scenario.parameters)}\n`;
                output += `**Expected**: ${scenario.expectedBehavior}\n`;
                output += `**Category**: ${scenario.category}\n\n`;
            });
        }
        if (mediumPriority.length > 0) {
            output += '## 🟡 Medium Priority Missing Tests\n\n';
            mediumPriority.forEach(scenario => {
                output += `- ${scenario.description}\n`;
            });
            output += '\n';
        }
        // Parameter combinations
        if (analysis.parameterCombinations.length > 0) {
            output += '## Parameter Combination Analysis\n\n';
            analysis.parameterCombinations.forEach(combo => {
                if (combo.missingCombinations.length > 0) {
                    output += `### ${combo.functionName}\n`;
                    output += `- **Total combinations**: ${combo.combinations.length}\n`;
                    output += `- **Tested combinations**: ${combo.testedCombinations.length}\n`;
                    output += `- **Missing combinations**: ${combo.missingCombinations.length}\n\n`;
                }
            });
        }
        return output;
    }
}
exports.SpecCoverageAgent = SpecCoverageAgent;
//# sourceMappingURL=spec-coverage.js.map