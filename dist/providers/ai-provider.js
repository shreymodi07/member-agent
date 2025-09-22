"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIProvider = void 0;
// NOTE: OpenAI and Anthropic support intentionally disabled (commented) per current requirement.
// To re-enable later, uncomment the imports and related logic below.
// import Anthropic from '@anthropic-ai/sdk';
// import OpenAI from 'openai';
class AIProvider {
    constructor(config) {
        // Force provider to azure-openai only.
        const provider = 'azure-openai';
        const defaultModel = 'gpt-4.1';
        this.config = {
            apiKey: config?.apiKey || process.env.AZURE_OPENAI_API_KEY || '',
            model: config?.model || defaultModel,
            provider: provider,
            baseUrl: config?.baseUrl || '',
            azureEndpoint: config?.azureEndpoint || process.env.AZURE_OPENAI_ENDPOINT || '',
            azureDeployment: config?.azureDeployment || process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1',
            azureApiVersion: config?.azureApiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
        };
        // Enforce Azure model naming expectation
        if (!this.config.model.startsWith('gpt')) {
            this.config.model = 'gpt-4.1';
        }
        if (!this.config.apiKey) {
            throw new Error('API key is required. Set AZURE_OPENAI_API_KEY environment variable or provide it in config.');
        }
        // Azure-only path
        // For Azure OpenAI, the baseURL should be just the resource endpoint
        // The SDK will automatically append /openai/deployments/{deployment}/chat/completions
        const azureBaseUrl = this.config.azureEndpoint?.replace(/\/openai.*$/, '') ||
            'https://member-agent-resource.cognitiveservices.azure.com';
        console.log('🔧 Azure OpenAI Configuration:');
        console.log(`   Raw Endpoint: ${this.config.azureEndpoint}`);
        console.log(`   Cleaned Endpoint: ${azureBaseUrl}`);
        console.log(`   Deployment: ${this.config.azureDeployment}`);
        console.log(`   API Version: ${this.config.azureApiVersion}`);
        console.log(`   Full URL will be: ${azureBaseUrl}/openai/deployments/${this.config.azureDeployment}/chat/completions`);
        // Validate configuration
        if (!this.config.azureDeployment) {
            throw new Error('Azure deployment name is required. Set azureDeployment in config.');
        }
        // Save cleaned base URL for REST calls
        this.azureBaseUrl = azureBaseUrl;
        // End constructor
    }
    async generateText(prompt) {
        // Only Azure path active.
        return await this.generateAzureOpenAI(prompt);
    }
    // private async generateOpenAI(...) { /* disabled - see comment above */ }
    // private async generateAnthropic(...) { /* disabled - see comment above */ }
    async generateAzureOpenAI(prompt) {
        try {
            if (!this.azureBaseUrl) {
                throw new Error('Azure OpenAI base URL not configured');
            }
            console.log('🚀 Making Azure OpenAI REST request...');
            console.log(`   Model/Deployment: ${this.config.azureDeployment}`);
            console.log(`   API Version: ${this.config.azureApiVersion}`);
            const url = `${this.azureBaseUrl}/openai/deployments/${this.config.azureDeployment}/chat/completions?api-version=${this.config.azureApiVersion}`;
            if (this.config.azureDeployment.includes('.')) {
                console.log('⚠ Deployment name contains a dot. This is uncommon for Azure deployment aliases. Double‑check in portal -> Model deployments.');
            }
            if (/cognitiveservices\.azure\.com/i.test(this.azureBaseUrl)) {
                console.log('ℹ Endpoint uses cognitiveservices domain. Newer Azure OpenAI resources typically use <name>.openai.azure.com');
            }
            const body = {
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000
            };
            const resp = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': this.config.apiKey
                },
                body: JSON.stringify(body)
            });
            const text = await resp.text();
            if (!resp.ok) {
                const errMsg = `Azure REST request failed: ${resp.status} ${resp.statusText} - ${text}`;
                throw new Error(errMsg);
            }
            const json = JSON.parse(text);
            const content = json.choices?.[0]?.message?.content;
            if (content) {
                console.log('✅ Azure OpenAI REST request successful');
                return content;
            }
            throw new Error('Unexpected response shape from Azure OpenAI REST API');
        }
        catch (error) {
            console.error('❌ Azure OpenAI API error:', error.message);
            // Provide specific guidance based on error
            if (/(404)|(Resource not found)|(DeploymentNotFound)/i.test(error.message)) {
                console.error('\n🔍 Troubleshooting 404 Error:');
                console.error('   1. Verify deployment name exists in Azure portal');
                console.error('   2. Deployment name is NOT the model. Copy the alias from the left column in Model deployments.');
                console.error('   3. Remove any version dots if you mistakenly used a model version as deployment alias (e.g., use gpt4o not gpt-4.1).');
                console.error('   4. Ensure API version matches a supported preview for that model (2024-02-15-preview or 2024-08-01-preview).');
                console.error('   5. Confirm resource domain (<name>.openai.azure.com vs cognitiveservices) matches the type you created.');
                console.error('\n💡 Common deployment aliases: gpt4o, gpt4o-mini, gpt-35-turbo');
            }
            else if (/(\b401\b)|(unauthorized)/i.test(error.message)) {
                console.error('\n🔍 Troubleshooting 401 Error:');
                console.error('   1. Verify API key is correct');
                console.error('   2. Check API key permissions in Azure portal');
                console.error('   3. Ensure API key hasn\'t expired');
            }
            else if (/(\b429\b)|(rate limit)/i.test(error.message)) {
                console.error('\n🔍 Troubleshooting 429 Error:');
                console.error('   1. Rate limit exceeded - wait and retry');
                console.error('   2. Check your Azure subscription limits');
            }
            console.warn(`Azure OpenAI API error: ${error.message}, falling back to mock response`);
            return this.generateMockResponse(prompt);
        }
    }
    generateMockResponse(prompt) {
        if (prompt.includes('specification')) {
            return `# Technical Specification

## Overview
This is a mock specification generated by the Teladoc AI agent.

## Requirements
- Feature requirements will be analyzed
- Security considerations included
- Compliance requirements addressed
- Performance metrics defined

## Implementation
- Code structure recommendations
- API design patterns
- Database schema considerations
- Testing strategies

## Security & Compliance
- PHI data handling protocols
- Access control requirements
- Audit logging specifications
- Encryption requirements

*Note: This is a mock response. In production, this would be generated by a real AI model.*`;
        }
        if (prompt.includes('code review')) {
            return `# Code Review Report

## Summary
The code has been analyzed for security, performance, and maintainability issues.

## Security Issues
**File: example.ts Line: 15**
- Severity: High
- Category: security
- Issue: Potential SQL injection vulnerability
- Suggestion: Use parameterized queries

## Performance Issues
**File: example.ts Line: 32**
- Severity: Medium
- Category: performance
- Issue: Inefficient database query
- Suggestion: Add proper indexing

## Compliance Issues
**File: example.ts Line: 45**
- Severity: Critical
- Category: compliance
- Issue: PHI data logged without encryption
- Suggestion: Remove sensitive data from logs

*Note: This is a mock response. In production, this would be generated by a real AI model.*`;
        }
        if (prompt.includes('security')) {
            return `# Security Analysis Report

## Critical Issues
**File: auth.ts Line: 23**
- Severity: Critical
- Category: vulnerability
- CWE: CWE-798
- Title: Hardcoded credentials
- Description: API key found in source code
- Remediation: Move credentials to environment variables

## High Priority Issues
**File: api.ts Line: 67**
- Severity: High
- Category: vulnerability
- CWE: CWE-89
- Title: SQL Injection
- Description: Unsanitized user input in SQL query
- Remediation: Use parameterized queries

## Compliance Issues
**File: logger.ts Line: 12**
- Severity: High
- Category: compliance
- Title: Sensitive data exposure in logs
- Description: Sensitive data logged without proper protection
- Remediation: Implement data sanitization in logging

*Note: This is a mock response. In production, this would be generated by a real AI model.*`;
        }
        return 'Mock AI response generated successfully.';
    }
}
exports.AIProvider = AIProvider;
//# sourceMappingURL=ai-provider.js.map