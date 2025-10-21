"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
class ConfigManager {
    constructor() {
        this.configPath = path_1.default.join(os_1.default.homedir(), '.teladoc-agent', 'config.json');
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
            if (await fs_extra_1.default.pathExists(this.configPath)) {
                const configData = await fs_extra_1.default.readJson(this.configPath);
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
        await fs_extra_1.default.ensureDir(path_1.default.dirname(this.configPath));
        await fs_extra_1.default.writeJson(this.configPath, config, { spaces: 2 });
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
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=manager.js.map