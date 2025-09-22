export interface BaseCommandOptions {
  verbose?: boolean;
  debug?: boolean;
}

export interface AgentConfig {
  apiKey?: string;
  model?: string;
  // provider narrowed to azure-openai per current simplified setup.
  // Previously supported: 'openai' | 'anthropic' | 'gpt-4'
  provider?: 'azure-openai';
  baseUrl?: string; // retained for future reinstatement of other providers
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
