import chalk from 'chalk';
import { resolveTargetDirectory } from '../utils/git.js';
import { readConfig } from '../utils/config.js';
import { checkForUpdates } from '../utils/version.js';

export interface StatusOptions {
  targetDir?: string; // For testing
}

export interface StatusResult {
  installed: boolean;
  installedVersion?: string;
  latestVersion?: string;
  updateAvailable: boolean;
  agents: {
    claude: boolean;
    github: boolean;
  };
}

export async function statusCommand(options: StatusOptions = {}): Promise<StatusResult> {
  const targetDir = options.targetDir || await resolveTargetDirectory({ here: false });

  // Check if installed
  let config;
  let installed = false;
  let installedVersion;
  let updateAvailable = false;
  let latestVersion;
  let agents = { claude: false, github: false };

  try {
    config = await readConfig(targetDir);
    installed = true;
    installedVersion = config.version;
    agents = config.agents;

    // Check for updates
    const versionCheck = await checkForUpdates(targetDir);
    updateAvailable = versionCheck.updateAvailable;
    latestVersion = versionCheck.latestVersion;
  } catch (error) {
    // Not installed
  }

  // Display status
  if (!installed) {
    console.log(chalk.yellow('DashKit is not installed'));
    console.log(chalk.blue('Run: dashkit init --here'));
    return {
      installed: false,
      updateAvailable: false,
      agents: { claude: false, github: false },
    };
  }

  console.log(chalk.green('✓ DashKit is installed'));
  console.log(chalk.blue(`  Version: ${installedVersion}`));

  if (agents.claude) {
    console.log(chalk.blue('  ✓ Claude agents (.claude/agents/)'));
  }

  if (agents.github) {
    console.log(chalk.blue('  ✓ GitHub agents (.github/agents/)'));
  }

  if (updateAvailable) {
    console.log(chalk.yellow(`\n⚠ Update available: ${latestVersion}`));
    console.log(chalk.blue('Run: dashkit update'));
  } else {
    console.log(chalk.green('\n✓ Up to date!'));
  }

  return {
    installed,
    installedVersion,
    latestVersion,
    updateAvailable,
    agents,
  };
}
