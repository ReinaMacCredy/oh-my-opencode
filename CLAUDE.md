# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Oh-My-OpenCode is a batteries-included plugin for OpenCode that provides multi-model agent orchestration (GPT-5.2, Claude, Gemini, Grok), 22 lifecycle hooks, LSP tools with refactoring, AST-Grep search, MCP integrations, and Claude Code compatibility layer. Think "oh-my-zsh" for OpenCode.

**This is a fork** (`@reinamaccredy/oh-my-opencode`) with Maestro workflow integration and ProxyPal model support.

## Essential Commands

```bash
# Development
bun run typecheck      # Type checking (strict TypeScript)
bun run build          # ESM build + declarations + JSON schema
bun test               # Run all tests (76 test files, 2500+ assertions)
bun test <pattern>     # Run specific test (e.g., bun test session-manager)

# Build schema after changing src/config/schema.ts
bun run build:schema

# Clean rebuild
bun run clean && bun run build
```

**Package manager**: Bun only. Never use npm/yarn. Use `bun-types` not `@types/node`.

## Architecture

```
src/
├── index.ts           # Plugin entry point, hook/tool registration
├── agents/            # AI agent definitions (Sisyphus, oracle, librarian, explore, frontend, etc.)
├── hooks/             # 22 lifecycle hooks (PreToolUse, PostToolUse patterns)
├── tools/             # LSP, AST-Grep, Grep, Glob, session management, sisyphus_task
├── features/          # Claude Code compat layer, background agents, context injection
├── fork/              # Fork-specific: ProxyPal models, Maestro integration
├── plugins/maestro/   # Independently publishable Maestro workflow plugin
├── config/            # Zod schemas (run build:schema after changes)
├── shared/            # Cross-cutting utilities
└── cli/               # Interactive installer, doctor checks
```

## Key Patterns

### Adding New Components

| Component | Location | Pattern |
|-----------|----------|---------|
| Agent | `src/agents/` | Create .ts file, add to `builtinAgents` in index.ts |
| Hook | `src/hooks/` | Create dir with `createXXXHook()` factory, export from `hooks/index.ts` |
| Tool | `src/tools/` | Create dir with index/types/constants/tools.ts, add to `builtinTools` |
| MCP | `src/mcp/` | Create config, add to index.ts and types.ts |
| Skill | `src/features/builtin-skills/` | Create skill dir with SKILL.md |

### Naming Conventions

- **Directories**: kebab-case (`session-manager`, `background-agent`)
- **Functions**: `createXXXHook()`, `createXXXTool()` factory pattern
- **Exports**: Barrel pattern in index.ts; explicit named exports for tools/hooks
- **Temperature**: 0.1 for code agents, max 0.3

### Testing (TDD Mandatory)

Follow RED-GREEN-REFACTOR strictly:
1. **RED**: Write failing test first (`bun test` → FAIL expected)
2. **GREEN**: Write minimal code to pass (`bun test` → PASS)
3. **REFACTOR**: Clean up while tests stay green

Test file naming: `*.test.ts` alongside source files.
BDD comments: `#given`, `#when`, `#then` (equivalent to Arrange-Act-Assert).

## Fork-Specific Code

All fork modifications are isolated in `src/fork/` for easier upstream syncing:

```
src/fork/
├── proxypal/models.ts     # Centralized ProxyPal model constants (18 models)
├── schema-extensions.ts   # Fork-specific Zod schemas (proxypal_mode)
└── index.ts               # initFork() + initMaestroHooks()
```

**Config Field**: `proxypal_mode: true` enables ProxyPal features.

### Maestro Plugin

Located at `src/plugins/maestro/`. Re-export shims in `src/hooks/` provide backward compatibility:
- `src/hooks/maestro-sisyphus-bridge/` → re-exports from plugin
- `src/hooks/tdd-enforcement/` → re-exports from plugin

## Upstream Sync

Upstream repo: `code-yeongyu/oh-my-opencode` (uses `dev` branch as main).

**Expected conflicts** on sync:
- `src/index.ts` (4 lines: fork imports + initialization)
- `src/cli/install.ts` (ProxyPal mode generation)
- `package.json` (fork-specific metadata)

```bash
git remote add upstream https://github.com/code-yeongyu/oh-my-opencode.git
git fetch upstream
git rebase upstream/dev
# Resolve conflicts in above files only
```

## Common File Locations

| Task | File |
|------|------|
| LSP refactoring | `src/tools/lsp/client.ts`, `tools.ts` |
| AST-Grep search | `src/tools/ast-grep/napi.ts` |
| Background agents | `src/features/background-agent/manager.ts` |
| Claude Code hooks | `src/features/claude-code-hooks-loader/` |
| Config schema | `src/config/schema.ts` (run `build:schema` after) |
| Main orchestrator | `src/hooks/sisyphus-orchestrator/index.ts` |
| Google OAuth | `src/auth/antigravity/` |

## Complexity Hotspots

Files requiring extra care when modifying:

| File | Lines | Notes |
|------|-------|-------|
| `src/agents/orchestrator-sisyphus.ts` | 1484 | Complex agent delegation |
| `src/auth/antigravity/fetch.ts` | 798 | Token refresh, URL rewriting |
| `src/hooks/sisyphus-orchestrator/index.ts` | 660 | Main orchestration logic |
| `src/tools/lsp/client.ts` | 612 | LSP protocol, JSON-RPC |
| `src/index.ts` | 548 | All hook/tool initialization |

## Anti-Patterns

- Never use npm/yarn (bun only)
- Never use `@types/node` (use `bun-types`)
- Never use bash for file operations in code (mkdir/touch/rm/cp/mv)
- Never `bun publish` directly (GitHub Actions workflow_dispatch only)
- Never bump version locally (version managed by CI)
- Never use year 2024 in code/prompts
- Never use temperature >0.3 for code agents
- Never skip TODO creation for multi-step tasks
- Never write implementation before test

## Deployment

**GitHub Actions workflow_dispatch only**:
1. Commit & push changes
2. Trigger publish workflow: `gh workflow run publish -f bump=patch`

Never modify package.json version locally. Never `bun publish` directly.

## Directory AGENTS.md Files

The codebase uses nested AGENTS.md files for directory-specific context. These are auto-injected when reading files. Key locations:
- `AGENTS.md` (root - project knowledge base)
- `src/tools/AGENTS.md`
- `src/hooks/AGENTS.md`
- `src/features/AGENTS.md`
- `src/shared/AGENTS.md`
- `src/cli/AGENTS.md`
- `src/agents/AGENTS.md`
