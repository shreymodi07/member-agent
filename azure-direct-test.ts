/**
 * Direct Azure OpenAI REST tester.
 *
 * Usage:
 *  npx tsx azure-direct-test.ts                 # uses config manager values
 *  AZURE_OPENAI_API_KEY=... npx tsx azure-direct-test.ts
 *  FULL_AZURE_URL="https://res.openai.azure.com/openai/deployments/dep/chat/completions?api-version=2024-02-15-preview" npx tsx azure-direct-test.ts
 *  npx tsx azure-direct-test.ts --deployment myDep --endpoint https://res.openai.azure.com --api-version 2024-02-15-preview
 */
import { ConfigManager } from './src/config/manager';
import * as crypto from 'crypto';

interface Args {
  deployment?: string;
  endpoint?: string;
  apiVersion?: string;
  prompt?: string;
}

function parseArgs(): Args {
  const args: Args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--deployment') args.deployment = argv[++i];
    else if (a === '--endpoint') args.endpoint = argv[++i];
    else if (a === '--api-version') args.apiVersion = argv[++i];
    else if (a === '--prompt') args.prompt = argv[++i];
  }
  return args;
}

async function main() {
  const args = parseArgs();
  const cm = new ConfigManager();
  const cfg = await cm.getAll();

  const fullUrl = process.env.FULL_AZURE_URL?.trim();
  let endpoint = (args.endpoint || cfg.azureEndpoint || '').replace(/\/$/, '');
  let deployment = args.deployment || cfg.azureDeployment || '';
  let apiVersion = args.apiVersion || cfg.azureApiVersion || '2024-02-15-preview';
  const apiKey = process.env.AZURE_OPENAI_API_KEY || cfg.apiKey;
  const prompt = args.prompt || 'Return the single word: pong';

  if (!apiKey) {
    console.error('❌ Missing API key. Set AZURE_OPENAI_API_KEY or add to config.');
    process.exit(1);
  }

  if (fullUrl) {
    console.log('🔗 Using FULL_AZURE_URL override (other flags ignored for URL composition).');
  } else {
    if (!endpoint) {
      console.error('❌ No endpoint configured. Provide --endpoint or set azureEndpoint in config.');
      process.exit(1);
    }
    // Normalize endpoint (strip trailing /openai/... if user pasted a full path)
    endpoint = endpoint.replace(/\/openai.*$/, '');
  }

  if (deployment && deployment.includes('.')) {
    console.warn('⚠ Deployment name contains a dot. Azure deployment aliases normally do NOT include model version periods. Double‑check in the portal.');
  }

  const url = fullUrl || `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  console.log('\n=== Azure Direct Test ===');
  console.log('Endpoint:     ', endpoint || '(from FULL_AZURE_URL)');
  console.log('Deployment:   ', deployment);
  console.log('API Version:  ', apiVersion);
  console.log('URL:          ', url);
  console.log('Prompt:       ', prompt);
  console.log('Timestamp:    ', new Date().toISOString());

  if (/cognitiveservices\.azure\.com/i.test(url)) {
    console.log('ℹ Note: cognitiveservices domain is older style. Newer OpenAI resources commonly use <name>.openai.azure.com');
  }

  const body = {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 16,
    temperature: 0,
    n: 1,
    user: 'azure-direct-test-' + crypto.randomBytes(4).toString('hex')
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey
      },
      body: JSON.stringify(body)
    });

    const text = await resp.text();
    console.log('\nStatus: ', resp.status, resp.statusText);
    console.log('Headers:');
    ['x-request-id','x-ms-region','azureml-model-error-sub-code'].forEach(h => {
      const v = resp.headers.get(h);
      if (v) console.log(`  ${h}: ${v}`);
    });

    let json: any = null;
    try { json = JSON.parse(text); } catch { /* keep raw */ }

    if (!resp.ok) {
      console.error('\n❌ Request Failed');
      console.error('Raw Body:', text.slice(0, 400));
  diagnoseFailure(resp.status, text, deployment || '(empty)', apiVersion);
      process.exit(1);
    }

    const content = json?.choices?.[0]?.message?.content || '(no content)';
    console.log('\n✅ Success! Content:');
    console.log(content);
  } catch (e: any) {
    console.error('\n❌ Network/Unhandled Error:', e.message);
  }
}

function diagnoseFailure(status: number, body: string, deployment: string, apiVersion: string) {
  console.log('\n=== Diagnosis ===');
  if (status === 404) {
    if (/DeploymentNotFound|does not exist|Deployment not found/i.test(body)) {
      console.log('• Deployment alias likely incorrect. In Azure portal go to: Azure OpenAI Resource -> Model deployments -> Copy the Deployment name (left column).');
    } else {
      console.log('• 404 returned but body did not contain standard DeploymentNotFound text. Check endpoint domain and API version.');
    }
    if (deployment.includes('.')) {
      console.log('• The deployment alias contains a dot; typical aliases are simple (e.g., gpt4o, chat, prod).');
    }
    console.log('• Try API version 2024-02-15-preview or 2024-08-01-preview if using newer models. Current:', apiVersion);
  } else if (status === 401) {
    console.log('• Unauthorized: verify you used a key from the Keys & Endpoint tab for THIS OpenAI resource.');
  } else if (status === 429) {
    console.log('• Rate limited: reduce request rate or check quota.');
  } else if (status >= 500) {
    console.log('• Server side issue; retry later or check Azure status page.');
  }
}

main();
