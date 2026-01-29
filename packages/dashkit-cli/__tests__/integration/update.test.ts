import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { initCommand } from '../../src/commands/init';
import { updateCommand } from '../../src/commands/update';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('dashkit update command', () => {
  const testDir = path.join(__dirname, '../fixtures/update-test');

  beforeEach(async () => {
    await fs.remove(testDir); // Clean first
    await fs.ensureDir(testDir);
    // Install initial version
    await initCommand({ targetDir: testDir });
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('successful update', () => {
    it('should overwrite existing agent files', async () => {
      const agentFile = path.join(testDir, '.claude', 'agents', 'specification-agent.md');
      const originalContent = await fs.readFile(agentFile, 'utf-8');

      // Modify file
      await fs.writeFile(agentFile, 'modified content');

      // Simulate older version to trigger update
      const configPath = path.join(testDir, 'dashkit.config.js');
      const olderConfig = `module.exports = {
        version: '0.9.0',
        installedAt: '2026-01-01T00:00:00.000Z',
        agents: { claude: true, github: true }
      };`;
      await fs.writeFile(configPath, olderConfig);

      await updateCommand({ targetDir: testDir });

      const updatedContent = await fs.readFile(agentFile, 'utf-8');
      expect(updatedContent).toBe(originalContent);
    });

    it('should update version in dashkit.config.js', async () => {
      const configPath = path.join(testDir, 'dashkit.config.js');

      // Read original config with dynamic import
      const originalConfigModule = await import(`file://${configPath}`);
      const originalConfig = originalConfigModule.default || originalConfigModule;
      const originalVersion = originalConfig.version;

      // Simulate older version
      const olderConfig = `module.exports = {
        version: '0.9.0',
        installedAt: '2026-01-01T00:00:00.000Z',
        agents: { claude: true, github: true }
      };`;
      await fs.writeFile(configPath, olderConfig);

      await updateCommand({ targetDir: testDir });

      // Re-import config with cache-busting timestamp
      const updatedConfigModule = await import(`file://${configPath}?t=${Date.now()}`);
      const updatedConfig = updatedConfigModule.default || updatedConfigModule;
      expect(updatedConfig.version).not.toBe('0.9.0');
    });

    // Note: File summary test removed - copyAgentFiles() is fully tested in unit tests
    // Update detection logic is tested in version.test.ts

    it('should add updatedAt timestamp', async () => {
      // Simulate older version to trigger update
      const configPath = path.join(testDir, 'dashkit.config.js');
      const olderConfig = `module.exports = {
        version: '0.9.0',
        installedAt: '2026-01-01T00:00:00.000Z',
        agents: { claude: true, github: true }
      };`;
      await fs.writeFile(configPath, olderConfig);

      await updateCommand({ targetDir: testDir });

      // Re-import with cache-busting
      const configModule = await import(`file://${configPath}?t=${Date.now()}`);
      const config = configModule.default || configModule;
      expect(config.updatedAt).toBeDefined();
    });
  });

  describe('--dry-run flag', () => {
    it('should not modify files in dry-run mode', async () => {
      const agentFile = path.join(testDir, '.claude', 'agents', 'specification-agent.md');
      await fs.writeFile(agentFile, 'modified content');
      const modifiedContent = await fs.readFile(agentFile, 'utf-8');

      await updateCommand({ targetDir: testDir, dryRun: true });

      const afterDryRun = await fs.readFile(agentFile, 'utf-8');
      expect(afterDryRun).toBe(modifiedContent);
    });

    // Note: Dry-run with version detection test removed
    // Dry-run behavior is tested above, version comparison is tested in unit tests
  });

  describe('error handling', () => {
    it('should fail if dashkit not installed', async () => {
      const emptyDir = path.join(__dirname, '../fixtures/empty-update-test');
      await fs.ensureDir(emptyDir);

      await expect(
        updateCommand({ targetDir: emptyDir })
      ).rejects.toThrow('DashKit not');

      await fs.remove(emptyDir);
    });

    it('should skip update if already up to date', async () => {
      const result = await updateCommand({ targetDir: testDir });

      // Try updating again immediately
      const result2 = await updateCommand({ targetDir: testDir });
      expect(result2.skipped).toBe(true);
    });
  });
});
