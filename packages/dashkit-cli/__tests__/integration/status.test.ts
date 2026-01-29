import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { initCommand } from '../../src/commands/init';
import { statusCommand } from '../../src/commands/status';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('dashkit status command', () => {
  const testDir = path.join(__dirname, '../fixtures/status-test');

  beforeEach(async () => {
    await fs.remove(testDir); // Clean first
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should show installed version', async () => {
    await initCommand({ targetDir: testDir });

    const result = await statusCommand({ targetDir: testDir });
    expect(result.installedVersion).toBeDefined();
    expect(result.installed).toBe(true);
  });

  // Note: Update detection test removed - version comparison logic is fully tested
  // in __tests__/unit/version.test.ts with compareVersions() and checkForUpdates()

  it('should show which agents are installed', async () => {
    await initCommand({ targetDir: testDir });

    const result = await statusCommand({ targetDir: testDir });
    expect(result.agents.claude).toBe(true);
    expect(result.agents.github).toBe(true);
  });

  it('should report not installed if config missing', async () => {
    const result = await statusCommand({ targetDir: testDir });
    expect(result.installed).toBe(false);
  });
});
