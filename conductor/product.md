# Product Context: @reinamaccredy/oh-my-opencode

## Vision & Purpose

**@reinamaccredy/oh-my-opencode** is a fork of [oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode) with **integrated Maestro workflow skills**. It provides a "batteries-included" agent harness for [OpenCode](https://github.com/sst/opencode), combining the original multi-model orchestration with structured design and implementation methodology.

- **Core Philosophy**: "Coding on steroids" with structured workflow support
- **The Sisyphus Archetype**: Relentless orchestrator that "keeps the boulder rolling" until tasks are 100% complete
- **Maestro Integration**: 10-phase design pipeline, TDD methodology, parallel execution via integrated skills

## Target Users

1. **Power Users & Hackers**: Developers who prefer terminal-based workflows with structured methodology
2. **AI Managers**: Users who want to delegate complex tasks with proper design → implementation flow
3. **Teams Using Maestro**: Users familiar with the Maestro workflow who want it integrated into their agent harness

## Key Features & Capabilities

### Maestro Workflow Skills (NEW)

Built-in skills providing structured development methodology:

| Skill | Triggers | Purpose |
|-------|----------|---------|
| `maestro-core` | (auto-loaded) | Skill hierarchy, routing table, fallback policies |
| `designing` | `ds`, `cn` | 10-phase Double Diamond design pipeline |
| `conductor` | `ci`, `ca` | TDD implementation execution |
| `orchestrator` | `co` | Multi-agent parallel execution with Agent Mail |
| `tracking` | `bd`, `fb`, `rb` | Beads issue tracker for persistent memory |

### Agent Swarm (The Team)
- **Sisyphus (Orchestrator)**: The primary lead (Claude Opus 4.5). Plans and delegates.
- **Oracle**: High-IQ strategy, architecture, and "impossible" debugging (GPT-5.2).
- **Librarian**: Documentation expert and multi-repo researcher (Claude Sonnet/Gemini Flash).
- **Explore**: Blazing fast codebase pattern matching (Grok/Haiku).
- **Frontend UI/UX Engineer**: Specialized in creative, beautiful UI code (Gemini 3 Pro).

### Advanced Tooling
- **Agentic LSP**: 11+ tools giving agents "IDE powers" (Go-to-definition, Rename, Find References, Code Actions).
- **AST-Grep**: Structural code search and replace that understands code hierarchy, not just text.
- **Background Tasks**: Non-blocking agent execution. The main agent can spin up subagents in parallel.
- **Ralph Loop**: An autonomous, self-referential development loop that continues until a task is verified as DONE.

### Compatibility & Safety
- **Claude Code Layer**: Full compatibility with Claude Code hooks, commands, skills, and MCPs.
- **Context Management**: Auto-injectors for `AGENTS.md` and `README.md` to maintain local context without bloating the main prompt.
- **Token Optimization**: Aggressive truncation and "multimodal looker" tools to save context window space.

## Project Goals

1. **Defining the Frontier**: Building a productized version of the "Sisyphus" agent (via Sisyphus Labs).
2. **Zero Latency/Zero Flicker**: Ensuring the terminal experience remains high-performance even with complex orchestration.
3. **Battery-Included Experience**: Out-of-the-box support for curated MCPs (Exa, Context7, Grep.app) and professional-grade git workflows (`git-master`).
4. **Obsessive Refinement**: The project is a "distillation of $24,000 worth of tokens," constantly updated based on real-world failure points of LLM agents.

## Key Concepts

- **`ultrawork` (or `ulw`)**: The "magic word" that triggers maximum performance mode, parallel agents, and relentless execution.
- **Bouldering**: The act of an agent working continuously through loops and failures to reach a goal.
- **Maestro Skills**: Integrated workflow skills (designing, conductor, orchestrator, tracking) providing structured methodology.
- **Auto-prepend**: When loading any Maestro skill, `maestro-core` is automatically prepended for routing context.

## Repository

- **Package**: `@reinamaccredy/oh-my-opencode` (npm)
- **Origin**: https://github.com/ReinaMacCredy/oh-my-opencode.git (fork)
- **Upstream**: https://github.com/code-yeongyu/oh-my-opencode.git
- **Current Branch**: `main`

## Fork Maintenance

See `FORK_MAINTENANCE.md` for:
- Conflict resolution when syncing from upstream
- How to update Maestro skills
- Version bump and publishing workflow
