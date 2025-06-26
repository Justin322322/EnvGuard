/**
 * Core types and interfaces for EnvGuard
 */

export interface EnvVariable {
  key: string;
  value: string;
  lineNumber: number;
  isQuoted: boolean;
  hasComment?: string | undefined;
}

export interface ValidationRule {
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  pattern?: RegExp;
  required?: boolean;
  allowEmpty?: boolean;
  customValidator?: (value: string) => boolean;
}

export interface SecurityRule {
  name: string;
  description: string;
  pattern: RegExp;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  info: ValidationInfo[];
  summary: ValidationSummary;
}

export interface ValidationError {
  type: 'missing_required' | 'invalid_format' | 'security_risk' | 'custom';
  variable: string;
  message: string;
  lineNumber?: number;
  suggestion?: string | undefined;
  severity: 'error';
}

export interface ValidationWarning {
  type: 'unused_variable' | 'weak_pattern' | 'deprecated' | 'custom' | 'security_risk';
  variable: string;
  message: string;
  lineNumber?: number;
  suggestion?: string | undefined;
  severity: 'warning';
}

export interface ValidationInfo {
  type: 'info' | 'suggestion';
  variable?: string;
  message: string;
  lineNumber?: number;
  severity: 'info';
}

export interface ValidationSummary {
  totalVariables: number;
  requiredVariables: number;
  missingVariables: number;
  unusedVariables: number;
  securityIssues: number;
  validationTime: number;
}

export interface EnvSchema {
  variables: Record<string, VariableSchema>;
  rules?: ValidationRule[];
  securityRules?: SecurityRule[];
  ignorePatterns?: string[];
}

export interface VariableSchema {
  required: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  pattern?: string;
  description?: string;
  example?: string;
  allowEmpty?: boolean;
  deprecated?: boolean;
  alternatives?: string[];
}

export interface EnvGuardConfig {
  schemaFile?: string | undefined;
  exampleFile?: string | undefined;
  envFile?: string | undefined;
  outputFormat?: 'text' | 'json' | 'junit' | undefined;
  strict?: boolean | undefined;
  ignorePatterns?: string[] | undefined;
  customRules?: ValidationRule[] | undefined;
  securityRules?: SecurityRule[] | undefined;
  exitOnError?: boolean | undefined;
  verbose?: boolean | undefined;
}

export interface ParsedEnvFile {
  variables: EnvVariable[];
  comments: string[];
  emptyLines: number[];
  parseErrors: ParseError[];
}

export interface ParseError {
  lineNumber: number;
  message: string;
  line: string;
}

export type ValidationMode = 'schema' | 'example' | 'both';

export interface CLIOptions {
  envFile: string;
  schemaFile?: string;
  exampleFile?: string;
  configFile?: string;
  mode: ValidationMode;
  outputFormat: 'text' | 'json' | 'junit';
  strict: boolean;
  verbose: boolean;
  exitOnError: boolean;
  ignorePatterns: string[];
}
