"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecurityComplianceAgent = void 0;
const ai_provider_1 = require("../providers/ai-provider");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
class SecurityComplianceAgent {
    constructor(config) {
        this.aiProvider = new ai_provider_1.AIProvider(config);
    }
    async scanSecurity(options) {
        const startTime = Date.now();
        // Check if this is a git diff scan
        const isDiffScan = options.filePaths.length === 1 && options.filePaths[0] === '__GIT_DIFF__';
        let codeContent;
        let fileCount;
        if (isDiffScan) {
            // Read git diff directly
            const { execSync } = require('child_process');
            codeContent = execSync('git diff HEAD', { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
            fileCount = (codeContent.match(/^diff --git/gm) || []).length;
        }
        else {
            // Read and analyze code files
            const result = await this.readCodeForSecurity(options.filePaths);
            codeContent = result.codeContent;
            fileCount = result.fileCount;
        }
        const context = await this.analyzeProjectContext(isDiffScan ? '.' : options.filePaths[0] || '.');
        // Perform security analysis - always use concise format for diff scans
        const securityReport = isDiffScan || options.tiered
            ? await this.performConciseSecurityAnalysis(codeContent, context, options.scanType, options.standard, isDiffScan)
            : await this.performSecurityAnalysis(codeContent, context, options.scanType, options.standard);
        // Parse security issues
        const issues = await this.parseSecurityIssues(securityReport);
        // Format output
        const formattedReport = await this.formatSecurityReport(securityReport, issues, options.format);
        // Save to file if needed
        let outputPath;
        if (options.outputPath || options.format !== 'console') {
            outputPath = options.outputPath || this.getDefaultOutputPath(options.filePaths[0] || '.', options.format);
            await fs_extra_1.default.ensureDir(path_1.default.dirname(outputPath));
            await fs_extra_1.default.writeFile(outputPath, formattedReport);
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
    async readCodeForSecurity(filePaths) {
        const allFiles = [];
        const MAX_FILE_SIZE = 1024 * 1024; // 1MB per file
        const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
        let totalSize = 0;
        for (const filePath of filePaths) {
            try {
                const realPath = await fs_extra_1.default.realpath(filePath);
                const stats = await fs_extra_1.default.stat(realPath);
                if (stats.isDirectory()) {
                    const files = await this.getSecurityRelevantFiles(realPath);
                    allFiles.push(...files);
                }
                else {
                    allFiles.push(realPath);
                }
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    // Silently skip missing files/symlinks
                    continue;
                }
                else {
                    throw error;
                }
            }
        }
        // Remove duplicates
        const uniqueFiles = [...new Set(allFiles)];
        const contents = [];
        let filesProcessed = 0;
        for (const file of uniqueFiles) {
            try {
                const stats = await fs_extra_1.default.stat(file);
                // Skip files that are too large
                if (stats.size > MAX_FILE_SIZE) {
                    console.warn(`Warning: Skipping large file ${file} (${Math.round(stats.size / 1024)}KB)`);
                    continue;
                }
                // Check if we're approaching the total size limit
                if (totalSize + stats.size > MAX_TOTAL_SIZE) {
                    console.warn(`Warning: Reached maximum content size limit. Scanned ${filesProcessed} files.`);
                    break;
                }
                const content = await fs_extra_1.default.readFile(file, 'utf-8');
                contents.push(`// File: ${file}\n${content}\n`);
                totalSize += stats.size;
                filesProcessed++;
            }
            catch (error) {
                // Silently skip files we can't read
                continue;
            }
        }
        return {
            codeContent: contents.join('\n'),
            fileCount: filesProcessed
        };
    }
    async getSecurityRelevantFiles(dirPath) {
        const files = [];
        let entries;
        try {
            entries = await fs_extra_1.default.readdir(dirPath);
        }
        catch (error) {
            // Silently skip directories we can't read
            return files;
        }
        for (const entry of entries) {
            const fullPath = path_1.default.join(dirPath, entry);
            try {
                // Use lstat to detect symlinks without following them
                const stats = await fs_extra_1.default.lstat(fullPath);
                // Skip symlinks to avoid broken references
                if (stats.isSymbolicLink()) {
                    continue;
                }
                if (stats.isDirectory() && !this.isIgnoredDirectory(entry)) {
                    const subFiles = await this.getSecurityRelevantFiles(fullPath);
                    files.push(...subFiles);
                }
                else if (stats.isFile() && this.isSecurityRelevantFile(entry)) {
                    files.push(fullPath);
                }
            }
            catch (error) {
                // Silently skip files/directories we can't access
                continue;
            }
        }
        return files;
    }
    isIgnoredDirectory(dirName) {
        const ignored = [
            '.git', 'node_modules', 'dist', 'build', '.next', 'coverage',
            'vendor', 'tmp', 'temp', 'cache', '.cache', 'public/packs',
            'log', 'logs', 'test', 'spec', '__tests__', '.bundle'
        ];
        return ignored.includes(dirName) || dirName.startsWith('.');
    }
    isSecurityRelevantFile(filename) {
        const securityExtensions = [
            '.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.php', '.rb',
            '.json', '.yaml', '.yml', '.env', '.config', '.ini', '.properties', '.xml'
        ];
        const securityFiles = [
            'package.json', 'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
            'requirements.txt', 'Pipfile', 'Gemfile', 'Gemfile.lock',
            'Dockerfile', 'docker-compose.yml',
            '.env', '.env.local', '.env.production', 'web.config', 'app.config'
        ];
        // Skip test files
        if (filename.includes('.test.') || filename.includes('.spec.') ||
            filename.includes('_test.') || filename.includes('_spec.')) {
            return false;
        }
        return securityExtensions.some(ext => filename.endsWith(ext)) ||
            securityFiles.includes(filename);
    }
    async analyzeProjectContext(filePath) {
        const rootPath = await this.findProjectRoot(filePath);
        return {
            rootPath,
            language: await this.detectLanguage(rootPath),
            framework: await this.detectFramework(rootPath),
            packageManager: await this.detectPackageManager(rootPath)
        };
    }
    async findProjectRoot(filePath) {
        let current = path_1.default.isAbsolute(filePath) ? path_1.default.dirname(filePath) : process.cwd();
        while (current !== path_1.default.dirname(current)) {
            const packageJson = path_1.default.join(current, 'package.json');
            const gitDir = path_1.default.join(current, '.git');
            if (await fs_extra_1.default.pathExists(packageJson) || await fs_extra_1.default.pathExists(gitDir)) {
                return current;
            }
            current = path_1.default.dirname(current);
        }
        return process.cwd();
    }
    async detectLanguage(rootPath) {
        if (await fs_extra_1.default.pathExists(path_1.default.join(rootPath, 'tsconfig.json')))
            return 'typescript';
        if (await fs_extra_1.default.pathExists(path_1.default.join(rootPath, 'package.json')))
            return 'javascript';
        if (await fs_extra_1.default.pathExists(path_1.default.join(rootPath, 'requirements.txt')))
            return 'python';
        return undefined;
    }
    async detectFramework(rootPath) {
        try {
            const packageJson = await fs_extra_1.default.readJson(path_1.default.join(rootPath, 'package.json'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (dependencies.react)
                return 'react';
            if (dependencies.vue)
                return 'vue';
            if (dependencies.next)
                return 'nextjs';
            if (dependencies.express)
                return 'express';
        }
        catch {
            // Ignore errors
        }
        return undefined;
    }
    async detectPackageManager(rootPath) {
        if (await fs_extra_1.default.pathExists(path_1.default.join(rootPath, 'pnpm-lock.yaml')))
            return 'pnpm';
        if (await fs_extra_1.default.pathExists(path_1.default.join(rootPath, 'yarn.lock')))
            return 'yarn';
        return 'npm';
    }
    async performSecurityAnalysis(codeContent, context, scanType, standard) {
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
    async performConciseSecurityAnalysis(codeContent, context, scanType, standard, isDiffScan) {
        const prompt = `You are a security expert analyzing ${isDiffScan ? 'git diff changes' : 'code'} for ${standard.toUpperCase()} compliance vulnerabilities.

${isDiffScan ? 'GIT DIFF:' : 'CODE:'}
\`\`\`
${codeContent}
\`\`\`

Provide ONLY a concise table of vulnerabilities found. Be brief and precise.

Format each finding as:
| Severity | CWE | File | Lines | Issue | Fix |
|----------|-----|------|-------|-------|-----|
| Critical/High/Medium/Low | CWE-XXX | path/to/file | 10-15 | Brief issue description | Brief fix |

Focus on:
- SQL Injection (CWE-89)
- XSS (CWE-79)
- Authentication bypass (CWE-287)
- Authorization flaws (CWE-285)
- Sensitive data exposure (CWE-200)
- Hardcoded secrets (CWE-798)
- GDPR violations (data handling, consent, logging PII)

Skip:
- Style/formatting issues
- Non-security code quality issues
- Theoretical vulnerabilities without evidence

Output ONLY the table. No explanations, no summaries, no extra text.`;
        return await this.aiProvider.generateText(prompt);
    }
    async performTieredSecurityAnalysis(codeContent, context, scanType, standard) {
        return this.performConciseSecurityAnalysis(codeContent, context, scanType, standard, false);
    }
    extractFilesFromContent(codeContent) {
        const files = [];
        const re = /^\/\/ File:\s*(.+)$/gm;
        let m;
        while ((m = re.exec(codeContent)) !== null) {
            const f = m[1].trim();
            if (f && !files.includes(f))
                files.push(f);
        }
        return files;
    }
    extractDiffSections(codeContent) {
        const lines = codeContent.split('\n');
        const chunks = [];
        let collecting = false;
        for (const line of lines) {
            if (line.startsWith('// Git Changes:')) {
                collecting = true;
                continue;
            }
            if (collecting && line.startsWith('// Full Content:')) {
                collecting = false;
                continue;
            }
            if (collecting)
                chunks.push(line);
        }
        return chunks.join('\n').trim();
    }
    getScanTypeInstructions(scanType) {
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
    getComplianceInstructions(standard) {
        switch (standard) {
            case 'hipaa':
                return `
General Compliance Requirements:
- Data access controls and encryption
- Audit logging for sensitive data access
- Data breach notification procedures
- Third-party agreements and assessments
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
    async parseSecurityIssues(report) {
        // Simplified parser - in production, you'd want more robust parsing
        const issues = [];
        const sections = report.split(/(?=##|\*\*)/);
        for (const section of sections) {
            const lines = section.split('\n');
            let currentIssue = {};
            for (const line of lines) {
                if (line.includes('File:') && line.includes('Line:')) {
                    const match = line.match(/File:\s*(.+)\s*Line:\s*(\d+)/);
                    if (match) {
                        currentIssue.file = match[1].trim();
                        currentIssue.line = parseInt(match[2]);
                    }
                }
                else if (line.includes('Severity:')) {
                    const severity = line.replace(/.*Severity:\s*/, '').trim().toLowerCase();
                    if (['low', 'medium', 'high', 'critical'].includes(severity)) {
                        currentIssue.severity = severity;
                    }
                }
                else if (line.includes('Category:')) {
                    const category = line.replace(/.*Category:\s*/, '').trim().toLowerCase();
                    if (['vulnerability', 'secret', 'compliance', 'configuration'].includes(category)) {
                        currentIssue.category = category;
                    }
                }
                else if (line.includes('CWE:')) {
                    currentIssue.cwe = line.replace(/.*CWE:\s*/, '').trim();
                }
                else if (line.includes('Title:')) {
                    currentIssue.title = line.replace(/.*Title:\s*/, '').trim();
                }
                else if (line.includes('Description:')) {
                    currentIssue.description = line.replace(/.*Description:\s*/, '').trim();
                }
                else if (line.includes('Remediation:')) {
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
    async formatSecurityReport(report, issues, format) {
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
    generateSarifReport(issues) {
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
    mapSeverityToSarif(severity) {
        switch (severity) {
            case 'critical': return 'error';
            case 'high': return 'error';
            case 'medium': return 'warning';
            case 'low': return 'note';
            default: return 'warning';
        }
    }
    getDefaultOutputPath(inputPath, format) {
        const baseName = path_1.default.basename(inputPath, path_1.default.extname(inputPath));
        const timestamp = new Date().toISOString().split('T')[0];
        let ext;
        switch (format) {
            case 'json':
                ext = 'json';
                break;
            case 'sarif':
                ext = 'sarif';
                break;
            default:
                ext = 'md';
                break;
        }
        return path_1.default.join(process.cwd(), 'security-reports', `${baseName}-security-${timestamp}.${ext}`);
    }
}
exports.SecurityComplianceAgent = SecurityComplianceAgent;
//# sourceMappingURL=security-compliance.js.map