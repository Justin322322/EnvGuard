#!/usr/bin/env node

/**
 * CLI entry point for EnvGuard
 */

import { EnvGuardCLI } from './cli/index';

const cli = new EnvGuardCLI();
cli.run().catch((error: Error) => {
  console.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
