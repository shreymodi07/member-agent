import { AgentConfig } from '../types/index.js';
export declare class AIProvider {
    private config;
    private azureBaseUrl?;
    constructor(config?: AgentConfig);
    generateText(prompt: string): Promise<string>;
    private generateAzureOpenAI;
    private generateMockResponse;
}
//# sourceMappingURL=ai-provider.d.ts.map