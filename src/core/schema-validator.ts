import {
  EnvVariable,
  EnvSchema,
  VariableSchema,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
  ValidationSummary,
} from '../types';

/**
 * Schema-based validator for environment variables
 */
export class SchemaValidator {
  private schema: EnvSchema;

  constructor(schema: EnvSchema) {
    this.schema = schema;
  }

  /**
   * Validate environment variables against the schema
   */
  public validate(variables: EnvVariable[]): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    const variableMap = new Map(variables.map(v => [v.key, v]));
    const schemaKeys = Object.keys(this.schema.variables);
    const envKeys = Array.from(variableMap.keys());

    // Check for missing required variables
    this.validateRequiredVariables(schemaKeys, variableMap, errors);

    // Check for unused variables
    this.validateUnusedVariables(envKeys, schemaKeys, variableMap, warnings);

    // Validate each variable against its schema
    this.validateVariableValues(variables, errors, warnings);

    // Apply custom rules
    this.applyCustomRules(variables, errors, warnings, info);

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
   * Validate that all required variables are present
   */
  private validateRequiredVariables(
    schemaKeys: string[],
    variableMap: Map<string, EnvVariable>,
    errors: ValidationError[]
  ): void {
    for (const key of schemaKeys) {
      const schema = this.schema.variables[key];
      if (schema?.required && !variableMap.has(key)) {
        errors.push({
          type: 'missing_required',
          variable: key,
          message: `Required environment variable '${key}' is missing`,
          suggestion: schema.description
            ? `Add ${key}=${schema.example || '<value>'} # ${schema.description}`
            : `Add ${key}=${schema.example || '<value>'}`,
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate for unused variables
   */
  private validateUnusedVariables(
    envKeys: string[],
    schemaKeys: string[],
    variableMap: Map<string, EnvVariable>,
    warnings: ValidationWarning[]
  ): void {
    const schemaKeySet = new Set(schemaKeys);
    const ignorePatterns = this.schema.ignorePatterns || [];

    for (const key of envKeys) {
      if (!schemaKeySet.has(key) && !this.shouldIgnoreVariable(key, ignorePatterns)) {
        const variable = variableMap.get(key)!;
        warnings.push({
          type: 'unused_variable',
          variable: key,
          message: `Variable '${key}' is not defined in schema`,
          lineNumber: variable.lineNumber,
          suggestion: 'Remove this variable or add it to your schema',
          severity: 'warning',
        });
      }
    }
  }

  /**
   * Validate individual variable values against their schemas
   */
  private validateVariableValues(
    variables: EnvVariable[],
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    for (const variable of variables) {
      const schema = this.schema.variables[variable.key];
      if (!schema) continue;

      // Check if deprecated
      if (schema.deprecated) {
        warnings.push({
          type: 'deprecated',
          variable: variable.key,
          message: `Variable '${variable.key}' is deprecated`,
          lineNumber: variable.lineNumber,
          suggestion: schema.alternatives?.length
            ? `Consider using: ${schema.alternatives.join(', ')}`
            : 'Consider removing this variable',
          severity: 'warning',
        });
      }

      // Check empty values
      if (!schema.allowEmpty && variable.value.trim() === '') {
        errors.push({
          type: 'invalid_format',
          variable: variable.key,
          message: `Variable '${variable.key}' cannot be empty`,
          lineNumber: variable.lineNumber,
          suggestion: schema.example ? `Example: ${schema.example}` : undefined,
          severity: 'error',
        });
        continue;
      }

      // Validate type
      this.validateVariableType(variable, schema, errors);

      // Validate pattern
      this.validateVariablePattern(variable, schema, errors);
    }
  }

  /**
   * Validate variable type
   */
  private validateVariableType(
    variable: EnvVariable,
    schema: VariableSchema,
    errors: ValidationError[]
  ): void {
    if (!schema.type || variable.value.trim() === '') return;

    const value = variable.value;
    let isValid = true;
    let expectedFormat = '';

    switch (schema.type) {
      case 'number':
        isValid = !isNaN(Number(value)) && isFinite(Number(value));
        expectedFormat = 'a valid number';
        break;
      case 'boolean':
        isValid = ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase());
        expectedFormat = 'true, false, 1, 0, yes, or no';
        break;
      case 'url':
        try {
          new URL(value);
        } catch {
          isValid = false;
        }
        expectedFormat = 'a valid URL';
        break;
      case 'email':
        isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
        expectedFormat = 'a valid email address';
        break;
      case 'json':
        try {
          JSON.parse(value);
        } catch {
          isValid = false;
        }
        expectedFormat = 'valid JSON';
        break;
    }

    if (!isValid) {
      errors.push({
        type: 'invalid_format',
        variable: variable.key,
        message: `Variable '${variable.key}' must be ${expectedFormat}`,
        lineNumber: variable.lineNumber,
        suggestion: schema.example ? `Example: ${schema.example}` : undefined,
        severity: 'error',
      });
    }
  }

  /**
   * Validate variable pattern
   */
  private validateVariablePattern(
    variable: EnvVariable,
    schema: VariableSchema,
    errors: ValidationError[]
  ): void {
    if (!schema.pattern || variable.value.trim() === '') return;

    const pattern = new RegExp(schema.pattern);
    if (!pattern.test(variable.value)) {
      errors.push({
        type: 'invalid_format',
        variable: variable.key,
        message: `Variable '${variable.key}' does not match required pattern`,
        lineNumber: variable.lineNumber,
        suggestion: schema.example ? `Example: ${schema.example}` : undefined,
        severity: 'error',
      });
    }
  }

  /**
   * Apply custom validation rules
   */
  private applyCustomRules(
    variables: EnvVariable[],
    errors: ValidationError[],
    warnings: ValidationWarning[],
    info: ValidationInfo[]
  ): void {
    if (!this.schema.rules) return;

    for (const rule of this.schema.rules) {
      for (const variable of variables) {
        if (rule.pattern && !rule.pattern.test(variable.value)) {
          switch (rule.severity) {
            case 'error':
              errors.push({
                type: 'custom',
                variable: variable.key,
                message: rule.description,
                lineNumber: variable.lineNumber,
                severity: 'error',
              });
              break;
            case 'warning':
              warnings.push({
                type: 'custom',
                variable: variable.key,
                message: rule.description,
                lineNumber: variable.lineNumber,
                severity: 'warning',
              });
              break;
            case 'info':
              info.push({
                type: 'info',
                variable: variable.key,
                message: rule.description,
                lineNumber: variable.lineNumber,
                severity: 'info',
              });
              break;
          }
        }

        if (rule.customValidator && !rule.customValidator(variable.value)) {
          switch (rule.severity) {
            case 'error':
              errors.push({
                type: 'custom',
                variable: variable.key,
                message: rule.description,
                lineNumber: variable.lineNumber,
                severity: 'error',
              });
              break;
            case 'warning':
              warnings.push({
                type: 'custom',
                variable: variable.key,
                message: rule.description,
                lineNumber: variable.lineNumber,
                severity: 'warning',
              });
              break;
            case 'info':
              info.push({
                type: 'info',
                variable: variable.key,
                message: rule.description,
                lineNumber: variable.lineNumber,
                severity: 'info',
              });
              break;
          }
        }
      }
    }
  }

  /**
   * Check if variable should be ignored based on patterns
   */
  private shouldIgnoreVariable(key: string, ignorePatterns: string[]): boolean {
    return ignorePatterns.some(pattern => {
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
    const requiredVariables = Object.values(this.schema.variables).filter(v => v.required).length;
    const missingVariables = errors.filter(e => e.type === 'missing_required').length;
    const unusedVariables = warnings.filter(w => w.type === 'unused_variable').length;
    const securityIssues = errors.filter(e => e.type === 'security_risk').length;

    return {
      totalVariables: variables.length,
      requiredVariables,
      missingVariables,
      unusedVariables,
      securityIssues,
      validationTime,
    };
  }
}
