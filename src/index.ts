/**
 * EnvGuard - Environment File Validator
 * Main entry point for programmatic usage
 */

// Core exports
export { EnvParser } from './core/parser';
export { SchemaValidator } from './core/schema-validator';
export { ExampleValidator } from './core/example-validator';
export { EnvGuardValidator } from './core/validator';

// Security exports
export { SecurityAnalyzer } from './security/analyzer';

// Configuration exports
export { ConfigLoader } from './config/loader';

// CLI exports
export { EnvGuardCLI } from './cli/index';
export { OutputFormatter } from './cli/output-formatter';

// Utility exports
export * from './utils/templates';

// Type exports
export * from './types';

// Default export for convenience
export { EnvGuardValidator as default } from './core/validator';
