import { AgentConfig, ProjectContext } from '../types';
import { AIProvider } from '../providers/ai-provider';
import fs from 'fs-extra';
import path from 'path';

export interface SecurityScanOptions {
  filePath: string;
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

export class SecurityComplianceAgent {
  private aiProvider: AIProvider;

  constructor(config?: AgentConfig) {
    this.aiProvider = new AIProvider(config);
  }

  async scanSecurity(options: SecurityScanOptions): Promise<SecurityScanResult> {
    const startTime = Date.now();
    
    // Read and analyze code
    const { codeContent, fileCount } = await this.readCodeForSecurity(options.filePath);
    const context = await this.analyzeProjectContext(options.filePath);
    
    // Perform security analysis
    const securityReport = await this.performSecurityAnalysis(
      codeContent,
      context,
      options.scanType,
      options.standard
    );
    
    // Parse security issues
    const issues = await this.parseSecurityIssues(securityReport);
    
    // Format output
    const formattedReport = await this.formatSecurityReport(
      securityReport,
      issues,
      options.format
    );
    
    // Save to file if needed
    let outputPath: string | undefined;
    if (options.outputPath || options.format !== 'console') {
      outputPath = options.outputPath || this.getDefaultOutputPath(options.filePath, options.format);
      await fs.ensureDir(path.dirname(outputPath));
      await fs.writeFile(outputPath, formattedReport);
    }
    
    const duration = Date.now() - startTime;
    
    // Calculate counts
    const totalIssues = issues.length;
    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const highCount = issues.filter(i => i.severity === 'high').length;
    const mediumCount = issues.filter(i => i.severity === 'medium').length;
    const lowCount = issues.filter(i => i.severity === 'low').length;

    return {
      report: formattedReport,
      outputPath,
      totalIssues,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      filesScanned: fileCount,
      duration,
      issues
    };
  }

  private async readCodeForSecurity(filePath: string): Promise<{ codeContent: string; fileCount: number }> {
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      const files = await this.getSecurityRelevantFiles(filePath);
      const contents = await Promise.all(
        files.map(async (file) => {
          const content = await fs.readFile(file, 'utf-8');
          return `// File: ${file}\n${content}\n`;
        })
      );
      return {
        codeContent: contents.join('\n'),
        fileCount: files.length
      };
    } else {
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        codeContent: `// File: ${filePath}\n${content}`,
        fileCount: 1
      };
    }
  }

  private async getSecurityRelevantFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    const entries = await fs.readdir(dirPath);

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory() && !this.isIgnoredDirectory(entry)) {
        const subFiles = await this.getSecurityRelevantFiles(fullPath);
        files.push(...subFiles);
      } else if (this.isSecurityRelevantFile(entry)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  private isIgnoredDirectory(dirName: string): boolean {
    const ignored = ['.git', 'node_modules', 'dist', 'build', '.next', 'coverage'];
    return ignored.includes(dirName) || dirName.startsWith('.');
  }

  private isSecurityRelevantFile(filename: string): boolean {
    const securityExtensions = [
      '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.php',
      '.json', '.yaml', '.yml', '.env', '.config', '.ini', '.properties'
    ];
    
    const securityFiles = [
      'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
      'requirements.txt', 'Pipfile', 'Dockerfile', 'docker-compose.yml',
      '.env', '.env.local', '.env.production', 'web.config', 'app.config'
    ];

    return securityExtensions.some(ext => filename.endsWith(ext)) ||
           securityFiles.includes(filename);
  }

  private async analyzeProjectContext(filePath: string): Promise<ProjectContext> {
    const rootPath = await this.findProjectRoot(filePath);
    
    return {
      rootPath,
      language: await this.detectLanguage(rootPath),
      framework: await this.detectFramework(rootPath),
      packageManager: await this.detectPackageManager(rootPath)
    };
  }

  private async findProjectRoot(filePath: string): Promise<string> {
    let current = path.isAbsolute(filePath) ? path.dirname(filePath) : process.cwd();
    
    while (current !== path.dirname(current)) {
      const packageJson = path.join(current, 'package.json');
      const gitDir = path.join(current, '.git');
      
      if (await fs.pathExists(packageJson) || await fs.pathExists(gitDir)) {
        return current;
      }
      
      current = path.dirname(current);
    }
    
    return process.cwd();
  }

  private async detectLanguage(rootPath: string): Promise<string | undefined> {
    if (await fs.pathExists(path.join(rootPath, 'tsconfig.json'))) return 'typescript';
    if (await fs.pathExists(path.join(rootPath, 'package.json'))) return 'javascript';
    if (await fs.pathExists(path.join(rootPath, 'requirements.txt'))) return 'python';
    return undefined;
  }

  private async detectFramework(rootPath: string): Promise<string | undefined> {
    try {
      const packageJson = await fs.readJson(path.join(rootPath, 'package.json'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (dependencies.react) return 'react';
      if (dependencies.vue) return 'vue';
      if (dependencies.next) return 'nextjs';
      if (dependencies.express) return 'express';
    } catch {
      // Ignore errors
    }
    
    return undefined;
  }

  private async detectPackageManager(rootPath: string): Promise<'npm' | 'yarn' | 'pnpm'> {
    if (await fs.pathExists(path.join(rootPath, 'pnpm-lock.yaml'))) return 'pnpm';
    if (await fs.pathExists(path.join(rootPath, 'yarn.lock'))) return 'yarn';
    return 'npm';
  }

  private async performSecurityAnalysis(
    codeContent: string,
    context: ProjectContext,
    scanType: string,
    standard: string
  ): Promise<string> {
    const prompt = `
You are a cybersecurity expert specializing in healthcare software security at Teladoc Health. 
Perform a comprehensive security analysis of the provided code.

Project Context:
- Language: ${context.language || 'Unknown'}
- Framework: ${context.framework || 'Unknown'}
- Scan Type: ${scanType}
- Compliance Standard: ${standard.toUpperCase()}

Code to analyze:
\`\`\`
${codeContent}
\`\`\`

Perform a ${scanType} security scan focusing on ${standard.toUpperCase()} compliance requirements.

${this.getScanTypeInstructions(scanType)}

${this.getComplianceInstructions(standard)}

For each security issue found, provide:
- File and line number
- Severity level (critical, high, medium, low)
- Category (vulnerability, secret, compliance, configuration)
- CWE ID if applicable
- Clear title and description
- Specific remediation steps
- Relevant references or documentation

Focus on:
1. **Authentication & Authorization**: JWT handling, session management, access controls
2. **Data Protection**: Encryption at rest/transit, PHI handling, data sanitization
3. **Input Validation**: SQL injection, XSS, command injection, deserialization
4. **Configuration**: Secure defaults, hardcoded secrets, environment variables
5. **Dependencies**: Known vulnerabilities, license compliance
6. **Logging & Monitoring**: Audit trails, sensitive data logging, monitoring gaps
7. **API Security**: Rate limiting, CORS, API authentication
8. **Infrastructure**: Container security, deployment configuration

Output the results in structured format with clear severity classification.
`;

    return await this.aiProvider.generateText(prompt);
  }

  private getScanTypeInstructions(scanType: string): string {
    switch (scanType) {
      case 'vulnerabilities':
        return `
Focus specifically on security vulnerabilities:
- OWASP Top 10 issues
- Known CVEs in dependencies
- Code injection vulnerabilities
- Authentication bypasses
- Authorization flaws
- Cryptographic weaknesses
`;

      case 'secrets':
        return `
Focus specifically on secret detection:
- API keys and tokens
- Database credentials
- Encryption keys
- SSH keys and certificates
- Environment variable exposure
- Hardcoded passwords
`;

      case 'compliance':
        return `
Focus specifically on compliance violations:
- Data handling requirements
- Access control policies
- Audit trail requirements
- Data retention policies
- Privacy controls
- Regulatory requirements
`;

      case 'all':
      default:
        return `
Perform comprehensive security analysis covering:
- All vulnerability types
- Secret detection
- Compliance requirements
- Configuration security
- Infrastructure security
`;
    }
  }

  private getComplianceInstructions(standard: string): string {
    switch (standard) {
      case 'hipaa':
        return `
HIPAA Compliance Requirements:
- PHI access controls and encryption
- Audit logging for PHI access
- Data breach notification procedures
- Business associate agreements
- Technical safeguards implementation
- Administrative safeguards
- Physical safeguards where applicable
`;

      case 'sox':
        return `
SOX Compliance Requirements:
- Financial data integrity controls
- Change management procedures
- Access controls for financial systems
- Audit trail maintenance
- Data retention policies
- Separation of duties
`;

      case 'pci':
        return `
PCI DSS Compliance Requirements:
- Cardholder data protection
- Secure payment processing
- Network security controls
- Access control measures
- Regular security testing
- Information security policies
`;

      case 'gdpr':
        return `
GDPR Compliance Requirements:
- Personal data processing lawfulness
- Data subject rights implementation
- Privacy by design principles
- Data breach notification
- Data protection impact assessments
- International data transfers
`;

      default:
        return 'Apply general security compliance best practices.';
    }
  }

  private async parseSecurityIssues(report: string): Promise<SecurityIssue[]> {
    // Simplified parser - in production, you'd want more robust parsing
    const issues: SecurityIssue[] = [];
    const sections = report.split(/(?=##|\*\*)/);
    
    for (const section of sections) {
      const lines = section.split('\n');
      let currentIssue: Partial<SecurityIssue> = {};
      
      for (const line of lines) {
        if (line.includes('File:') && line.includes('Line:')) {
          const match = line.match(/File:\s*(.+)\s*Line:\s*(\d+)/);
          if (match) {
            currentIssue.file = match[1].trim();
            currentIssue.line = parseInt(match[2]);
          }
        } else if (line.includes('Severity:')) {
          const severity = line.replace(/.*Severity:\s*/, '').trim().toLowerCase();
          if (['low', 'medium', 'high', 'critical'].includes(severity)) {
            currentIssue.severity = severity as any;
          }
        } else if (line.includes('Category:')) {
          const category = line.replace(/.*Category:\s*/, '').trim().toLowerCase();
          if (['vulnerability', 'secret', 'compliance', 'configuration'].includes(category)) {
            currentIssue.category = category as any;
          }
        } else if (line.includes('CWE:')) {
          currentIssue.cwe = line.replace(/.*CWE:\s*/, '').trim();
        } else if (line.includes('Title:')) {
          currentIssue.title = line.replace(/.*Title:\s*/, '').trim();
        } else if (line.includes('Description:')) {
          currentIssue.description = line.replace(/.*Description:\s*/, '').trim();
        } else if (line.includes('Remediation:')) {
          currentIssue.remediation = line.replace(/.*Remediation:\s*/, '').trim();
        }
      }
      
      if (currentIssue.file && currentIssue.title) {
        issues.push({
          file: currentIssue.file,
          line: currentIssue.line || 1,
          severity: currentIssue.severity || 'medium',
          category: currentIssue.category || 'vulnerability',
          cwe: currentIssue.cwe,
          title: currentIssue.title,
          description: currentIssue.description || '',
          remediation: currentIssue.remediation || ''
        });
      }
    }
    
    return issues;
  }

  private async formatSecurityReport(
    report: string,
    issues: SecurityIssue[],
    format: string
  ): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify({
          summary: {
            totalIssues: issues.length,
            critical: issues.filter(i => i.severity === 'critical').length,
            high: issues.filter(i => i.severity === 'high').length,
            medium: issues.filter(i => i.severity === 'medium').length,
            low: issues.filter(i => i.severity === 'low').length
          },
          issues,
          rawReport: report
        }, null, 2);
      
      case 'sarif':
        return this.generateSarifReport(issues);
      
      default: // console
        return report;
    }
  }

  private generateSarifReport(issues: SecurityIssue[]): string {
    const sarif = {
      version: '2.1.0',
      $schema: 'https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json',
      runs: [{
        tool: {
          driver: {
            name: 'Teladoc Security Agent',
            version: '1.0.0'
          }
        },
        results: issues.map(issue => ({
          ruleId: issue.cwe || 'security-issue',
          level: this.mapSeverityToSarif(issue.severity),
          message: {
            text: issue.description
          },
          locations: [{
            physicalLocation: {
              artifactLocation: {
                uri: issue.file
              },
              region: {
                startLine: issue.line
              }
            }
          }]
        }))
      }]
    };
    
    return JSON.stringify(sarif, null, 2);
  }

  private mapSeverityToSarif(severity: string): string {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'note';
      default: return 'warning';
    }
  }

  private getDefaultOutputPath(inputPath: string, format: string): string {
    const baseName = path.basename(inputPath, path.extname(inputPath));
    const timestamp = new Date().toISOString().split('T')[0];
    
    let ext: string;
    switch (format) {
      case 'json': ext = 'json'; break;
      case 'sarif': ext = 'sarif'; break;
      default: ext = 'md'; break;
    }
    
    return path.join(process.cwd(), 'security-reports', `${baseName}-security-${timestamp}.${ext}`);
  }
}
