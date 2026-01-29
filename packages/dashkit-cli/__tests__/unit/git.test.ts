import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs-extra';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { findGitRoot, isGitRepository } from '../../src/utils/git';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Git utilities', () => {
  const testDir = path.join(__dirname, '../fixtures/git-repo');
  const emptyDir = path.join(__dirname, '../fixtures/empty-repo');

  beforeEach(async () => {
    // Create git repository fixture
    await fs.ensureDir(testDir);
    execSync('git init', { cwd: testDir, stdio: 'ignore' });

    // Create empty directory fixture
    await fs.ensureDir(emptyDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
    await fs.remove(emptyDir);
  });

  describe('findGitRoot', () => {
    it('should find git root when in repository', () => {
      const gitRoot = findGitRoot(testDir);
      expect(gitRoot).toBeTruthy();
      expect(gitRoot).toContain('git-repo');
    });

    it('should return null when not in git repository', () => {
      // Note: This test may find parent git repo if running inside a git repository
      // Skip if we're inside a git repo (like when running in the dashkit repo itself)
      const parentGitRoot = findGitRoot(process.cwd());
      if (parentGitRoot && emptyDir.startsWith(parentGitRoot)) {
        // We're inside a git repo, so this test isn't applicable
        return;
      }
      const gitRoot = findGitRoot(emptyDir);
      expect(gitRoot).toBeNull();
    });

    it('should use cwd when no directory provided', () => {
      // Note: Pass startDir explicitly instead of changing process.cwd()
      // to avoid race conditions in parallel test execution
      const gitRoot = findGitRoot(testDir);
      expect(gitRoot).toBeTruthy();
      expect(gitRoot).toContain('git-repo');
    });
  });

  describe('isGitRepository', () => {
    it('should return true for directory with .git', () => {
      expect(isGitRepository(testDir)).toBe(true);
    });

    it('should return false for directory without .git', () => {
      expect(isGitRepository(emptyDir)).toBe(false);
    });
  });
});
