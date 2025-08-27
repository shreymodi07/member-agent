# 🚀 Getting Started with Teladoc Member Agents

## Quick Start Guide for New Users

### Step 1: Installation

**Option A: Install from npm (when published)**
```bash
npm install -g @teladoc/member-agents
```

**Option B: Install from source (current)**
```bash
# Clone the repository
git clone <repository-url>
cd member-agent

# Install dependencies
npm install

# Build the project
npm run build

# Link for global use (optional)
npm link
```

### Step 2: First-Time Setup

Run the interactive configuration:
```bash
teladoc-agent config
```

This will walk you through:
- Setting up your AI provider (OpenAI or Anthropic)
- Configuring your API key
- Setting project defaults

**Manual Configuration:**
```bash
# Set API key
teladoc-agent config --set apiKey --value your-api-key-here

# Set provider
teladoc-agent config --set provider --value anthropic

# Set model
teladoc-agent config --set model --value claude-3-sonnet
```

### Step 3: Your First Code Review

**The Smart Way (Recommended):**
```bash
# Navigate to your project directory
cd /path/to/your/project

# Make some changes to your code
# Then run this - it automatically detects what changed!
teladoc-agent review
```

**Manual File Review:**
```bash
# Review a specific file
teladoc-agent review --file src/auth.js

# Review an entire directory
teladoc-agent review --file src/
```

### Step 4: Generate Your First Specification

```bash
# Generate an API specification
teladoc-agent spec --file src/api/ --type api

# Generate a feature specification
teladoc-agent spec --file src/patient-portal/ --type feature

# Generate component documentation
teladoc-agent spec --file src/components/PatientCard.jsx --type component
```

### Step 5: Security Scanning

```bash
# Full security scan with HIPAA compliance
teladoc-agent security --file src/ --standard hipaa

# Quick secret scan
teladoc-agent security --file . --scan secrets

# Generate SARIF report for CI/CD
teladoc-agent security --file src/ --format sarif --output security-report.sarif
```

## Daily Workflow Examples

### Pre-Commit Code Review
```bash
# After making changes, before committing:
cd your-project
teladoc-agent review --changes
git add .
git commit -m "Your commit message"
```

### Feature Development Workflow
```bash
# 1. Write your feature code
# 2. Generate specification
teladoc-agent spec --file src/new-feature/ --type feature

# 3. Review your code
teladoc-agent review

# 4. Security check
teladoc-agent security --file src/new-feature/ --standard hipaa

# 5. Commit with confidence!
```

### Weekly Security Audit
```bash
# Full project security scan
teladoc-agent security --file . --standard hipaa --format markdown --output weekly-security-report.md
```

## Understanding Output Formats

### Code Review Formats
- **Console**: Immediate feedback in terminal
- **Markdown**: Human-readable report file
- **JSON**: Machine-readable for integrations

```bash
# Console output (default)
teladoc-agent review --file src/

# Save as markdown report
teladoc-agent review --file src/ --format markdown --output review-report.md

# JSON for automation
teladoc-agent review --file src/ --format json --output review-data.json
```

### Security Report Formats
- **Console**: Quick overview
- **JSON**: Detailed structured data
- **SARIF**: Industry standard for CI/CD

```bash
# SARIF for GitHub integration
teladoc-agent security --file src/ --format sarif --output security.sarif
```

## Environment Variables (Alternative Setup)

Instead of using the config command, you can set environment variables:

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export ANTHROPIC_API_KEY="your-anthropic-key-here"
# OR
export OPENAI_API_KEY="your-openai-key-here"

# Then just use the tool without configuration
teladoc-agent review
```

## Common Use Cases

### 1. **Before Code Reviews** 
Run your own AI review first to catch issues before human reviewers see them.

### 2. **Compliance Checking**
Ensure your code meets HIPAA, SOX, or other healthcare standards.

### 3. **Documentation Generation**
Automatically create specs from existing code.

### 4. **Security Auditing**
Regular vulnerability and secret scanning.

### 5. **Learning Tool**
See best practices and security recommendations as you code.

## Tips for Best Results

### 🎯 **For Better Code Reviews:**
- Make small, focused changes
- Use descriptive git commit messages
- Review changes before committing

### 🔒 **For Security Scanning:**
- Run regularly, not just before releases
- Pay attention to critical and high severity issues
- Use SARIF format for automated CI/CD integration

### 📝 **For Specification Generation:**
- Add comments to your code explaining business logic
- Use clear function and variable names
- Structure your code logically

## Troubleshooting

### "API key not found"
```bash
# Check current config
teladoc-agent config --list

# Set API key
teladoc-agent config --set apiKey --value your-key-here
```

### "No changes detected"
```bash
# Make sure you're in a git repository
git status

# Or specify files manually
teladoc-agent review --file src/
```

### "Permission denied"
```bash
# Install globally with proper permissions
sudo npm install -g @teladoc/member-agents

# Or use npx without global install
npx @teladoc/member-agents review
```

## Integration Examples

### VS Code Integration
Add to your VS Code tasks.json:
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Teladoc Code Review",
      "type": "shell",
      "command": "teladoc-agent review --changes",
      "group": "test"
    }
  ]
}
```

### Git Hooks
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
teladoc-agent review --changes --severity high
teladoc-agent security --file . --scan secrets
```

### CI/CD Pipeline (GitHub Actions)
```yaml
- name: Security Scan
  run: teladoc-agent security --file . --format sarif --output security.sarif
  
- name: Upload Security Results
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: security.sarif
```

## Next Steps

1. **Try it out** on a small project first
2. **Integrate** into your daily workflow
3. **Customize** with your own templates and rules
4. **Share** with your team
5. **Contribute** improvements back to the project

## Getting Help

- Run `teladoc-agent --help` for command overview
- Run `teladoc-agent <command> --help` for specific command help
- Check the README.md for detailed documentation
- Contact the member team for support

**Happy coding with AI assistance! 🤖✨**
