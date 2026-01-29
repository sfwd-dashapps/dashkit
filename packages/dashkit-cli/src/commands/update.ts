import chalk from 'chalk';
import path from 'path';
import { resolveTargetDirectory } from '../utils/git.js';
import { copyAgentFiles, listAgentFiles } from '../utils/files.js';
import { readConfig, updateConfigVersion } from '../utils/config.js';
import { checkForUpdates } from '../utils/version.js';
import { ERRORS } from '../utils/errors.js';

export interface UpdateOptions {
  dryRun?: boolean;
  targetDir?: string; // For testing
}

export interface UpdateResult {
  success: boolean;
  filesUpdated: number;
  dryRun?: boolean;
  filesToUpdate?: string[];
  skipped?: boolean;
  fromVersion: string;
  toVersion: string;
}

export async function updateCommand(options: UpdateOptions = {}): Promise<UpdateResult> {
  const { dryRun = false } = options;

  // Resolve target directory
  const targetDir = options.targetDir || await resolveTargetDirectory({ here: false });

  // Check if installed
  let config;
  try {
    config = await readConfig(targetDir);
  } catch (error) {
    throw ERRORS.NOT_INSTALLED;
  }

  // Check for updates
  const versionCheck = await checkForUpdates(targetDir);

  if (!versionCheck.updateAvailable) {
    console.log(chalk.blue('Already up to date!'));
    return {
      success: true,
      filesUpdated: 0,
      skipped: true,
      fromVersion: versionCheck.currentVersion,
      toVersion: versionCheck.latestVersion,
    };
  }

  console.log(chalk.yellow(
    `Updating from ${versionCheck.currentVersion} to ${versionCheck.latestVersion}...`
  ));

  // Dry run mode
  if (dryRun) {
    console.log(chalk.gray('Dry run mode - no files will be changed'));
    const filesToUpdate = await listAgentFiles(targetDir);

    console.log(chalk.blue('\nFiles that would be updated:'));
    filesToUpdate.forEach(file => {
      console.log(chalk.gray(`  ${file}`));
    });

    return {
      success: true,
      filesUpdated: 0,
      dryRun: true,
      filesToUpdate,
      fromVersion: versionCheck.currentVersion,
      toVersion: versionCheck.latestVersion,
    };
  }

  // Perform update (overwrite files)
  const filesUpdated = await copyAgentFiles(targetDir, { force: true });

  // Update config
  await updateConfigVersion(targetDir, versionCheck.latestVersion);

  // Success message
  console.log(chalk.green('✓ Update complete!'));
  console.log(chalk.blue(`  Updated ${filesUpdated} agent files`));
  console.log(chalk.blue('  Updated dashkit.config.js'));
  console.log(chalk.blue('\nReview changes with: git diff'));

  return {
    success: true,
    filesUpdated: filesUpdated + 1, // Include config file
    fromVersion: versionCheck.currentVersion,
    toVersion: versionCheck.latestVersion,
  };
}
