# DashKit

A structured feature planning agent framework for disciplined software development. DashKit provides specialized agents for Claude Code and GitHub Copilot that coordinate to guide feature development from initial specification through to implementation planning.

## Overview

DashKit enforces a documentation-driven approach to building complex features through three specialized agents:

- **specification-agent**: Creates comprehensive specifications from feature requests
- **research-agent**: Investigates technical requirements and existing codebase patterns
- **planning-agent**: Produces detailed, actionable implementation plans

These agents coordinate to produce structured documentation in the `plans/` directory that guides feature development.

## Repository Structure

```
dashkit/
├── .claude/agents/          # Claude Code agent definitions
├── .github/agents/          # GitHub Copilot agent definitions
├── packages/
│   └── dashkit-cli/         # CLI tool for installing agents
└── plans/                   # Feature planning documentation
```

## Installation

### Using the CLI (Recommended)

The DashKit CLI installs agent definitions into your project:

```bash
# Install the CLI globally
npm install -g @sfwd-dashapps/dashkit

# Install agents in your project
cd your-project
dashkit init --here
```

### Manual Installation

Copy agent files from this repository into your project:

```bash
# Copy Claude agents
cp -r .claude/agents/ your-project/.claude/agents/

# Copy GitHub agents
cp -r .github/agents/ your-project/.github/agents/
```

## Usage

Once installed, invoke agents through Claude Code or GitHub Copilot:

### Claude Code

```bash
# Invoke an agent
@specification-agent Create a user authentication system

# Agents are available in chat or inline
```

### GitHub Copilot

```bash
# In VS Code or CLI
/specification-agent Create a user authentication system
```

## Agent Workflow

1. **Specification Phase**: User provides feature request to specification-agent
2. **Research Phase**: Specification-agent delegates to research-agent to analyze codebase
3. **Planning Phase**: Planning-agent creates detailed implementation plans per ticket

All phases produce markdown documentation in `plans/[feature-name]/`.

## Documentation Structure

Each feature produces:

- `SPECIFICATION.md` - User stories and acceptance criteria
- `OVERVIEW.md` - High-level summary for stakeholders
- `RESEARCH.md` - Technical analysis and existing patterns
- `[ticket-number]/PLAN.md` - Step-by-step implementation plans

## CLI Tool

The `dashkit` CLI manages agent installations:

```bash
dashkit init       # Install agents
dashkit update     # Update to latest version
dashkit status     # Check installation status
dashkit version    # Show version information
```

See [packages/dashkit-cli/README.md](packages/dashkit-cli/README.md) for full CLI documentation.

## Integration Requirements

DashKit agents integrate with:

- **Jira**: Create epics, stories, and tasks (requires MCP access)
- **GitHub**: Reference code patterns and issues (requires MCP access)
- **Project Guidelines**: References `.github/copilot-instructions.md`, `CLAUDE.md`, etc.

## Development

This repository uses:

- **Monorepo structure**: CLI tool in `packages/`
- **Agent definitions**: Markdown files with frontmatter
- **Plan templates**: Structured markdown for documentation

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Project Context

For Claude Code context about working in this repository, see [CLAUDE.md](CLAUDE.md).

## License

MIT License

Copyright (c) 2026 SprintFWD LLC

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions: 

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software. 

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
