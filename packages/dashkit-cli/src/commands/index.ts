import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './init.js';
import { updateCommand } from './update.js';
import { statusCommand } from './status.js';
import { versionCommand } from './version.js';
import { withErrorHandling } from '../utils/errors.js';
import { getCurrentPackageVersion } from '../utils/version.js';

export const program = new Command();

program
  .name('dashkit')
  .description('Install and manage dashkit agents')
  .version(getCurrentPackageVersion());

program
  .command('init')
  .description('Install agent definitions into your repository')
  .option('--here', 'Use current directory as target')
  .option('--force', 'Overwrite existing installation')
  .addHelpText('after', `
Examples:
  $ dashkit init --here
  $ dashkit init --force
  `)
  .action((options) => withErrorHandling(async () => {
    await initCommand(options);
  }));

program
  .command('update')
  .description('Update agents to latest version')
  .option('--dry-run', 'Show what would be updated')
  .addHelpText('after', `
Examples:
  $ dashkit update
  $ dashkit update --dry-run
  `)
  .action((options) => withErrorHandling(async () => {
    await updateCommand(options);
  }));

program
  .command('status')
  .description('Check installation status and available updates')
  .addHelpText('after', `
Examples:
  $ dashkit status
  `)
  .action((options) => withErrorHandling(async () => {
    await statusCommand(options);
  }));

program
  .command('version')
  .description('Show version information')
  .addHelpText('after', `
Examples:
  $ dashkit version
  `)
  .action((options) => withErrorHandling(async () => {
    await versionCommand(options);
  }));
