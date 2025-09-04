import { AIProvider } from '../providers/ai-provider';
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
export declare class SpecCoverageAgent {
    private aiProvider;
    constructor(aiProvider: AIProvider);
    analyzeSpecCoverage(options: {
        targetPath: string;
        format: string;
        outputFile?: string;
        includeParameterCombinations: boolean;
        generateSuggestions: boolean;
        framework: string;
    }): Promise<CoverageAnalysis>;
    private discoverSourceFiles;
    private extractFunctions;
    private parseFunctionsFromFile;
    private parseWithAI;
    private parseWithRegex;
    private parseParameters;
    private extractReturnType;
    private getPossibleValues;
    private discoverTestFiles;
    private parseExistingTests;
    private extractTestNames;
    private analyzeParameterCombinations;
    private generateParameterCombinations;
    private identifyTestedCombinations;
    private isCombinationTested;
    private generateMissingScenarios;
    private generateScenariosForFunction;
    private calculateSummary;
    private formatResults;
}
//# sourceMappingURL=spec-coverage.d.ts.map