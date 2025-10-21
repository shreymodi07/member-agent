# Teladoc Member Agents

AI-powered code review and security scanning for development teams.

## Features

🔍 **Smart Code Review** - Automatically analyzes your git changes
- Security vulnerability detection
- Code quality analysis
- Best practices enforcement
- Performance optimization suggestions

🔒 **Security Scanner** - Find vulnerabilities and compliance issues
- Security vulnerability detection
- Code security analysis
- Best practices validation
- Git diff scanning for efficient change-focused analysis

## Installation

### From Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-username/member-agent.git
cd member-agent

# Install dependencies and build
npm install
npm run build

# Install globally
npm install -g .
```

## Setup

### Quick Azure Setup

```bash
# One-step setup - just provide your API key
teladoc-agent quick-azure
```

This stores your Azure OpenAI configuration with opinionated defaults. Verify the config:

```bash
teladoc-agent config --list
```

## Configuration

### View Configuration

```bash
# Show all current config settings
teladoc-agent config --list
```

### Configure Azure OpenAI

```bash
# Set individual values
teladoc-agent config --set azureEndpoint --value https://member-agents-resource.cognitiveservices.azure.com
teladoc-agent config --set azureDeployment --value gpt-4.1-mini
teladoc-agent config --set azureApiVersion --value 2025-01-01-preview
teladoc-agent config --set apiKey --value your-azure-api-key

# Reset to defaults
teladoc-agent config --reset
```

### Environment Variables

Alternatively, set configuration via environment variables:

```bash
export AZURE_OPENAI_API_KEY=your-azure-key
export AZURE_OPENAI_ENDPOINT=https://member-agents-resource.cognitiveservices.azure.com
export AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
export AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

## Code Review

### Review Git Changes

```bash
# Analyze your current git changes
teladoc-agent review --changes

# Output to markdown file
teladoc-agent review --changes --format markdown -o review.md
```

### Review Specific File

```bash
# Review a specific file or directory
teladoc-agent review -f path/to/file.js

# Output to file
teladoc-agent review -f path/to/file.js --format markdown -o review.md
```

## Security Scanning

### Scan Git Changes (Recommended)

```bash
# Scan only files changed in git diff - concise, precise findings
teladoc-agent security --diff

# Output to JSON
teladoc-agent security --diff --format json -o security.json
```

### Scan Current Directory

```bash
# Scan all files in current directory
teladoc-agent security

# Scan specific file or directory
teladoc-agent security -f path/to/scan
```

### Output Formats

```bash
# Console output (default)
teladoc-agent security --diff

# JSON output
teladoc-agent security --diff --format json -o security.json
```

## Requirements

- Node.js 18+
- Git repository (for smart change detection)
- Azure OpenAI API credentials
