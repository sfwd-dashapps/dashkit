# DashKit CLI Installer Specification

## Overview

Create a CLI tool called `dashkit` that allows developers to install and update the dashkit agent definitions in their application repositories.

### Rationale

The framework provides valuable agent definitions for structured feature development, but there's currently no distribution mechanism. Developers must manually copy files, leading to:
- Inconsistent installations
- Difficulty tracking which version is installed
- No easy way to receive updates
- Barrier to adoption

A CLI tool solves these problems by providing a standard, automated installation and update mechanism similar to established tools like `create-react-app`, Rails generators, and GitHub SpecKit.

### Desired Outcomes

1. Developers can install `dashkit` via npm/GitHub Packages
2. Running `dashkit init` installs agent definitions into their repository
3. Running `dashkit update` updates agents to the latest framework version
4. A config file tracks installation state and version
5. Users can manage local modifications through git version control

### User Stories

**As a developer adopting the framework**, I want to run a simple command to install the agent definitions, so that I can start using structured feature planning immediately without manual file copying.

**Given** I have an application repository
**When** I run `npm install dashkit` followed by `dashkit init --here`
**Then** the agent definitions should be installed in both `.claude/agents/` and `.github/agents/` directories
**And** a `dashkit.config.js` file should be created tracking the installation

**As a developer with the framework installed**, I want to update my agents when the framework improves, so that I benefit from bug fixes and enhancements.

**Given** I have dashkit agents installed in my repository
**When** I run `dashkit update`
**Then** the agent files should be overwritten with the latest versions from the framework
**And** the version in `dashkit.config.js` should be updated
**And** I should see a summary of what was updated

**As a developer who has customized agents**, I want git to track agent file changes, so that I can review and merge updates safely.

**Given** I have modified agent files locally
**When** I run `dashkit update`
**Then** the files should be overwritten
**And** git should show the changes as uncommitted modifications
**And** I can use git diff and merge tools to resolve conflicts

**As a project maintainer**, I want to see which version of dashkit is installed, so that I can troubleshoot issues and plan upgrades.

**Given** dashkit is installed in my repository
**When** I run `dashkit version` or `dashkit status`
**Then** I should see the currently installed framework version
**And** whether updates are available

### Acceptance Criteria

**Installation**:
- [ ] CLI is published to GitHub Packages as `dashkit`
- [ ] `npm install dashkit` successfully installs the package
- [ ] `dashkit init --here` creates `.claude/agents/` directory with all agent definitions
- [ ] `dashkit init --here` creates `.github/agents/` directory with all agent definitions
- [ ] `dashkit init --here` creates `dashkit.config.js` in repository root
- [ ] `dashkit.config.js` includes framework version and installation timestamp
- [ ] Installation fails gracefully if agents already exist (with override option)
- [ ] Installation works from any subdirectory when using `--here` flag

**Update**:
- [ ] `dashkit update` overwrites existing agent files with latest versions
- [ ] `dashkit update` updates version in `dashkit.config.js`
- [ ] `dashkit update` displays a summary of updated files
- [ ] Update respects .gitignore and doesn't commit changes
- [ ] Update works when run from repository root or subdirectories

**Configuration**:
- [ ] `dashkit.config.js` is a valid JavaScript module
- [ ] Config tracks framework version installed
- [ ] Config is human-readable and commentable
- [ ] Config can be extended with custom settings (future-proofing)

**Version Management**:
- [ ] `dashkit version` shows installed framework version
- [ ] `dashkit status` checks if updates are available
- [ ] Version comparisons use semantic versioning

**Developer Experience**:
- [ ] Clear error messages for common issues (not in git repo, already installed, etc.)
- [ ] `--help` flag shows command documentation
- [ ] Commands provide progress feedback
- [ ] Exit codes follow conventions (0 = success, non-zero = error)

## Technical Requirements

### Distribution
- **Package Name**: `dashkit`
- **Registry**: GitHub Packages (github.com/sfwd-dashapps org)
- **Package Manager**: npm
- **Language**: TypeScript compiled to JavaScript
- **Node Version**: Target Node 18+ (LTS)

### CLI Framework
- Use a modern CLI framework (commander.js, yargs, or similar)
- Support common flags: `--help`, `--version`, `--here`
- Colorized output for better UX (chalk or similar)
- Proper exit codes and error handling

### File Operations
- Copy agent files from package installation location to target repository
- Create directories if they don't exist
- Handle file permissions appropriately
- Detect git repository root (for relative path handling)

### Configuration File Format
```javascript
// dashkit.config.js
module.exports = {
  version: '1.0.0',           // Framework version installed
  installedAt: '2025-01-28',  // ISO date string
  agents: {
    claude: true,              // .claude/agents/ installed
    github: true,              // .github/agents/ installed
  },
  // Future: custom agent settings, paths, etc.
};
```

### Source Control Integration
- Detect if directory is a git repository
- Don't auto-commit changes (let users review)
- Provide informative messages about reviewing changes

### Commands

**`dashkit init [options]`**
- `--here`: Use current directory as target (default: look for repo root)
- `--force`: Overwrite existing installation
- Installs agents and creates config

**`dashkit update [options]`**
- `--dry-run`: Show what would be updated without changing files
- Updates agents and config

**`dashkit version`**
- Shows installed framework version from config
- Shows CLI tool version

**`dashkit status`**
- Shows installation status
- Checks if updates available
- Shows which agents are installed

## Dependencies

### Required External Tools
- Node.js 18+ runtime
- npm (for package installation)
- git (recommended for tracking changes, not strictly required)

### MCP/Integration Dependencies
- **Jira MCP**: Users must configure Jira MCP tools separately if they want Jira integration
- **GitHub MCP**: Users must configure GitHub MCP tools separately if they want GitHub integration
- These are documented as optional but recommended dependencies

### Package Dependencies
- CLI framework (commander.js or yargs)
- File system utilities (fs-extra)
- Colorized output (chalk)
- YAML/JSON parsing if needed
- Semantic versioning library (semver)

## Non-Functional Requirements

- **Performance**: Installation should complete in < 5 seconds
- **Reliability**: Must handle common error cases gracefully
- **Maintainability**: TypeScript codebase with tests
- **Documentation**: README with clear usage instructions
- **Portability**: Works on macOS, Linux, Windows

## Future Enhancements (Out of Scope for v1)

- Interactive prompts for configuration
- Selective agent installation (choose which agents to install)
- Custom agent templates/overrides
- Agent format selection (Claude only, GitHub only, or both)
- Automatic update checks on invocation
- Plugin/extension system
- Workspace file generation
- MCP configuration helpers
- Multiple framework sources/registries

## Diagrams and References

### Installation Flow
```
User runs: npm install dashkit
          ↓
User runs: dashkit init --here
          ↓
Check: Is this a valid target directory?
          ↓
Check: Are agents already installed?
          ↓
Create: .claude/agents/ directory
          ↓
Copy: specification-agent.md, research-agent.md, planning-agent.md
          ↓
Create: .github/agents/ directory
          ↓
Copy: specification-agent.agent.md, research-agent.agent.md, planning-agent.agent.md
          ↓
Create: dashkit.config.js
          ↓
Success: Display summary and next steps
```

### Update Flow
```
User runs: dashkit update
          ↓
Check: Is dashkit installed? (dashkit.config.js exists)
          ↓
Fetch: Latest agent files from package
          ↓
Overwrite: .claude/agents/* files
          ↓
Overwrite: .github/agents/* files
          ↓
Update: dashkit.config.js with new version
          ↓
Display: Summary of updated files
          ↓
Remind: Review changes with git diff
```

## Reference Projects

- **GitHub SpecKit**: https://github.com/github/spec-kit - CLI for installing agent scripts
- **create-react-app**: Standard for project initialization CLIs
- **Rails generators**: Pattern for code generation and scaffolding
- **npm/yarn**: Package manager CLI patterns
