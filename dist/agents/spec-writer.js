import { AIProvider } from '../providers/ai-provider.js';
import fs from 'fs-extra';
import path from 'path';
export class SpecWriterAgent {
    constructor(config) {
        this.aiProvider = new AIProvider(config);
    }
    async generateSpec(options) {
        const startTime = Date.now();
        // Read and analyze the input file(s)
        const codeContent = await this.readCodeContent(options.filePath);
        const projectContext = await this.analyzeProjectContext(options.filePath);
        // Generate specification based on type
        const specification = await this.generateSpecification(codeContent, projectContext, options.type, options.template);
        // Save to output file
        const outputPath = options.outputPath || this.getDefaultOutputPath(options.filePath, options.type);
        await fs.ensureDir(path.dirname(outputPath));
        await fs.writeFile(outputPath, specification);
        const duration = Date.now() - startTime;
        const lineCount = specification.split('\n').length;
        return {
            outputPath,
            duration,
            lineCount,
            specification
        };
    }
    async readCodeContent(filePath) {
        const stats = await fs.stat(filePath);
        if (stats.isDirectory()) {
            // Read multiple files from directory
            const files = await this.getCodeFiles(filePath);
            const contents = await Promise.all(files.map(async (file) => {
                const content = await fs.readFile(file, 'utf-8');
                return `// File: ${file}\n${content}\n`;
            }));
            return contents.join('\n');
        }
        else {
            return await fs.readFile(filePath, 'utf-8');
        }
    }
    async getCodeFiles(dirPath) {
        const files = [];
        const entries = await fs.readdir(dirPath);
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry);
            const stats = await fs.stat(fullPath);
            if (stats.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
                const subFiles = await this.getCodeFiles(fullPath);
                files.push(...subFiles);
            }
            else if (this.isCodeFile(entry)) {
                files.push(fullPath);
            }
        }
        return files;
    }
    isCodeFile(filename) {
        const codeExtensions = ['.ts', '.js', '.tsx', '.jsx', '.py', '.java', '.cs', '.go', '.rs', '.php'];
        return codeExtensions.some(ext => filename.endsWith(ext));
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
    async detectLanguage(rootPath) {
        if (await fs.pathExists(path.join(rootPath, 'tsconfig.json')))
            return 'typescript';
        if (await fs.pathExists(path.join(rootPath, 'package.json')))
            return 'javascript';
        if (await fs.pathExists(path.join(rootPath, 'requirements.txt')))
            return 'python';
        if (await fs.pathExists(path.join(rootPath, 'Cargo.toml')))
            return 'rust';
        if (await fs.pathExists(path.join(rootPath, 'go.mod')))
            return 'go';
        return undefined;
    }
    async detectFramework(rootPath) {
        try {
            const packageJson = await fs.readJson(path.join(rootPath, 'package.json'));
            const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            if (dependencies.react)
                return 'react';
            if (dependencies.vue)
                return 'vue';
            if (dependencies.angular)
                return 'angular';
            if (dependencies.next)
                return 'nextjs';
            if (dependencies.nuxt)
                return 'nuxtjs';
            if (dependencies.express)
                return 'express';
            if (dependencies.fastify)
                return 'fastify';
        }
        catch {
            // Ignore errors
        }
        return undefined;
    }
    async detectPackageManager(rootPath) {
        if (await fs.pathExists(path.join(rootPath, 'pnpm-lock.yaml')))
            return 'pnpm';
        if (await fs.pathExists(path.join(rootPath, 'yarn.lock')))
            return 'yarn';
        return 'npm';
    }
    async generateSpecification(codeContent, context, type, template) {
        const prompt = this.buildSpecPrompt(codeContent, context, type, template);
        return await this.aiProvider.generateText(prompt);
    }
    buildSpecPrompt(codeContent, context, type, template) {
        const basePrompt = `
You are a senior technical writer at Teladoc Health, specializing in creating comprehensive technical specifications for healthcare software systems. 

Project Context:
- Language: ${context.language || 'Unknown'}
- Framework: ${context.framework || 'Unknown'}
- Root Path: ${context.rootPath}

Code to analyze:
\`\`\`
${codeContent}
\`\`\`

Generate a ${type} specification that includes:
${this.getSpecificationTemplate(type)}

Focus on:
- Compliance requirements for sensitive data
- Security considerations and data protection
- Integration points with existing systems
- Performance requirements for user-facing features
- Accessibility requirements (WCAG 2.1 AA)
- Error handling and logging requirements

${template ? `Use this custom template structure:\n${template}` : ''}

Provide a comprehensive, professional specification document.
`;
        return basePrompt;
    }
    getSpecificationTemplate(type) {
        switch (type) {
            case 'api':
                return `
1. API Overview and Purpose
2. Authentication and Security
3. Endpoints and Methods
4. Request/Response Schemas
5. Error Codes and Handling
6. Rate Limiting and Throttling
7. Data Privacy and Compliance
8. Integration Examples
9. Testing Requirements
10. Monitoring and Logging
`;
            case 'feature':
                return `
1. Feature Overview and Business Value
2. User Stories and Acceptance Criteria
3. Technical Requirements
4. Architecture and Design
5. Database Schema Changes
6. API Contracts
7. Security and Compliance Requirements
8. Performance Requirements
9. Testing Strategy
10. Deployment and Rollout Plan
`;
            case 'component':
                return `
1. Component Purpose and Scope
2. Props/Interface Definition
3. State Management
4. Styling and Theming
5. Accessibility Requirements
6. Event Handling
7. Performance Considerations
8. Testing Requirements
9. Usage Examples
10. Integration Guidelines
`;
            default:
                return 'Please provide a comprehensive technical specification.';
        }
    }
    getDefaultOutputPath(inputPath, type) {
        const baseName = path.basename(inputPath, path.extname(inputPath));
        const timestamp = new Date().toISOString().split('T')[0];
        return path.join(process.cwd(), 'specs', `${baseName}-${type}-spec-${timestamp}.md`);
    }
}
//# sourceMappingURL=spec-writer.js.map