import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { parse as parseYaml } from 'yaml';
import { EnvGuardConfig, ValidationRule, SecurityRule } from '../types';

/**
 * Configuration loader for EnvGuard
 */
export class ConfigLoader {
  private static readonly DEFAULT_CONFIG_FILES = [
    'envguard.config.json',
    'envguard.config.js',
    'envguard.config.yaml',
    'envguard.config.yml',
    '.envguardrc',
    '.envguardrc.json',
    '.envguardrc.yaml',
    '.envguardrc.yml',
  ];

  /**
   * Load configuration from a specific file
   */
  public async loadFromFile(configPath: string): Promise<EnvGuardConfig> {
    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`);
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const ext = this.getFileExtension(configPath);

      let config: any;
      switch (ext) {
        case '.json':
          config = JSON.parse(content);
          break;
        case '.yaml':
        case '.yml':
          config = parseYaml(content);
          break;
        case '.js':
          // For .js files, we need to require them
          delete require.cache[resolve(configPath)];
          config = require(resolve(configPath));
          if (config.default) {
            config = config.default;
          }
          break;
        default:
          // Try JSON first, then YAML
          try {
            config = JSON.parse(content);
          } catch {
            config = parseYaml(content);
          }
      }

      return this.validateAndNormalizeConfig(config);
    } catch (error) {
      throw new Error(`Failed to load configuration from ${configPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Load default configuration by searching for config files
   */
  public async loadDefault(): Promise<EnvGuardConfig> {
    for (const configFile of ConfigLoader.DEFAULT_CONFIG_FILES) {
      if (existsSync(configFile)) {
        return this.loadFromFile(configFile);
      }
    }

    // Return default configuration if no config file found
    return this.getDefaultConfig();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): EnvGuardConfig {
    return {
      envFile: '.env',
      exampleFile: '.env.example',
      outputFormat: 'text',
      strict: false,
      verbose: false,
      exitOnError: true,
      ignorePatterns: [
        '^_.*', // Variables starting with underscore
        '.*_TEST$', // Test variables
        '.*_DEBUG$', // Debug variables
      ],
      customRules: [],
      securityRules: [],
    };
  }

  /**
   * Validate and normalize configuration
   */
  private validateAndNormalizeConfig(config: any): EnvGuardConfig {
    if (typeof config !== 'object' || config === null) {
      throw new Error('Configuration must be an object');
    }

    const normalized: EnvGuardConfig = {
      ...this.getDefaultConfig(),
      ...config,
    };

    // Validate specific fields
    if (normalized.outputFormat && !['text', 'json', 'junit'].includes(normalized.outputFormat)) {
      throw new Error('outputFormat must be one of: text, json, junit');
    }

    if (normalized.customRules) {
      normalized.customRules = this.validateCustomRules(normalized.customRules);
    }

    if (normalized.securityRules) {
      normalized.securityRules = this.validateSecurityRules(normalized.securityRules);
    }

    if (normalized.ignorePatterns && !Array.isArray(normalized.ignorePatterns)) {
      throw new Error('ignorePatterns must be an array of strings');
    }

    return normalized;
  }

  /**
   * Validate custom rules
   */
  private validateCustomRules(rules: any[]): ValidationRule[] {
    if (!Array.isArray(rules)) {
      throw new Error('customRules must be an array');
    }

    return rules.map((rule, index) => {
      if (typeof rule !== 'object' || rule === null) {
        throw new Error(`Custom rule at index ${index} must be an object`);
      }

      if (!rule.name || typeof rule.name !== 'string') {
        throw new Error(`Custom rule at index ${index} must have a name`);
      }

      if (!rule.description || typeof rule.description !== 'string') {
        throw new Error(`Custom rule at index ${index} must have a description`);
      }

      if (!rule.severity || !['error', 'warning', 'info'].includes(rule.severity)) {
        throw new Error(`Custom rule at index ${index} must have severity: error, warning, or info`);
      }

      const validatedRule: ValidationRule = {
        name: rule.name,
        description: rule.description,
        severity: rule.severity,
      };

      if (rule.pattern) {
        if (typeof rule.pattern === 'string') {
          validatedRule.pattern = new RegExp(rule.pattern);
        } else if (rule.pattern instanceof RegExp) {
          validatedRule.pattern = rule.pattern;
        } else {
          throw new Error(`Custom rule at index ${index} pattern must be a string or RegExp`);
        }
      }

      if (rule.required !== undefined) {
        validatedRule.required = Boolean(rule.required);
      }

      if (rule.allowEmpty !== undefined) {
        validatedRule.allowEmpty = Boolean(rule.allowEmpty);
      }

      if (rule.customValidator) {
        if (typeof rule.customValidator !== 'function') {
          throw new Error(`Custom rule at index ${index} customValidator must be a function`);
        }
        validatedRule.customValidator = rule.customValidator;
      }

      return validatedRule;
    });
  }

  /**
   * Validate security rules
   */
  private validateSecurityRules(rules: any[]): SecurityRule[] {
    if (!Array.isArray(rules)) {
      throw new Error('securityRules must be an array');
    }

    return rules.map((rule, index) => {
      if (typeof rule !== 'object' || rule === null) {
        throw new Error(`Security rule at index ${index} must be an object`);
      }

      if (!rule.name || typeof rule.name !== 'string') {
        throw new Error(`Security rule at index ${index} must have a name`);
      }

      if (!rule.description || typeof rule.description !== 'string') {
        throw new Error(`Security rule at index ${index} must have a description`);
      }

      if (!rule.severity || !['error', 'warning', 'info'].includes(rule.severity)) {
        throw new Error(`Security rule at index ${index} must have severity: error, warning, or info`);
      }

      if (!rule.pattern) {
        throw new Error(`Security rule at index ${index} must have a pattern`);
      }

      let pattern: RegExp;
      if (typeof rule.pattern === 'string') {
        pattern = new RegExp(rule.pattern);
      } else if (rule.pattern instanceof RegExp) {
        pattern = rule.pattern;
      } else {
        throw new Error(`Security rule at index ${index} pattern must be a string or RegExp`);
      }

      return {
        name: rule.name,
        description: rule.description,
        pattern,
        severity: rule.severity,
        suggestion: rule.suggestion,
      };
    });
  }

  /**
   * Get file extension
   */
  private getFileExtension(filePath: string): string {
    const lastDot = filePath.lastIndexOf('.');
    return lastDot === -1 ? '' : filePath.substring(lastDot);
  }
}
