# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Purpose

This repository defines a **structured feature planning agent framework** for agentic coding. It uses specialized agents built for Claude Code or Github Copilot that work together to guide feature development from initial specification through to implementation planning. The framework enforces a disciplined, documentation-driven approach to building complex features.

This repository also includes a **CLI tool** (`packages/dashkit-cli/`) that allows users to install agent definitions into their own projects.

## Architecture Overview

This is a **meta-repository** that contains agent definitions which operate in the context of your actual application codebase. The agents coordinate to produce comprehensive documentation that guides feature development.

### Agent Orchestration Flow

```
User Feature Request
        ↓
specification-agent (Epic owner)
        ├→ Creates SPECIFICATION.md, OVERVIEW.md, RESEARCH.md skeleton
        ├→ Creates/updates Jira Epic
        ├→ Delegates to research-agent
        │       ↓
        │   research-agent
        │       ├→ Analyzes codebase patterns
        │       ├→ Investigates technical requirements
        │       ├→ Populates RESEARCH.md
        │       └→ Returns findings
        ├→ Creates Story/Task Jira tickets
        └→ Delegates each ticket to planning-agent
                ↓
        planning-agent (per Story/Task)
                ├→ Reviews RESEARCH.md + SPECIFICATION.md
                ├→ Creates detailed PLAN.md
                └→ Updates Jira ticket
```

### Directory Structure

```
dashkit/
├── .claude/agents/          # Claude Code agent definitions
├── .github/agents/          # GitHub Copilot agent definitions
├── packages/
│   └── dashkit-cli/         # CLI tool for distributing agents
│       ├── src/             # TypeScript source code
│       ├── templates/       # Agent templates bundled in package
│       ├── __tests__/       # Test suite (Vitest)
│       └── dist/            # Compiled output
└── plans/
    └── [feature-name-slug]/
        ├── SPECIFICATION.md    # User stories, acceptance criteria (specification-agent)
        ├── OVERVIEW.md         # High-level summary for stakeholders (specification-agent)
        ├── RESEARCH.md         # Technical analysis, existing patterns (research-agent)
        └── [jira-ticket-number]/
            └── PLAN.md         # Implementation steps, test specs (planning-agent)
```

## Agent Definitions

### Two Locations for Agent Files

Agents are defined in **two parallel locations**:

1. **`.claude/agents/`** - Agent definitions for Claude Code CLI
2. **`.github/agents/`** - Agent definitions for Copilot (Github, VSCode Copilot, Copilot CLI)

Both locations contain the same three agents but in slightly different formats:
- `.claude/` uses frontmatter with `name`, `description`, `model`, `color`
- `.github/` uses frontmatter with `description`, `tools` (MCP-style)

**When modifying agents, update both locations to maintain consistency.**

### specification-agent

**Purpose**: Creates comprehensive specifications from feature requests.

**Key Responsibilities**:
- Creates SPECIFICATION.md with user stories and acceptance criteria
- Creates OVERVIEW.md for stakeholders
- Creates skeleton RESEARCH.md (headers only)
- Creates or references Jira Epic
- Delegates to research-agent to populate RESEARCH.md
- Creates Story/Task Jira tickets from user stories
- Delegates each ticket to planning-agent

**Model**: Opus (high-reasoning for requirements analysis)

**Guidelines References**: `.github/copilot-instructions.md`, `**/AGENTS.md`, `**/CLAUDE.md`, `**/CONTRIBUTING.md`, `**/README.md`

### research-agent

**Purpose**: Investigates technical requirements and codebase patterns to inform implementation.

**Key Responsibilities**:
- Analyzes existing codebase patterns and similar features
- Investigates external APIs and integration points
- Identifies technical dependencies and constraints
- Documents findings in RESEARCH.md with code references
- Provides recommendations for implementation approaches

**Model**: Sonnet (balanced reasoning and efficiency)

**Key Focus Areas**:
- Current state analysis with file paths and line numbers
- Existing patterns to follow
- Performance implications
- Security considerations
- Data migration requirements

### planning-agent

**Purpose**: Creates detailed, actionable implementation plans from research and specifications.

**Key Responsibilities**:
- Reviews RESEARCH.md and SPECIFICATION.md
- Creates step-by-step implementation plan in PLAN.md
- Defines test specifications for TDD
- Provides exact code recommendations with file paths and line numbers
- Maps plan steps to acceptance criteria
- Updates Jira tickets with implementation details

**Model**: Sonnet (detailed planning)

**Planning Considerations**:
- Test-Driven Development approach
- Full-stack implementation coordination
- Performance optimization strategies
- Data migration plans
- Monitoring and alerting setup
- Feature toggles
- Breaking changes documentation
- Post-deployment steps

## Workflow Guidelines

### Starting a New Feature

1. **Provide the feature request** to the specification-agent (or let it be invoked by another agent)
2. The specification-agent will:
   - Ask clarifying questions if needed
   - Create the plan directory structure
   - Draft SPECIFICATION.md and OVERVIEW.md
   - Create/reference a Jira Epic
   - Automatically invoke research-agent
3. The research-agent will:
   - Analyze relevant codebase areas
   - Document findings in RESEARCH.md
   - Provide implementation recommendations
4. The specification-agent will then:
   - Create Story/Task Jira tickets
   - Automatically invoke planning-agent for each ticket
5. The planning-agent(s) will:
   - Create detailed PLAN.md files
   - Define test specifications
   - Provide concrete implementation guidance

### Jira Ticket Strategy

- **Epic**: High-level feature (created by specification-agent)
- **Story**: User-facing value, 1-3 user stories per ticket
- **Task**: Developer/DevOps/PM work items

Keep tickets focused on single outcomes. One Story per user-facing outcome or audience.

### File Naming Conventions

- Use **UPPERCASE** for documentation files (SPECIFICATION.md, RESEARCH.md, PLAN.md, OVERVIEW.md)
- Use **kebab-case** for directory names ([feature-name-slug])
- Use **Jira ticket numbers** for subdirectories

## Project Integration

These agents reference project-specific guidelines that should exist in your application repository:

- `.github/copilot-instructions.md` - Coding standards and patterns
- `**/AGENTS.md` - Agent-specific guidance for your project
- `**/CLAUDE.md` - Claude context for your codebase
- `**/CONTRIBUTING.md` - Contribution guidelines
- `**/README.md` - Project overview

The agents will use these files to understand your architecture, coding conventions, and existing patterns.

## Quality Standards

### Research Quality
- Accuracy: Verify technical details with actual code references
- Completeness: Address all aspects needed for planning
- Clarity: Write for implementers, use concrete specifics
- Context Awareness: Reference existing codebase patterns

### Planning Quality
- Actionable: Provide concrete steps, not high-level ideas
- TDD-Focused: Define tests before implementation
- Performance-Aware: Consider time/space complexity
- Risk-Conscious: Document breaking changes, migration needs

## Usage Notes

- **This is a framework repository**: The agents defined here operate in the context of your application codebase, not within this repository itself
- **Agent coordination is automatic**: specification-agent delegates to research-agent and planning-agent
- **Documentation is the deliverable**: The agents produce markdown files that guide human or AI implementers
- **Jira integration expected**: Agents assume access to Jira via MCP tools
- **GitHub integration expected**: Agents assume access to GitHub via MCP tools

## Modifying This Framework

When updating agent definitions:

1. Edit agent files in **both** `.claude/agents/` and `.github/agents/`
2. Maintain consistency in agent responsibilities
3. Keep the orchestration flow clear
4. Update this CLAUDE.md if workflow changes
5. Test agents work together correctly

## CLI Tool Development

The `packages/dashkit-cli/` directory contains a TypeScript CLI tool published to GitHub Packages as `@sfwd-dashapps/dashkit`.

### CLI Tool Architecture

- **Language**: TypeScript with ES modules
- **Test Framework**: Vitest (native ESM support)
- **Commands**: init, update, status, version
- **Distribution**: Templates bundled directly in package
- **Package Manager**: npm via GitHub Packages

### Working on the CLI

```bash
cd packages/dashkit-cli
npm install
npm run build      # Compile TypeScript
npm test           # Run test suite
npm link           # Install globally for testing
```

### CLI Design Principles

1. **Monolithic Package**: Agent templates bundled in `templates/` directory
2. **Version Tracking**: `dashkit.config.js` tracks installed framework version
3. **Update Detection**: Semantic versioning with semver library
4. **TDD Approach**: All tests written before implementation
5. **Clear Errors**: Descriptive error messages with actionable guidance

### CLI Test Coverage

- 59 tests total (55 passing, 4 skipped)
- Unit tests for all utility modules
- Integration tests for all commands
- 93% pass rate with documented skipped tests

See `packages/dashkit-cli/README.md` for full CLI documentation.

## Key Principles

1. **Separation of Concerns**: Specification → Research → Planning are distinct phases
2. **Documentation-Driven**: All decisions captured in markdown files
3. **Test-First**: Planning includes test specifications before implementation
4. **Context-Aware**: Agents reference existing codebase patterns via project guidelines
5. **Delegated Execution**: Each agent knows when to hand off to specialists