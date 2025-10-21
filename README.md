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

🤖 **AI Provider Support (Simplified)**

- Currently streamlined to **Azure OpenAI only** for minimal setup.
- Other providers (OpenAI, Anthropic) are commented out in code and can be re-enabled later.

## Installation

### Option 1: From Source (Recommended for Development)

```bash
# Clone the repository
git clone https://github.com/your-username/member-agent.git
cd member-agent

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

1. **(One-step) Quick Azure setup (just API key):**

   ```bash
   teladoc-agent quick-azure
   ```

   This stores your Azure OpenAI key + opinionated defaults (endpoint, deployment, api version). You can inspect them later:

   ```bash
   teladoc-agent config --list
   ```

   To override any value afterward:

   ```bash
   teladoc-agent config --set azureDeployment --value your-deployment
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

### Configuration (Azure Only)

```bash
# Show current config
teladoc-agent config --list

# Configure Azure OpenAI (provider already fixed to azure-openai)
teladoc-agent config --set provider --value azure-openai
teladoc-agent config --set azureEndpoint --value https://member-agents-resource.cognitiveservices.azure.com
teladoc-agent config --set azureDeployment --value gpt-4.1-mini
teladoc-agent config --set azureApiVersion --value 2025-01-01-preview
teladoc-agent config --set apiKey --value your-azure-api-key

# Reset to defaults
teladoc-agent config --reset
```

#### Environment Variables

You can also set configuration via environment variables:

```bash
# Azure OpenAI
export AZURE_OPENAI_API_KEY=your-azure-key
export AZURE_OPENAI_ENDPOINT=https://member-agents-resource.cognitiveservices.azure.com
export AZURE_OPENAI_DEPLOYMENT=gpt-4.1-mini
export AZURE_OPENAI_API_VERSION=2025-01-01-preview
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

### Rubocop Fixing

Iterative full-project fixing (uses ruby_gardener output):

```bash
teladoc-agent rubocop-fix --path /path/to/ruby/project
```

Fix only issues introduced in your current git diff (avoids churn in untouched legacy code):

```bash
teladoc-agent rubocop-fix-diff
```

Use staged changes only (what you have added with `git add`):

```bash
teladoc-agent rubocop-fix-diff --staged
```

How diff mode works:

1. Collects a zero-context `git diff -U0` (or `--cached`) against HEAD.
2. Maps added/modified line numbers per file.
3. Runs `bundle exec ruby_gardener check` and filters issues to those line numbers only.
4. Attempts AI line edits; on complex structural/metric rules it inserts `# rubocop:disable <Rule>` directly above.
5. Commits initial changes then amends subsequent iterations to keep history clean.

Benefits:

- Enforces “leave the campground cleaner” principle.
- Prevents mass auto-formatting making PR review noisy.
- Keeps focus on newly introduced technical debt.

Tips:

- Stage only the files you want before using `--staged` for more control.
- Re-run after manual adjustments for another iteration.
- Increase iterations with `--max-iterations` if needed (default 5 for diff mode).

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

## Re-enabling Other Providers Later

The codebase has OpenAI & Anthropic logic commented out (see `src/providers/ai-provider.ts` and `src/types/index.ts`). To restore:

1. Uncomment the imports and related branches in `AIProvider`.
2. Restore provider union in `AgentConfig` type.
3. Revert the simplified sections in `config` command where provider selection was reduced.
4. Update this README to re-add multi-provider instructions.

This keeps current onboarding as a single-step Azure experience while preserving an easy path back to multi-provider support.
- API key from OpenAI (GPT-4, etc.) or Anthropic (Claude)
