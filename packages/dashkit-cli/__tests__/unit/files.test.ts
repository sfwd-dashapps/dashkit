import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { getTemplatesDir, copyAgentFiles, ensureDirectories, listAgentFiles } from '../../src/utils/files';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('File utilities', () => {
  const testDir = path.join(__dirname, '../fixtures/file-ops-test');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('getTemplatesDir', () => {
    it('should return path to templates directory', () => {
      const templatesDir = getTemplatesDir();
      expect(templatesDir).toContain('templates');
    });
  });

  describe('ensureDirectories', () => {
    it('should create .claude/agents directory', async () => {
      await ensureDirectories(testDir);
      expect(await fs.pathExists(path.join(testDir, '.claude', 'agents'))).toBe(true);
    });

    it('should create .github/agents directory', async () => {
      await ensureDirectories(testDir);
      expect(await fs.pathExists(path.join(testDir, '.github', 'agents'))).toBe(true);
    });

    it('should not throw if directories already exist', async () => {
      await ensureDirectories(testDir);
      await expect(ensureDirectories(testDir)).resolves.not.toThrow();
    });
  });

  describe('copyAgentFiles', () => {
    it('should copy claude agent files', async () => {
      await copyAgentFiles(testDir, { force: false });

      const claudeAgentsDir = path.join(testDir, '.claude', 'agents');
      expect(await fs.pathExists(path.join(claudeAgentsDir, 'specification-agent.md'))).toBe(true);
      expect(await fs.pathExists(path.join(claudeAgentsDir, 'research-agent.md'))).toBe(true);
      expect(await fs.pathExists(path.join(claudeAgentsDir, 'planning-agent.md'))).toBe(true);
    });

    it('should copy github agent files', async () => {
      await copyAgentFiles(testDir, { force: false });

      const githubAgentsDir = path.join(testDir, '.github', 'agents');
      expect(await fs.pathExists(path.join(githubAgentsDir, 'specification-agent.agent.md'))).toBe(true);
      expect(await fs.pathExists(path.join(githubAgentsDir, 'research-agent.agent.md'))).toBe(true);
      expect(await fs.pathExists(path.join(githubAgentsDir, 'planning-agent.agent.md'))).toBe(true);
    });

    it('should throw if files exist and force is false', async () => {
      await copyAgentFiles(testDir, { force: false });
      await expect(copyAgentFiles(testDir, { force: false })).rejects.toThrow();
    });

    it('should overwrite files when force is true', async () => {
      await copyAgentFiles(testDir, { force: false });
      await expect(copyAgentFiles(testDir, { force: true })).resolves.not.toThrow();
    });
  });

  describe('listAgentFiles', () => {
    it('should list all installed agent files', async () => {
      await copyAgentFiles(testDir, { force: false });

      const files = await listAgentFiles(testDir);
      expect(files).toHaveLength(6);
      expect(files).toContain('.claude/agents/specification-agent.md');
      expect(files).toContain('.claude/agents/research-agent.md');
      expect(files).toContain('.claude/agents/planning-agent.md');
      expect(files).toContain('.github/agents/specification-agent.agent.md');
      expect(files).toContain('.github/agents/research-agent.agent.md');
      expect(files).toContain('.github/agents/planning-agent.agent.md');
    });

    it('should return empty array if no agents installed', async () => {
      const files = await listAgentFiles(testDir);
      expect(files).toHaveLength(0);
    });
  });
});
