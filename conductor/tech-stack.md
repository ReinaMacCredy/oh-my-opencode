# Tech Stack: oh-my-opencode

## Runtime & Build

| Component | Technology | Notes |
|-----------|------------|-------|
| **Runtime** | [Bun](https://bun.sh/) | Used for building, testing, and script execution |
| **Language** | TypeScript (ESNext) | Strict mode enabled |
| **Build** | `bun build` | ESM output, external `@ast-grep/napi` |
| **Type Emit** | `tsc --emitDeclarationOnly` | Declaration files only |
| **Package** | npm (ESM module) | `"type": "module"` |

## Core Dependencies

### OpenCode Integration
- `@opencode-ai/plugin` - Plugin interface for OpenCode
- `@opencode-ai/sdk` - SDK for OpenCode interactions

### AST & Code Analysis
- `@ast-grep/napi` - Native AST pattern matching (25 languages)
- `@ast-grep/cli` - CLI for AST operations

### Model Context Protocol
- `@modelcontextprotocol/sdk` - MCP server implementations

### Schema & Validation
- `zod` - Runtime type validation for configs and tool inputs

### CLI & UI
- `commander` - CLI argument parsing
- `@clack/prompts` - Interactive CLI prompts
- `picocolors` - Terminal colors

### Web & Auth
- `hono` - Lightweight web framework (auth flows)
- `@openauthjs/openauth` - OAuth handling

### Utilities
- `js-yaml` - YAML parsing (skill frontmatter)
- `jsonc-parser` - JSON with comments support
- `picomatch` - Glob pattern matching

## Directory Structure

```
oh-my-opencode/
├── src/
│   ├── agents/          # Agent definitions (Sisyphus, Oracle, etc.)
│   ├── tools/           # Agent toolset (LSP, AST-grep, sessions)
│   ├── hooks/           # Lifecycle interceptors (pre/post tool use)
│   ├── features/        # Core capabilities (background tasks, skills)
│   ├── cli/             # CLI interface (install, doctor)
│   ├── auth/            # OAuth & token management
│   ├── mcp/             # MCP server integrations
│   ├── shared/          # Utilities, config parsing, logging
│   └── plugin-handlers/ # OpenCode plugin event handlers
├── assets/              # JSON schemas
├── dist/                # Build output
└── conductor/           # Context-driven development (this directory)
```

## Entry Points

| Entry | File | Purpose |
|-------|------|---------|
| **Plugin** | `src/index.ts` | OpenCode loads this to initialize the plugin |
| **CLI** | `src/cli/index.ts` | `oh-my-opencode` binary entry |
| **Auth** | `src/google-auth.ts` | Google/Gemini authentication module |

## Testing

| Aspect | Value |
|--------|-------|
| **Runner** | `bun test` |
| **Pattern** | Colocated (`*.test.ts` alongside source) |
| **Framework** | `bun:test` with `describe`/`it`/`expect` |
| **Style** | BDD with `#given`/`#when`/`#then` in describe titles |

## Scripts

```bash
bun run build       # Build plugin and CLI
bun run typecheck   # Type check without emit
bun test            # Run test suite
bun run clean       # Remove dist/
```

## Configuration Files

| File | Purpose |
|------|---------|
| `tsconfig.json` | TypeScript configuration (strict mode) |
| `package.json` | Dependencies and scripts |
| `oh-my-opencode.schema.json` | Config schema for validation |
