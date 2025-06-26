import chalk from 'chalk';
import { ValidationResult, ValidationError, ValidationWarning, ValidationInfo } from '../types';

/**
 * Output formatter for validation results
 */
export class OutputFormatter {
  private outputFormat: 'text' | 'json' | 'junit';

  constructor(format: 'text' | 'json' | 'junit' = 'text') {
    this.outputFormat = format;
  }

  /**
   * Format validation result
   */
  public format(result: ValidationResult): string {
    switch (this.outputFormat) {
      case 'json':
        return this.formatJson(result);
      case 'junit':
        return this.formatJUnit(result);
      case 'text':
      default:
        return this.formatText(result);
    }
  }

  /**
   * Format as human-readable text
   */
  private formatText(result: ValidationResult): string {
    const lines: string[] = [];

    // Summary header
    const status = result.isValid ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED');
    lines.push(`${status} - Environment validation completed\n`);

    // Errors
    if (result.errors.length > 0) {
      lines.push(chalk.red.bold(`🚨 ERRORS (${result.errors.length}):`));
      for (const error of result.errors) {
        lines.push(this.formatError(error));
      }
      lines.push('');
    }

    // Warnings
    if (result.warnings.length > 0) {
      lines.push(chalk.yellow.bold(`⚠️  WARNINGS (${result.warnings.length}):`));
      for (const warning of result.warnings) {
        lines.push(this.formatWarning(warning));
      }
      lines.push('');
    }

    // Info
    if (result.info.length > 0) {
      lines.push(chalk.blue.bold(`ℹ️  INFO (${result.info.length}):`));
      for (const info of result.info) {
        lines.push(this.formatInfo(info));
      }
      lines.push('');
    }

    // Summary
    lines.push(this.formatSummary(result));

    return lines.join('\n');
  }

  /**
   * Format error message
   */
  private formatError(error: ValidationError): string {
    const location = error.lineNumber ? chalk.gray(`:${error.lineNumber}`) : '';
    const variable = error.variable ? chalk.cyan(error.variable) : '';
    const message = chalk.red(error.message);
    const suggestion = error.suggestion ? chalk.gray(`\n    💡 ${error.suggestion}`) : '';

    return `  ${variable}${location}: ${message}${suggestion}`;
  }

  /**
   * Format warning message
   */
  private formatWarning(warning: ValidationWarning): string {
    const location = warning.lineNumber ? chalk.gray(`:${warning.lineNumber}`) : '';
    const variable = warning.variable ? chalk.cyan(warning.variable) : '';
    const message = chalk.yellow(warning.message);
    const suggestion = warning.suggestion ? chalk.gray(`\n    💡 ${warning.suggestion}`) : '';

    return `  ${variable}${location}: ${message}${suggestion}`;
  }

  /**
   * Format info message
   */
  private formatInfo(info: ValidationInfo): string {
    const location = info.lineNumber ? chalk.gray(`:${info.lineNumber}`) : '';
    const variable = info.variable ? chalk.cyan(info.variable) : '';
    const message = chalk.blue(info.message);

    return `  ${variable}${location}: ${message}`;
  }

  /**
   * Format summary
   */
  private formatSummary(result: ValidationResult): string {
    const { summary } = result;
    const lines: string[] = [];

    lines.push(chalk.bold('📊 SUMMARY:'));
    lines.push(`  Total variables: ${chalk.cyan(summary.totalVariables.toString())}`);
    lines.push(`  Required variables: ${chalk.cyan(summary.requiredVariables.toString())}`);
    
    if (summary.missingVariables > 0) {
      lines.push(`  Missing variables: ${chalk.red(summary.missingVariables.toString())}`);
    }
    
    if (summary.unusedVariables > 0) {
      lines.push(`  Unused variables: ${chalk.yellow(summary.unusedVariables.toString())}`);
    }
    
    if (summary.securityIssues > 0) {
      lines.push(`  Security issues: ${chalk.red(summary.securityIssues.toString())}`);
    }

    lines.push(`  Validation time: ${chalk.gray(`${summary.validationTime}ms`)}`);

    return lines.join('\n');
  }

  /**
   * Format as JSON
   */
  private formatJson(result: ValidationResult): string {
    return JSON.stringify(result, null, 2);
  }

  /**
   * Format as JUnit XML
   */
  private formatJUnit(result: ValidationResult): string {
    const totalTests = result.errors.length + result.warnings.length + result.info.length;
    const failures = result.errors.length;
    const time = (result.summary.validationTime / 1000).toFixed(3);

    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push(`<testsuite name="EnvGuard" tests="${totalTests}" failures="${failures}" time="${time}">`);

    // Add test cases for errors
    for (const error of result.errors) {
      lines.push(this.formatJUnitTestCase(error, 'error'));
    }

    // Add test cases for warnings
    for (const warning of result.warnings) {
      lines.push(this.formatJUnitTestCase(warning, 'warning'));
    }

    // Add test cases for info
    for (const info of result.info) {
      lines.push(this.formatJUnitTestCase(info, 'info'));
    }

    lines.push('</testsuite>');
    return lines.join('\n');
  }

  /**
   * Format JUnit test case
   */
  private formatJUnitTestCase(
    issue: ValidationError | ValidationWarning | ValidationInfo,
    type: 'error' | 'warning' | 'info'
  ): string {
    const variable = issue.variable || 'general';
    const className = `EnvGuard.${issue.type}`;
    const testName = `${variable}_${type}`;
    const suggestion = 'suggestion' in issue ? issue.suggestion : undefined;

    if (type === 'error') {
      return `  <testcase classname="${className}" name="${testName}">
    <failure message="${this.escapeXml(issue.message)}" type="${issue.type}">
      ${this.escapeXml(issue.message)}
      ${suggestion ? `\nSuggestion: ${this.escapeXml(suggestion)}` : ''}
    </failure>
  </testcase>`;
    } else {
      return `  <testcase classname="${className}" name="${testName}">
    <system-out>${this.escapeXml(issue.message)}</system-out>
  </testcase>`;
    }
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
