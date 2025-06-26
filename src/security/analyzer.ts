import {
  EnvVariable,
  SecurityRule,
  ValidationError,
  ValidationWarning,
  ValidationInfo,
} from '../types';

/**
 * Security analyzer for environment variables
 */
export class SecurityAnalyzer {
  private securityRules: SecurityRule[];

  constructor(customRules: SecurityRule[] = []) {
    this.securityRules = [...this.getDefaultSecurityRules(), ...customRules];
  }

  /**
   * Analyze environment variables for security issues
   */
  public analyze(
    variables: EnvVariable[]
  ): {
    errors: ValidationError[];
    warnings: ValidationWarning[];
    info: ValidationInfo[];
  } {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const info: ValidationInfo[] = [];

    for (const variable of variables) {
      // Check against security rules
      this.checkSecurityRules(variable, errors, warnings, info);

      // Check for hardcoded secrets
      this.checkHardcodedSecrets(variable, errors, warnings);

      // Check for weak patterns
      this.checkWeakPatterns(variable, warnings, info);

      // Check for exposed sensitive data
      this.checkSensitiveDataExposure(variable, warnings);
    }

    return { errors, warnings, info };
  }

  /**
   * Get default security rules
   */
  private getDefaultSecurityRules(): SecurityRule[] {
    return [
      {
        name: 'hardcoded-password',
        description: 'Hardcoded password detected',
        pattern: /password.*=.*(admin|password|123456|qwerty|letmein)/i,
        severity: 'error',
        suggestion: 'Use a strong, unique password and store it securely',
      },
      {
        name: 'hardcoded-api-key',
        description: 'Potential hardcoded API key detected',
        pattern: /api[_-]?key.*=.*[a-zA-Z0-9]{20,}/i,
        severity: 'warning',
        suggestion: 'Ensure API keys are not committed to version control',
      },
      {
        name: 'hardcoded-secret',
        description: 'Potential hardcoded secret detected',
        pattern: /secret.*=.*[a-zA-Z0-9]{16,}/i,
        severity: 'warning',
        suggestion: 'Ensure secrets are not committed to version control',
      },
      {
        name: 'weak-jwt-secret',
        description: 'Weak JWT secret detected',
        pattern: /jwt[_-]?secret.*=.*(secret|jwt|token|key)$/i,
        severity: 'error',
        suggestion: 'Use a strong, randomly generated JWT secret',
      },
      {
        name: 'default-database-credentials',
        description: 'Default database credentials detected',
        pattern: /(db|database)[_-]?(user|username|password).*=.*(root|admin|user|password)$/i,
        severity: 'error',
        suggestion: 'Use strong, unique database credentials',
      },
    ];
  }

  /**
   * Check variable against security rules
   */
  private checkSecurityRules(
    variable: EnvVariable,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    info: ValidationInfo[]
  ): void {
    const variableLine = `${variable.key}=${variable.value}`;

    for (const rule of this.securityRules) {
      if (rule.pattern.test(variableLine)) {
        switch (rule.severity) {
          case 'error':
            errors.push({
              type: 'security_risk',
              variable: variable.key,
              message: rule.description,
              lineNumber: variable.lineNumber,
              suggestion: rule.suggestion,
              severity: 'error',
            });
            break;
          case 'warning':
            warnings.push({
              type: 'security_risk',
              variable: variable.key,
              message: rule.description,
              lineNumber: variable.lineNumber,
              suggestion: rule.suggestion,
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

  /**
   * Check for hardcoded secrets
   */
  private checkHardcodedSecrets(
    variable: EnvVariable,
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): void {
    const value = variable.value;
    const key = variable.key.toLowerCase();

    // Check for common secret patterns
    const secretPatterns = [
      { pattern: /^[A-Za-z0-9+/]{40,}={0,2}$/, name: 'Base64 encoded secret' },
      { pattern: /^[a-f0-9]{32,}$/i, name: 'Hexadecimal secret' },
      { pattern: /^[A-Za-z0-9_-]{32,}$/, name: 'Random string secret' },
    ];

    const sensitiveKeys = [
      'secret',
      'key',
      'token',
      'password',
      'pass',
      'pwd',
      'auth',
      'credential',
      'private',
    ];

    const isSensitiveKey = sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));

    if (isSensitiveKey) {
      // Check if it looks like a real secret
      const matchedPattern = secretPatterns.find(p => p.pattern.test(value));
      if (matchedPattern) {
        warnings.push({
          type: 'security_risk',
          variable: variable.key,
          message: `Potential ${matchedPattern.name} detected in sensitive variable`,
          lineNumber: variable.lineNumber,
          suggestion: 'Ensure this secret is not committed to version control',
          severity: 'warning',
        });
      }

      // Check for obviously weak values
      if (this.isWeakSecret(value)) {
        errors.push({
          type: 'security_risk',
          variable: variable.key,
          message: 'Weak or default secret detected',
          lineNumber: variable.lineNumber,
          suggestion: 'Use a strong, randomly generated secret',
          severity: 'error',
        });
      }
    }
  }

  /**
   * Check for weak patterns
   */
  private checkWeakPatterns(
    variable: EnvVariable,
    warnings: ValidationWarning[],
    info: ValidationInfo[]
  ): void {
    const value = variable.value;
    const key = variable.key.toLowerCase();

    // Check for development/test indicators
    const devPatterns = [
      { pattern: /localhost/i, message: 'Localhost URL detected' },
      { pattern: /127\.0\.0\.1/, message: 'Localhost IP detected' },
      { pattern: /(dev|test|staging|debug)/i, message: 'Development/test environment indicator' },
      { pattern: /^(true|false)$/i, message: 'Boolean flag detected', severity: 'info' as const },
    ];

    for (const devPattern of devPatterns) {
      if (devPattern.pattern.test(value)) {
        const severity = devPattern.severity || 'warning';

        if (severity === 'warning') {
          warnings.push({
            type: 'weak_pattern',
            variable: variable.key,
            message: devPattern.message,
            lineNumber: variable.lineNumber,
            suggestion: 'Ensure this is appropriate for production',
            severity: 'warning',
          });
        } else {
          info.push({
            type: 'info',
            variable: variable.key,
            message: devPattern.message,
            lineNumber: variable.lineNumber,
            severity: 'info',
          });
        }
      }
    }

    // Check for empty or placeholder values in sensitive keys
    const sensitiveKeys = ['secret', 'key', 'token', 'password', 'auth'];
    const isSensitive = sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));

    if (isSensitive && this.isPlaceholderValue(value)) {
      warnings.push({
        type: 'weak_pattern',
        variable: variable.key,
        message: 'Placeholder value detected in sensitive variable',
        lineNumber: variable.lineNumber,
        suggestion: 'Replace with actual secure value',
        severity: 'warning',
      });
    }
  }

  /**
   * Check for sensitive data exposure
   */
  private checkSensitiveDataExposure(
    variable: EnvVariable,
    warnings: ValidationWarning[]
  ): void {
    const value = variable.value;

    // Check for potential PII or sensitive data
    const sensitivePatterns = [
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, message: 'Credit card number pattern' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, message: 'SSN pattern' },
      { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, message: 'Email address' },
      { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, message: 'IP address' },
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.pattern.test(value)) {
        warnings.push({
          type: 'security_risk',
          variable: variable.key,
          message: `Potential ${pattern.message} detected`,
          lineNumber: variable.lineNumber,
          suggestion: 'Verify this sensitive data should be in environment variables',
          severity: 'warning',
        });
      }
    }

    // Check for URLs with credentials
    try {
      const url = new URL(value);
      if (url.username || url.password) {
        warnings.push({
          type: 'security_risk',
          variable: variable.key,
          message: 'URL contains embedded credentials',
          lineNumber: variable.lineNumber,
          suggestion: 'Store credentials separately from URLs',
          severity: 'warning',
        });
      }
    } catch {
      // Not a URL, ignore
    }
  }

  /**
   * Check if a value is a weak secret
   */
  private isWeakSecret(value: string): boolean {
    const weakSecrets = [
      'secret',
      'password',
      'admin',
      'root',
      'user',
      'test',
      'dev',
      'development',
      '123456',
      'qwerty',
      'letmein',
      'changeme',
      'default',
    ];

    const lowerValue = value.toLowerCase();
    return weakSecrets.includes(lowerValue) || value.length < 8;
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
      /^todo$/i,
      /^fixme$/i,
    ];

    return placeholderPatterns.some(pattern => pattern.test(value.trim()));
  }
}
