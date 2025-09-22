# Azure Troubleshooting Guide

## Common Issues and Solutions

### 1. 404 Resource Not Found Error

**Symptoms:**

- `Azure OpenAI API error: 404 Resource not found`
- API calls fail with 404 status

**Solutions:**

1. **Check Endpoint URL Format:**
   - ✅ Common legacy style: `https://your-resource.cognitiveservices.azure.com`
   - ✅ Newer resource style: `https://your-resource.openai.azure.com`
   - ❌ Wrong: Full path including `/openai/deployments/.../chat/completions` pasted into config

2. **Deployment Alias ≠ Model Name:**
   - The value you pass as `azureDeployment` must be the Deployment (alias) column in Portal → Model deployments.
   - Examples of valid aliases: `gpt4o`, `gpt4o-mini`, `chat`, `prod`, `gpt-35-turbo` (if you named it that).
   - Invalid (model names accidentally used as alias): `gpt-4.1` (no such Azure deployable model), `text-davinci-003` (legacy model usually not newly deployable), `gpt-4` (only if you explicitly created alias with that exact string).

3. **Verify Deployment Exists:**
   - Portal path: Your OpenAI resource → Model deployments → Copy the exact Deployment name string (case sensitive).
   - If you only see a button to Create a deployment and no rows, you have NOT deployed a model yet.

4. **API Version Compatibility:**
   - Safe baseline: `2024-02-15-preview`
   - For newer models (gpt-4o family) also try: `2024-08-01-preview`
   - Avoid speculative future versions unless documented in your portal.
   - If you get 404 with one version, retry with the other BEFORE changing anything else.

5. **Distinguish 404 Causes:**
   - Body contains `DeploymentNotFound` → alias mismatch
   - Body says `Resource not found` with no deployment token → wrong endpoint domain (cognitiveservices vs openai) or region mismatch
   - Empty / HTML body → likely network / proxy interference

6. **Use Direct Test Script:**
    Run the new low-level tester (no SDK abstraction):

    ```bash
    npx tsx azure-direct-test.ts --deployment <alias> --endpoint https://your-resource.openai.azure.com --api-version 2024-02-15-preview
    ```

    Or with a pasted full URL:

    ```bash
    FULL_AZURE_URL="https://your-resource.openai.azure.com/openai/deployments/<alias>/chat/completions?api-version=2024-02-15-preview" \
       AZURE_OPENAI_API_KEY=... npx tsx azure-direct-test.ts
    ```

### 2. 401 Unauthorized Error

**Symptoms:**

- `401 Unauthorized` error
- API key issues

**Solutions:**

1. **Verify API Key:**
   - Ensure you're using the correct API key from Azure portal
   - Check Azure OpenAI resource → Keys section

2. **Check API Key Permissions:**
   - Ensure the API key has access to the deployment
   - Verify the resource is not disabled

### 3. 429 Rate Limit Exceeded

**Symptoms:**

- `429 Too Many Requests` error
- Temporary throttling

**Solutions:**

1. **Reduce Request Frequency:**
   - Add delays between requests
   - Implement exponential backoff

2. **Check Rate Limits:**
   - Review your Azure subscription limits
   - Consider upgrading your tier if needed

## Quick Setup Commands

### Using the Setup Helper (Recommended)

```bash
npm run setup:azure
```

### Manual Configuration

```bash
# Set provider
teladoc-agent config --set provider --value azure-openai

# Set endpoint (just the base URL)
teladoc-agent config --set azureEndpoint --value https://your-resource.cognitiveservices.azure.com

# Set deployment name
teladoc-agent config --set azureDeployment --value gpt-4.1

# Set API version
teladoc-agent config --set azureApiVersion --value 2024-02-15-preview

# Set API key
teladoc-agent config --set apiKey --value your-api-key-here
```

### Environment Variables

```bash
export AZURE_OPENAI_API_KEY=your-api-key
export AZURE_OPENAI_ENDPOINT=https://your-resource.cognitiveservices.azure.com
export AZURE_OPENAI_DEPLOYMENT=gpt-4.1
export AZURE_OPENAI_API_VERSION=2024-02-15-preview
```

## Testing Your Setup

### Run the Test Script

```bash
npm run test:azure
```

### Manual Test

```bash
teladoc-agent review --help
# This should show the help without API errors
```

## Azure Portal Verification

1. **Go to Azure Portal** → Cognitive Services → OpenAI
2. **Select your resource**
3. **Check:**
   - Resource endpoint URL
   - Available deployments
   - API keys
   - Usage metrics

## Debug Mode

Enable verbose logging to see detailed error information:

```bash
teladoc-agent review --verbose --debug
```

## Support

If issues persist:

1. Check Azure service status
2. Verify your subscription has OpenAI access
3. Ensure the deployment model is available in your region
4. Contact Azure support if needed

## Configuration Examples

### Working Configuration (Example)

```json
{
  "provider": "azure-openai",
  "apiKey": "your-api-key",
   "azureEndpoint": "https://member-agent-resource.openai.azure.com",
   "azureDeployment": "gpt4o", 
   "azureApiVersion": "2024-02-15-preview"
}
```

### Common Mistakes to Avoid

- ❌ Don't include `/openai/deployments/...` in the endpoint
- ❌ Don't confuse model name with deployment alias
- ❌ Don't use unsupported or future API versions not shown in portal docs
- ❌ Don't leave endpoint set to cognitiveservices if your resource uses the new openai domain
- ❌ Don't forget to set the API key
