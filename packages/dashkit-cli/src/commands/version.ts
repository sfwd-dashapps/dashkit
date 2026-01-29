import chalk from 'chalk';
import { resolveTargetDirectory } from '../utils/git.js';
import { readConfig } from '../utils/config.js';
import { getCurrentPackageVersion } from '../utils/version.js';

export interface VersionOptions {
  targetDir?: string; // For testing
}

export interface VersionResult {
  cliVersion: string;
  installedVersion?: string;
}

export async function versionCommand(options: VersionOptions = {}): Promise<VersionResult> {
  const cliVersion = getCurrentPackageVersion();

  console.log(chalk.blue(`DashKit CLI: ${cliVersion}`));

  // Try to read installed version (don't fail if not in git repo)
  let installedVersion;
  try {
    const targetDir = options.targetDir || await resolveTargetDirectory({ here: false });
    const config = await readConfig(targetDir);
    installedVersion = config.version;
    console.log(chalk.blue(`Installed Framework: ${installedVersion}`));
  } catch (error) {
    // Not in git repo or not installed - that's OK for version command
    console.log(chalk.gray('Framework not installed in this directory'));
  }

  return {
    cliVersion,
    installedVersion,
  };
}
