import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { resolveTargetDirectory } from '../utils/git.js';
import { copyAgentFiles } from '../utils/files.js';
import { writeConfig, readConfig } from '../utils/config.js';
import { getCurrentPackageVersion } from '../utils/version.js';
import { ERRORS } from '../utils/errors.js';

export interface InitOptions {
  here?: boolean;
  force?: boolean;
  targetDir?: string; // For testing
}

export interface InitResult {
  success: boolean;
  filesCreated: number;
  targetDir: string;
}

export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const { force = false } = options;

  // Resolve target directory
  const targetDir = options.targetDir || await resolveTargetDirectory({ here: options.here });

  console.log(chalk.blue(`Installing DashKit agents to ${targetDir}...`));

  // Check for existing installation
  const configPath = path.join(targetDir, 'dashkit.config.js');
  if (await fs.pathExists(configPath) && !force) {
    throw ERRORS.ALREADY_INSTALLED;
  }

  // Copy agent files
  const filesCreated = await copyAgentFiles(targetDir, { force });

  // Create config file
  const version = getCurrentPackageVersion();
  await writeConfig(targetDir, version);

  // Success message
  console.log(chalk.green('✓ DashKit agents installed successfully!'));
  console.log(chalk.blue(`  .claude/agents/ - ${filesCreated / 2} agents`));
  console.log(chalk.blue(`  .github/agents/ - ${filesCreated / 2} agents`));
  console.log(chalk.blue('  dashkit.config.js - configuration'));

  // Git guidance
  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.blue('1. Review changes: git diff'));
  console.log(chalk.blue('2. Commit agents: git add . && git commit -m "Install DashKit agents"'));
  console.log(chalk.blue('3. Start using agents in your project'));

  return {
    success: true,
    filesCreated: filesCreated + 1, // Include config file
    targetDir,
  };
}
