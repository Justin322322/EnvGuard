#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { EnvGuardValidator } from '../core/validator';
import { OutputFormatter } from './output-formatter';
import { ConfigLoader } from '../config/loader';
import { CLIOptions, EnvGuardConfig } from '../types';
import { version } from '../../package.json';

/**
 * CLI interface for EnvGuard
 */
export class EnvGuardCLI {
  private program: Command;

  constructor() {
    this.program = new Command();
    this.setupCommands();
  }

  /**
   * Setup CLI commands and options
   */
  private setupCommands(): void {
    this.program
      .name('envguard')
      .description('Environment File Validator with Security Analysis')
      .version(version);

    // Main validate command
    this.program
      .command('validate')
      .description('Validate environment file against schema or example')
      .option('-e, --env-file <file>', 'Environment file to validate', '.env')
      .option('-s, --schema-file <file>', 'Schema file for validation')
      .option('-x, --example-file <file>', 'Example file for validation', '.env.example')
      .option('-c, --config-file <file>', 'Configuration file')
      .option('-m, --mode <mode>', 'Validation mode: schema, example, or both', 'example')
      .option('-f, --format <format>', 'Output format: text, json, or junit', 'text')
      .option('--strict', 'Enable strict mode (treat warnings as errors)', false)
      .option('--verbose', 'Enable verbose output', false)
      .option('--exit-on-error', 'Exit with non-zero code on validation errors', true)
      .option('--ignore-patterns <patterns>', 'Comma-separated ignore patterns', '')
      .action(async (options) => {
        await this.handleValidateCommand(options);
      });

    // Init command to create configuration files
    this.program
      .command('init')
      .description('Initialize EnvGuard configuration files')
      .option('--schema', 'Create schema file template', false)
      .option('--config', 'Create config file template', false)
      .option('--example', 'Create .env.example template', false)
      .action(async (options) => {
        await this.handleInitCommand(options);
      });

    // Check command for quick validation
    this.program
      .command('check')
      .description('Quick validation check (exit code only)')
      .option('-e, --env-file <file>', 'Environment file to validate', '.env')
      .option('-x, --example-file <file>', 'Example file for validation', '.env.example')
      .option('-c, --config-file <file>', 'Configuration file')
      .action(async (options) => {
        await this.handleCheckCommand(options);
      });
  }

  /**
   * Handle validate command
   */
  private async handleValidateCommand(options: any): Promise<void> {
    try {
      const cliOptions = this.parseOptions(options);
      const config = await this.loadConfig(cliOptions);
      
      this.displayBanner();
      
      if (cliOptions.verbose) {
        console.log(chalk.gray(`Validating: ${config.envFile}`));
        console.log(chalk.gray(`Mode: ${cliOptions.mode}`));
        console.log(chalk.gray(`Format: ${cliOptions.outputFormat}\n`));
      }

      const validator = new EnvGuardValidator(config);
      const result = await validator.validate();

      const formatter = new OutputFormatter(cliOptions.outputFormat);
      const output = formatter.format(result);
      console.log(output);

      // Exit with appropriate code
      if (cliOptions.exitOnError && !result.isValid) {
        process.exit(1);
      } else if (cliOptions.strict && result.warnings.length > 0) {
        process.exit(1);
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  /**
   * Handle init command
   */
  private async handleInitCommand(options: any): Promise<void> {
    try {
      this.displayBanner();
      const { createSchemaTemplate, createConfigTemplate, createExampleTemplate } = await import('../utils/templates');

      if (options.schema) {
        await createSchemaTemplate();
        console.log(chalk.green('✅ Created schema template: envguard.schema.json'));
      }

      if (options.config) {
        await createConfigTemplate();
        console.log(chalk.green('✅ Created config template: envguard.config.json'));
      }

      if (options.example) {
        await createExampleTemplate();
        console.log(chalk.green('✅ Created example template: .env.example'));
      }

      if (!options.schema && !options.config && !options.example) {
        // Create all templates by default
        await createSchemaTemplate();
        await createConfigTemplate();
        await createExampleTemplate();
        console.log(chalk.green('✅ Created all template files'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(1);
    }
  }

  /**
   * Handle check command
   */
  private async handleCheckCommand(options: any): Promise<void> {
    try {
      const cliOptions = this.parseOptions(options);
      const config = await this.loadConfig(cliOptions);

      const validator = new EnvGuardValidator(config);
      const result = await validator.validate();

      // Silent mode - only exit codes
      if (!result.isValid) {
        process.exit(1);
      }
    } catch (error) {
      process.exit(1);
    }
  }

  /**
   * Display awesome ASCII art banner
   */
  private displayBanner(): void {
    const banner = `
${chalk.bold.green('███████╗███╗   ██╗██╗   ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ██████╗')}
${chalk.bold.green('██╔════╝████╗  ██║██║   ██║██╔════╝ ██║   ██║██╔══██╗██╔══██╗██╔══██╗')}
${chalk.bold.green('█████╗  ██╔██╗ ██║██║   ██║██║  ███╗██║   ██║███████║██████╔╝██║  ██║')}
${chalk.bold.green('██╔══╝  ██║╚██╗██║╚██╗ ██╔╝██║   ██║██║   ██║██╔══██║██╔══██╗██║  ██║')}
${chalk.bold.green('███████╗██║ ╚████║ ╚████╔╝ ╚██████╔╝╚██████╔╝██║  ██║██║  ██║██████╔╝')}
${chalk.bold.green('╚══════╝╚═╝  ╚═══╝  ╚═══╝   ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝')}

${chalk.bold.yellow('Environment File Validator & Security Analyzer')}
${chalk.gray('Secure your environment variables with comprehensive validation')}
`;
    console.log(banner);
    console.log(); // Add spacing after banner
  }

  /**
   * Parse CLI options
   */
  private parseOptions(options: any): CLIOptions {
    return {
      envFile: options.envFile || '.env',
      schemaFile: options.schemaFile,
      exampleFile: options.exampleFile,
      configFile: options.configFile,
      mode: options.mode || 'example',
      outputFormat: options.format || 'text',
      strict: options.strict || false,
      verbose: options.verbose || false,
      exitOnError: options.exitOnError !== false,
      ignorePatterns: options.ignorePatterns ? options.ignorePatterns.split(',') : [],
    };
  }

  /**
   * Load configuration
   */
  private async loadConfig(cliOptions: CLIOptions): Promise<EnvGuardConfig> {
    const configLoader = new ConfigLoader();
    
    // Load from config file if specified
    let config: EnvGuardConfig = {};
    if (cliOptions.configFile) {
      config = await configLoader.loadFromFile(cliOptions.configFile);
    } else {
      // Try to load default config files
      config = await configLoader.loadDefault();
    }

    // Override with CLI options
    return {
      ...config,
      envFile: cliOptions.envFile,
      schemaFile: cliOptions.schemaFile || config.schemaFile,
      exampleFile: cliOptions.exampleFile || config.exampleFile,
      outputFormat: cliOptions.outputFormat,
      strict: cliOptions.strict,
      verbose: cliOptions.verbose,
      exitOnError: cliOptions.exitOnError,
      ignorePatterns: [
        ...(config.ignorePatterns || []),
        ...cliOptions.ignorePatterns,
      ],
    };
  }

  /**
   * Run the CLI
   */
  public async run(argv?: string[]): Promise<void> {
    try {
      // Show banner for help command or when no arguments
      const args = argv || process.argv;
      if (args.length <= 2 || args.includes('--help') || args.includes('-h')) {
        this.displayBanner();
      }
      await this.program.parseAsync(argv);
    } catch (error) {
      console.error(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new EnvGuardCLI();
  cli.run().catch((error) => {
    console.error(chalk.red(`Fatal error: ${error.message}`));
    process.exit(1);
  });
}
