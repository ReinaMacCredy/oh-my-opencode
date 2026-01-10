# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.1.0-beta.1] - 2026-01-10

### Changed

- **BREAKING ARCHITECTURE**: Isolated fork-specific code into `src/fork/` and `src/plugins/maestro/` directories for easier upstream synchronization
- ProxyPal models centralized in `src/fork/proxypal/models.ts` (18 models total: 11 agent models, 7 category models)
- Maestro plugin now independently publishable as `@reinamaccredy/maestro-plugin`
- Moved `maestro-sisyphus-bridge` and `tdd-enforcement` hooks to Maestro plugin with re-export shims for backward compatibility
- Moved `boulder-state` feature to Maestro plugin with re-export shim
- Fork initialization now happens via `initFork()` in `src/fork/index.ts`
- Maestro hooks loaded via `initMaestroHooks()` in fork initialization

### Added

- `proxypal_mode` configuration field for enabling ProxyPal features
- CLI flag `--proxypal=<yes|no>` for installer
- Fork architecture documentation in `AGENTS.md`
- ProxyPal mode documentation in `README.md`
- Upstream sync strategy documentation

### Fixed

- None

### Migration Guide

**For Users:**
- No action required - all changes are backward compatible via re-export shims
- Existing configurations continue to work without modification
- ProxyPal mode is opt-in via `proxypal_mode` config field

**For Maintainers:**
- Fork-specific code now isolated in `src/fork/` directory
- Maestro plugin code in `src/plugins/maestro/` directory
- Expected merge conflicts on upstream sync limited to:
  - `src/index.ts` (4 lines: fork imports + initialization)
  - `src/cli/install.ts` (ProxyPal mode generation)
  - `package.json` (fork-specific metadata)
- No conflicts expected in `src/hooks/*`, `src/features/*`, `src/agents/*`, `src/config/*`

### Technical Details

**New Directory Structure:**
```
src/fork/
├── proxypal/models.ts       # Centralized model constants
├── schema-extensions.ts     # Fork-specific Zod schemas
└── index.ts                 # initFork() + initMaestroHooks()

src/plugins/maestro/
├── hooks/                   # Maestro-specific hooks
├── features/boulder-state/  # Workflow state management
├── schema.ts                # MaestroConfig + TddGatesConfig
└── index.ts                 # createMaestroPlugin()
```

**Re-export Shims (Backward Compatibility):**
- `src/hooks/maestro-sisyphus-bridge/index.ts` → re-exports from plugin
- `src/hooks/tdd-enforcement/index.ts` → re-exports from plugin
- `src/features/boulder-state/index.ts` → re-exports from plugin

## [3.0.1-beta.3] - 2026-01-09

### Initial fork release

- Fork created from oh-my-opencode upstream
- Added Maestro workflow integration
- Added ProxyPal model support
- Added TDD enforcement
