# Teladoc Member Agents

AI-powered development agents for Teladoc member team providing spec writing, code review, and security compliance assistance.

## Features

🔍 **Spec Writer Agent** - Generate comprehensive technical specifications
- API specifications
- Feature specifications  
- Component specifications
- Healthcare compliance focused

🔍 **Code Review Agent** - AI-powered code review and analysis
- Security vulnerability detection
- Performance optimization suggestions
- HIPAA/SOX compliance checking
- Best practices enforcement

🔒 **Security Compliance Agent** - Security scanning and compliance checking
- Vulnerability scanning
- Secret detection
- HIPAA/SOX/PCI/GDPR compliance
- SARIF report generation

## Installation

```bash
npm install -g @teladoc/member-agents
```

## Quick Start

### 1. Configure the agent

```bash
teladoc-agent config
```

### 2. Generate a specification

```bash
teladoc-agent spec --file ./src/api --type api
```

### 3. Review code

```bash
teladoc-agent review --file ./src --format markdown
```

### 4. Security scan

```bash
teladoc-agent security --file ./src --standard hipaa
```

## Configuration

The agent supports multiple AI providers:

- **OpenAI**: Set `OPENAI_API_KEY` environment variable
- **Anthropic**: Set `ANTHROPIC_API_KEY` environment variable

Configure via interactive setup:
```bash
teladoc-agent config
```

Or manually:
```bash
teladoc-agent config --set provider openai
teladoc-agent config --set model gpt-4
```

## Commands

### Spec Writer

Generate technical specifications from code:

```bash
# Generate API specification
teladoc-agent spec --file ./src/api --type api --output ./docs/api-spec.md

# Generate feature specification
teladoc-agent spec --file ./src/features/patient-portal --type feature

# Generate component specification
teladoc-agent spec --file ./src/components/PatientCard.tsx --type component
```

### Code Review

Perform AI-powered code review:

```bash
# Review specific file
teladoc-agent review --file ./src/auth.ts

# Review entire directory
teladoc-agent review --file ./src --severity high

# Generate markdown report
teladoc-agent review --file ./src --format markdown --output ./reports/review.md

# Generate JSON report
teladoc-agent review --file ./src --format json --output ./reports/review.json
```

### Security Compliance

Scan for security issues and compliance violations:

```bash
# Full security scan
teladoc-agent security --file ./src --standard hipaa

# Scan for secrets only
teladoc-agent security --file ./src --scan secrets

# Generate SARIF report
teladoc-agent security --file ./src --format sarif --output ./reports/security.sarif

# Compliance-specific scans
teladoc-agent security --file ./src --standard sox
teladoc-agent security --file ./src --standard pci
teladoc-agent security --file ./src --standard gdpr
```

### Configuration Management

```bash
# Interactive configuration
teladoc-agent config

# View current configuration
teladoc-agent config --list

# Set specific values
teladoc-agent config --set apiKey your-api-key
teladoc-agent config --set provider anthropic
teladoc-agent config --set model claude-3-sonnet

# Reset to defaults
teladoc-agent config --reset
```

## Healthcare Compliance Features

### HIPAA Compliance
- PHI data handling analysis
- Access control validation
- Audit logging requirements
- Encryption requirement checks

### SOX Compliance
- Financial data integrity
- Change management validation
- Access control verification
- Audit trail analysis

### Security Best Practices
- OWASP Top 10 vulnerability detection
- Authentication/authorization review
- Input validation analysis
- Secure coding pattern enforcement

## Output Formats

### Specifications
- **Markdown**: Human-readable documentation
- **Custom templates**: Use your own specification templates

### Code Reviews
- **Console**: Immediate feedback
- **Markdown**: Comprehensive reports
- **JSON**: Machine-readable format

### Security Reports
- **Console**: Quick overview
- **JSON**: Detailed structured data
- **SARIF**: Industry-standard security format

## Templates

Create custom specification templates:

```bash
mkdir templates
# Create your custom template files
teladoc-agent spec --file ./src --template ./templates/my-api-template.md
```

## Integration

### CI/CD Integration

```yaml
# GitHub Actions example
- name: Security Scan
  run: |
    npx @teladoc/member-agents security --file ./src --format sarif --output security-results.sarif
    
- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v2
  with:
    sarif_file: security-results.sarif
```

### Pre-commit Hooks

```json
{
  "pre-commit": [
    "teladoc-agent review --file ./src --severity high",
    "teladoc-agent security --file ./src --scan secrets"
  ]
}
```

## API Reference

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `provider` | AI provider (openai, anthropic) | openai |
| `model` | AI model to use | gpt-4 |
| `apiKey` | API key for the provider | - |
| `baseUrl` | Custom API base URL | - |
| `defaultLanguage` | Default programming language | typescript |
| `packageManager` | Package manager (npm, yarn, pnpm) | npm |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `TELADOC_AGENT_CONFIG` | Path to config file |

## Troubleshooting

### Common Issues

**API Key Not Found**
```bash
# Set environment variable
export OPENAI_API_KEY=your-key-here

# Or configure via CLI
teladoc-agent config --set apiKey your-key-here
```

**Permission Errors**
```bash
# Install globally with correct permissions
sudo npm install -g @teladoc/member-agents
```

**Large Repository Scanning**
```bash
# Use specific file patterns to limit scope
teladoc-agent review --file "./src/**/*.ts" --severity high
```

## Development

### Building from Source

```bash
git clone https://github.com/teladoc/member-agents
cd member-agents
npm install
npm run build
npm link
```

### Running Tests

```bash
npm test
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- GitHub Issues: https://github.com/teladoc/member-agents/issues
- Internal Slack: #member-team-dev-tools
- Email: member-team@teladoc.com
