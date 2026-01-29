# DashKit CLI Installer Overview

A command-line tool that enables developers to install and update the dashkit agent definitions in their application repositories.

## Motivation

The dashkit provides canonical agent definitions for structured feature development (Spec => Research => Plan => Implement => Review). Currently, there's no automated way for developers to install these agents into their own projects or keep them updated as the framework evolves. Manual copying is error-prone and makes it difficult to distribute improvements.

## Feature Highlights

- **NPM Package Distribution**: Published as `dashkit` to GitHub Packages for easy installation
- **Simple Installation Command**: `dashkit init` bootstraps agent definitions into target repository
- **Dual Agent Format Support**: Installs both `.claude/agents/` and `.github/agents/` formats
- **Configuration File**: `dashkit.config.js` tracks installation state and version
- **Update Support**: `dashkit update` overwrites agents with latest versions from framework
- **Version Control Friendly**: Assumes users commit agents to git and resolve conflicts themselves
- **TypeScript/Node.js Implementation**: Modern, maintainable codebase with good tooling

## Benefits

- **Faster Onboarding**: New projects can adopt the framework instantly
- **Consistent Updates**: All projects can easily stay current with framework improvements
- **Reduced Maintenance**: Centralized agent definitions eliminate copy-paste duplication
- **Developer Experience**: Simple CLI commands familiar to Node.js developers
- **Discoverability**: Published package makes the framework more accessible
