# Step-by-Step: Create Azure OpenAI Deployment

## 📋 Prerequisites
- Azure subscription with OpenAI access
- Azure OpenAI resource: member-agent-resource

## 🚀 Step-by-Step Instructions

### Step 1: Access Azure Portal
1. Open your web browser
2. Go to: https://portal.azure.com
3. Sign in with your Azure account

### Step 2: Find Your OpenAI Resource
1. In the search bar at the top, type: 'member-agent-resource'
2. Click on your Azure OpenAI resource from the results
3. It should be in the 'Cognitive Services' section

### Step 3: Navigate to Model Deployments
1. In your OpenAI resource page, look at the left sidebar
2. Click on 'Model deployments' (under 'Resource Management')

### Step 4: Create New Deployment
1. Click the '+ Create new deployment' button
2. You'll see the deployment creation form

### Step 5: Configure the Deployment
Fill out the form with these settings:

**Deployment Details:**
- Deployment name: gpt-4-deployment (or any name you prefer)
- Model: GPT-4 (select from dropdown)
- Model version: Auto-update to default (recommended)

**Scale Settings:**
- Content Filter: Default
- Tokens per Minute Rate Limit: 30000 (default should be fine)
- Deployment type: Standard

### Step 6: Create the Deployment
1. Review your settings
2. Click 'Create' button
3. Wait for deployment to complete (usually 5-10 minutes)

### Step 7: Verify Deployment
1. Go back to 'Model deployments' page
2. You should see your new deployment in the list
3. Status should show as 'Succeeded'

### Step 8: Update Your Configuration
After deployment is created, update your member-agent config:

```bash
teladoc-agent config --set azureDeployment --value gpt-4-deployment
```

### Step 9: Test the Connection
```bash
teladoc-agent review -f test.js
```

## 🎯 Expected Result
- No more 404 errors
- Real AI responses instead of mock responses
- All CLI commands work with Azure OpenAI

## 🔧 Troubleshooting
If you still get errors:
1. Double-check the deployment name matches exactly
2. Ensure the deployment status is 'Succeeded'
3. Verify your API key has access to the resource

## 💡 Alternative Models
If GPT-4 is not available, try:
- GPT-3.5-turbo
- text-davinci-003
- Other available models in your region

---
**Need help?** The deployment creation usually takes 5-10 minutes.

