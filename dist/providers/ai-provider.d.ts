import { AgentConfig } from '../types';
export declare class AIProvider {
    private config;
    private anthropic?;
    constructor(config?: AgentConfig);
    generateText(prompt: string): Promise<string>;
    private generateOpenAI;
    private generateAnthropic;
    private generateMockResponse;
}
//# sourceMappingURL=ai-provider.d.ts.map