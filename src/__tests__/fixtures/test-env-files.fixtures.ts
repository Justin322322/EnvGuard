/**
 * Test fixtures for .env files
 */

export const validEnvFile = `# Application Configuration
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/testdb

# Authentication
JWT_SECRET=super-secret-jwt-key-for-testing
API_KEY=test-api-key-12345

# Feature Flags
DEBUG=true
ENABLE_FEATURE_X=false

# Empty value (should be allowed for some variables)
OPTIONAL_VAR=
`;

export const invalidEnvFile = `# Invalid .env file with syntax errors
NODE_ENV=development
INVALID LINE WITHOUT EQUALS
PORT=3000
=MISSING_KEY
ANOTHER_INVALID_LINE
DATABASE_URL=postgresql://user:password@localhost:5432/testdb
`;

export const envFileWithSecurityIssues = `# Environment file with security issues
NODE_ENV=production
PORT=3000

# Weak secrets
JWT_SECRET=secret
PASSWORD=admin
API_KEY=12345

# Hardcoded credentials
DATABASE_URL=postgresql://admin:password@localhost:5432/proddb
ADMIN_PASSWORD=admin123

# Potential PII
USER_EMAIL=john.doe@example.com
CREDIT_CARD=4111-1111-1111-1111
`;

export const exampleEnvFile = `# Example environment configuration
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Authentication
JWT_SECRET=your-super-secret-jwt-key
API_KEY=your-api-key-here

# Feature Flags
DEBUG=false
ENABLE_FEATURE_X=false

# Optional variables
OPTIONAL_VAR=
REDIS_URL=redis://localhost:6379
`;

export const envFileWithUnusedVars = `# Environment file with unused variables
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/testdb

# These variables are not in the example
UNUSED_VAR_1=value1
UNUSED_VAR_2=value2
LEGACY_SETTING=old_value
`;

export const envFileWithMissingVars = `# Environment file missing required variables
NODE_ENV=development
# PORT is missing
# DATABASE_URL is missing

# Only some variables present
JWT_SECRET=test-secret
DEBUG=true
`;

export const envFileWithQuotes = `# Environment file with various quote styles
SINGLE_QUOTED='single quoted value'
DOUBLE_QUOTED="double quoted value"
UNQUOTED=unquoted value
QUOTED_WITH_SPACES="value with spaces"
QUOTED_WITH_SPECIAL="value with $pecial ch@racters"
EMPTY_QUOTED=""
EMPTY_SINGLE_QUOTED=''

# Quotes with comments
QUOTED_WITH_COMMENT="value" # This is a comment
SINGLE_WITH_COMMENT='value' # Another comment
`;

export const envFileWithComments = `# Main configuration
NODE_ENV=development # Environment setting
PORT=3000 # Server port

# Database configuration
DATABASE_URL=postgresql://user:password@localhost:5432/testdb # Main database

# Authentication settings
JWT_SECRET=test-secret # JWT signing key
API_KEY=test-key # External API key

# Feature flags
DEBUG=true # Enable debug mode
ENABLE_FEATURE_X=false # Experimental feature
`;

export const testSchema = {
  variables: {
    NODE_ENV: {
      required: true,
      type: 'string' as const,
      description: 'Node.js environment',
      example: 'development',
      allowEmpty: false,
    },
    PORT: {
      required: true,
      type: 'number' as const,
      description: 'Server port',
      example: '3000',
      allowEmpty: false,
    },
    DATABASE_URL: {
      required: true,
      type: 'url' as const,
      description: 'Database connection URL',
      example: 'postgresql://user:password@localhost:5432/dbname',
      allowEmpty: false,
    },
    JWT_SECRET: {
      required: true,
      type: 'string' as const,
      description: 'JWT signing secret',
      example: 'your-super-secret-jwt-key',
      allowEmpty: false,
    },
    API_KEY: {
      required: false,
      type: 'string' as const,
      description: 'External API key',
      example: 'your-api-key-here',
      allowEmpty: true,
    },
    DEBUG: {
      required: false,
      type: 'boolean' as const,
      description: 'Enable debug mode',
      example: 'false',
      allowEmpty: true,
    },
    OPTIONAL_VAR: {
      required: false,
      type: 'string' as const,
      description: 'Optional variable',
      example: '',
      allowEmpty: true,
    },
  },
  ignorePatterns: ['^_.*', '.*_TEST$'],
};

export const testConfig = {
  envFile: '.env',
  exampleFile: '.env.example',
  outputFormat: 'text' as const,
  strict: false,
  verbose: false,
  exitOnError: true,
  ignorePatterns: ['^_.*', '.*_TEST$'],
  customRules: [
    {
      name: 'no-localhost-in-prod',
      description: 'Localhost should not be used in production',
      severity: 'warning' as const,
      pattern: /localhost/,
    },
  ],
  securityRules: [
    {
      name: 'weak-password',
      description: 'Weak password detected',
      pattern: /password.*=.*(admin|password|123)/i,
      severity: 'error' as const,
      suggestion: 'Use a strong password',
    },
  ],
};
