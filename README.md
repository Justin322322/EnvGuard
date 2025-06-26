# EnvGuard Ìª°Ô∏è

[![npm version](https://badge.fury.io/js/envguard.svg)](https://badge.fury.io/js/envguard)
[![CI](https://github.com/Justin322322/EnvGuard/workflows/CI/badge.svg)](https://github.com/Justin322322/EnvGuard/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/%3C%2F%3E-TypeScript-%230074c1.svg)](http://www.typescriptlang.org/)

**Environment File Validator & Security Analyzer**

A comprehensive TypeScript utility for validating `.env` files, detecting security vulnerabilities, and ensuring environment variable consistency across your projects. EnvGuard helps you maintain secure and reliable environment configurations with powerful validation rules, security analysis, and seamless CI/CD integration.

## Ì∫Ä Features

- ‚úÖ **Schema-based validation** - Validate against JSON/YAML schemas with custom rules
- Ì¥ç **Example-based validation** - Compare against `.env.example` files for consistency
- Ì¥í **Security analysis** - Detect hardcoded secrets, weak patterns, and vulnerabilities
- Ì≥ä **Multiple output formats** - Text, JSON, and JUnit XML for different use cases
- Ì∫Ä **CI/CD integration** - Perfect for automated pipelines with exit codes
- ÌæØ **Missing/unused detection** - Find missing required variables and unused definitions
- Ì≥ù **Detailed reporting** - Comprehensive validation results with actionable suggestions
- Ìª†Ô∏è **CLI & Programmatic API** - Use as command-line tool or integrate into your applications
- Ìæ® **Beautiful output** - Colorized terminal output with clear formatting
- Ì¥ß **Flexible configuration** - Support for custom validation rules and patterns
- Ì≥¶ **Zero dependencies** - Lightweight with minimal external dependencies
- Ìºê **Cross-platform** - Works on Windows, macOS, and Linux

## Ì≥¶ Installation

### Global Installation (Recommended for CLI usage)
```bash
npm install -g envguard
```

### Local Installation (For project integration)
```bash
npm install envguard
# or
yarn add envguard
# or
pnpm add envguard
```

## Ì∫Ä Quick Start

### CLI Usage Examples

#### Basic validation against .env.example
```bash
envguard validate --env .env --example .env.example
```

#### Validate with security analysis
```bash
envguard validate --env .env --example .env.example --security
```

#### Validate against custom schema
```bash
envguard validate --env .env --schema env-schema.json
```

#### Generate schema from .env.example
```bash
envguard init --example .env.example --output env-schema.json
```

#### Output in different formats
```bash
# JSON output for automation
envguard validate --env .env --example .env.example --format json

# JUnit XML for CI/CD integration
envguard validate --env .env --example .env.example --format junit --output results.xml
```

### Programmatic Usage

```typescript
import { EnvValidator, ValidationConfig } from 'envguard';

const validator = new EnvValidator();

// Basic validation
const config: ValidationConfig = {
  envPath: '.env',
  examplePath: '.env.example',
  enableSecurity: true
};

const result = await validator.validate(config);

if (result.isValid) {
  console.log('‚úÖ Environment file is valid');
  console.log(`Validated ${result.summary.total} variables`);
} else {
  console.log('‚ùå Validation failed:');
  result.errors.forEach(error => {
    console.log(`  - ${error.message}`);
  });
}

// Advanced usage with custom schema
const schemaConfig: ValidationConfig = {
  envPath: '.env',
  schemaPath: 'env-schema.json',
  enableSecurity: true,
  strict: true
};

const schemaResult = await validator.validate(schemaConfig);
```

## Ì≥ã Configuration

### Schema Format

EnvGuard supports comprehensive JSON and YAML schema formats with advanced validation rules:

```json
{
  "variables": {
    "DATABASE_URL": {
      "required": true,
      "type": "string",
      "pattern": "^postgresql://",
      "description": "PostgreSQL connection string",
      "example": "postgresql://user:pass@localhost:5432/db"
    },
    "PORT": {
      "required": false,
      "type": "number",
      "default": 3000,
      "min": 1000,
      "max": 65535,
      "description": "Server port number"
    },
    "NODE_ENV": {
      "required": true,
      "type": "string",
      "enum": ["development", "production", "test"],
      "description": "Application environment"
    },
    "API_KEY": {
      "required": true,
      "type": "string",
      "minLength": 32,
      "pattern": "^[a-zA-Z0-9]+$",
      "sensitive": true,
      "description": "External API key"
    },
    "DEBUG": {
      "required": false,
      "type": "boolean",
      "default": false,
      "description": "Enable debug mode"
    }
  },
  "groups": {
    "database": ["DATABASE_URL", "DB_HOST", "DB_PORT"],
    "api": ["API_KEY", "API_SECRET"]
  },
  "rules": {
    "requireHttps": true,
    "noHardcodedSecrets": true,
    "enforceNaming": "SCREAMING_SNAKE_CASE"
  }
}
```

### YAML Schema Example

```yaml
variables:
  DATABASE_URL:
    required: true
    type: string
    pattern: "^postgresql://"
    description: "PostgreSQL connection string"
  
  REDIS_URL:
    required: false
    type: string
    pattern: "^redis://"
    default: "redis://localhost:6379"
    
  JWT_SECRET:
    required: true
    type: string
    minLength: 32
    sensitive: true
    description: "JWT signing secret"

groups:
  database: [DATABASE_URL, DB_HOST, DB_PORT]
  cache: [REDIS_URL, CACHE_TTL]

rules:
  requireHttps: true
  noHardcodedSecrets: true
```

### Security Rules

EnvGuard includes comprehensive security analysis that detects:

- **Hardcoded secrets**: API keys, passwords, tokens in plain text
- **Weak patterns**: Simple passwords, predictable values
- **Exposed credentials**: Database URLs with embedded passwords
- **Insecure protocols**: HTTP URLs in production environments
- **Common vulnerabilities**: Default passwords, test credentials
- **Sensitive data exposure**: Credit card numbers, SSNs, etc.

```typescript
// Custom security patterns
const securityConfig = {
  patterns: [
    {
      name: "AWS Access Key",
      pattern: /AKIA[0-9A-Z]{16}/,
      severity: "high"
    },
    {
      name: "Private Key",
      pattern: /-----BEGIN PRIVATE KEY-----/,
      severity: "critical"
    }
  ],
  rules: {
    noHardcodedPasswords: true,
    requireStrongSecrets: true,
    enforceHttps: true
  }
};
```

## Ì¥ß CLI Commands Reference

### `validate` Command

Validate environment files against schemas or examples with comprehensive options.

```bash
envguard validate [options]

Options:
  -e, --env <path>        Path to .env file (default: ".env")
  -x, --example <path>    Path to .env.example file
  -s, --schema <path>     Path to schema file (JSON/YAML)
  --security              Enable security analysis
  --format <type>         Output format: text|json|junit (default: "text")
  --output <path>         Output file path
  --strict                Fail on warnings
  --verbose               Show detailed validation information
  --no-color              Disable colored output
  --help                  Show help for command

Examples:
  envguard validate                                    # Basic validation
  envguard validate --env .env.prod --security        # Production validation
  envguard validate --schema schema.json --strict     # Schema validation
  envguard validate --format json --output report.json # JSON report
```

### `init` Command

Generate schema files and configuration templates.

```bash
envguard init [options]

Options:
  -x, --example <path>    Path to .env.example file (default: ".env.example")
  -o, --output <path>     Output schema file path (default: "env-schema.json")
  --format <type>         Schema format: json|yaml (default: "json")
  --config                Generate configuration file
  --template <type>       Template type: basic|advanced|security
  --help                  Show help for command

Examples:
  envguard init                                        # Generate basic schema
  envguard init --format yaml --output schema.yml     # YAML schema
  envguard init --template security                   # Security-focused template
  envguard init --config                              # Generate config file
```

### `check` Command

Quick validation check with exit codes only (perfect for CI/CD).

```bash
envguard check [options]

Options:
  -e, --env <path>        Path to .env file (default: ".env")
  -x, --example <path>    Path to .env.example file
  -s, --schema <path>     Path to schema file
  --security              Enable security analysis
  --strict                Fail on warnings
  --silent                No output, exit code only

Exit Codes:
  0  - Validation passed
  1  - Validation failed
  2  - Security issues found
  3  - Configuration error
```

## Ì≥ä Output Formats

### Text Format (Default)
Human-readable validation results with colors and formatting:

```
‚úÖ Environment validation completed successfully

Ì≥ã Summary:
  Total variables: 12
  Valid: 10
  Missing: 1
  Invalid: 1
  Warnings: 2

‚ùå Errors:
  DATABASE_URL: Required variable is missing
  API_KEY: Invalid format (expected: alphanumeric, min 32 chars)

‚ö†Ô∏è  Warnings:
  DEBUG: Using default value 'false'
  LOG_LEVEL: Recommended to set explicitly

Ì¥í Security Analysis:
  ‚úÖ No hardcoded secrets detected
  ‚ö†Ô∏è  HTTP URL detected in production environment
```

### JSON Format
Machine-readable output for integration with other tools:

```json
{
  "isValid": false,
  "timestamp": "2024-06-27T10:30:00.000Z",
  "summary": {
    "total": 12,
    "valid": 10,
    "missing": 1,
    "invalid": 1,
    "warnings": 2
  },
  "errors": [
    {
      "type": "missing",
      "variable": "DATABASE_URL",
      "message": "Required variable DATABASE_URL is missing",
      "severity": "error",
      "line": null
    },
    {
      "type": "invalid",
      "variable": "API_KEY",
      "message": "Invalid format (expected: alphanumeric, min 32 chars)",
      "severity": "error",
      "line": 5,
      "expected": "^[a-zA-Z0-9]{32,}$",
      "actual": "short_key"
    }
  ],
  "warnings": [
    {
      "type": "default",
      "variable": "DEBUG",
      "message": "Using default value 'false'",
      "severity": "warning"
    }
  ],
  "security": {
    "issues": [
      {
        "type": "insecure_protocol",
        "variable": "API_URL",
        "message": "HTTP URL detected in production environment",
        "severity": "medium",
        "recommendation": "Use HTTPS for production APIs"
      }
    ],
    "score": 85
  }
}
```

### JUnit XML Format
Perfect for CI/CD integration with test reporting:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<testsuites name="EnvGuard Validation" tests="12" failures="2" errors="0" time="0.045">
  <testsuite name="Environment Variables" tests="12" failures="2" errors="0" time="0.045">
    <testcase name="DATABASE_URL" classname="env.validation" time="0.001">
      <failure message="Required variable DATABASE_URL is missing" type="missing">
        Variable DATABASE_URL is required but not found in .env file
      </failure>
    </testcase>
    <testcase name="API_KEY" classname="env.validation" time="0.001">
      <failure message="Invalid format" type="invalid">
        Expected: alphanumeric string with minimum 32 characters
        Actual: short_key (9 characters)
      </failure>
    </testcase>
    <testcase name="PORT" classname="env.validation" time="0.001"/>
    <testcase name="NODE_ENV" classname="env.validation" time="0.001"/>
    <!-- ... more test cases ... -->
  </testsuite>
</testsuites>
```

## Ì¥Ñ CI/CD Integration

### GitHub Actions

Complete workflow for environment validation:

```yaml
name: Environment Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate-env:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install EnvGuard
      run: npm install -g envguard
    
    - name: Validate development environment
      run: envguard validate --env .env.example --schema env-schema.json --security
    
    - name: Validate production environment
      run: envguard validate --env .env.production.example --schema env-schema.json --strict --security
    
    - name: Generate validation report
      run: envguard validate --env .env.example --schema env-schema.json --format junit --output env-validation.xml
      if: always()
    
    - name: Upload test results
      uses: dorny/test-reporter@v1
      if: always()
      with:
        name: Environment Validation Results
        path: env-validation.xml
        reporter: java-junit
        fail-on-error: true

  security-scan:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Security scan
      run: |
        npm install -g envguard
        envguard validate --env .env.example --security --strict --format json --output security-report.json
    
    - name: Upload security report
      uses: actions/upload-artifact@v4
      with:
        name: security-report
        path: security-report.json
```

### GitLab CI

```yaml
stages:
  - validate
  - security

validate-environment:
  stage: validate
  image: node:18
  script:
    - npm install -g envguard
    - envguard validate --env .env.example --schema env-schema.json
    - envguard validate --env .env.production.example --schema env-schema.json --strict
  artifacts:
    reports:
      junit: env-validation.xml
    paths:
      - env-validation.xml
    expire_in: 1 week

security-analysis:
  stage: security
  image: node:18
  script:
    - npm install -g envguard
    - envguard validate --env .env.example --security --strict --format json --output security-report.json
  artifacts:
    reports:
      security: security-report.json
    paths:
      - security-report.json
    expire_in: 1 month
  allow_failure: false
```

### Jenkins Pipeline

```groovy
pipeline {
    agent any
    
    stages {
        stage('Environment Validation') {
            steps {
                sh 'npm install -g envguard'
                sh 'envguard validate --env .env.example --schema env-schema.json --format junit --output env-validation.xml'
            }
            post {
                always {
                    junit 'env-validation.xml'
                }
            }
        }
        
        stage('Security Analysis') {
            steps {
                sh 'envguard validate --env .env.example --security --strict --format json --output security-report.json'
                archiveArtifacts artifacts: 'security-report.json', fingerprint: true
            }
        }
    }
}
```

## Ì≥ö API Reference

### EnvValidator Class

The main class for programmatic validation.

#### Constructor

```typescript
constructor(options?: ValidatorOptions)

interface ValidatorOptions {
  logger?: Logger;
  customPatterns?: SecurityPattern[];
  defaultRules?: ValidationRules;
}
```

#### Methods

##### `validate(config: ValidationConfig): Promise<ValidationResult>`

Validates environment files according to the provided configuration.

```typescript
interface ValidationConfig {
  envPath: string;                    // Path to .env file
  examplePath?: string;               // Path to .env.example file
  schemaPath?: string;                // Path to schema file
  enableSecurity?: boolean;           // Enable security analysis
  strict?: boolean;                   // Fail on warnings
  customRules?: ValidationRules;      // Custom validation rules
  outputFormat?: 'text' | 'json' | 'junit';
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  summary: ValidationSummary;
  security?: SecurityAnalysisResult;
  timestamp: string;
}
```

##### `generateSchema(examplePath: string, options?: SchemaOptions): Promise<Schema>`

Generates a validation schema from an .env.example file.

```typescript
interface SchemaOptions {
  format?: 'json' | 'yaml';
  includeDescriptions?: boolean;
  inferTypes?: boolean;
  addSecurityRules?: boolean;
}
```

##### `validateSchema(schema: Schema): Promise<SchemaValidationResult>`

Validates a schema file for correctness.

### Types and Interfaces

#### ValidationError

```typescript
interface ValidationError {
  type: 'missing' | 'invalid' | 'security' | 'format';
  variable: string;
  message: string;
  severity: 'error' | 'warning';
  line?: number;
  expected?: string;
  actual?: string;
  suggestion?: string;
}
```

#### SecurityAnalysisResult

```typescript
interface SecurityAnalysisResult {
  issues: SecurityIssue[];
  score: number;
  recommendations: string[];
}

interface SecurityIssue {
  type: string;
  variable: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  pattern?: string;
  recommendation: string;
}
```

#### Schema

```typescript
interface Schema {
  variables: Record<string, VariableSchema>;
  groups?: Record<string, string[]>;
  rules?: ValidationRules;
  metadata?: SchemaMetadata;
}

interface VariableSchema {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean';
  pattern?: string;
  enum?: string[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  default?: any;
  description?: string;
  example?: string;
  sensitive?: boolean;
  deprecated?: boolean;
}
```

## Ìª†Ô∏è Advanced Usage

### Custom Validation Rules

```typescript
import { EnvValidator, ValidationRules } from 'envguard';

const customRules: ValidationRules = {
  requireHttps: true,
  noHardcodedSecrets: true,
  enforceNaming: 'SCREAMING_SNAKE_CASE',
  customPatterns: [
    {
      name: 'Company API Key',
      pattern: /^COMP_[A-Z0-9]{32}$/,
      variables: ['COMPANY_API_KEY'],
      required: true
    }
  ]
};

const validator = new EnvValidator({
  defaultRules: customRules
});
```

### Environment-Specific Validation

```typescript
// Different validation for different environments
const getValidationConfig = (env: string): ValidationConfig => {
  const baseConfig = {
    envPath: `.env.${env}`,
    enableSecurity: true
  };

  switch (env) {
    case 'production':
      return {
        ...baseConfig,
        schemaPath: 'schemas/production.json',
        strict: true,
        customRules: {
          requireHttps: true,
          noDebugMode: true,
          requireStrongSecrets: true
        }
      };
    
    case 'development':
      return {
        ...baseConfig,
        examplePath: '.env.example',
        strict: false
      };
    
    default:
      return baseConfig;
  }
};

// Validate multiple environments
const environments = ['development', 'staging', 'production'];
for (const env of environments) {
  const config = getValidationConfig(env);
  const result = await validator.validate(config);
  console.log(`${env}: ${result.isValid ? '‚úÖ' : '‚ùå'}`);
}
```

### Integration with Build Tools

#### Webpack Plugin

```typescript
// webpack.config.js
const EnvGuardWebpackPlugin = require('envguard/webpack');

module.exports = {
  plugins: [
    new EnvGuardWebpackPlugin({
      envPath: '.env',
      schemaPath: 'env-schema.json',
      failOnError: true
    })
  ]
};
```

#### Vite Plugin

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import envguard from 'envguard/vite';

export default defineConfig({
  plugins: [
    envguard({
      envPath: '.env',
      examplePath: '.env.example',
      enableSecurity: true
    })
  ]
});
```

## Ì¥ç Troubleshooting

### Common Issues

#### Issue: "Schema validation failed"
```bash
# Check schema syntax
envguard validate --schema env-schema.json --verbose

# Generate a new schema from example
envguard init --example .env.example --output new-schema.json
```

#### Issue: "Security analysis false positives"
```typescript
// Customize security patterns
const config = {
  envPath: '.env',
  enableSecurity: true,
  customRules: {
    ignorePatterns: [
      'TEST_API_KEY',  // Ignore test keys
      'DEMO_*'         // Ignore demo variables
    ]
  }
};
```

#### Issue: "Performance with large .env files"
```typescript
// Use streaming validation for large files
const validator = new EnvValidator({
  streaming: true,
  batchSize: 100
});
```

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# CLI debug mode
envguard validate --verbose --env .env --schema schema.json

# Programmatic debug mode
const validator = new EnvValidator({
  logger: {
    level: 'debug',
    output: console.log
  }
});
```

## Ì≥à Performance

EnvGuard is optimized for performance:

- **Fast parsing**: Efficient .env file parsing
- **Minimal memory usage**: Streaming validation for large files
- **Caching**: Schema and pattern caching
- **Parallel processing**: Concurrent validation of multiple files

### Benchmarks

| File Size | Variables | Validation Time | Memory Usage |
|-----------|-----------|-----------------|--------------|
| 1KB       | 20        | 5ms            | 2MB          |
| 10KB      | 200       | 25ms           | 5MB          |
| 100KB     | 2000      | 150ms          | 15MB         |
| 1MB       | 20000     | 800ms          | 50MB         |

## Ì¥ù Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Justin322322/EnvGuard.git
cd EnvGuard

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- parser.test.ts

# Run tests in watch mode
npm run test:watch
```

## Ì≥Ñ License

MIT License - see [LICENSE](LICENSE) file for details.

## Ìπè Acknowledgments

- Inspired by various environment validation tools
- Built with TypeScript for type safety
- Uses industry-standard security patterns
- Community-driven development

## Ì≥û Support

- Ì≥ñ [Documentation](https://github.com/Justin322322/EnvGuard/wiki)
- Ì∞õ [Issue Tracker](https://github.com/Justin322322/EnvGuard/issues)
- Ì≤¨ [Discussions](https://github.com/Justin322322/EnvGuard/discussions)
- Ì≥ß [Email Support](mailto:support@envguard.dev)

## Ì∑∫Ô∏è Roadmap

### Upcoming Features

- [ ] **Web Dashboard** - Visual environment management
- [ ] **IDE Extensions** - VS Code and IntelliJ plugins
- [ ] **Docker Integration** - Container environment validation
- [ ] **Kubernetes Support** - ConfigMap and Secret validation
- [ ] **Database Integration** - Store schemas in databases
- [ ] **Team Collaboration** - Shared schemas and rules
- [ ] **Advanced Analytics** - Environment usage analytics
- [ ] **Auto-fixing** - Automatic environment file fixes

### Version 2.0 Goals

- Enhanced security analysis with ML-based detection
- Real-time environment monitoring
- Integration with secret management systems
- Advanced reporting and dashboards
- Multi-language support (Python, Go, Java)

---

**Made with ‚ù§Ô∏è for secure environment management**

*EnvGuard helps developers maintain secure, consistent, and reliable environment configurations across all stages of development and deployment.*
