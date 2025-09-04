import { AgentConfig } from '../types';
export interface SecurityScanOptions {
    filePaths: string[];
    scanType: 'vulnerabilities' | 'secrets' | 'compliance' | 'all';
    standard: 'hipaa' | 'sox' | 'pci' | 'gdpr';
    format: 'console' | 'json' | 'sarif';
    outputPath?: string;
}
export interface SecurityScanResult {
    report: string;
    outputPath?: string;
    totalIssues: number;
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    filesScanned: number;
    duration: number;
    issues: SecurityIssue[];
}
export interface SecurityIssue {
    file: string;
    line: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'vulnerability' | 'secret' | 'compliance' | 'configuration';
    cwe?: string;
    title: string;
    description: string;
    remediation: string;
    references?: string[];
}
export declare class SecurityComplianceAgent {
    private aiProvider;
    constructor(config?: AgentConfig);
    scanSecurity(options: SecurityScanOptions): Promise<SecurityScanResult>;
    private readCodeForSecurity;
    private getSecurityRelevantFiles;
    private isIgnoredDirectory;
    private isSecurityRelevantFile;
    private analyzeProjectContext;
    private findProjectRoot;
    private detectLanguage;
    private detectFramework;
    private detectPackageManager;
    private performSecurityAnalysis;
    private getScanTypeInstructions;
    private getComplianceInstructions;
    private parseSecurityIssues;
    private formatSecurityReport;
    private generateSarifReport;
    private mapSeverityToSarif;
    private getDefaultOutputPath;
}
//# sourceMappingURL=security-compliance.d.ts.map