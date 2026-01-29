import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { initCommand } from '../../src/commands/init';
import { versionCommand } from '../../src/commands/version';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('dashkit version command', () => {
  const testDir = path.join(__dirname, '../fixtures/version-cmd-test');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should show CLI tool version', async () => {
    const result = await versionCommand({ targetDir: testDir });
    expect(result.cliVersion).toBeDefined();
    expect(result.cliVersion).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('should show installed framework version if installed', async () => {
    await initCommand({ targetDir: testDir });

    const result = await versionCommand({ targetDir: testDir });
    expect(result.installedVersion).toBeDefined();
  });

  it('should indicate not installed if no config', async () => {
    const result = await versionCommand({ targetDir: testDir });
    expect(result.installedVersion).toBeUndefined();
  });
});
