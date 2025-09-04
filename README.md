# Teladoc Member Agents

AI-powered code review and security scanning for Teladoc development teams.

## Features

🔍 **Smart Code Review** - Automatically analyzes your git changes

- Security vulnerability detection
- HIPAA compliance checking
- Best practices enforcement
- Healthcare-focused analysis

🔒 **Security Scanner** - Find vulnerabilities and compliance issues

- HIPAA/SOX compliance validation
- Security vulnerability detection
- Industry-standard reporting

📋 **Spec Coverage Analyzer** - Analyze test coverage and suggest missing scenarios

- Function parameter combination analysis
- Missing test scenario detection
- Coverage gap identification
- Test template generation

## Installation

### Option 1: From Source (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/your-username/member-agent.git
cd member-agent

# Quick install script
./install.sh
```

**Manual installation:**

```bash
# Clone and navigate
git clone https://github.com/your-username/member-agent.git
cd member-agent

# Install dependencies and build
npm install
npm run build

# Install globally
npm install -g .
```

### Option 2: From npm (Coming Soon)

```bash
npm install -g teladoc-member-agents
```

## Quick Start

1. **Set up your AI provider:**
   ```bash
   # For Anthropic (Claude)
   teladoc-agent config --set provider anthropic --value claude-3-5-sonnet-20241022
   teladoc-agent config --set apiKey --value YOUR_ANTHROPIC_API_KEY

   # For OpenAI (GPT-4, etc.)
   teladoc-agent config --set provider openai --value gpt-4
   teladoc-agent config --set apiKey --value YOUR_OPENAI_API_KEY
   ```

2. **Review your code changes:**
   ```bash
   teladoc-agent review --changes
   ```

3. **Scan for security issues:**
   ```bash
   teladoc-agent security
   ```

4. **Analyze spec coverage:**
   ```bash
   teladoc-agent spec-coverage
   ```

## Commands

### Code Review

```bash
# Smart review - analyzes your git changes automatically
teladoc-agent review --changes

# Review specific file
teladoc-agent review -f path/to/file.js

# Output to markdown file
teladoc-agent review --changes --format markdown -o review.md
```

### Security Scanning

```bash
# Scan current directory
teladoc-agent security

# Scan specific file or directory
teladoc-agent security -f path/to/scan

# Output to JSON file
teladoc-agent security --format json -o security.json
```

### Configuration

```bash
# Show current config
teladoc-agent config --list

# Set API provider and key
teladoc-agent config --set provider --value anthropic
teladoc-agent config --set apiKey --value your-api-key

# Reset to defaults
teladoc-agent config --reset
```

### Spec Coverage Analysis

```bash
# Analyze current directory for spec coverage
teladoc-agent spec-coverage

# Analyze specific file or directory
teladoc-agent spec-coverage -f src/utils.ts

# Output detailed analysis to markdown
teladoc-agent spec-coverage --format markdown -o coverage-report.md

# Skip parameter combination analysis (faster)
teladoc-agent spec-coverage --skip-combinations

# Focus only on missing scenarios
teladoc-agent spec-coverage --skip-suggestions
```

## Examples

**Review your current changes:**

```bash
# Make some code changes, then:
teladoc-agent review --changes
```

**Security scan with healthcare focus:**

```bash
teladoc-agent security -f ./src
```

**Generate reports:**

```bash
teladoc-agent review --changes --format markdown -o code-review.md
teladoc-agent security --format json -o security-report.json
teladoc-agent spec-coverage --format markdown -o coverage-analysis.md
```

## Requirements

- Node.js 18+
- Git repository (for smart change detection)
- API key from OpenAI (GPT-4, etc.) or Anthropic (Claude)

## Features

🔍 **Smart Code Review** - Automatically analyzes your git changes
   - Security vulnerability detection
   - HIPAA compliance checking
   - Best practices enforcement
   - Healthcare-focused analysis

🔒 **Security Scanner** - Find vulnerabilities and compliance issues
   - HIPAA/SOX compliance validation
   - Security vulnerability detection
   - Industry-standard reporting

📋 **Spec Coverage Analyzer** - Analyze test coverage and suggest missing scenarios
   - Function parameter combination analysis
   - Missing test scenario detection
   - Coverage gap identification
   - Test template generation

🤖 **AI Provider Support**
   - Supports both Anthropic (Claude) and OpenAI (GPT-4, etc.)
   - Easily switch providers via configuration
