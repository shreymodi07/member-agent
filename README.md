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

## Installation

```bash
npm install -g teladoc-member-agents
```

## Quick Start

1. **Set up your AI provider:**
   ```bash
   teladoc-agent config --set provider anthropic --value claude-3-5-sonnet-20241022
   teladoc-agent config --set apiKey --value your-api-key
   ```

2. **Review your code changes:**
   ```bash
   teladoc-agent review --changes
   ```

3. **Scan for security issues:**
   ```bash
   teladoc-agent security
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
```

## Requirements

- Node.js 18+
- Git repository (for smart change detection)
- API key from OpenAI or Anthropic

## License

MIT
