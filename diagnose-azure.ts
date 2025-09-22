#!/usr/bin/env node

/**
 * Azure OpenAI Diagnostic Tool
 * Tests different deployment names and configurations
 */

import { AIProvider } from './src/providers/ai-provider';
import { AgentConfig } from './src/types';

async function diagnoseAzureOpenAI() {
  console.log('🔍 Azure OpenAI Diagnostic Tool\n');

  // Get current configuration
  const config: AgentConfig = {
    provider: 'azure-openai',
    apiKey: process.env.AZURE_OPENAI_API_KEY || '',
    azureEndpoint: process.env.AZURE_OPENAI_ENDPOINT || 'https://member-agent-resource.cognitiveservices.azure.com',
    azureDeployment: process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4.1',
    azureApiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview'
  };

  if (!config.apiKey) {
    console.error('❌ AZURE_OPENAI_API_KEY environment variable is required');
    console.log('\n💡 Set your API key:');
    console.log('   export AZURE_OPENAI_API_KEY=your-api-key');
    process.exit(1);
  }

  console.log('📋 Current Configuration:');
  console.log(`   Endpoint: ${config.azureEndpoint}`);
  console.log(`   API Key: ${config.apiKey.substring(0, 10)}...`);
  console.log(`   API Version: ${config.azureApiVersion}`);
  console.log('');

  // Common deployment names to test
  const deploymentNames = [
    'gpt-4.1',
    'gpt-4',
    'gpt-35-turbo',
    'gpt-3.5-turbo',
    'text-davinci-003',
    'text-curie-001',
    'text-babbage-001',
    'text-ada-001'
  ];

  console.log('🧪 Testing different deployment names...\n');

  for (const deployment of deploymentNames) {
    console.log(`🔍 Testing deployment: ${deployment}`);

    const testConfig = { ...config, azureDeployment: deployment };

    try {
      const aiProvider = new AIProvider(testConfig);
      const response = await aiProvider.generateText('Hello! This is a test.');

      // Check if this is a real response or mock fallback
      if (response.includes('Mock AI response') || response.includes('mock response')) {
        console.log(`❌ MOCK: ${deployment} returns mock response (deployment not found)`);
      } else {
        console.log(`✅ SUCCESS: ${deployment} is available!`);
        console.log(`   Response: ${response.substring(0, 50)}...`);
        console.log('\n🎉 Found working deployment! Update your config:');
        console.log(`   teladoc-agent config --set azureDeployment --value ${deployment}`);
        return;
      }

    } catch (error: any) {
      if (error.message.includes('404')) {
        console.log(`❌ 404: ${deployment} not found`);
      } else if (error.message.includes('401')) {
        console.log(`❌ 401: ${deployment} unauthorized (check API key)`);
        break; // Stop testing if API key is wrong
      } else if (error.message.includes('429')) {
        console.log(`❌ 429: ${deployment} rate limited`);
      } else {
        console.log(`❌ ERROR: ${deployment} - ${error.message}`);
      }
    }

    console.log('');
  }

  console.log('❌ No working deployments found.');
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Check your Azure OpenAI resource in the portal');
  console.log('2. Verify the endpoint URL is correct');
  console.log('3. Ensure your API key has access to the resource');
  console.log('4. Confirm the resource is in "Running" state');
  console.log('5. Check if you have the correct deployment names');
  console.log('\n📖 For more help, see AZURE_TROUBLESHOOTING.md');
}

// Run the diagnostic
diagnoseAzureOpenAI().catch(console.error);