export interface BaseCommandOptions {
    verbose?: boolean;
    debug?: boolean;
}
export interface AgentConfig {
    apiKey?: string;
    model?: string;
    provider?: 'azure-openai';
    baseUrl?: string;
    azureEndpoint?: string;
    azureDeployment?: string;
    azureApiVersion?: string;
}
export interface ProjectContext {
    rootPath: string;
    gitRepo?: string;
    language?: string;
    framework?: string;
    packageManager?: 'npm' | 'yarn' | 'pnpm';
}
//# sourceMappingURL=index.d.ts.map