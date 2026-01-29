export class DashKitError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'DashKitError';
  }
}

export const ERRORS = {
  NOT_GIT_REPO: new DashKitError(
    'Not in a git repository. Use --here flag or cd to a git repository.',
    'NOT_GIT_REPO',
    1
  ),

  ALREADY_INSTALLED: new DashKitError(
    'DashKit is already installed. Use --force to overwrite or run "dashkit update" to upgrade.',
    'ALREADY_INSTALLED',
    1
  ),

  NOT_INSTALLED: new DashKitError(
    'DashKit not found. Run "dashkit init --here" first.',
    'NOT_INSTALLED',
    1
  ),

  PERMISSION_DENIED: new DashKitError(
    'Permission denied. Check file permissions or run with appropriate privileges.',
    'PERMISSION_DENIED',
    1
  ),

  NODE_VERSION: new DashKitError(
    `Node.js 18 or higher required. Current version: ${process.version}`,
    'NODE_VERSION',
    1
  ),

  INVALID_CONFIG: new DashKitError(
    'Invalid dashkit.config.js. Delete and run "dashkit init --force" to reinstall.',
    'INVALID_CONFIG',
    1
  ),
};

export async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T | never> {
  try {
    return await fn();
  } catch (error: any) {
    if (error instanceof DashKitError) {
      console.error(`✗ ${error.message}`);
      process.exit(error.exitCode);
    }

    if (error.code === 'EACCES') {
      console.error('✗ Permission denied');
      console.error('  Try running with appropriate permissions');
      process.exit(1);
    }

    if (error.code === 'ENOSPC') {
      console.error('✗ No space left on device');
      process.exit(1);
    }

    // Unexpected error
    console.error('✗ Unexpected error:');
    console.error(error);
    process.exit(1);
  }
}
