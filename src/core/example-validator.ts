import {
  EnvVariable,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ValidationSummary,
} from '../types';

/**
 * Example-based validator that compares .env against .env.example
 */
export class ExampleValidator {
  private exampleVariables: EnvVariable[];
  private ignorePatterns: string[];

  constructor(exampleVariables: EnvVariable[], ignorePatterns: string[] = []) {
    this.exampleVariables = exampleVariables;
    this.ignorePatterns = ignorePatterns;
  }

  /**
   * Validate environment variables against example file
   */
  public validate(variables: EnvVariable[]): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    const variableMap = new Map(variables.map(v => [v.key, v]));
    const exampleMap = new Map(this.exampleVariables.map(v => [v.key, v]));

    const envKeys = Array.from(variableMap.keys());
    const exampleKeys = Array.from(exampleMap.keys());

    // Check for missing variables (present in example but not in env)
    this.validateMissingVariables(exampleKeys, variableMap, exampleMap, errors);

    // Check for unused variables (present in env but not in example)
    this.validateUnusedVariables(envKeys, exampleKeys, variableMap, warnings);

    // Check for empty values where example has values
    this.validateEmptyValues(variables, exampleMap, warnings);

    // Check for potential value format mismatches
    this.validateValueFormats(variables, exampleMap, warnings, info);

    const validationTime = Date.now() - startTime;
    const summary = this.createSummary(variables, errors, warnings, validationTime);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      info,
      summary,
    };
  }

  /**
   * Validate missing variables
   */
  private validateMissingVariables(
    exampleKeys: string[],
    variableMap: Map<string, EnvVariable>,
    exampleMap: Map<string, EnvVariable>,
    errors: ValidationError[]
  ): void {
    for (const key of exampleKeys) {
      if (!variableMap.has(key) && !this.shouldIgnoreVariable(key)) {
        const exampleVar = exampleMap.get(key)!;
        const suggestion = this.generateSuggestionFromExample(exampleVar);

        errors.push({
          type: 'missing_required',
          variable: key,
          message: `Variable '${key}' is present in example but missing from .env file`,
          suggestion,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate unused variables
   */
  private validateUnusedVariables(
    envKeys: string[],
    exampleKeys: string[],
    variableMap: Map<string, EnvVariable>,
    warnings: ValidationWarning[]
  ): void {
    const exampleKeySet = new Set(exampleKeys);

    for (const key of envKeys) {
      if (!exampleKeySet.has(key) && !this.shouldIgnoreVariable(key)) {
        const variable = variableMap.get(key)!;
        warnings.push({
          type: 'unused_variable',
          variable: key,
          message: `Variable '${key}' is not present in .env.example`,
          lineNumber: variable.lineNumber,
          suggestion: 'Add this variable to .env.example or remove it if not needed',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate empty values
   */
  private validateEmptyValues(
    variables: EnvVariable[],
    exampleMap: Map<string, EnvVariable>,
    warnings: ValidationWarning[]
  ): void {
    for (const variable of variables) {
      const exampleVar = exampleMap.get(variable.key);
      if (
        exampleVar &&
        variable.value.trim() === '' &&
        exampleVar.value.trim() !== '' &&
        !this.isPlaceholderValue(exampleVar.value)
      ) {
        warnings.push({
          type: 'unused_variable',
          variable: variable.key,
          message: `Variable '${variable.key}' is empty but has a value in example`,
          lineNumber: variable.lineNumber,
          suggestion: `Consider setting a value. Example: ${exampleVar.value}`,
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate value formats against examples
   */
  private validateValueFormats(
    variables: EnvVariable[],
    exampleMap: Map<string, EnvVariable>,
    warnings: ValidationWarning[],
    info: ValidationInfo[]
  ): void {
    for (const variable of variables) {
      const exampleVar = exampleMap.get(variable.key);
      if (!exampleVar || variable.value.trim() === '') continue;

      // Check if the format looks different from example
      const formatMismatch = this.detectFormatMismatch(variable, exampleVar);
      if (formatMismatch) {
        warnings.push({
          type: 'weak_pattern',
          variable: variable.key,
          message: formatMismatch.message,
          lineNumber: variable.lineNumber,
          suggestion: formatMismatch.suggestion,
          severity: 'warning',
        });
      }

      // Provide helpful info about expected formats
      const formatInfo = this.getFormatInfo(variable, exampleVar);
      if (formatInfo) {
        info.push({
          type: 'info',
          variable: variable.key,
          message: formatInfo,
          lineNumber: variable.lineNumber,
          severity: 'info',
        });
      }
    }
  }

  /**
   * Detect format mismatches between actual and example values
   */
  private detectFormatMismatch(
    variable: EnvVariable,
    exampleVar: EnvVariable
  ): { message: string; suggestion: string } | null {
    const value = variable.value;
    const example = exampleVar.value;

    // Skip if example is a placeholder
    if (this.isPlaceholderValue(example)) return null;

    // Check URL format
    if (this.looksLikeUrl(example) && !this.looksLikeUrl(value)) {
      return {
        message: `Variable '${variable.key}' should be a URL based on example`,
        suggestion: `Expected URL format like: ${example}`,
      };
    }

    // Check number format
    if (this.looksLikeNumber(example) && !this.looksLikeNumber(value)) {
      return {
        message: `Variable '${variable.key}' should be a number based on example`,
        suggestion: `Expected number format like: ${example}`,
      };
    }

    // Check boolean format
    if (this.looksLikeBoolean(example) && !this.looksLikeBoolean(value)) {
      return {
        message: `Variable '${variable.key}' should be a boolean based on example`,
        suggestion: `Expected boolean format like: ${example}`,
      };
    }

    // Check email format
    if (this.looksLikeEmail(example) && !this.looksLikeEmail(value)) {
      return {
        message: `Variable '${variable.key}' should be an email based on example`,
        suggestion: `Expected email format like: ${example}`,
      };
    }

    return null;
  }

  /**
   * Get format information for a variable
   */
  private getFormatInfo(variable: EnvVariable, exampleVar: EnvVariable): string | null {
    const example = exampleVar.value;

    if (this.isPlaceholderValue(example)) {
      return `Variable '${variable.key}' uses placeholder in example: ${example}`;
    }

    return null;
  }

  /**
   * Generate suggestion from example variable
   */
  private generateSuggestionFromExample(exampleVar: EnvVariable): string {
    const comment = exampleVar.hasComment ? ` # ${exampleVar.hasComment}` : '';
    return `${exampleVar.key}=${exampleVar.value}${comment}`;
  }

  /**
   * Check if a value is a placeholder
   */
  private isPlaceholderValue(value: string): boolean {
    const placeholderPatterns = [
      /^<.*>$/,
      /^\[.*\]$/,
      /^{.*}$/,
      /^your_.*$/i,
      /^example_.*$/i,
      /^placeholder$/i,
      /^change_me$/i,
      /^replace_me$/i,
      /^xxx+$/i,
    ];

    return placeholderPatterns.some(pattern => pattern.test(value.trim()));
  }

  /**
   * Check if value looks like a URL
   */
  private looksLikeUrl(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if value looks like a number
   */
  private looksLikeNumber(value: string): boolean {
    return !isNaN(Number(value)) && isFinite(Number(value));
  }

  /**
   * Check if value looks like a boolean
   */
  private looksLikeBoolean(value: string): boolean {
    return ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase());
  }

  /**
   * Check if value looks like an email
   */
  private looksLikeEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  /**
   * Check if variable should be ignored
   */
  private shouldIgnoreVariable(key: string): boolean {
    return this.ignorePatterns.some(pattern => {
      const regex = new RegExp(pattern);
      return regex.test(key);
    });
  }

  /**
   * Create validation summary
   */
  private createSummary(
    variables: EnvVariable[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    validationTime: number
  ): ValidationSummary {
    const missingVariables = errors.filter(e => e.type === 'missing_required').length;
    const unusedVariables = warnings.filter(w => w.type === 'unused_variable').length;

    return {
      totalVariables: variables.length,
      requiredVariables: this.exampleVariables.length,
      missingVariables,
      unusedVariables,
      securityIssues: 0, // Security analysis is handled separately
      validationTime,
    };
  }
}
