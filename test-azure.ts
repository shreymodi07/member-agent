#!/usr/bin/env node

/**
 * Test script to verify Azure OpenAI integration
 * Run with: npm run test:azure
 */

import { AIProvider } from './src/providers/ai-provider';
import { AgentConfig } from './src/types';

async function testAzureOpenAI() {
  console.log('🧪 Testing Azure OpenAI Integration...\n');

  // Test configuration
  const config: AgentConfig = {
    provider: 'azure-openai',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://member-agents-resource.cognitiveservices.azure.com',
    azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1-mini',
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2025-01-01-preview'
  };

  if (!config.apiKey) {
    console.error('❌ AZURE_OPENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  try {
    const aiProvider = new AIProvider(config);
    console.log('✅ Azure OpenAI provider initialized successfully');

    // Test a simple prompt
    console.log('🔄 Testing text generation...');
    const response = await aiProvider.generateText('Hello! Please respond with a simple greeting.');

    console.log('✅ Text generation successful!');
    console.log('📝 Response:', response);
    console.log('\n🎉 Azure OpenAI integration test passed!');

  } catch (error) {
    console.error('❌ Azure OpenAI test failed:', (error as Error).message);
    process.exit(1);
  }
}

// Run the test
testAzureOpenAI().catch(console.error);