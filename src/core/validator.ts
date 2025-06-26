import { EnvParser } from './parser';
import { SchemaValidator } from './schema-validator';
import { ExampleValidator } from './example-validator';
import { SecurityAnalyzer } from '../security/analyzer';
import {
  EnvVariable,
  EnvSchema,
  ValidationResult,
  ValidationMode,
  EnvGuardConfig,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ValidationSummary,
} from '../types';

/**
 * Main validator that orchestrates all validation components
 */
export class EnvGuardValidator {
  private config: EnvGuardConfig;

  constructor(config: EnvGuardConfig) {
    this.config = config;
  }

  /**
   * Validate environment file
   */
  public async validate(): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Parse the main .env file
      const envFile = this.config.envFile || '.env';
      const parsedEnv = EnvParser.parseFile(envFile);

      if (parsedEnv.parseErrors.length > 0) {
        return this.createErrorResult(parsedEnv.parseErrors, startTime);
      }

      // Determine validation mode
      const mode = this.determineValidationMode();

      // Perform validation based on mode
      let result: ValidationResult;
      switch (mode) {
        case 'schema':
          result = await this.validateWithSchema(parsedEnv.variables);
          break;
        case 'example':
          result = await this.validateWithExample(parsedEnv.variables);
          break;
        case 'both':
          result = await this.validateWithBoth(parsedEnv.variables);
          break;
        default:
          throw new Error(`Unknown validation mode: ${mode}`);
      }

      // Add security analysis
      const securityResult = this.performSecurityAnalysis(parsedEnv.variables);
      result.errors.push(...securityResult.errors);
      result.warnings.push(...securityResult.warnings);
      result.info.push(...securityResult.info);

      // Update summary
      result.summary.securityIssues = securityResult.errors.length;
      result.summary.validationTime = Date.now() - startTime;
      result.isValid = result.errors.length === 0;

      return result;
    } catch (error) {
      return this.createErrorResult([{
        lineNumber: 0,
        message: `Validation failed: ${(error as Error).message}`,
        line: '',
      }], startTime);
    }
  }

  /**
   * Validate using schema file
   */
  private async validateWithSchema(variables: EnvVariable[]): Promise<ValidationResult> {
    if (!this.config.schemaFile) {
      throw new Error('Schema file is required for schema validation mode');
    }

    const schema = await this.loadSchema(this.config.schemaFile);
    const validator = new SchemaValidator(schema);
    return validator.validate(variables);
  }

  /**
   * Validate using example file
   */
  private async validateWithExample(variables: EnvVariable[]): Promise<ValidationResult> {
    if (!this.config.exampleFile) {
      throw new Error('Example file is required for example validation mode');
    }

    const exampleParsed = EnvParser.parseFile(this.config.exampleFile);
    if (exampleParsed.parseErrors.length > 0) {
      throw new Error(`Failed to parse example file: ${exampleParsed.parseErrors[0]?.message}`);
    }

    const validator = new ExampleValidator(
      exampleParsed.variables,
      this.config.ignorePatterns || []
    );
    return validator.validate(variables);
  }

  /**
   * Validate using both schema and example
   */
  private async validateWithBoth(variables: EnvVariable[]): Promise<ValidationResult> {
    const schemaResult = await this.validateWithSchema(variables);
    const exampleResult = await this.validateWithExample(variables);

    // Merge results
    const mergedResult: ValidationResult = {
      isValid: schemaResult.isValid && exampleResult.isValid,
      errors: [...schemaResult.errors, ...exampleResult.errors],
      warnings: [...schemaResult.warnings, ...exampleResult.warnings],
      info: [...schemaResult.info, ...exampleResult.info],
      summary: this.mergeSummaries(schemaResult.summary, exampleResult.summary),
    };

    // Remove duplicate issues
    mergedResult.errors = this.deduplicateErrors(mergedResult.errors);
    mergedResult.warnings = this.deduplicateWarnings(mergedResult.warnings);

    return mergedResult;
  }

  /**
   * Perform security analysis
   */
  private performSecurityAnalysis(variables: EnvVariable[]): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
  } {
    const analyzer = new SecurityAnalyzer(this.config.securityRules || []);
    return analyzer.analyze(variables);
  }

  /**
   * Determine validation mode based on config
   */
  private determineValidationMode(): ValidationMode {
    if (this.config.schemaFile && this.config.exampleFile) {
      return 'both';
    } else if (this.config.schemaFile) {
      return 'schema';
    } else if (this.config.exampleFile) {
      return 'example';
    } else {
      // Default to example mode with .env.example
      this.config.exampleFile = '.env.example';
      return 'example';
    }
  }

  /**
   * Load schema from file
   */
  private async loadSchema(schemaFile: string): Promise<EnvSchema> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const yaml = await import('yaml');

      const content = fs.readFileSync(schemaFile, 'utf-8');
      const ext = path.extname(schemaFile).toLowerCase();

      if (ext === '.json') {
        return JSON.parse(content) as EnvSchema;
      } else if (ext === '.yaml' || ext === '.yml') {
        return yaml.parse(content) as EnvSchema;
      } else {
        throw new Error(`Unsupported schema file format: ${ext}`);
      }
    } catch (error) {
      throw new Error(`Failed to load schema file: ${(error as Error).message}`);
    }
  }

  /**
   * Create error result from parse errors
   */
  private createErrorResult(parseErrors: any[], startTime: number): ValidationResult {
    const errors: ValidationError[] = parseErrors.map(error => ({
      type: 'invalid_format',
      variable: '',
      message: error.message,
      lineNumber: error.lineNumber,
      severity: 'error',
    }));

    return {
      isValid: false,
      errors,
      warnings: [],
      info: [],
      summary: {
        totalVariables: 0,
        requiredVariables: 0,
        missingVariables: 0,
        unusedVariables: 0,
        securityIssues: 0,
        validationTime: Date.now() - startTime,
      },
    };
  }

  /**
   * Merge validation summaries
   */
  private mergeSummaries(summary1: ValidationSummary, summary2: ValidationSummary): ValidationSummary {
    return {
      totalVariables: Math.max(summary1.totalVariables, summary2.totalVariables),
      requiredVariables: Math.max(summary1.requiredVariables, summary2.requiredVariables),
      missingVariables: Math.max(summary1.missingVariables, summary2.missingVariables),
      unusedVariables: Math.max(summary1.unusedVariables, summary2.unusedVariables),
      securityIssues: summary1.securityIssues + summary2.securityIssues,
      validationTime: Math.max(summary1.validationTime, summary2.validationTime),
    };
  }

  /**
   * Remove duplicate errors
   */
  private deduplicateErrors(errors: ValidationError[]): ValidationError[] {
    const seen = new Set<string>();
    return errors.filter(error => {
      const key = `${error.type}-${error.variable}-${error.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Remove duplicate warnings
   */
  private deduplicateWarnings(warnings: ValidationWarning[]): ValidationWarning[] {
    const seen = new Set<string>();
    return warnings.filter(warning => {
      const key = `${warning.type}-${warning.variable}-${warning.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}
