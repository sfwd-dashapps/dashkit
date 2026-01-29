# Feature Research: DashKit CLI Installer

## Overview

The DashKit CLI Installer is a TypeScript-based command-line tool that distributes agent definitions from the dashkit to target application repositories. This tool enables developers to install and update three specialized agents (specification-agent, research-agent, planning-agent) through simple npm commands, similar to established tools like create-react-app and GitHub's SpecKit.

## Business Requirements

The tool must provide:
1. **Easy Installation**: Developers run `npm install dashkit` and `dashkit init --here` to bootstrap agents
2. **Seamless Updates**: `dashkit update` overwrites agent files with latest framework versions
3. **Dual Format Support**: Install agents in both `.claude/agents/` and `.github/agents/` directories
4. **Version Tracking**: Maintain `dashkit.config.js` to track installation state and version
5. **Git-Friendly**: Work within version-controlled repositories, letting users manage conflicts
6. **Cross-Platform**: Function consistently across macOS, Linux, and Windows

## Technical Analysis

### 1. CLI Framework Selection

**Comparison of Major Frameworks**:

| Framework | Pros | Cons | Recommendation |
|-----------|------|------|----------------|
| **Commander.js** | - Most popular (30k+ stars)<br>- Simple API<br>- TypeScript support<br>- Well-maintained<br>- Git-style subcommands | - Slightly more verbose | **RECOMMENDED** |
| **Yargs** | - Powerful option parsing<br>- Interactive prompts built-in<br>- Builder pattern | - More complex API<br>- Heavier weight | Good alternative |
| **oclif** | - Full-featured framework<br>- Plugin architecture<br>- Testing utilities | - Overkill for simple CLIs<br>- Steeper learning curve | Not needed for v1 |
| **CAC** | - Lightweight<br>- Modern API | - Less mature<br>- Smaller community | Too new |

**Recommendation**: **Commander.js v12+** for its proven track record, excellent TypeScript support, and alignment with our simple command structure.

```typescript
// Example structure with Commander
import { Command } from 'commander';

const program = new Command();

program
  .name('dashkit')
  .description('Install and manage dashkit agents')
  .version('1.0.0');

program
  .command('init')
  .description('Install agent definitions into your repository')
  .option('--here', 'Use current directory as target')
  .option('--force', 'Overwrite existing installation')
  .action(initCommand);

program
  .command('update')
  .description('Update agents to latest version')
  .option('--dry-run', 'Show what would be updated')
  .action(updateCommand);
```

### 2. File Bundling and Distribution Strategy

**How to Bundle Agent Files in NPM Package**:

Three primary approaches:

#### Approach A: Direct File Inclusion (RECOMMENDED)

**Structure**:
```
dashkit/
├── package.json
├── dist/
│   └── cli.js (compiled TypeScript)
├── templates/
│   ├── .claude/
│   │   └── agents/
│   │       ├── specification-agent.md
│   │       ├── research-agent.md
│   │       └── planning-agent.md
│   └── .github/
│       └── agents/
│           ├── specification-agent.agent.md
│           ├── research-agent.agent.md
│           └── planning-agent.agent.md
└── templates/dashkit.config.js.template
```

**package.json configuration**:
```json
{
  "name": "dashkit",
  "version": "1.0.0",
  "bin": {
    "dashkit": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "templates/"
  ]
}
```

**Pros**:
- Simple to implement
- Direct file copying with fs-extra
- Easy to understand and maintain
- Templates visible in package installation

**Cons**:
- Agent files duplicated in package
- Slightly larger package size (~50KB uncompressed)

#### Approach B: Build-Time Embedding

Embed files as strings in TypeScript at build time:

```typescript
// Generated at build time
export const AGENTS = {
  claude: {
    'specification-agent.md': '---\nname: specification-agent\n...',
    'research-agent.md': '---\nname: research-agent\n...',
    'planning-agent.md': '---\nname: planning-agent\n...',
  },
  github: {
    'specification-agent.agent.md': '---\ndescription: ...',
    // ...
  }
};
```

**Pros**:
- Single compiled artifact
- No separate templates directory
- Faster file access (no disk reads)

**Cons**:
- More complex build process
- Harder to inspect/debug
- Requires build tooling (e.g., webpack loaders)

#### Approach C: Dynamic Fetching

Fetch agent files from GitHub on demand:

**Pros**:
- Smallest package size
- Always get latest versions

**Cons**:
- Requires network access
- Slower installation
- Version tracking becomes complex
- Offline usage not possible

**Recommendation**: **Approach A (Direct File Inclusion)** provides the best balance of simplicity, reliability, and maintainability for v1.

### 3. Package Structure and Configuration

**Recommended package.json Structure**:

```json
{
  "name": "@sfwd-dashapps/dashkit",
  "version": "1.0.0",
  "description": "Install and manage dashkit agents",
  "main": "./dist/index.js",
  "bin": {
    "dashkit": "./dist/cli.js"
  },
  "files": [
    "dist/",
    "templates/",
    "README.md",
    "LICENSE"
  ],
  "scripts": {
    "build": "tsc",
    "watch": "tsc --watch",
    "prepublishOnly": "npm run build",
    "test": "jest"
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
    "typescript": "^5.3.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "ts-jest": "^29.1.0"
  }
}
```

**Key Configuration Elements**:

1. **`bin` field**: Maps `dashkit` command to executable
   - CLI file must have shebang: `#!/usr/bin/env node`
   - Will be symlinked to `node_modules/.bin/dashkit` on install

2. **`files` field**: Specifies what to include in published package
   - Only `dist/` and `templates/` needed
   - Keeps package size minimal

3. **`publishConfig`**: Directs publishing to GitHub Packages
   - Requires GitHub authentication token
   - Package name must match GitHub org scope

4. **`engines`**: Enforces Node.js 18+ requirement
   - Ensures compatibility with ES modules and modern APIs

### 4. Making CLI Globally Executable

**Implementation Steps**:

1. **Add Shebang to Entry Point**:

```typescript
#!/usr/bin/env node

// src/cli.ts
import { program } from './commands/index.js';

program.parse(process.argv);
```

2. **Configure TypeScript Compilation**:

```json
// tsconfig.json
{
  "compilerOptions": {
    "module": "ES2022",
    "target": "ES2022",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "esModuleInterop": true,
    "strict": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

3. **Preserve Shebang During Build**:

The TypeScript compiler preserves shebangs automatically. For CLI distribution:

```typescript
// package.json
{
  "type": "module",  // Use ES modules
  "bin": {
    "dashkit": "./dist/cli.js"
  }
}
```

4. **File Permissions**:

NPM automatically handles file permissions when installing from the `bin` field. The shebang line makes the file executable.

**Installation Methods**:

```bash
# Local installation (project-specific)
npm install @sfwd-dashapps/dashkit --save-dev
npx dashkit init --here

# Global installation (system-wide)
npm install -g @sfwd-dashapps/dashkit
dashkit init --here
```

### 5. GitHub Packages Setup

**Publishing to GitHub Packages**:

1. **Authentication**:

```bash
# Create .npmrc in package root
echo "@dashapps:registry=https://npm.pkg.github.com" >> .npmrc

# Authenticate with GitHub token
npm login --registry=https://npm.pkg.github.com
# Username: your-github-username
# Password: your-github-personal-access-token
# Email: your-email
```

2. **Package Naming Convention**:

GitHub Packages requires scoped names matching the GitHub organization:
- Package name: `@sfwd-dashapps/dashkit`
- GitHub org: `dashapps`

3. **Publishing Workflow**:

```bash
# Build package
npm run build

# Publish to GitHub Packages
npm publish
```

4. **GitHub Actions CI/CD** (recommended):

```yaml
# .github/workflows/publish.yml
name: Publish Package

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://npm.pkg.github.com'
      - run: npm ci
      - run: npm run build
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

**User Installation**:

Users need to authenticate once to install from GitHub Packages:

```bash
# Add to ~/.npmrc or project .npmrc
@dashapps:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### 6. File Installation Strategy

**Analysis of Similar Tools**:

#### create-react-app Pattern

- Uses `fs-extra` for robust file operations
- Copies template directory recursively
- Handles conflicts by prompting or aborting
- Creates missing directories automatically

```typescript
// Simplified create-react-app pattern
import fs from 'fs-extra';
import path from 'path';

async function installTemplate(targetDir: string) {
  const templateDir = path.join(__dirname, '..', 'templates');

  // Ensure target exists
  await fs.ensureDir(targetDir);

  // Copy files
  await fs.copy(templateDir, targetDir, {
    overwrite: false,  // Don't overwrite by default
    errorOnExist: true, // Throw if files exist
  });
}
```

#### Rails Generators Pattern

- Templates can include ERB-style interpolation
- Supports conditional file generation
- Tracks generated files in manifest

**Recommendation for DashKit**:

Use **direct file copying** with `fs-extra` for v1:

```typescript
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

interface InstallOptions {
  targetDir: string;
  force?: boolean;
}

async function installAgents(options: InstallOptions): Promise<void> {
  const { targetDir, force = false } = options;

  // Resolve paths
  const templateDir = path.join(__dirname, '..', 'templates');
  const claudeAgentsDir = path.join(targetDir, '.claude', 'agents');
  const githubAgentsDir = path.join(targetDir, '.github', 'agents');

  // Check for existing installation
  const configPath = path.join(targetDir, 'dashkit.config.js');
  if (await fs.pathExists(configPath) && !force) {
    throw new Error(
      'DashKit is already installed. Use --force to overwrite.'
    );
  }

  // Create directories
  await fs.ensureDir(claudeAgentsDir);
  await fs.ensureDir(githubAgentsDir);

  // Copy agent files
  const claudeTemplates = path.join(templateDir, '.claude', 'agents');
  const githubTemplates = path.join(templateDir, '.github', 'agents');

  await fs.copy(claudeTemplates, claudeAgentsDir, {
    overwrite: force,
    errorOnExist: !force,
  });

  await fs.copy(githubTemplates, githubAgentsDir, {
    overwrite: force,
    errorOnExist: !force,
  });

  // Create config file
  const config = generateConfig();
  await fs.writeFile(configPath, config);

  console.log(chalk.green('✓ DashKit agents installed successfully!'));
  console.log(chalk.blue('  .claude/agents/ - 3 agents'));
  console.log(chalk.blue('  .github/agents/ - 3 agents'));
  console.log(chalk.blue('  dashkit.config.js - configuration'));
}
```

**File Conflict Handling**:

Three strategies:
1. **Abort on conflict** (recommended for v1): Fail fast, tell user to use `--force`
2. **Prompt user**: Interactive mode (future enhancement)
3. **Always overwrite**: Use with `--force` flag

**Preserving File Permissions**:

`fs-extra.copy()` preserves file permissions by default. For markdown files, standard permissions (644) are appropriate.

### 7. Update Mechanism Design

**Version Comparison Strategy**:

Use semantic versioning (semver) for robust version comparisons:

```typescript
import semver from 'semver';
import fs from 'fs-extra';
import path from 'path';

interface DashKitConfig {
  version: string;
  installedAt: string;
  agents: {
    claude: boolean;
    github: boolean;
  };
}

async function checkForUpdates(targetDir: string): Promise<{
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
}> {
  const configPath = path.join(targetDir, 'dashkit.config.js');

  // Read installed version
  const config: DashKitConfig = require(configPath);
  const currentVersion = config.version;

  // Get package version (this package's version)
  const packageJson = require('../package.json');
  const latestVersion = packageJson.version;

  return {
    currentVersion,
    latestVersion,
    updateAvailable: semver.gt(latestVersion, currentVersion),
  };
}

async function updateAgents(options: {
  targetDir: string;
  dryRun?: boolean;
}): Promise<void> {
  const { targetDir, dryRun = false } = options;

  // Check version
  const versionCheck = await checkForUpdates(targetDir);

  if (!versionCheck.updateAvailable) {
    console.log(chalk.blue('Already up to date!'));
    return;
  }

  console.log(chalk.yellow(
    `Updating from ${versionCheck.currentVersion} to ${versionCheck.latestVersion}`
  ));

  if (dryRun) {
    console.log(chalk.gray('Dry run mode - no files will be changed'));
    await listFilesToUpdate(targetDir);
    return;
  }

  // Perform update (similar to install, but always overwrite)
  await installAgents({ targetDir, force: true });

  console.log(chalk.green('✓ Update complete!'));
  console.log(chalk.blue('Review changes with: git diff'));
}
```

**How Similar Tools Handle Updates**:

| Tool | Strategy | Notes |
|------|----------|-------|
| **npm** | Semantic versioning, lockfile | Gold standard for dependency management |
| **create-react-app** | Major version upgrades via scripts | `react-scripts` handles internal updates |
| **Homebrew** | Version comparison, formula updates | Shows changelog before upgrade |
| **VS Code Extensions** | Automatic background checks | Notifies user of available updates |

**Recommendation**: Use **semver-based comparison** with manual update command (no automatic updates in v1).

### 8. Configuration File Pattern

**Format Analysis**:

| Format | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **JavaScript (module.exports)** | - Executable (can compute values)<br>- Comments supported<br>- Familiar to Node devs | - Requires require() or import<br>- Parsing complexity | **RECOMMENDED** |
| **JSON** | - Simple parsing<br>- Universal format | - No comments<br>- No computed values | Too rigid |
| **YAML** | - Human-readable<br>- Comments supported | - Requires parser dependency<br>- Less familiar to JS devs | Not needed |
| **TypeScript** | - Type safety<br>- IDE support | - Requires compilation<br>- Too complex for config | Overkill |

**Recommended Config Structure**:

```javascript
// dashkit.config.js
module.exports = {
  // Framework version installed
  version: '1.0.0',

  // ISO 8601 date string
  installedAt: '2026-01-28T10:30:00.000Z',

  // Which agent formats are installed
  agents: {
    claude: true,  // .claude/agents/
    github: true,  // .github/agents/
  },

  // Future extensibility examples:
  // customAgentPaths: {
  //   claude: '.claude/agents',
  //   github: '.github/agents',
  // },
  // selectedAgents: ['specification', 'research', 'planning'],
  // mcpConfig: {
  //   jira: { enabled: true },
  //   github: { enabled: true },
  // },
};
```

**Config File Operations**:

```typescript
import path from 'path';
import fs from 'fs-extra';

// Generate new config
function generateConfig(version: string): string {
  const config = {
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

// Read existing config
async function readConfig(targetDir: string): Promise<any> {
  const configPath = path.join(targetDir, 'dashkit.config.js');

  if (!await fs.pathExists(configPath)) {
    throw new Error('DashKit not installed. Run: dashkit init --here');
  }

  // Dynamic import for ES modules
  const config = await import(configPath);
  return config.default || config;
}

// Update config version
async function updateConfigVersion(
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
```

### 9. Git Repository Integration

**Detecting Git Repository Root**:

```typescript
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';

function findGitRoot(startDir: string = process.cwd()): string | null {
  try {
    const gitRoot = execSync('git rev-parse --show-toplevel', {
      cwd: startDir,
      encoding: 'utf-8',
    }).trim();

    return gitRoot;
  } catch (error) {
    // Not a git repository or git not installed
    return null;
  }
}

function isGitRepository(dir: string): boolean {
  return fs.pathExistsSync(path.join(dir, '.git'));
}

// Usage in init command
async function resolveTargetDirectory(options: {
  here?: boolean;
}): Promise<string> {
  if (options.here) {
    // Use current directory
    return process.cwd();
  }

  // Find git root
  const gitRoot = findGitRoot();

  if (!gitRoot) {
    console.log(chalk.yellow(
      '⚠ Not in a git repository. Use --here to install in current directory.'
    ));
    process.exit(1);
  }

  return gitRoot;
}
```

**Best Practices for Version Control Integration**:

1. **Never auto-commit**: Let users review changes with `git diff`
2. **Remind users to review**: Display message after install/update
3. **Respect .gitignore**: Don't modify version control settings
4. **Stage guidance**: Suggest `git add` commands in success message

```typescript
function displayGitGuidance(): void {
  console.log(chalk.blue('\nNext steps:'));
  console.log(chalk.blue('1. Review changes: git diff'));
  console.log(chalk.blue('2. Commit agents: git add . && git commit -m "Install DashKit agents"'));
  console.log(chalk.blue('3. Start using agents in your project'));
}
```

### 10. Error Handling Requirements

**Critical Error Cases to Handle**:

```typescript
class DashKitError extends Error {
  constructor(
    message: string,
    public code: string,
    public exitCode: number = 1
  ) {
    super(message);
    this.name = 'DashKitError';
  }
}

// Error definitions
const ERRORS = {
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
    'Node.js 18 or higher required. Current version: ' + process.version,
    'NODE_VERSION',
    1
  ),

  INVALID_CONFIG: new DashKitError(
    'Invalid dashkit.config.js. Delete and run "dashkit init --force" to reinstall.',
    'INVALID_CONFIG',
    1
  ),
};

// Error handling wrapper
async function withErrorHandling<T>(
  fn: () => Promise<T>
): Promise<T | never> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof DashKitError) {
      console.error(chalk.red(`✗ ${error.message}`));
      process.exit(error.exitCode);
    }

    if (error.code === 'EACCES') {
      console.error(chalk.red('✗ Permission denied'));
      console.error(chalk.gray('Try running with appropriate permissions'));
      process.exit(1);
    }

    if (error.code === 'ENOSPC') {
      console.error(chalk.red('✗ No space left on device'));
      process.exit(1);
    }

    // Unexpected error
    console.error(chalk.red('✗ Unexpected error:'));
    console.error(error);
    process.exit(1);
  }
}
```

**User-Facing Error Messages**:

Follow these principles:
- Clear, actionable error messages
- Suggest next steps when possible
- Use color coding (red for errors, yellow for warnings)
- Include error codes for debugging

```typescript
// Good error message
console.error(chalk.red('✗ DashKit is already installed'));
console.error(chalk.gray('  To overwrite: dashkit init --force'));
console.error(chalk.gray('  To update: dashkit update'));

// Bad error message
console.error('Error: exists');
```

### 11. CLI UX Best Practices

**Progress Indicators**:

For file operations, show progress:

```typescript
import ora from 'ora';  // Optional: spinner library

async function installWithProgress(): Promise<void> {
  const spinner = ora('Installing DashKit agents...').start();

  try {
    await fs.ensureDir(claudeAgentsDir);
    spinner.text = 'Creating .claude/agents/...';

    await fs.copy(claudeTemplates, claudeAgentsDir);
    spinner.text = 'Installing Claude agents...';

    await fs.ensureDir(githubAgentsDir);
    spinner.text = 'Creating .github/agents/...';

    await fs.copy(githubTemplates, githubAgentsDir);
    spinner.text = 'Installing GitHub agents...';

    await fs.writeFile(configPath, config);
    spinner.succeed('DashKit installed successfully!');
  } catch (error) {
    spinner.fail('Installation failed');
    throw error;
  }
}
```

**Color Conventions**:

```typescript
import chalk from 'chalk';

// Success
console.log(chalk.green('✓ Success message'));

// Info
console.log(chalk.blue('ℹ Info message'));

// Warning
console.log(chalk.yellow('⚠ Warning message'));

// Error
console.log(chalk.red('✗ Error message'));

// Muted/secondary
console.log(chalk.gray('Additional details'));
```

**Help Documentation**:

Commander.js provides automatic `--help` generation:

```typescript
program
  .command('init')
  .description('Install DashKit agent definitions')
  .option('--here', 'Use current directory instead of git root')
  .option('--force', 'Overwrite existing installation')
  .addHelpText('after', `
Examples:
  $ dashkit init --here
  $ dashkit init --force
  `)
  .action(initCommand);
```

### 12. Testing Strategy

**Test Structure**:

```typescript
// __tests__/init.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'jest';
import fs from 'fs-extra';
import path from 'path';
import { initCommand } from '../src/commands/init';

describe('dashkit init', () => {
  const testDir = path.join(__dirname, 'fixtures', 'test-repo');

  beforeEach(async () => {
    await fs.ensureDir(testDir);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should install agents in .claude/agents/', async () => {
    await initCommand({ targetDir: testDir });

    const claudeAgents = path.join(testDir, '.claude', 'agents');
    expect(await fs.pathExists(claudeAgents)).toBe(true);

    const files = await fs.readdir(claudeAgents);
    expect(files).toContain('specification-agent.md');
    expect(files).toContain('research-agent.md');
    expect(files).toContain('planning-agent.md');
  });

  it('should create dashkit.config.js', async () => {
    await initCommand({ targetDir: testDir });

    const configPath = path.join(testDir, 'dashkit.config.js');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = require(configPath);
    expect(config.version).toBeDefined();
    expect(config.installedAt).toBeDefined();
  });

  it('should fail if already installed without --force', async () => {
    await initCommand({ targetDir: testDir });

    await expect(
      initCommand({ targetDir: testDir })
    ).rejects.toThrow('already installed');
  });

  it('should overwrite with --force flag', async () => {
    await initCommand({ targetDir: testDir });

    const configPath = path.join(testDir, 'dashkit.config.js');
    const originalConfig = await fs.readFile(configPath, 'utf-8');

    await new Promise(resolve => setTimeout(resolve, 10)); // Ensure time difference

    await initCommand({ targetDir: testDir, force: true });

    const newConfig = await fs.readFile(configPath, 'utf-8');
    expect(newConfig).not.toBe(originalConfig);
  });
});
```

## Implementation Approaches

### Approach 1: Monolithic Package (RECOMMENDED)

**Description**: Single npm package containing CLI tool and agent templates.

**Structure**:
```
dashkit/
├── src/
│   ├── cli.ts              # Entry point
│   ├── commands/
│   │   ├── init.ts
│   │   ├── update.ts
│   │   ├── status.ts
│   │   └── version.ts
│   └── utils/
│       ├── git.ts
│       ├── config.ts
│       └── files.ts
├── templates/
│   ├── .claude/agents/
│   └── .github/agents/
├── package.json
├── tsconfig.json
└── README.md
```

**Pros**:
- Simple distribution model
- Self-contained package
- Easy version synchronization
- Straightforward installation

**Cons**:
- Agent updates require package republish
- Package contains both code and data

**Complexity**: Low

**Recommendation**: Use this for v1.

### Approach 2: Separate Data Package

**Description**: CLI tool and agent templates in separate packages.

**Structure**:
```
@sfwd-dashapps/dashkit          # CLI tool
@sfwd-dashapps/dashkit-agents   # Agent templates
```

**Pros**:
- Separate versioning for CLI and agents
- Smaller CLI package
- Could support multiple agent sources

**Cons**:
- More complex dependency management
- Two packages to maintain
- Version coordination complexity
- Users might install only one package

**Complexity**: Medium-High

**Recommendation**: Not recommended for v1; consider for v2 if needed.

### Approach 3: Registry + CLI

**Description**: CLI fetches agents from external registry on demand.

**Pros**:
- Always get latest agents
- CLI updates separate from agent updates
- Could support multiple frameworks

**Cons**:
- Requires network access
- Complex version management
- Offline usage impossible
- Registry infrastructure needed

**Complexity**: High

**Recommendation**: Not appropriate for v1.

## Technology Recommendations

### Core Dependencies

| Library | Version | Purpose | Justification |
|---------|---------|---------|---------------|
| **commander** | ^12.1.0 | CLI framework | Industry standard, excellent TypeScript support |
| **chalk** | ^5.3.0 | Colorized output | Best-in-class terminal styling |
| **fs-extra** | ^11.2.0 | File operations | Robust file system utilities with promises |
| **semver** | ^7.6.0 | Version comparison | Semantic versioning standard |

### Development Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| **typescript** | ^5.3.0 | Type safety and modern JS features |
| **@types/node** | ^20.11.0 | Node.js type definitions |
| **@types/fs-extra** | ^11.0.4 | fs-extra type definitions |
| **jest** | ^29.7.0 | Testing framework |
| **ts-jest** | ^29.1.0 | TypeScript support for Jest |

### Optional Dependencies (Future)

| Library | Purpose | When to Add |
|---------|---------|-------------|
| **ora** | Spinner animations | When adding interactive progress |
| **inquirer** | Interactive prompts | When adding interactive mode |
| **update-notifier** | Update availability checks | When adding auto-update checks |

### Recommended TypeScript Configuration

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
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "__tests__"]
}
```

## Risk Assessment

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **GitHub Packages auth complexity** | High | Medium | Provide clear documentation, consider npm registry as alternative |
| **Cross-platform path handling** | Medium | Medium | Use `path.join()` and test on all platforms |
| **File permission issues** | Medium | Medium | Robust error handling, clear error messages |
| **Config file parsing errors** | Low | Low | Use try-catch, provide fallback/reinstall option |
| **Version desync between CLI and agents** | Low | Low | Monolithic package approach prevents this |
| **Git repository detection failures** | Low | Medium | Graceful fallback to `--here` flag |

### Operational Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Users don't review git changes** | High | Low | Prominent reminder messages, suggest `git diff` |
| **Merge conflicts on update** | Medium | Low | Document git workflow, embrace git's conflict resolution |
| **Breaking changes to agent format** | Low | High | Semantic versioning, changelog documentation |
| **Users modify agents and lose changes** | Medium | Medium | Warn before overwriting, suggest git branch workflow |

### Dependency Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Commander.js breaking changes** | Low | Medium | Pin major version, test before upgrading |
| **Chalk v5 ESM-only** | N/A | Low | Already using ES modules |
| **Node.js version incompatibility** | Low | High | Engines field enforcement, CI testing across versions |

## Testing Considerations

### Test Coverage Requirements

1. **Unit Tests**:
   - Config file generation and parsing
   - Version comparison logic
   - Git repository detection
   - File path resolution

2. **Integration Tests**:
   - Complete init flow
   - Update flow with version changes
   - Error handling for all error cases
   - Cross-platform compatibility

3. **E2E Tests**:
   - Full installation in fresh repository
   - Update from v1.0.0 to v1.1.0
   - Force overwrite scenario
   - Dry-run mode validation

### Test Fixtures

```
__tests__/
├── fixtures/
│   ├── empty-repo/
│   ├── existing-installation/
│   └── modified-agents/
├── unit/
│   ├── config.test.ts
│   ├── git.test.ts
│   └── version.test.ts
└── integration/
    ├── init.test.ts
    ├── update.test.ts
    └── errors.test.ts
```

### Mocking Strategy

Mock file system operations for fast unit tests:

```typescript
jest.mock('fs-extra');
import fs from 'fs-extra';

const mockFs = fs as jest.Mocked<typeof fs>;

beforeEach(() => {
  mockFs.pathExists.mockResolvedValue(false);
  mockFs.ensureDir.mockResolvedValue(undefined);
});
```

Use real file system for integration tests in temp directories.

## Open Questions

1. **Should we support selective agent installation?**
   - Future enhancement: `dashkit init --agents=specification,research`
   - Decision: Not for v1, document as future feature

2. **Should we check for updates automatically on each run?**
   - Consideration: Adds network latency to every command
   - Recommendation: Manual check via `dashkit status` for v1

3. **How do we handle agent format changes between versions?**
   - Example: Frontmatter field additions/removals
   - Recommendation: Treat as breaking change, major version bump

4. **Should config file be JSON or JS?**
   - Analysis: JS allows comments and future extensibility
   - Recommendation: Use `.js` module format

5. **What's the migration path for users with custom modifications?**
   - Recommendation: Document git branching strategy for customizations
   - Future: Consider merge tool integration

6. **Should we support installation in non-git repositories?**
   - Decision: Yes, via `--here` flag, but warn user
   - Rationale: Some users might have other VCS or no VCS

7. **How do we communicate breaking changes in agent updates?**
   - Recommendation: CHANGELOG.md + breaking change notices in update output
   - Consider: Major version bumps for agent contract changes

## References

### External Documentation

- **Commander.js**: https://github.com/tj/commander.js
- **fs-extra**: https://github.com/jprichardson/node-fs-extra
- **Chalk**: https://github.com/chalk/chalk
- **Semver**: https://github.com/npm/node-semver
- **GitHub Packages**: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry

### Similar Tools Analysis

1. **GitHub SpecKit** (https://github.com/github/spec-kit):
   - CLI tool for installing agent scripts
   - Uses direct file copying approach
   - Simple command structure (`spec-kit init`)
   - Good reference for agent distribution pattern

2. **create-react-app**:
   - Gold standard for project initialization
   - Template copying with `fs-extra`
   - Clear success/error messaging
   - Good reference for UX patterns

3. **npm/yarn CLI**:
   - Industry standard for package management
   - Excellent error handling
   - Good reference for CLI structure

### Code References (within dashkit)

- **Agent Definitions**:
  - `.claude/agents/specification-agent.md` (79 lines)
  - `.claude/agents/research-agent.md` (221 lines)
  - `.claude/agents/planning-agent.md` (80 lines)
  - `.github/agents/specification-agent.agent.md`
  - `.github/agents/research-agent.agent.md`
  - `.github/agents/planning-agent.agent.md`

- **Framework Documentation**:
  - `CLAUDE.md` - Framework overview and workflow
  - Agent definitions include frontmatter metadata

## Appendix: Project Structure Example

```
dashkit/
├── packages/
│   └── dashkit/                    # New package
│       ├── src/
│       │   ├── cli.ts             # Entry point with shebang
│       │   ├── commands/
│       │   │   ├── index.ts       # Command registration
│       │   │   ├── init.ts        # Init command implementation
│       │   │   ├── update.ts      # Update command implementation
│       │   │   ├── status.ts      # Status command implementation
│       │   │   └── version.ts     # Version command implementation
│       │   └── utils/
│       │       ├── git.ts         # Git operations
│       │       ├── config.ts      # Config file operations
│       │       ├── files.ts       # File copying utilities
│       │       ├── version.ts     # Version comparison
│       │       └── errors.ts      # Error definitions
│       ├── templates/
│       │   ├── .claude/
│       │   │   └── agents/
│       │   │       ├── specification-agent.md
│       │   │       ├── research-agent.md
│       │   │       └── planning-agent.md
│       │   ├── .github/
│       │   │   └── agents/
│       │   │       ├── specification-agent.agent.md
│       │   │       ├── research-agent.agent.md
│       │   │       └── planning-agent.agent.md
│       │   └── dashkit.config.js.template
│       ├── __tests__/
│       │   ├── fixtures/
│       │   ├── unit/
│       │   └── integration/
│       ├── package.json
│       ├── tsconfig.json
│       ├── jest.config.js
│       ├── README.md
│       └── LICENSE
├── .claude/agents/                # Source of truth for agents
├── .github/agents/               # Source of truth for agents
└── plans/
    └── dashkit-cli-installer/
        ├── OVERVIEW.md
        ├── SPECIFICATION.md
        └── RESEARCH.md           # This file
```

## Summary and Recommendations

### Key Decisions

1. **CLI Framework**: Use Commander.js v12+ for proven reliability and TypeScript support
2. **File Distribution**: Direct file inclusion in package (Approach A)
3. **Package Structure**: Monolithic package combining CLI and templates
4. **Configuration Format**: JavaScript module (`dashkit.config.js`) for flexibility
5. **Version Management**: Semantic versioning with manual updates
6. **Git Integration**: Detect git root, never auto-commit, guide users
7. **Error Handling**: Comprehensive error cases with actionable messages
8. **Testing**: Jest with unit, integration, and E2E test coverage

### Implementation Priority

**Phase 1: Core Functionality** (MVP)
- [x] Basic CLI structure with Commander.js
- [x] `dashkit init --here` command
- [x] File copying from templates
- [x] Config file generation
- [x] Basic error handling

**Phase 2: Update Support**
- [x] `dashkit update` command
- [x] Version comparison with semver
- [x] Config file updating
- [x] Git repository detection

**Phase 3: Polish**
- [x] Colorized output with Chalk
- [x] `dashkit status` and `dashkit version` commands
- [x] Comprehensive error messages
- [x] Help documentation

**Phase 4: Publishing**
- [x] GitHub Packages setup
- [x] GitHub Actions CI/CD
- [x] README and documentation
- [x] Test coverage

### Next Steps for Planning Agent

The planning agent should use this research to create a detailed implementation plan that includes:

1. **Package scaffolding**: Directory structure, package.json, tsconfig.json
2. **Command implementation**: Detailed steps for each command with code examples
3. **Test specifications**: Specific test cases to write before implementation
4. **GitHub Packages setup**: Authentication, publishing workflow
5. **Documentation**: README structure, usage examples
6. **CI/CD pipeline**: GitHub Actions workflow for testing and publishing

All file paths, library versions, and technical specifications are provided above for reference.
