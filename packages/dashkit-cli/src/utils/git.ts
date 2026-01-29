import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import { ERRORS } from './errors.js';

function checkGitInstalled(): void {
  try {
    execSync('git --version', { stdio: 'ignore' });
  } catch (error) {
    throw new Error(
      'Git is not installed. Install git or use --here flag to install in current directory.'
    );
  }
}

export function findGitRoot(startDir: string = process.cwd()): string | null {
  try {
    // Check if git is installed first
    checkGitInstalled();

    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: startDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'], // Suppress stderr
    }).trim();

    return gitRoot;
  } catch (error) {
    // Not a git repository or git command failed
    return null;
  }
}

export function isGitRepository(dir: string): boolean {
  return fs.pathExistsSync(path.join(dir, '.git'));
}

export async function resolveTargetDirectory(options: {
  here?: boolean;
}): Promise<string> {
  if (options.here) {
    // Use current directory
    return process.cwd();
  }

  // Find git root
  const gitRoot = findGitRoot();

  if (!gitRoot) {
    throw new Error(
      'Not in a git repository. Use --here to install in current directory.'
    );
  }

  return gitRoot;
}
