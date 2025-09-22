# Azure OpenAI Deployment Setup Guide

## Problem: 404 Resource Not Found
Your Azure OpenAI resource doesn't have any model deployments created.

## Solution: Create Deployments in Azure Portal

### Step 1: Go to Azure Portal
1. Open https://portal.azure.com
2. Navigate to your Azure OpenAI resource
3. Look for 'member-agent-resource' in Cognitive Services

### Step 2: Create Model Deployment
1. In your Azure OpenAI resource, click on 'Model deployments'
2. Click '+ Create new deployment'
3. Choose a model:
   - **Recommended**: GPT-4 (gpt-4)
   - **Alternative**: GPT-3.5 Turbo (gpt-35-turbo)
4. Give it a deployment name (this is what you use in config)
5. Set capacity as needed
6. Click 'Create'

### Step 3: Update Configuration
After creating deployment, update your config:
```bash
teladoc-agent config --set azureDeployment --value YOUR_DEPLOYMENT_NAME
```

### Step 4: Test
```bash
teladoc-agent review -f test.js
```

## Current Status
- ✅ CLI is working with mock responses
- ❌ Azure OpenAI deployment missing
- 🔄 Need to create deployment in Azure Portal

## Alternative: Use Mock Mode
Your system works perfectly with mock responses for development/testing.

