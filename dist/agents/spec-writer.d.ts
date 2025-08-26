import { AgentConfig } from '../types';
export interface SpecGenerationOptions {
    filePath: string;
    type: 'api' | 'feature' | 'component';
    template?: string;
    outputPath?: string;
}
export interface SpecGenerationResult {
    outputPath: string;
    duration: number;
    lineCount: number;
    specification: string;
}
export declare class SpecWriterAgent {
    private aiProvider;
    constructor(config?: AgentConfig);
    generateSpec(options: SpecGenerationOptions): Promise<SpecGenerationResult>;
    private readCodeContent;
    private getCodeFiles;
    private isCodeFile;
    private analyzeProjectContext;
    private findProjectRoot;
    private detectLanguage;
    private detectFramework;
    private detectPackageManager;
    private generateSpecification;
    private buildSpecPrompt;
    private getSpecificationTemplate;
    private getDefaultOutputPath;
}
//# sourceMappingURL=spec-writer.d.ts.map