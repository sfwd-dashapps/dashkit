import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { initCommand } from '../../src/commands/init';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('dashkit init command', () => {
  const testDir = path.join(__dirname, '../fixtures/init-test');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('successful installation', () => {
    it('should install agents in .claude/agents/', async () => {
      await initCommand({ targetDir: testDir });

      const claudeAgents = path.join(testDir, '.claude', 'agents');
      expect(await fs.pathExists(claudeAgents)).toBe(true);

      const files = await fs.readdir(claudeAgents);
      expect(files).toContain('specification-agent.md');
      expect(files).toContain('research-agent.md');
      expect(files).toContain('planning-agent.md');
    });

    it('should install agents in .github/agents/', async () => {
      await initCommand({ targetDir: testDir });

      const githubAgents = path.join(testDir, '.github', 'agents');
      expect(await fs.pathExists(githubAgents)).toBe(true);

      const files = await fs.readdir(githubAgents);
      expect(files).toContain('specification-agent.agent.md');
      expect(files).toContain('research-agent.agent.md');
      expect(files).toContain('planning-agent.agent.md');
    });

    it('should create dashkit.config.js', async () => {
      await initCommand({ targetDir: testDir });

      const configPath = path.join(testDir, 'dashkit.config.js');
      expect(await fs.pathExists(configPath)).toBe(true);

      // Use dynamic import for ESM compatibility
      const configModule = await import(`file://${configPath}`);
      const config = configModule.default || configModule;
      expect(config.version).toBeDefined();
      expect(config.installedAt).toBeDefined();
      expect(config.agents.claude).toBe(true);
      expect(config.agents.github).toBe(true);
    });

    it('should return success message', async () => {
      const result = await initCommand({ targetDir: testDir });
      expect(result.success).toBe(true);
      expect(result.filesCreated).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should fail if already installed without --force', async () => {
      await initCommand({ targetDir: testDir });

      await expect(
        initCommand({ targetDir: testDir })
      ).rejects.toThrow('already installed');
    });

    it('should overwrite with --force flag', async () => {
      await initCommand({ targetDir: testDir });

      const configPath = path.join(testDir, 'dashkit.config.js');
      const originalModTime = (await fs.stat(configPath)).mtime;

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      await initCommand({ targetDir: testDir, force: true });

      const newModTime = (await fs.stat(configPath)).mtime;
      expect(newModTime.getTime()).toBeGreaterThan(originalModTime.getTime());
    });

    it('should handle permission errors gracefully', async () => {
      // Make directory read-only
      await fs.chmod(testDir, 0o444);

      try {
        await expect(
          initCommand({ targetDir: testDir })
        ).rejects.toThrow();
      } finally {
        // Restore permissions for cleanup (must happen even if test fails)
        await fs.chmod(testDir, 0o755);
      }
    });
  });

  describe('--here flag behavior', () => {
    it('should use current directory when --here is specified', async () => {
      // Pass targetDir explicitly to simulate --here without changing process.cwd()
      await initCommand({ here: true, targetDir: testDir });

      const configPath = path.join(testDir, 'dashkit.config.js');
      expect(await fs.pathExists(configPath)).toBe(true);
    });
  });
});
