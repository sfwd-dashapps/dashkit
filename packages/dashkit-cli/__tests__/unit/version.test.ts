import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { checkForUpdates, compareVersions } from '../../src/utils/version';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Version utilities', () => {
  describe('compareVersions', () => {
    it('should detect when update is available', () => {
      const result = compareVersions('1.0.0', '1.1.0');
      expect(result.updateAvailable).toBe(true);
    });

    it('should detect when already up to date', () => {
      const result = compareVersions('1.1.0', '1.1.0');
      expect(result.updateAvailable).toBe(false);
    });

    it('should detect when current is newer', () => {
      const result = compareVersions('2.0.0', '1.1.0');
      expect(result.updateAvailable).toBe(false);
    });

    it('should handle semantic versioning correctly', () => {
      expect(compareVersions('1.0.0', '1.0.1').updateAvailable).toBe(true);
      expect(compareVersions('1.0.0', '1.1.0').updateAvailable).toBe(true);
      expect(compareVersions('1.0.0', '2.0.0').updateAvailable).toBe(true);
    });
  });

  describe('checkForUpdates', () => {
    const testDir = path.join(__dirname, '../fixtures/version-test');

    beforeEach(async () => {
      await fs.ensureDir(testDir);
    });

    afterEach(async () => {
      await fs.remove(testDir);
    });

    it('should check for updates using config file', async () => {
      // Create config with older version
      const configContent = `module.exports = {
        version: '1.0.0',
        installedAt: '2026-01-01T00:00:00.000Z',
        agents: { claude: true, github: true }
      };`;
      await fs.writeFile(path.join(testDir, 'dashkit.config.js'), configContent);

      const result = await checkForUpdates(testDir);
      expect(result.currentVersion).toBe('1.0.0');
      expect(result.latestVersion).toBeDefined();
    });
  });
});
