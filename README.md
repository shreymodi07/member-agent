# Teladoc Member Agents

AI-powered code review and security scanning for development teams.

## Features

🔍 **Smart Code Review** - Automatically analyzes your git changes

- Security vulnerability detection
- Code quality analysis
- Best practices enforcement
- Performance optimization suggestions
- **NEW:** QA testing guidance with actionable recommendations

🔒 **Security Scanner** - Find vulnerabilities and compliance issues

- Security vulnerability detection
- Code security analysis
- Best practices validation
- **NEW:** Git diff scanning for efficient change-focused analysis
- **NEW:** QA testing guidance with security-focused recommendations

📋 **Spec Coverage Analyzer** - Analyze test coverage and suggest missing scenarios

- Function parameter combination analysis
- Missing test scenario detection
- Coverage gap identification
- Test template generation
- **NEW:** QA testing guidance for comprehensive test validation

🧪 **QA Test Generator** - Generate focused testing instructions for code changes

- Simple 1-2 line testing instructions in plain English
- Non-technical explanations for QA teams
- Git diff integration for efficient analysis

🤖 **AI Provider Support**

- Supports both Anthropic (Claude) and OpenAI (GPT-4, etc.)
- Easily switch providers via configuration

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
   # Or analyze only changed files:
   teladoc-agent spec-coverage --diff
   ```

5. **Generate QA testing instructions:**

   ```bash
   teladoc-agent qa-test --diff
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

# Scan only files changed in git diff (recommended for efficiency)
teladoc-agent security --diff

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

# Analyze only files changed in git diff (recommended for efficiency)
teladoc-agent spec-coverage --diff

# Output detailed analysis to markdown
teladoc-agent spec-coverage --format markdown -o coverage-report.md

# Skip parameter combination analysis (faster)
teladoc-agent spec-coverage --skip-combinations

# Focus only on missing scenarios
teladoc-agent spec-coverage --skip-suggestions
```

### QA Testing Instructions

```bash
# Generate QA testing instructions for current directory
teladoc-agent qa-test

# Generate QA testing instructions for git diff changes
teladoc-agent qa-test --diff

# Analyze specific file for QA testing needs
teladoc-agent qa-test -f src/components/Button.ts

# Output QA analysis to JSON file
teladoc-agent qa-test --diff --format json -o qa-analysis.json
```

## Examples

**Review your current changes:**

```bash
# Make some code changes, then:
teladoc-agent review --changes
```

**Security scan your codebase:**

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
