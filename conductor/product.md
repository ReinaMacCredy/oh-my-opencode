# Product Context: oh-my-opencode

## Vision & Purpose

**oh-my-opencode (OmO)** is a "batteries-included" agent harness and enhancement suite for [OpenCode](https://github.com/sst/opencode). It is positioned as the **"oh-my-zsh for OpenCode,"** transforming a raw agentic CLI into a high-performance, multi-model development environment.

- **Core Philosophy**: "Coding on steroids." Agents should work like a real development team, not isolated chat bots.
- **The Sisyphus Archetype**: The project centers around **Sisyphus**, an obsessive, relentless orchestrator agent that "keeps the boulder rolling" until tasks are 100% complete.
- **Strategic Advantage**: Aggressive parallelization, multi-model orchestration (using the best model for each specific task), and deep IDE-like tooling (LSP/AST) for agents.

## Target Users

1. **Power Users & Hackers**: Developers who prefer terminal-based workflows and want total control over their agentic environment.
2. **AI Managers**: Users who want to act as "Dev Team Leads," delegating complex tasks to a swarm of specialized subagents.
3. **Cost-Conscious Professionals**: Users who want to leverage their existing ChatGPT Plus, Claude Pro, or Gemini subscriptions across different providers.

## Key Features & Capabilities

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
- **Junior Agents**: Domain-specific subagents (`Sisyphus-Junior-visual`, etc.) with optimized temperatures and prompts.

## Repository

- **Origin**: https://github.com/ReinaMacCredy/oh-my-opencode.git (fork)
- **Upstream**: https://github.com/code-yeongyu/oh-my-opencode.git
- **Current Branch**: `dev`
