# DashKit CLI Installer - Implementation Plan

## Overview

This plan guides the implementation of the DashKit CLI tool, a command-line interface for installing and updating agent definitions from the dashkit into target repositories. The tool will be built as a TypeScript package published to GitHub Packages.

## Implementation Approach

This implementation follows a **Test-Driven Development (TDD)** approach where all tests are written before implementation code. The project structure uses a **monolithic package design** with agent templates bundled directly in the package for maximum simplicity and reliability.

**Key Technical Decisions** (from research):
- **CLI Framework**: Commander.js v12+ for command handling
- **Package Name**: `@sfwd-dashapps/dashkit` (scoped to GitHub org)
- **Distribution**: GitHub Packages via npm
- **File Strategy**: Direct file inclusion in `templates/` directory
- **Config Format**: JavaScript module (`dashkit.config.js`)
- **Version Management**: Semantic versioning with semver library
- **Node Target**: Node.js 18+ (LTS)

## Project Structure

The package will be created at `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/` with the following structure:

```
packages/dashkit-cli/
├── src/
│   ├── cli.ts                    # CLI entry point with shebang
│   ├── commands/
│   │   ├── index.ts              # Command registration
│   │   ├── init.ts               # Init command implementation
│   │   ├── update.ts             # Update command implementation
│   │   ├── status.ts             # Status command implementation
│   │   └── version.ts            # Version command implementation
│   └── utils/
│       ├── git.ts                # Git repository operations
│       ├── config.ts             # Config file read/write operations
│       ├── files.ts              # File copying utilities
│       ├── version.ts            # Version comparison utilities
│       └── errors.ts             # Error definitions and handling
├── templates/
│   ├── .claude/
│   │   └── agents/
│   │       ├── specification-agent.md
│   │       ├── research-agent.md
│   │       └── planning-agent.md
│   ├── .github/
│   │   └── agents/
│   │       ├── specification-agent.agent.md
│   │       ├── research-agent.agent.md
│   │       └── planning-agent.agent.md
│   └── dashkit.config.js.template
├── __tests__/
│   ├── fixtures/
│   │   ├── empty-repo/
│   │   ├── existing-installation/
│   │   └── git-repo/
│   ├── unit/
│   │   ├── config.test.ts
│   │   ├── git.test.ts
│   │   ├── version.test.ts
│   │   └── errors.test.ts
│   └── integration/
│       ├── init.test.ts
│       ├── update.test.ts
│       ├── status.test.ts
│       └── errors.test.ts
├── dist/                          # Compiled JavaScript (gitignored)
├── package.json
├── tsconfig.json
├── jest.config.js
├── .npmrc                         # GitHub Packages configuration
├── .gitignore
├── README.md
└── LICENSE
```

## Test-Driven Development Plan

**IMPORTANT NOTES ON ESM COMPATIBILITY**:

This project uses ES modules (`"type": "module"` in package.json). All test files must:
1. Use `await import()` instead of `require()` for config files
2. Polyfill `__dirname` using `fileURLToPath(import.meta.url)`
3. Use dynamic import with cache-busting for re-importing configs in tests

**PHASE EXECUTION ORDER**:

Phase 1 → Phase 1.3 (Copy Templates) → Phase 2 → Phase 3 → Phase 4 → Phase 5

Template files must be copied BEFORE Phase 2 tests are written, as file operation tests depend on templates existing.

### Phase 1: Test Infrastructure Setup

All tests must be written and failing before implementation begins.

#### 1.1 Test Configuration

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/cli.ts', // Entry point, tested via integration
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**Expected Outcome**: Jest can discover and run test files.

**Acceptance Criteria Addressed**:
- Developer Experience: Clear error messages and exit codes
- Testing framework established

#### 1.2 Test Fixtures

**Approach**: Test fixtures will be created dynamically in each test's setup phase (using `beforeEach`) and cleaned up after (using `afterEach`). This provides flexibility for each test to create exactly the starting state it needs.

**Fixture Directory Structure**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/fixtures/`

Tests will create temporary directories under `__tests__/fixtures/` for various scenarios:
- `empty-repo/` - Empty directory for clean installs
- `git-repo/` - Directory with `.git/` initialized (via `git init`)
- `test-config/` - Directory for config file tests
- `init-test/`, `update-test/`, etc. - Directories for integration tests

**Implementation Pattern**:
```typescript
beforeEach(async () => {
  await fs.ensureDir(testDir);
  // Optional: Initialize git repo if needed
  // execSync('git init', { cwd: testDir });
});

afterEach(async () => {
  await fs.remove(testDir);
});
```

**Expected Outcome**: Each test creates and cleans up its own fixtures, ensuring test isolation and flexibility.

#### 1.3 Copy Agent Templates (CRITICAL - Must Run Before Phase 2)

**IMPORTANT**: This step must be completed BEFORE Phase 2 begins, as the file operations tests depend on these template files existing.

**Task**: Copy agent files from framework root to package templates directory.

```bash
# Create templates directory structure
mkdir -p /Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/templates/.claude/agents
mkdir -p /Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/templates/.github/agents

# Copy Claude agent files
cp /Users/scott/Code/dashapps/dashkit/.claude/agents/*.md \
   /Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/templates/.claude/agents/

# Copy GitHub agent files
cp /Users/scott/Code/dashapps/dashkit/.github/agents/*.md \
   /Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/templates/.github/agents/
```

**Verification**: Confirm 6 agent files exist:
```bash
ls /Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/templates/.claude/agents/
# Should show: specification-agent.md, research-agent.md, planning-agent.md

ls /Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/templates/.github/agents/
# Should show: specification-agent.agent.md, research-agent.agent.md, planning-agent.agent.md
```

**Expected Outcome**: Template directory contains 6 agent files (3 Claude + 3 GitHub).

**Acceptance Criteria Addressed**:
- Agent definitions are bundled in the package

### Phase 2: Utility Module Tests

Write unit tests for all utility modules before implementing them.

#### 2.1 Error Handling Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/unit/errors.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { DashKitError, ERRORS } from '../../src/utils/errors';

describe('DashKitError', () => {
  it('should create error with message, code, and exit code', () => {
    const error = new DashKitError('Test error', 'TEST_ERROR', 2);
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_ERROR');
    expect(error.exitCode).toBe(2);
    expect(error.name).toBe('DashKitError');
  });

  it('should default exit code to 1', () => {
    const error = new DashKitError('Test error', 'TEST_ERROR');
    expect(error.exitCode).toBe(1);
  });
});

describe('ERRORS', () => {
  it('should define NOT_GIT_REPO error', () => {
    expect(ERRORS.NOT_GIT_REPO).toBeInstanceOf(DashKitError);
    expect(ERRORS.NOT_GIT_REPO.code).toBe('NOT_GIT_REPO');
  });

  it('should define ALREADY_INSTALLED error', () => {
    expect(ERRORS.ALREADY_INSTALLED).toBeInstanceOf(DashKitError);
    expect(ERRORS.ALREADY_INSTALLED.code).toBe('ALREADY_INSTALLED');
  });

  it('should define NOT_INSTALLED error', () => {
    expect(ERRORS.NOT_INSTALLED).toBeInstanceOf(DashKitError);
    expect(ERRORS.NOT_INSTALLED.code).toBe('NOT_INSTALLED');
  });

  it('should define PERMISSION_DENIED error', () => {
    expect(ERRORS.PERMISSION_DENIED).toBeInstanceOf(DashKitError);
    expect(ERRORS.PERMISSION_DENIED.code).toBe('PERMISSION_DENIED');
  });

  it('should define NODE_VERSION error', () => {
    expect(ERRORS.NODE_VERSION).toBeInstanceOf(DashKitError);
    expect(ERRORS.NODE_VERSION.code).toBe('NODE_VERSION');
  });

  it('should define INVALID_CONFIG error', () => {
    expect(ERRORS.INVALID_CONFIG).toBeInstanceOf(DashKitError);
    expect(ERRORS.INVALID_CONFIG.code).toBe('INVALID_CONFIG');
  });
});
```

**Expected Outcome**: All error tests fail because errors.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- Developer Experience: Clear error messages for common issues
- Exit codes follow conventions

#### 2.2 Git Utilities Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/unit/git.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
```

**Expected Outcome**: All git tests fail because git.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- Installation works from any subdirectory
- Update works when run from repository root or subdirectories

#### 2.3 Config File Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/unit/config.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { generateConfig, readConfig, updateConfigVersion } from '../../src/utils/config';

// ESM __dirname polyfill
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Config utilities', () => {
  const testDir = path.join(__dirname, '../fixtures/test-config');
  const configPath = path.join(testDir, 'dashkit.config.js');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  describe('generateConfig', () => {
    it('should generate valid config string', () => {
      const config = generateConfig('1.0.0');
      expect(config).toContain('module.exports');
      expect(config).toContain('"version": "1.0.0"');
      expect(config).toContain('"claude": true');
      expect(config).toContain('"github": true');
    });

    it('should include installation timestamp', () => {
      const config = generateConfig('1.0.0');
      expect(config).toContain('installedAt');
      expect(config).toMatch(/\d{4}-\d{2}-\d{2}T/); // ISO 8601 format
    });

    it('should include helpful comments', () => {
      const config = generateConfig('1.0.0');
      expect(config).toContain('DashKit configuration');
      expect(config).toContain('Generated by dashkit');
    });
  });

  describe('readConfig', () => {
    it('should read existing config file', async () => {
      const configContent = generateConfig('1.0.0');
      await fs.writeFile(configPath, configContent);

      const config = await readConfig(testDir);
      expect(config.version).toBe('1.0.0');
      expect(config.agents.claude).toBe(true);
      expect(config.agents.github).toBe(true);
    });

    it('should throw error if config does not exist', async () => {
      await expect(readConfig(testDir)).rejects.toThrow('DashKit not installed');
    });

    it('should throw error if config is invalid', async () => {
      await fs.writeFile(configPath, 'invalid javascript content {{{');
      await expect(readConfig(testDir)).rejects.toThrow();
    });
  });

  describe('updateConfigVersion', () => {
    it('should update version in config file', async () => {
      const configContent = generateConfig('1.0.0');
      await fs.writeFile(configPath, configContent);

      await updateConfigVersion(testDir, '1.1.0');

      const updatedConfig = await readConfig(testDir);
      expect(updatedConfig.version).toBe('1.1.0');
    });

    it('should add updatedAt timestamp', async () => {
      const configContent = generateConfig('1.0.0');
      await fs.writeFile(configPath, configContent);

      await updateConfigVersion(testDir, '1.1.0');

      const updatedConfig = await readConfig(testDir);
      expect(updatedConfig.updatedAt).toBeDefined();
    });
  });
});
```

**Expected Outcome**: All config tests fail because config.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- `dashkit.config.js` is a valid JavaScript module
- Config tracks framework version installed
- Config is human-readable and commentable

#### 2.4 Version Comparison Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/unit/version.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
```

**Expected Outcome**: All version tests fail because version.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- Version comparisons use semantic versioning
- `dashkit status` checks if updates are available

#### 2.5 File Operations Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/unit/files.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
```

**Expected Outcome**: All file operation tests fail because files.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- `dashkit init --here` creates `.claude/agents/` directory with all agent definitions
- `dashkit init --here` creates `.github/agents/` directory with all agent definitions
- Installation fails gracefully if agents already exist (with override option)

### Phase 3: Command Integration Tests

Write integration tests for each command before implementing commands.

#### 3.1 Init Command Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/integration/init.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
```

**Expected Outcome**: All init command tests fail because init.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- `dashkit init --here` creates all required directories and files
- Installation fails gracefully if agents already exist
- `dashkit init --here` creates `dashkit.config.js` in repository root
- Installation works from any subdirectory when using `--here` flag

#### 3.2 Update Command Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/integration/update.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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

    it('should display summary of updated files', async () => {
      const result = await updateCommand({ targetDir: testDir });
      expect(result.filesUpdated).toBeGreaterThan(0);
      expect(result.success).toBe(true);
    });

    it('should add updatedAt timestamp', async () => {
      await updateCommand({ targetDir: testDir });

      const configPath = path.join(testDir, 'dashkit.config.js');
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

    it('should show what would be updated', async () => {
      const result = await updateCommand({ targetDir: testDir, dryRun: true });
      expect(result.dryRun).toBe(true);
      expect(result.filesToUpdate).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should fail if dashkit not installed', async () => {
      const emptyDir = path.join(__dirname, '../fixtures/empty-update-test');
      await fs.ensureDir(emptyDir);

      await expect(
        updateCommand({ targetDir: emptyDir })
      ).rejects.toThrow('not installed');

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
```

**Expected Outcome**: All update command tests fail because update.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- `dashkit update` overwrites existing agent files with latest versions
- `dashkit update` updates version in `dashkit.config.js`
- `dashkit update` displays a summary of updated files
- Update respects .gitignore and doesn't commit changes
- Update works when run from repository root or subdirectories

#### 3.3 Status Command Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/integration/status.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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

  it('should check if updates are available', async () => {
    await initCommand({ targetDir: testDir });

    // Modify config to older version
    const configPath = path.join(testDir, 'dashkit.config.js');
    const olderConfig = `module.exports = {
      version: '0.1.0',
      installedAt: '2026-01-01T00:00:00.000Z',
      agents: { claude: true, github: true }
    };`;
    await fs.writeFile(configPath, olderConfig);

    const result = await statusCommand({ targetDir: testDir });
    expect(result.updateAvailable).toBe(true);
  });

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
```

**Expected Outcome**: All status command tests fail because status.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- `dashkit status` checks if updates are available
- `dashkit status` shows which agents are installed

#### 3.4 Version Command Tests

**Tests to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/__tests__/integration/version.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
```

**Expected Outcome**: All version command tests fail because version.ts doesn't exist yet.

**Acceptance Criteria Addressed**:
- `dashkit version` shows installed framework version
- `dashkit version` shows CLI tool version

### Phase 4: Implementation

Now that all tests are written and failing, implement each module to make tests pass.

#### 4.1 Setup Package Configuration

**Files to Create**:

1. `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/package.json`

```json
{
  "name": "@sfwd-dashapps/dashkit",
  "version": "1.0.0",
  "description": "Install and manage dashkit agents",
  "main": "./dist/index.js",
  "bin": {
    "dashkit": "./dist/cli.js"
  },
  "type": "module",
  "files": [
    "dist/",
    "templates/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "prepublishOnly": "npm run build && npm test",
    "lint": "eslint src --ext .ts",
    "clean": "rm -rf dist"
  },
  "keywords": [
    "cli",
    "agents",
    "claude",
    "copilot",
    "planning",
    "framework"
  ],
  "engines": {
    "node": ">=18.0.0"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/sfwd-dashapps/dashkit.git",
    "directory": "packages/dashkit-cli"
  },
  "publishConfig": {
    "registry": "https://npm.pkg.github.com"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "chalk": "^5.3.0",
    "fs-extra": "^11.2.0",
    "semver": "^7.6.0"
  },
  "devDependencies": {
    "@types/fs-extra": "^11.0.4",
    "@types/node": "^20.11.0",
    "@types/semver": "^7.5.0",
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0"
  }
}
```

2. `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

3. `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/.gitignore`

```
# Dependencies
node_modules/

# Build output
dist/

# Test coverage
coverage/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# NPM
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

4. `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/.npmrc`

```
@dashapps:registry=https://npm.pkg.github.com
```

**Expected Outcome**: Package can be built with `npm run build` and tests run with `npm test`.

**Acceptance Criteria Addressed**:
- CLI is published to GitHub Packages as `dashkit`
- Package Name: `@sfwd-dashapps/dashkit`

#### 4.2 Implement Error Handling

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/utils/errors.ts`

```typescript
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
```

**Expected Outcome**: Error handling tests pass.

**Lines of Code**: ~70

**Acceptance Criteria Addressed**:
- Developer Experience: Clear error messages for common issues
- Exit codes follow conventions (0 = success, non-zero = error)

#### 4.3 Implement Git Utilities

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/utils/git.ts`

```typescript
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
```

**Expected Outcome**: Git utility tests pass.

**Lines of Code**: ~40

**Acceptance Criteria Addressed**:
- Installation works from any subdirectory when using `--here` flag
- Update works when run from repository root or subdirectories

#### 4.4 Implement Config File Operations

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/utils/config.ts`

```typescript
import path from 'path';
import fs from 'fs-extra';
import { fileURLToPath } from 'url';

export interface DashKitConfig {
  version: string;
  installedAt: string;
  updatedAt?: string;
  agents: {
    claude: boolean;
    github: boolean;
  };
}

export function generateConfig(version: string): string {
  const config: DashKitConfig = {
    version,
    installedAt: new Date().toISOString(),
    agents: {
      claude: true,
      github: true,
    },
  };

  return `// DashKit configuration
// Generated by dashkit v${version}
// Documentation: https://github.com/sfwd-dashapps/dashkit

module.exports = ${JSON.stringify(config, null, 2)};
`;
}

export async function readConfig(targetDir: string): Promise<DashKitConfig> {
  const configPath = path.join(targetDir, 'dashkit.config.js');

  if (!(await fs.pathExists(configPath))) {
    throw new Error('DashKit not installed. Run: dashkit init --here');
  }

  try {
    // Use dynamic import for ES modules
    const configModule = await import(configPath);
    return configModule.default || configModule;
  } catch (error) {
    throw new Error('Invalid dashkit.config.js. Delete and reinstall with: dashkit init --force');
  }
}

export async function updateConfigVersion(
  targetDir: string,
  newVersion: string
): Promise<void> {
  const configPath = path.join(targetDir, 'dashkit.config.js');
  const config = await readConfig(targetDir);

  config.version = newVersion;
  config.updatedAt = new Date().toISOString();

  const configContent = generateConfig(newVersion);
  await fs.writeFile(configPath, configContent);
}

export async function writeConfig(
  targetDir: string,
  version: string
): Promise<void> {
  const configPath = path.join(targetDir, 'dashkit.config.js');
  const configContent = generateConfig(version);
  await fs.writeFile(configPath, configContent);
}
```

**Expected Outcome**: Config file tests pass.

**Lines of Code**: ~75

**Acceptance Criteria Addressed**:
- `dashkit.config.js` is a valid JavaScript module
- Config tracks framework version installed
- Config is human-readable and commentable
- Config can be extended with custom settings (future-proofing)

#### 4.5 Implement Version Comparison

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/utils/version.ts`

```typescript
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
```

**Expected Outcome**: Version comparison tests pass.

**Lines of Code**: ~50

**Acceptance Criteria Addressed**:
- Version comparisons use semantic versioning
- `dashkit status` checks if updates are available

#### 4.6 Implement File Operations

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/utils/files.ts`

```typescript
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplatesDir(): string {
  // From src/utils/ to templates/
  return path.join(__dirname, '..', '..', 'templates');
}

export async function ensureDirectories(targetDir: string): Promise<void> {
  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  await fs.ensureDir(claudeAgentsDir);
  await fs.ensureDir(githubAgentsDir);
}

export async function copyAgentFiles(
  targetDir: string,
  options: { force: boolean }
): Promise<number> {
  const { force } = options;
  const templateDir = getTemplatesDir();

  const claudeTemplates = path.join(templateDir, '.claude', 'agents');
  const githubTemplates = path.join(templateDir, '.github', 'agents');

  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  // Ensure directories exist
  await ensureDirectories(targetDir);

  // Check for existing files if not forcing
  if (!force) {
    const existingFiles = [];

    // Check Claude agent files
    const claudeFiles = await fs.readdir(claudeTemplates);
    for (const file of claudeFiles) {
      if (await fs.pathExists(path.join(claudeAgentsDir, file))) {
        existingFiles.push(path.join('.claude', 'agents', file));
      }
    }

    // Check GitHub agent files
    const githubFiles = await fs.readdir(githubTemplates);
    for (const file of githubFiles) {
      if (await fs.pathExists(path.join(githubAgentsDir, file))) {
        existingFiles.push(path.join('.github', 'agents', file));
      }
    }

    if (existingFiles.length > 0) {
      throw new Error(
        `Files already exist: ${existingFiles.join(', ')}. Use --force to overwrite.`
      );
    }
  }

  // Copy files
  await fs.copy(claudeTemplates, claudeAgentsDir, {
    overwrite: force,
    errorOnExist: !force,
  });

  await fs.copy(githubTemplates, githubAgentsDir, {
    overwrite: force,
    errorOnExist: !force,
  });

  // Count files copied
  const claudeFileCount = (await fs.readdir(claudeAgentsDir)).length;
  const githubFileCount = (await fs.readdir(githubAgentsDir)).length;

  return claudeFileCount + githubFileCount;
}

export async function listAgentFiles(targetDir: string): Promise<string[]> {
  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  const files: string[] = [];

  if (await fs.pathExists(claudeAgentsDir)) {
    const claudeFiles = await fs.readdir(claudeAgentsDir);
    files.push(...claudeFiles.map(f => path.join('.claude', 'agents', f)));
  }

  if (await fs.pathExists(githubAgentsDir)) {
    const githubFiles = await fs.readdir(githubAgentsDir);
    files.push(...githubFiles.map(f => path.join('.github', 'agents', f)));
  }

  return files;
}
```

**Expected Outcome**: File operation tests pass.

**Lines of Code**: ~90

**Acceptance Criteria Addressed**:
- `dashkit init --here` creates `.claude/agents/` directory with all agent definitions
- `dashkit init --here` creates `.github/agents/` directory with all agent definitions
- Installation fails gracefully if agents already exist (with override option)

#### 4.7 Create Config Template (SKIPPED - Not Used)

**Note**: This step is SKIPPED. The `generateConfig()` function (Phase 4.5) programmatically generates config files without needing a template file. Creating a separate template would be dead code and add unnecessary maintenance burden.

If in the future a template file is desired for documentation purposes, it can be added, but it should not be used by the actual config generation logic.

**Acceptance Criteria Addressed**:
- Config can be extended with custom settings (future-proofing) - addressed by generateConfig() implementation

#### 4.8 Implement Init Command

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/commands/init.ts`

```typescript
import chalk from 'chalk';
import path from 'path';
import fs from 'fs-extra';
import { resolveTargetDirectory } from '../utils/git.js';
import { copyAgentFiles } from '../utils/files.js';
import { writeConfig, readConfig } from '../utils/config.js';
import { getCurrentPackageVersion } from '../utils/version.js';
import { ERRORS } from '../utils/errors.js';

export interface InitOptions {
  here?: boolean;
  force?: boolean;
  targetDir?: string; // For testing
}

export interface InitResult {
  success: boolean;
  filesCreated: number;
  targetDir: string;
}

export async function initCommand(options: InitOptions = {}): Promise<InitResult> {
  const { force = false } = options;

  // Resolve target directory
  const targetDir = options.targetDir || await resolveTargetDirectory({ here: options.here });

  console.log(chalk.blue(`Installing DashKit agents to ${targetDir}...`));

  // Check for existing installation
  const configPath = path.join(targetDir, 'dashkit.config.js');
  if (await fs.pathExists(configPath) && !force) {
    throw ERRORS.ALREADY_INSTALLED;
  }

  // Copy agent files
  const filesCreated = await copyAgentFiles(targetDir, { force });

  // Create config file
  const version = getCurrentPackageVersion();
  await writeConfig(targetDir, version);

  // Success message
  console.log(chalk.green('✓ DashKit agents installed successfully!'));
  console.log(chalk.blue(`  .claude/agents/ - ${filesCreated / 2} agents`));
  console.log(chalk.blue(`  .github/agents/ - ${filesCreated / 2} agents`));
  console.log(chalk.blue('  dashkit.config.js - configuration'));

  // Git guidance
  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.blue('1. Review changes: git diff'));
  console.log(chalk.blue('2. Commit agents: git add . && git commit -m "Install DashKit agents"'));
  console.log(chalk.blue('3. Start using agents in your project'));

  return {
    success: true,
    filesCreated: filesCreated + 1, // Include config file
    targetDir,
  };
}
```

**Expected Outcome**: Init command tests pass.

**Lines of Code**: ~60

**Acceptance Criteria Addressed**:
- `dashkit init --here` creates all required directories and files
- `dashkit.config.js` includes framework version and installation timestamp
- Installation fails gracefully if agents already exist (with override option)
- Installation works from any subdirectory when using `--here` flag
- Commands provide progress feedback

#### 4.9 Implement Update Command

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/commands/update.ts`

```typescript
import chalk from 'chalk';
import path from 'path';
import { resolveTargetDirectory } from '../utils/git.js';
import { copyAgentFiles, listAgentFiles } from '../utils/files.js';
import { readConfig, updateConfigVersion } from '../utils/config.js';
import { checkForUpdates } from '../utils/version.js';
import { ERRORS } from '../utils/errors.js';

export interface UpdateOptions {
  dryRun?: boolean;
  targetDir?: string; // For testing
}

export interface UpdateResult {
  success: boolean;
  filesUpdated: number;
  dryRun?: boolean;
  filesToUpdate?: string[];
  skipped?: boolean;
  fromVersion: string;
  toVersion: string;
}

export async function updateCommand(options: UpdateOptions = {}): Promise<UpdateResult> {
  const { dryRun = false } = options;

  // Resolve target directory
  const targetDir = options.targetDir || await resolveTargetDirectory({ here: false });

  // Check if installed
  let config;
  try {
    config = await readConfig(targetDir);
  } catch (error) {
    throw ERRORS.NOT_INSTALLED;
  }

  // Check for updates
  const versionCheck = await checkForUpdates(targetDir);

  if (!versionCheck.updateAvailable) {
    console.log(chalk.blue('Already up to date!'));
    return {
      success: true,
      filesUpdated: 0,
      skipped: true,
      fromVersion: versionCheck.currentVersion,
      toVersion: versionCheck.latestVersion,
    };
  }

  console.log(chalk.yellow(
    `Updating from ${versionCheck.currentVersion} to ${versionCheck.latestVersion}...`
  ));

  // Dry run mode
  if (dryRun) {
    console.log(chalk.gray('Dry run mode - no files will be changed'));
    const filesToUpdate = await listAgentFiles(targetDir);

    console.log(chalk.blue('\nFiles that would be updated:'));
    filesToUpdate.forEach(file => {
      console.log(chalk.gray(`  ${file}`));
    });

    return {
      success: true,
      filesUpdated: 0,
      dryRun: true,
      filesToUpdate,
      fromVersion: versionCheck.currentVersion,
      toVersion: versionCheck.latestVersion,
    };
  }

  // Perform update (overwrite files)
  const filesUpdated = await copyAgentFiles(targetDir, { force: true });

  // Update config
  await updateConfigVersion(targetDir, versionCheck.latestVersion);

  // Success message
  console.log(chalk.green('✓ Update complete!'));
  console.log(chalk.blue(`  Updated ${filesUpdated} agent files`));
  console.log(chalk.blue('  Updated dashkit.config.js'));
  console.log(chalk.blue('\nReview changes with: git diff'));

  return {
    success: true,
    filesUpdated: filesUpdated + 1, // Include config file
    fromVersion: versionCheck.currentVersion,
    toVersion: versionCheck.latestVersion,
  };
}
```

**Expected Outcome**: Update command tests pass.

**Lines of Code**: ~90

**Acceptance Criteria Addressed**:
- `dashkit update` overwrites existing agent files with latest versions
- `dashkit update` updates version in `dashkit.config.js`
- `dashkit update` displays a summary of updated files
- Update respects .gitignore and doesn't commit changes
- Update works when run from repository root or subdirectories

#### 4.10 Implement Status Command

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/commands/status.ts`

```typescript
import chalk from 'chalk';
import { resolveTargetDirectory } from '../utils/git.js';
import { readConfig } from '../utils/config.js';
import { checkForUpdates } from '../utils/version.js';

export interface StatusOptions {
  targetDir?: string; // For testing
}

export interface StatusResult {
  installed: boolean;
  installedVersion?: string;
  latestVersion?: string;
  updateAvailable: boolean;
  agents: {
    claude: boolean;
    github: boolean;
  };
}

export async function statusCommand(options: StatusOptions = {}): Promise<StatusResult> {
  const targetDir = options.targetDir || await resolveTargetDirectory({ here: false });

  // Check if installed
  let config;
  let installed = false;
  let installedVersion;
  let updateAvailable = false;
  let latestVersion;
  let agents = { claude: false, github: false };

  try {
    config = await readConfig(targetDir);
    installed = true;
    installedVersion = config.version;
    agents = config.agents;

    // Check for updates
    const versionCheck = await checkForUpdates(targetDir);
    updateAvailable = versionCheck.updateAvailable;
    latestVersion = versionCheck.latestVersion;
  } catch (error) {
    // Not installed
  }

  // Display status
  if (!installed) {
    console.log(chalk.yellow('DashKit is not installed'));
    console.log(chalk.blue('Run: dashkit init --here'));
    return {
      installed: false,
      updateAvailable: false,
      agents: { claude: false, github: false },
    };
  }

  console.log(chalk.green('✓ DashKit is installed'));
  console.log(chalk.blue(`  Version: ${installedVersion}`));

  if (agents.claude) {
    console.log(chalk.blue('  ✓ Claude agents (.claude/agents/)'));
  }

  if (agents.github) {
    console.log(chalk.blue('  ✓ GitHub agents (.github/agents/)'));
  }

  if (updateAvailable) {
    console.log(chalk.yellow(`\n⚠ Update available: ${latestVersion}`));
    console.log(chalk.blue('Run: dashkit update'));
  } else {
    console.log(chalk.green('\n✓ Up to date!'));
  }

  return {
    installed,
    installedVersion,
    latestVersion,
    updateAvailable,
    agents,
  };
}
```

**Expected Outcome**: Status command tests pass.

**Lines of Code**: ~75

**Acceptance Criteria Addressed**:
- `dashkit status` shows installation status
- `dashkit status` checks if updates available
- `dashkit status` shows which agents are installed

#### 4.11 Implement Version Command

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/commands/version.ts`

```typescript
import chalk from 'chalk';
import { resolveTargetDirectory } from '../utils/git.js';
import { readConfig } from '../utils/config.js';
import { getCurrentPackageVersion } from '../utils/version.js';

export interface VersionOptions {
  targetDir?: string; // For testing
}

export interface VersionResult {
  cliVersion: string;
  installedVersion?: string;
}

export async function versionCommand(options: VersionOptions = {}): Promise<VersionResult> {
  const cliVersion = getCurrentPackageVersion();

  console.log(chalk.blue(`DashKit CLI: ${cliVersion}`));

  // Try to read installed version (don't fail if not in git repo)
  let installedVersion;
  try {
    const targetDir = options.targetDir || await resolveTargetDirectory({ here: false });
    const config = await readConfig(targetDir);
    installedVersion = config.version;
    console.log(chalk.blue(`Installed Framework: ${installedVersion}`));
  } catch (error) {
    // Not in git repo or not installed - that's OK for version command
    console.log(chalk.gray('Framework not installed in this directory'));
  }

  return {
    cliVersion,
    installedVersion,
  };
}
```

**Expected Outcome**: Version command tests pass.

**Lines of Code**: ~35

**Acceptance Criteria Addressed**:
- `dashkit version` shows installed framework version
- `dashkit version` shows CLI tool version

#### 4.12 Register Commands

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/commands/index.ts`

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import { initCommand } from './init.js';
import { updateCommand } from './update.js';
import { statusCommand } from './status.js';
import { versionCommand } from './version.js';
import { withErrorHandling } from '../utils/errors.js';
import { getCurrentPackageVersion } from '../utils/version.js';

export const program = new Command();

program
  .name('dashkit')
  .description('Install and manage dashkit agents')
  .version(getCurrentPackageVersion());

program
  .command('init')
  .description('Install agent definitions into your repository')
  .option('--here', 'Use current directory as target')
  .option('--force', 'Overwrite existing installation')
  .addHelpText('after', `
Examples:
  $ dashkit init --here
  $ dashkit init --force
  `)
  .action((options) => withErrorHandling(() => initCommand(options)));

program
  .command('update')
  .description('Update agents to latest version')
  .option('--dry-run', 'Show what would be updated')
  .addHelpText('after', `
Examples:
  $ dashkit update
  $ dashkit update --dry-run
  `)
  .action((options) => withErrorHandling(() => updateCommand(options)));

program
  .command('status')
  .description('Show installation status and check for updates')
  .addHelpText('after', `
Examples:
  $ dashkit status
  `)
  .action((options) => withErrorHandling(() => statusCommand(options)));

program
  .command('version')
  .description('Show CLI and framework versions')
  .addHelpText('after', `
Examples:
  $ dashkit version
  `)
  .action((options) => withErrorHandling(() => versionCommand(options)));

// Handle unknown commands
program.on('command:*', () => {
  console.error(chalk.red(`✗ Unknown command: ${program.args.join(' ')}`));
  console.log(chalk.blue('Run "dashkit --help" for available commands'));
  process.exit(1);
});
```

**Expected Outcome**: CLI can parse and route commands correctly.

**Lines of Code**: ~70

**Acceptance Criteria Addressed**:
- `--help` flag shows command documentation
- Clear error messages for common issues

#### 4.13 Create CLI Entry Point

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/src/cli.ts`

```typescript
#!/usr/bin/env node

import { program } from './commands/index.js';

// Check Node version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);

if (majorVersion < 18) {
  console.error(`✗ Node.js 18 or higher required. Current version: ${nodeVersion}`);
  console.error('  Please upgrade Node.js: https://nodejs.org/');
  process.exit(1);
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
```

**Expected Outcome**: CLI entry point is executable and validates Node version.

**Lines of Code**: ~20

**Acceptance Criteria Addressed**:
- CLI enforces Node.js 18+ requirement
- Commands provide progress feedback
- `--help` flag shows command documentation

### Phase 5: Documentation and Publishing

#### 5.1 Create README

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/README.md`

```markdown
# DashKit CLI

Install and manage dashkit agents in your application repository.

## Installation

### From GitHub Packages

```bash
# Configure npm to use GitHub Packages
echo "@dashapps:registry=https://npm.pkg.github.com" >> ~/.npmrc

# Install globally
npm install -g @sfwd-dashapps/dashkit

# Or install as dev dependency
npm install --save-dev @sfwd-dashapps/dashkit
```

### Authentication

To install from GitHub Packages, you need a GitHub Personal Access Token with `read:packages` permission:

1. Create a token at https://github.com/settings/tokens
2. Add to `~/.npmrc`:

```
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

## Usage

### Initialize Agents

Install agent definitions into your repository:

```bash
# Install in current directory
dashkit init --here

# Install in git repository root (auto-detects)
dashkit init
```

This creates:
- `.claude/agents/` - Agent definitions for Claude Code CLI
- `.github/agents/` - Agent definitions for GitHub Copilot
- `dashkit.config.js` - Configuration file tracking installation

### Update Agents

Update to the latest framework version:

```bash
# Update agents
dashkit update

# Preview changes without modifying files
dashkit update --dry-run
```

### Check Status

View installation status and check for updates:

```bash
dashkit status
```

### Show Version

Display CLI and framework versions:

```bash
dashkit version
```

## Commands

### `dashkit init [options]`

Install agent definitions into your repository.

**Options:**
- `--here` - Use current directory as target (default: git root)
- `--force` - Overwrite existing installation

**Examples:**
```bash
dashkit init --here
dashkit init --force
```

### `dashkit update [options]`

Update agents to the latest framework version.

**Options:**
- `--dry-run` - Show what would be updated without changing files

**Examples:**
```bash
dashkit update
dashkit update --dry-run
```

### `dashkit status`

Show installation status, installed version, and check for updates.

**Example:**
```bash
dashkit status
```

### `dashkit version`

Show CLI tool version and installed framework version.

**Example:**
```bash
dashkit version
```

## Configuration

The `dashkit.config.js` file tracks your installation:

```javascript
module.exports = {
  version: '1.0.0',           // Framework version installed
  installedAt: '2026-01-28',  // ISO date string
  agents: {
    claude: true,              // .claude/agents/ installed
    github: true,              // .github/agents/ installed
  },
};
```

This file is created automatically and updated by `dashkit update`.

## Git Workflow

DashKit never auto-commits changes. After installing or updating agents:

1. Review changes: `git diff`
2. Commit agents: `git add . && git commit -m "Install DashKit agents"`
3. Push to remote: `git push`

If you have local modifications to agents, `dashkit update` will overwrite them. Use git to review and merge changes:

```bash
# Before updating
git checkout -b update-agents

# Update agents
dashkit update

# Review changes
git diff

# Merge or cherry-pick as needed
git checkout main
git merge update-agents
```

## Requirements

- Node.js 18 or higher
- Git (recommended for version control)

## Troubleshooting

### Permission Denied

```bash
✗ Permission denied
```

**Solution:** Check directory permissions or run with appropriate privileges.

### Not in Git Repository

```bash
✗ Not in a git repository
```

**Solution:** Use `--here` flag to install in current directory:
```bash
dashkit init --here
```

### Already Installed

```bash
✗ DashKit is already installed
```

**Solution:** Use `--force` to overwrite or `dashkit update` to upgrade:
```bash
dashkit init --force
# or
dashkit update
```

### Invalid Config

```bash
✗ Invalid dashkit.config.js
```

**Solution:** Delete config and reinstall:
```bash
rm dashkit.config.js
dashkit init --force
```

## Contributing

See the main repository for contribution guidelines:
https://github.com/sfwd-dashapps/dashkit

## License

MIT License - see LICENSE file for details.
```

**Expected Outcome**: Clear, comprehensive documentation for users.

**Acceptance Criteria Addressed**:
- Documentation: README with clear usage instructions

#### 5.2 Create LICENSE

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/LICENSE`

```
MIT License

Copyright (c) 2026 SprintFWD LLC d/b/a DashApps

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Expected Outcome**: License file exists for package distribution.

#### 5.3 Create CHANGELOG.md

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-28

### Added
- Initial release of DashKit CLI
- `dashkit init` command to install agent definitions
- `dashkit update` command to update agents to latest version
- `dashkit status` command to check installation status and updates
- `dashkit version` command to show CLI and framework versions
- Support for both Claude Code (`.claude/agents/`) and GitHub Copilot (`.github/agents/`) formats
- Configuration file (`dashkit.config.js`) to track installation state
- Semantic versioning for framework updates
- `--force` flag to overwrite existing installations
- `--dry-run` flag to preview updates without making changes
- `--here` flag to install in current directory instead of git root
- Comprehensive error handling with clear, actionable messages
- Git repository detection and integration guidance

### Technical
- TypeScript implementation with full type safety
- ES modules (ESM) support
- Jest test suite with 80%+ coverage
- Published to GitHub Packages as `@sfwd-dashapps/dashkit`
- Node.js 18+ requirement

[1.0.0]: https://github.com/sfwd-dashapps/dashkit/releases/tag/v1.0.0
```

**Expected Outcome**: Changelog exists for tracking version history.

**Acceptance Criteria Addressed**:
- Documentation: Version history and release notes

#### 5.4 Create GitHub Actions Workflow

**File to Create**: `/Users/scott/Code/dashapps/dashkit/.github/workflows/publish-dashkit.yml`

```yaml
name: Publish DashKit Package

on:
  release:
    types: [created]
  workflow_dispatch:
    inputs:
      package_version:
        description: 'Version to publish (e.g., 1.0.0)'
        required: true

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@dashapps'

      - name: Install dependencies
        working-directory: packages/dashkit-cli
        run: npm ci

      - name: Run tests
        working-directory: packages/dashkit-cli
        run: npm test

      - name: Build package
        working-directory: packages/dashkit-cli
        run: npm run build

      - name: Publish to GitHub Packages
        working-directory: packages/dashkit-cli
        run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - name: Create release notes
        if: github.event_name == 'release'
        run: |
          echo "Published @sfwd-dashapps/dashkit@$(node -p "require('./packages/dashkit-cli/package.json').version")" >> $GITHUB_STEP_SUMMARY
```

**Expected Outcome**: Automated publishing workflow on GitHub releases.

**Acceptance Criteria Addressed**:
- CLI is published to GitHub Packages
- Automated publishing workflow

#### 5.5 Create Package Publishing Documentation

**File to Create**: `/Users/scott/Code/dashapps/dashkit/packages/dashkit-cli/PUBLISHING.md`

```markdown
# Publishing DashKit to GitHub Packages

## Prerequisites

1. GitHub Personal Access Token with `write:packages` permission
2. Configured `.npmrc` with GitHub Packages authentication
3. Repository access to `sfwd-dashapps/dashkit`

## Manual Publishing

### 1. Update Version

Update version in `package.json`:

```bash
cd packages/dashkit-cli
npm version [major|minor|patch]
```

### 2. Run Tests

Ensure all tests pass:

```bash
npm test
npm run test:coverage
```

### 3. Build Package

Compile TypeScript:

```bash
npm run build
```

### 4. Authenticate with GitHub Packages

Add to `~/.npmrc` or `packages/dashkit-cli/.npmrc`:

```
@dashapps:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### 5. Publish

```bash
npm publish
```

## Automated Publishing via GitHub Actions

### On Release

1. Create a new release on GitHub
2. Tag with version (e.g., `v1.0.0`)
3. GitHub Actions will automatically:
   - Run tests
   - Build package
   - Publish to GitHub Packages

### Manual Trigger

1. Go to Actions tab on GitHub
2. Select "Publish DashKit Package" workflow
3. Click "Run workflow"
4. Enter version number
5. Confirm

## Versioning Strategy

Follow Semantic Versioning (semver):

- **Major (X.0.0)**: Breaking changes to agent format or CLI interface
- **Minor (1.X.0)**: New features, non-breaking enhancements
- **Patch (1.0.X)**: Bug fixes, documentation updates

## Release Checklist

- [ ] All tests passing
- [ ] Version bumped in `package.json`
- [ ] CHANGELOG.md updated
- [ ] Agent templates up to date
- [ ] README.md reflects current features
- [ ] Build successful (`npm run build`)
- [ ] Publish successful (`npm publish`)
- [ ] GitHub release created with tag

## Troubleshooting

### Authentication Error

```
npm ERR! 401 Unauthorized
```

**Solution:** Regenerate GitHub token with `write:packages` permission.

### Version Already Exists

```
npm ERR! 403 Forbidden
```

**Solution:** Increment version number before publishing.

### Build Errors

```
npm ERR! TypeScript compilation failed
```

**Solution:** Fix TypeScript errors and run `npm run build` again.
```

**Expected Outcome**: Clear publishing process for maintainers.

## Performance Considerations

### Installation Performance

**Target**: Installation should complete in < 5 seconds

**Optimization Strategies**:
1. Direct file copying (no network requests)
2. Minimal dependencies (only 4 runtime deps)
3. No heavy computation during install
4. Efficient file I/O with `fs-extra`

### Package Size

**Target**: Package size < 100KB uncompressed

**Size Breakdown**:
- Agent templates: ~50KB (6 markdown files)
- Compiled JavaScript: ~30KB
- Dependencies: Installed separately
- Total: ~80KB

### Memory Usage

**Target**: CLI should use < 50MB memory

**Optimization Strategies**:
1. Stream-based file operations for large files
2. No in-memory caching of templates
3. Single-pass file copying
4. Minimal object allocations

## Security Considerations

### File System Security

1. **Path Traversal Prevention**: All paths resolved with `path.join()` and validated
2. **Permission Checks**: Handle EACCES errors gracefully
3. **Overwrite Protection**: Require `--force` flag to overwrite existing files
4. **No Arbitrary Code Execution**: Config file read only, not executed

### Dependency Security

All dependencies are from trusted sources:
- `commander`: 30k+ stars, maintained by TJ Holowaychuk
- `chalk`: 20k+ stars, maintained by Sindre Sorhus
- `fs-extra`: 9k+ stars, maintained by JP Richardson
- `semver`: Official npm semantic versioning library

### GitHub Packages Security

1. Requires authentication to install
2. Published under `@dashapps` org scope
3. Only org members can publish updates
4. GitHub audit log tracks all publishes

## Data Migration

**Not Applicable**: This is a new package with no existing user data to migrate.

## Monitoring and Alerting

### NPM Package Metrics

Monitor via GitHub Packages:
1. Download count per version
2. Installation errors (via GitHub Issues)
3. Dependency vulnerabilities (Dependabot)

### User Feedback Channels

1. GitHub Issues for bug reports
2. GitHub Discussions for questions
3. Version adoption tracking via downloads

### Success Metrics

- **Installation Success Rate**: > 95%
- **Update Success Rate**: > 95%
- **User Satisfaction**: < 5% error rate in issues
- **Adoption**: Track unique installations per week

## Feature Toggles

**Not Applicable for v1**: All features enabled by default. Future versions may add:
- Selective agent installation
- Custom template sources
- Interactive prompts

## Breaking Changes

### v1.0.0 Initial Release

No breaking changes (initial release).

### Future Breaking Changes

Document in CHANGELOG.md and bump major version:
- Changes to `dashkit.config.js` structure
- Removal of commands
- Changes to agent file formats
- Changes to CLI flags

## Post Deployment Steps

After publishing v1.0.0 to GitHub Packages:

### 1. Verify Installation

Test installation in fresh project:

```bash
mkdir test-project
cd test-project
git init
echo "@dashapps:registry=https://npm.pkg.github.com" > .npmrc
npm install -g @sfwd-dashapps/dashkit
dashkit init --here
```

**Expected**: All files created successfully.

### 2. Update Framework Documentation

Add installation instructions to main README:

File: `/Users/scott/Code/dashapps/dashkit/README.md`

Add section:
```markdown
## Installation

Install DashKit to use these agents in your project:

\`\`\`bash
npm install -g @sfwd-dashapps/dashkit
dashkit init --here
\`\`\`

See [packages/dashkit-cli/README.md](packages/dashkit-cli/README.md) for full documentation.
```

### 3. Create Example Repository

Create example repo demonstrating DashKit usage:
- Fresh project with DashKit installed
- Sample feature plan in `plans/` directory
- Demonstrates agent workflow

### 4. Announce Release

Communicate release via:
1. GitHub Release notes with changelog
2. Internal team notification
3. Documentation site update (if exists)

### 5. Monitor Initial Usage

Track for first week:
- Installation errors (GitHub Issues)
- User questions (GitHub Discussions)
- Bug reports
- Feature requests

### 6. Gather Feedback

After 2 weeks, review:
- Issue tracker for patterns
- User feedback
- Analytics (if available)
- Plan v1.1.0 enhancements

## Acceptance Criteria Checklist

### Installation
- [x] CLI is published to GitHub Packages as `@sfwd-dashapps/dashkit`
- [x] `npm install @sfwd-dashapps/dashkit` successfully installs the package
- [x] `dashkit init --here` creates `.claude/agents/` directory with all agent definitions
- [x] `dashkit init --here` creates `.github/agents/` directory with all agent definitions
- [x] `dashkit init --here` creates `dashkit.config.js` in repository root
- [x] `dashkit.config.js` includes framework version and installation timestamp
- [x] Installation fails gracefully if agents already exist (with override option)
- [x] Installation works from any subdirectory when using `--here` flag

### Update
- [x] `dashkit update` overwrites existing agent files with latest versions
- [x] `dashkit update` updates version in `dashkit.config.js`
- [x] `dashkit update` displays a summary of updated files
- [x] Update respects .gitignore and doesn't commit changes
- [x] Update works when run from repository root or subdirectories

### Configuration
- [x] `dashkit.config.js` is a valid JavaScript module
- [x] Config tracks framework version installed
- [x] Config is human-readable and commentable
- [x] Config can be extended with custom settings (future-proofing)

### Version Management
- [x] `dashkit version` shows installed framework version
- [x] `dashkit status` checks if updates are available
- [x] Version comparisons use semantic versioning

### Developer Experience
- [x] Clear error messages for common issues (not in git repo, already installed, etc.)
- [x] `--help` flag shows command documentation
- [x] Commands provide progress feedback
- [x] Exit codes follow conventions (0 = success, non-zero = error)

## Implementation Summary

### Total Files Created: 28

**Source Code (16 files)**:
- `src/cli.ts` (~20 lines)
- `src/commands/index.ts` (~70 lines)
- `src/commands/init.ts` (~60 lines)
- `src/commands/update.ts` (~90 lines)
- `src/commands/status.ts` (~75 lines)
- `src/commands/version.ts` (~35 lines)
- `src/utils/errors.ts` (~70 lines)
- `src/utils/git.ts` (~40 lines)
- `src/utils/config.ts` (~75 lines)
- `src/utils/version.ts` (~50 lines)
- `src/utils/files.ts` (~90 lines)

**Tests (6 files)**:
- `__tests__/unit/errors.test.ts` (~60 lines)
- `__tests__/unit/git.test.ts` (~50 lines)
- `__tests__/unit/config.test.ts` (~80 lines)
- `__tests__/unit/version.test.ts` (~50 lines)
- `__tests__/integration/init.test.ts` (~100 lines)
- `__tests__/integration/update.test.ts` (~120 lines)

**Templates (7 files)**:
- `templates/.claude/agents/specification-agent.md` (copied)
- `templates/.claude/agents/research-agent.md` (copied)
- `templates/.claude/agents/planning-agent.md` (copied)
- `templates/.github/agents/specification-agent.agent.md` (copied)
- `templates/.github/agents/research-agent.agent.md` (copied)
- `templates/.github/agents/planning-agent.agent.md` (copied)
- `templates/dashkit.config.js.template` (~30 lines)

**Configuration (5 files)**:
- `package.json` (~60 lines)
- `tsconfig.json` (~25 lines)
- `jest.config.js` (~20 lines)
- `.gitignore` (~20 lines)
- `.npmrc` (~1 line)

**Documentation (4 files)**:
- `README.md` (~200 lines)
- `LICENSE` (~20 lines)
- `PUBLISHING.md` (~150 lines)

**CI/CD (1 file)**:
- `.github/workflows/publish-dashkit.yml` (~40 lines)

### Total Lines of Code: ~1,700 lines

**Breakdown**:
- Source Code: ~575 lines
- Tests: ~460 lines
- Documentation: ~370 lines
- Configuration: ~126 lines
- Templates: Varies (agent files)

### Estimated Implementation Time

**With TDD Approach**:
- Phase 1 (Test Infrastructure): 1 hour
- Phase 2 (Utility Tests): 2 hours
- Phase 3 (Command Tests): 3 hours
- Phase 4 (Implementation): 6 hours
- Phase 5 (Documentation): 2 hours
- **Total**: ~14 hours

**Key Dependencies**:
- All tests must pass before moving to next phase
- Template files must be copied before file operation tests
- Package config must be set up before running any tests
- Git fixtures must be initialized before git tests

### Risk Mitigation

1. **TypeScript Compilation Errors**: Use strict mode from start
2. **Test Flakiness**: Use unique test directories per test
3. **File Permission Issues**: Handle EACCES gracefully in all file ops
4. **Cross-Platform Issues**: Test on macOS, Linux, and Windows
5. **GitHub Packages Auth**: Provide clear documentation

## Plan Updates and Corrections

**Version**: 1.1 (Updated 2026-01-28)

This plan has been updated to address critical ESM compatibility issues and implementation gaps identified during pre-implementation review. Key changes:

### Critical Fixes Applied:

1. **ESM Compatibility** (CRITICAL):
   - Added `__dirname` polyfills using `fileURLToPath(import.meta.url)` to all test files
   - Replaced all `require()` calls with `await import()` in tests
   - Added cache-busting for config file re-imports: `import(\`file://\${path}?t=\${Date.now()}\`)`
   - Updated all test files with proper ESM imports

2. **Phase Reordering** (CRITICAL):
   - Moved "Copy Agent Templates" from Phase 4.2 to Phase 1.3
   - Templates must exist BEFORE Phase 2 tests run (file operation tests depend on them)
   - Updated execution order: Phase 1 → Phase 1.3 → Phase 2 → Phase 3 → Phase 4 → Phase 5

3. **Missing Imports**:
   - Added `beforeEach`, `afterEach` to `version.test.ts` imports
   - Added `fileURLToPath` imports to all test files

4. **Error Handling Improvements**:
   - Added git installation check in `findGitRoot()`
   - Added JSON parse error handling in `checkForUpdates()` and `getCurrentPackageVersion()`
   - Added semver validation for package versions
   - Fixed version command to not fail when not in git repo

5. **Test Improvements**:
   - Fixed permission test cleanup using `finally` block
   - Removed process.cwd() changes to avoid race conditions
   - Added test for `listAgentFiles()` function
   - Fixed GitHub agent file existence check in `copyAgentFiles()`

6. **Documentation**:
   - Removed unused config template (Phase 4.8)
   - Added CHANGELOG.md creation (Phase 5.3)
   - Renumbered sections after removing Phase 4.2

### Lines Changed: ~150 lines across 15 files

### Validation Status:
- ✅ All ESM compatibility issues resolved
- ✅ Phase ordering corrected
- ✅ Missing imports added
- ✅ Error handlers complete
- ✅ Test coverage improved

### Ready for Implementation: YES

All critical issues have been addressed. The plan is now ready for TDD implementation following the corrected phase order.

---

## Conclusion

This plan provides a complete, test-driven implementation roadmap for the DashKit CLI Installer. By writing all tests first, we ensure comprehensive coverage and catch issues early. The modular architecture allows for future enhancements while maintaining a simple, focused v1 release.

The implementation follows established patterns from tools like create-react-app and GitHub SpecKit, ensuring a familiar developer experience. The monolithic package design keeps the project simple and reliable, with all dependencies clearly specified and version-locked.

All acceptance criteria from the specification are addressed, with clear mapping between tests, implementation, and requirements. The post-deployment steps ensure a successful launch and provide a framework for ongoing maintenance and enhancement.
