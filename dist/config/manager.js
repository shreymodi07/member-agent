import fs from 'fs-extra';
import path from 'path';
import os from 'os';
export class ConfigManager {
    constructor() {
        this.configPath = path.join(os.homedir(), '.teladoc-agent', 'config.json');
        this.defaultConfig = {
            provider: 'azure-openai',
            model: 'gpt-4.1',
            defaultLanguage: 'typescript',
            packageManager: 'npm',
            outputDir: './output',
            templatesDir: './templates',
            azureEndpoint: 'https://member-agents-resource.cognitiveservices.azure.com',
            azureDeployment: 'gpt-4.1-mini',
            azureApiVersion: '2025-01-01-preview'
        };
    }
    async get(key) {
        const config = await this.getAll();
        return config[key];
    }
    async set(key, value) {
        const config = await this.getAll();
        config[key] = value;
        await this.saveConfig(config);
    }
    async getAll() {
        try {
            if (await fs.pathExists(this.configPath)) {
                const configData = await fs.readJson(this.configPath);
                return { ...this.defaultConfig, ...configData };
            }
        }
        catch (error) {
            console.warn('Error reading config file, using defaults:', error.message);
        }
        return { ...this.defaultConfig };
    }
    async reset() {
        await this.saveConfig(this.defaultConfig);
    }
    async saveConfig(config) {
        await fs.ensureDir(path.dirname(this.configPath));
        await fs.writeJson(this.configPath, config, { spaces: 2 });
    }
    async getAgentConfig() {
        const config = await this.getAll();
        return {
            apiKey: config.apiKey,
            model: config.model,
            provider: config.provider,
            baseUrl: config.baseUrl,
            azureEndpoint: config.azureEndpoint,
            azureDeployment: config.azureDeployment,
            azureApiVersion: config.azureApiVersion
        };
    }
}
//# sourceMappingURL=manager.js.map