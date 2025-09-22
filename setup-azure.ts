#!/usr/bin/env node

/**
 * Azure OpenAI Setup Helper
 * Run with: npm run setup:azure
 */

import inquirer from 'inquirer';
import { ConfigManager } from './src/config/manager';

async function setupAzureOpenAI() {
  console.log('🔧 Azure OpenAI Setup Helper\n');

  const configManager = new ConfigManager();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: 'Enter your Azure OpenAI API Key:',
      validate: (input: string) => input.length > 0 || 'API Key is required'
    },
    {
      type: 'input',
      name: 'endpoint',
      message: 'Enter your Azure OpenAI endpoint URL:',
      default: 'https://member-agent-resource.cognitiveservices.azure.com',
      validate: (input: string) => {
        if (!input.includes('openai.azure.com') && !input.includes('cognitiveservices.azure.com')) {
          return 'Invalid Azure endpoint format. Should contain "openai.azure.com" or "cognitiveservices.azure.com"';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'deployment',
      message: 'Enter your deployment name (leave empty to auto-detect):',
      default: 'gpt-4.1'
    },
    {
      type: 'input',
      name: 'apiVersion',
      message: 'Enter API version:',
      default: '2024-02-15-preview'
    }
  ]);

  // Clean the endpoint URL (remove any path after the resource)
  const cleanEndpoint = answers.endpoint.replace(/\/openai.*$/, '');

  console.log('\n📝 Setting configuration...');

  await configManager.set('provider', 'azure-openai');
  await configManager.set('apiKey', answers.apiKey);
  await configManager.set('azureEndpoint', cleanEndpoint);
  await configManager.set('azureDeployment', answers.deployment || 'gpt-4.1');
  await configManager.set('azureApiVersion', answers.apiVersion);

  console.log('\n✅ Azure OpenAI configuration saved!');
  console.log('🔍 Configuration Summary:');
  console.log(`   Provider: azure-openai`);
  console.log(`   Endpoint: ${cleanEndpoint}`);
  console.log(`   Deployment: ${answers.deployment}`);
  console.log(`   API Version: ${answers.apiVersion}`);

  console.log('\n🧪 Testing configuration...');

  // Test the configuration
  try {
    const { AIProvider } = await import('./src/providers/ai-provider');

    const testConfig = {
      provider: 'azure-openai' as const,
      apiKey: answers.apiKey,
      azureEndpoint: cleanEndpoint,
      azureDeployment: answers.deployment || 'gpt-4.1',
      azureApiVersion: answers.apiVersion
    };

    const aiProvider = new AIProvider(testConfig);
    const testResponse = await aiProvider.generateText('Hello! This is a test.');

    console.log('✅ Configuration test successful!');
    console.log('📝 Test response:', testResponse.substring(0, 100) + '...');

  } catch (error) {
    console.error('❌ Configuration test failed:', (error as Error).message);
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your API key is correct');
    console.log('2. Check that the deployment name exists in your Azure resource');
    console.log('3. Ensure the API version is supported by your deployment');
    console.log('4. Verify your Azure resource has the correct permissions');
  }
}

// Run the setup
setupAzureOpenAI().catch(console.error);