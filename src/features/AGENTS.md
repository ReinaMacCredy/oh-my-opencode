# FEATURES KNOWLEDGE BASE

## OVERVIEW

Claude Code compatibility layer + core feature modules + **Maestro workflow engine**. Commands, skills, agents, MCPs, hooks from Claude Code work seamlessly. Integrated Maestro skills provide structured design and implementation methodology.

## STRUCTURE

```
features/
├── background-agent/           # Task lifecycle, notifications (460 lines)
├── builtin-commands/           # Built-in slash commands
├── builtin-skills/             # Built-in skills + Maestro skills
│   ├── skills.ts               # Maestro skills: maestro-core, designing, conductor, orchestrator, tracking
│   ├── types.ts                # BuiltinSkill interface
│   └── index.ts                # Skill creation factory
├── workflow-engine/            # Maestro workflow abstraction layer
│   ├── contracts/v1/           # WorkflowEngineContract_v1 interface (55 tests)
│   │   ├── types.ts            # WorkflowState, PhaseConfig, ValidationResult
│   │   ├── engine.contract.ts  # Abstract contract definition
│   │   └── contract.test.ts    # Comprehensive test suite
│   ├── adapters/               # Engine adapters
│   │   ├── sisyphus/           # SisyphusAdapter (wraps boulder-state)
│   │   └── maestro/            # MaestroAdapter (design phases, TDD)
│   ├── engines/                # Engine implementations
│   │   └── maestro-engine.ts   # MaestroEngine (layered plugin)
│   └── service.ts              # Singleton access to workflow engine
├── opencode-skill-loader/      # Skills from OpenCode + Claude paths
│   └── skill-content.ts        # Auto-prepends maestro-core for Maestro skills
├── claude-code-agent-loader/   # ~/.claude/agents/*.md
├── claude-code-command-loader/ # ~/.claude/commands/*.md
├── claude-code-mcp-loader/     # .mcp.json files
│   └── env-expander.ts         # ${VAR} expansion
├── claude-code-plugin-loader/  # installed_plugins.json (484 lines)
├── claude-code-session-state/  # Session state persistence
├── skill-mcp-manager/          # MCP servers in skill YAML
└── hook-message-injector/      # Inject messages into conversation
```

## MAESTRO SKILLS

Built-in Maestro workflow skills (TypeScript templates in `builtin-skills/skills.ts`):

| Skill | Triggers | Purpose |
|-------|----------|---------|
| `maestro-core` | (auto-loaded) | Skill hierarchy, routing table, fallback policies |
| `designing` | `ds`, `cn` | 10-phase Double Diamond design pipeline |
| `conductor` | `ci`, `ca` | TDD implementation execution |
| `orchestrator` | `co` | Multi-agent parallel execution |
| `tracking` | `bd`, `fb`, `rb` | Beads issue tracker |

**Auto-prepend Logic** (`opencode-skill-loader/skill-content.ts`):
```typescript
const MAESTRO_SKILLS = new Set(["designing", "conductor", "orchestrator", "tracking"])
// When loading any Maestro skill → auto-prepends maestro-core template
```

## WORKFLOW ENGINE

Abstraction layer for structured development workflows:

| Component | Purpose |
|-----------|---------|
| `WorkflowEngineContract_v1` | Interface for workflow engines (state, phases, transitions) |
| `SisyphusAdapter` | Wraps existing boulder-state for compatibility |
| `MaestroAdapter` | Implements Maestro design phases and TDD methodology |
| `MaestroEngine` | Layered plugin combining both adapters |

## LOADER PRIORITY

| Loader | Priority (highest first) |
|--------|--------------------------|
| Commands | `.opencode/command/` > `~/.config/opencode/command/` > `.claude/commands/` > `~/.claude/commands/` |
| Skills | `.opencode/skill/` > `~/.config/opencode/skill/` > `.claude/skills/` > `~/.claude/skills/` |
| Agents | `.claude/agents/` > `~/.claude/agents/` |
| MCPs | `.claude/.mcp.json` > `.mcp.json` > `~/.claude/.mcp.json` |

## CONFIG TOGGLES

```json
{
  "claude_code": {
    "mcp": false,      // Skip .mcp.json
    "commands": false, // Skip commands/*.md
    "skills": false,   // Skip skills/*/SKILL.md
    "agents": false,   // Skip agents/*.md
    "hooks": false     // Skip settings.json hooks
  }
}
```

## BACKGROUND AGENT

- Lifecycle: pending → running → completed/failed
- OS notification on complete
- `background_output` to retrieve results
- `background_cancel` with task_id or all=true

## SKILL MCP

- MCP servers embedded in skill YAML frontmatter
- Lazy client loading, session-scoped cleanup
- `skill_mcp` tool exposes capabilities

## ANTI-PATTERNS

- Blocking on load (loaders run at startup)
- No error handling (always try/catch)
- Ignoring priority order
- Writing to ~/.claude/ (read-only)
