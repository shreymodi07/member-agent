export interface BaseCommandOptions {
    verbose?: boolean;
    debug?: boolean;
}
export interface AgentConfig {
    apiKey?: string;
    model?: string;
    provider?: 'openai' | 'anthropic';
    baseUrl?: string;
}
export interface ProjectContext {
    rootPath: string;
    gitRepo?: string;
    language?: string;
    framework?: string;
    packageManager?: 'npm' | 'yarn' | 'pnpm';
}
//# sourceMappingURL=index.d.ts.map