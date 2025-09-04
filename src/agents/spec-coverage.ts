import { AIProvider } from '../providers/ai-provider';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface FunctionSignature {
  name: string;
  parameters: Parameter[];
  returnType?: string;
  filePath: string;
  lineNumber: number;
  isAsync: boolean;
}

export interface Parameter {
  name: string;
  type: string;
  isOptional: boolean;
  defaultValue?: string;
  possibleValues?: string[];
}

export interface TestScenario {
  description: string;
  parameters: Record<string, any>;
  expectedBehavior: string;
  priority: 'high' | 'medium' | 'low';
  category: 'happy-path' | 'edge-case' | 'error-handling';
}

export interface CoverageAnalysis {
  functions: FunctionSignature[];
  existingTests: string[];
  missingScenarios: TestScenario[];
  parameterCombinations: Array<{
    functionName: string;
    combinations: Record<string, any>[];
    testedCombinations: Record<string, any>[];
    missingCombinations: Record<string, any>[];
  }>;
  summary: {
    filesAnalyzed: number;
    functionsFound: number;
    testFilesFound: number;
    missingScenariosCount: number;
    parameterCombinations: number;
    coveragePercentage: number;
  };
  formatted: string;
}

export class SpecCoverageAgent {
  constructor(private aiProvider: AIProvider) {}

  async analyzeSpecCoverage(options: {
    targetPath: string;
    format: string;
    outputFile?: string;
    includeParameterCombinations: boolean;
    generateSuggestions: boolean;
    framework: string;
  }): Promise<CoverageAnalysis> {
    
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

  private async discoverSourceFiles(targetPath: string): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.ts', '.js', '.tsx', '.jsx'];
    
    const traverse = async (dir: string) => {
      let items: string[];
      try {
        items = await fs.readdir(dir);
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${(error as Error).message}`);
        return;
      }
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules') && !item.includes('.git')) {
            await traverse(fullPath);
          } else if (extensions.some(ext => item.endsWith(ext)) && 
                     !item.includes('.test.') && 
                     !item.includes('.spec.')) {
            files.push(fullPath);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.warn(`Warning: File not found, skipping ${fullPath}`);
          } else {
            console.warn(`Warning: Could not stat ${fullPath}: ${(error as Error).message}`);
          }
        }
      }
    };
    
    try {
      if (await fs.pathExists(targetPath)) {
        const stat = await fs.stat(targetPath);
        if (stat.isDirectory()) {
          await traverse(targetPath);
        } else {
          files.push(targetPath);
        }
      } else {
        console.warn(`Warning: Target path ${targetPath} does not exist`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Warning: Target path ${targetPath} not found`);
      } else {
        throw error;
      }
    }
    
    return files;
  }

  private async extractFunctions(sourceFiles: string[]): Promise<FunctionSignature[]> {
    const functions: FunctionSignature[] = [];
    
    for (const file of sourceFiles) {
      const content = await fs.readFile(file, 'utf8');
      const fileFunctions = await this.parseFunctionsFromFile(content, file);
      functions.push(...fileFunctions);
    }
    
    return functions;
  }

  private async parseFunctionsFromFile(content: string, filePath: string): Promise<FunctionSignature[]> {
    // Try AI parsing first, then fallback to regex parsing
    const aiResult = await this.parseWithAI(content, filePath);
    if (aiResult.length > 0) {
      return aiResult;
    }
    
    // Fallback to simple regex parsing
    return this.parseWithRegex(content, filePath);
  }

  private async parseWithAI(content: string, filePath: string): Promise<FunctionSignature[]> {
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
              return parsed.map((fn: any) => ({ ...fn, filePath }));
            }
          } catch (parseError) {
            // Continue to next match
            continue;
          }
        }
      }
      
      // If no valid JSON found, return empty array
      console.warn(`No valid JSON found in response for ${filePath}`);
      return [];
    } catch (error) {
      console.warn(`Failed to parse functions from ${filePath}:`, error);
    }
    
    return [];
  }

  private parseWithRegex(content: string, filePath: string): FunctionSignature[] {
    const functions: FunctionSignature[] = [];
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

  private parseParameters(paramsString: string): Parameter[] {
    if (!paramsString.trim()) return [];
    
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

  private extractReturnType(line: string): string {
    const returnMatch = line.match(/\):\s*([^{]+)/);
    return returnMatch ? returnMatch[1].trim() : 'void';
  }

  private getPossibleValues(type: string): string[] {
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

  private async discoverTestFiles(targetPath: string): Promise<string[]> {
    const testFiles: string[] = [];
    const testPatterns = ['.test.', '.spec.', '__tests__'];
    
    const traverse = async (dir: string) => {
      let items: string[];
      try {
        items = await fs.readdir(dir);
      } catch (error) {
        console.warn(`Warning: Could not read directory ${dir}: ${(error as Error).message}`);
        return;
      }
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        try {
          const stat = await fs.stat(fullPath);
          
          if (stat.isDirectory() && !item.includes('node_modules')) {
            await traverse(fullPath);
          } else if (testPatterns.some(pattern => item.includes(pattern))) {
            testFiles.push(fullPath);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
            console.warn(`Warning: File not found, skipping ${fullPath}`);
          } else {
            console.warn(`Warning: Could not stat ${fullPath}: ${(error as Error).message}`);
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        console.warn(`Warning: Target path ${targetPath} not found`);
      } else {
        throw error;
      }
    }
    
    return testFiles;
  }

  private async parseExistingTests(testFiles: string[], framework: string): Promise<string[]> {
    const tests: string[] = [];
    
    for (const file of testFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const fileTests = this.extractTestNames(content, framework);
        tests.push(...fileTests.map(test => `${path.basename(file)}: ${test}`));
      } catch (error) {
        console.warn(`Failed to read test file ${file}:`, error);
      }
    }
    
    return tests;
  }

  private extractTestNames(content: string, framework: string): string[] {
    const tests: string[] = [];
    
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

  private async analyzeParameterCombinations(
    functions: FunctionSignature[], 
    existingTests: string[]
  ): Promise<Array<{
    functionName: string;
    combinations: Record<string, any>[];
    testedCombinations: Record<string, any>[];
    missingCombinations: Record<string, any>[];
  }>> {
    
    const results = [];
    
    for (const func of functions) {
      if (func.parameters.length === 0) continue;
      
      const combinations = this.generateParameterCombinations(func.parameters);
      const testedCombinations = this.identifyTestedCombinations(func, existingTests);
      const missingCombinations = combinations.filter(combo => 
        !this.isCombinationTested(combo, testedCombinations)
      );
      
      results.push({
        functionName: func.name,
        combinations,
        testedCombinations,
        missingCombinations
      });
    }
    
    return results;
  }

  private generateParameterCombinations(parameters: Parameter[]): Record<string, any>[] {
    const combinations: Record<string, any>[] = [];
    
    // Generate boundary value combinations
    const paramValues = parameters.map(param => {
      const values = [];
      
      if (param.possibleValues) {
        values.push(...param.possibleValues);
      } else {
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
    const generateCombos = (index: number, current: Record<string, any>): void => {
      if (combinations.length >= maxCombinations) return;
      
      if (index >= parameters.length) {
        combinations.push({ ...current });
        return;
      }
      
      const param = parameters[index];
      const values = paramValues[index];
      
      for (const value of values) {
        if (combinations.length >= maxCombinations) break;
        current[param.name] = value;
        generateCombos(index + 1, current);
      }
    };
    
    generateCombos(0, {});
    return combinations;
  }

  private identifyTestedCombinations(func: FunctionSignature, existingTests: string[]): Record<string, any>[] {
    // This would analyze test files to find what parameter combinations are already tested
    // For now, return empty array as placeholder
    return [];
  }

  private isCombinationTested(combination: Record<string, any>, tested: Record<string, any>[]): boolean {
    return tested.some(test => 
      Object.keys(combination).every(key => test[key] === combination[key])
    );
  }

  private async generateMissingScenarios(
    functions: FunctionSignature[],
    existingTests: string[],
    parameterCombinations: any[]
  ): Promise<TestScenario[]> {
    
    const scenarios: TestScenario[] = [];
    
    for (const func of functions) {
      const funcScenarios = await this.generateScenariosForFunction(func, existingTests);
      scenarios.push(...funcScenarios);
    }
    
    return scenarios;
  }

  private async generateScenariosForFunction(func: FunctionSignature, existingTests: string[]): Promise<TestScenario[]> {
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
          } catch (parseError) {
            // Continue to next match
            continue;
          }
        }
      }
      
      // If no valid JSON found, return empty array
      console.warn(`No valid JSON found in AI response for ${func.name}`);
      return [];
    } catch (error) {
      console.warn(`Failed to generate scenarios for ${func.name}:`, error);
    }
    
    return [];
  }

  private calculateSummary(
    functions: FunctionSignature[],
    testFiles: string[],
    missingScenarios: TestScenario[],
    parameterCombinations: any[]
  ) {
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

  private formatResults(analysis: Omit<CoverageAnalysis, 'formatted'>, format: string): string {
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