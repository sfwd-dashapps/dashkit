import semver from 'semver';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';
import { readConfig } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VersionComparison {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}

export function compareVersions(
  currentVersion: string,
  latestVersion: string
): VersionComparison {
  return {
    currentVersion,
    latestVersion,
    updateAvailable: semver.gt(latestVersion, currentVersion),
  };
}

export async function checkForUpdates(
  targetDir: string
): Promise<VersionComparison> {
  // Read installed version
  const config = await readConfig(targetDir);
  const currentVersion = config.version;

  // Get package version (this package's version)
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');

  let packageJson;
  try {
    packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
  } catch (error) {
    throw new Error('Failed to read package.json. Package may be corrupted.');
  }

  const latestVersion = packageJson.version;

  // Validate version format
  if (!semver.valid(latestVersion)) {
    throw new Error('Invalid version in package.json');
  }

  return compareVersions(currentVersion, latestVersion);
}

export function getCurrentPackageVersion(): string {
  const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');

  let packageJson;
  try {
    packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  } catch (error) {
    throw new Error('Failed to read package.json. Package may be corrupted.');
  }

  const version = packageJson.version;

  if (!semver.valid(version)) {
    throw new Error('Invalid version in package.json');
  }

  return version;
}
