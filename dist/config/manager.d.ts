import { AgentConfig } from '../types';
export interface FullConfig extends AgentConfig {
    defaultLanguage?: string;
    packageManager?: 'npm' | 'yarn' | 'pnpm';
    outputDir?: string;
    templatesDir?: string;
    [key: string]: any;
}
export declare class ConfigManager {
    private configPath;
    private defaultConfig;
    constructor();
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<void>;
    getAll(): Promise<FullConfig>;
    reset(): Promise<void>;
    private saveConfig;
    getAgentConfig(): Promise<AgentConfig>;
}
//# sourceMappingURL=manager.d.ts.map