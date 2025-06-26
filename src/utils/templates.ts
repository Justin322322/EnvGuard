import { writeFileSync, existsSync } from 'fs';
import { EnvSchema } from '../types';

/**
 * Template generators for EnvGuard configuration files
 */

/**
 * Create schema template file
 */
export async function createSchemaTemplate(filename = 'envguard.schema.json'): Promise<void> {
  if (existsSync(filename)) {
    throw new Error(`File ${filename} already exists`);
  }

  const schema: EnvSchema = {
    variables: {
      NODE_ENV: {
        required: true,
        type: 'string',
        description: 'Node.js environment',
        example: 'development',
        allowEmpty: false,
      },
      PORT: {
        required: false,
        type: 'number',
        description: 'Server port number',
        example: '3000',
        allowEmpty: false,
      },
      DATABASE_URL: {
        required: true,
        type: 'url',
        description: 'Database connection URL',
        example: 'postgresql://user:password@localhost:5432/dbname',
        allowEmpty: false,
      },
      JWT_SECRET: {
        required: true,
        type: 'string',
        description: 'JWT signing secret',
        example: 'your-super-secret-jwt-key',
        allowEmpty: false,
      },
      API_KEY: {
        required: false,
        type: 'string',
        description: 'External API key',
        example: 'your-api-key-here',
        allowEmpty: true,
      },
      DEBUG: {
        required: false,
        type: 'boolean',
        description: 'Enable debug mode',
        example: 'false',
        allowEmpty: true,
      },
    },
    rules: [
      {
        name: 'no-empty-secrets',
        description: 'Secret variables cannot be empty',
        severity: 'error',
        pattern: /(secret|key|token|password).*=\s*$/i,
      },
      {
        name: 'production-check',
        description: 'Production environment should not have debug enabled',
        severity: 'warning',
        customValidator: (_value: string) => {
          // This would be implemented in the actual validator
          return true;
        },
      },
    ],
    securityRules: [
      {
        name: 'weak-jwt-secret',
        description: 'JWT secret appears to be weak',
        pattern: /jwt[_-]?secret.*=.*(secret|jwt|token|key|test|dev)$/i,
        severity: 'error',
        suggestion: 'Use a strong, randomly generated JWT secret',
      },
    ],
    ignorePatterns: [
      '^_.*',
      '.*_TEST$',
      '.*_DEBUG$',
    ],
  };

  const content = JSON.stringify(schema, null, 2);
  writeFileSync(filename, content, 'utf-8');
}

/**
 * Create config template file
 */
export async function createConfigTemplate(filename = 'envguard.config.json'): Promise<void> {
  if (existsSync(filename)) {
    throw new Error(`File ${filename} already exists`);
  }

  const config = {
    envFile: '.env',
    schemaFile: 'envguard.schema.json',
    exampleFile: '.env.example',
    outputFormat: 'text',
    strict: false,
    verbose: false,
    exitOnError: true,
    ignorePatterns: [
      '^_.*',
      '.*_TEST$',
      '.*_DEBUG$',
    ],
    customRules: [
      {
        name: 'no-localhost-in-prod',
        description: 'Localhost URLs should not be used in production',
        severity: 'warning',
        pattern: 'localhost|127\\.0\\.0\\.1',
      },
    ],
    securityRules: [
      {
        name: 'no-hardcoded-passwords',
        description: 'Hardcoded passwords detected',
        severity: 'error',
        pattern: 'password.*=.*(admin|password|123456)',
        suggestion: 'Use environment-specific secure passwords',
      },
    ],
  };

  const content = JSON.stringify(config, null, 2);
  writeFileSync(filename, content, 'utf-8');
}

/**
 * Create .env.example template
 */
export async function createExampleTemplate(filename = '.env.example'): Promise<void> {
  if (existsSync(filename)) {
    throw new Error(`File ${filename} already exists`);
  }

  const content = `# Environment Configuration Template
# Copy this file to .env and fill in your actual values

# Application Environment
NODE_ENV=development

# Server Configuration
PORT=3000
HOST=localhost

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
DATABASE_POOL_SIZE=10

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# External APIs
API_KEY=your-api-key-here
EXTERNAL_SERVICE_URL=https://api.example.com

# Feature Flags
ENABLE_FEATURE_X=false
DEBUG=false

# Email Configuration (optional)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password

# Redis Configuration (optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
`;

  writeFileSync(filename, content, 'utf-8');
}

/**
 * Create GitHub Actions workflow template
 */
export async function createGitHubWorkflowTemplate(filename = '.github/workflows/envguard.yml'): Promise<void> {
  const content = `name: Environment Validation

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  validate-env:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install EnvGuard
      run: npm install -g envguard
    
    - name: Validate Environment Files
      run: |
        # Validate main environment file
        envguard validate --env-file .env.example --format junit > envguard-results.xml
        
        # Check for security issues
        envguard validate --env-file .env.example --strict
    
    - name: Upload Results
      uses: actions/upload-artifact@v3
      if: always()
      with:
        name: envguard-results
        path: envguard-results.xml
`;

  // Create directory if it doesn't exist
  const fs = await import('fs');
  const path = await import('path');
  
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  writeFileSync(filename, content, 'utf-8');
}

/**
 * Create pre-commit hook template
 */
export async function createPreCommitHookTemplate(filename = '.git/hooks/pre-commit'): Promise<void> {
  const content = `#!/bin/sh
# EnvGuard pre-commit hook

echo "Running EnvGuard validation..."

# Check if .env file exists and validate it
if [ -f ".env" ]; then
    npx envguard check --env-file .env
    if [ $? -ne 0 ]; then
        echo "❌ Environment validation failed!"
        echo "Please fix the issues above before committing."
        exit 1
    fi
fi

# Validate .env.example if it exists
if [ -f ".env.example" ]; then
    npx envguard validate --env-file .env.example --format text
    if [ $? -ne 0 ]; then
        echo "❌ .env.example validation failed!"
        echo "Please fix the issues above before committing."
        exit 1
    fi
fi

echo "✅ Environment validation passed!"
`;

  writeFileSync(filename, content, 'utf-8');
  
  // Make the hook executable
  const fs = await import('fs');
  fs.chmodSync(filename, '755');
}
