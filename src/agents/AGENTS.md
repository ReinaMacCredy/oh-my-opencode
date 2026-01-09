# AGENTS KNOWLEDGE BASE

## OVERVIEW

AI agent definitions for multi-model orchestration. 7 specialized agents: Sisyphus (orchestrator), oracle (read-only consultation), librarian (research), explore (grep), frontend-ui-ux-engineer, document-writer, multimodal-looker.

## STRUCTURE

```
agents/
├── orchestrator-sisyphus.ts # Orchestrator agent (1484 lines) - complex delegation
├── sisyphus.ts              # Main Sisyphus prompt (641 lines)
├── sisyphus-junior.ts       # Junior variant for delegated tasks
├── oracle.ts                # Strategic advisor (GPT-5.2)
├── librarian.ts             # Multi-repo research (Claude Sonnet 4.5)
├── explore.ts               # Fast codebase grep (Grok Code)
├── frontend-ui-ux-engineer.ts  # UI generation (Gemini 3 Pro)
├── document-writer.ts       # Technical docs (Gemini 3 Pro)
├── multimodal-looker.ts     # PDF/image analysis (Gemini 3 Flash)
├── prometheus-prompt.ts     # Planning agent prompt (982 lines)
├── metis.ts                 # Plan Consultant agent (404 lines)
├── momus.ts                 # Plan Reviewer agent (404 lines)
├── build-prompt.ts          # Shared build agent prompt
├── plan-prompt.ts           # Shared plan agent prompt
├── types.ts                 # AgentModelConfig interface
├── utils.ts                 # createBuiltinAgents(), getAgentName()
└── index.ts                 # builtinAgents export
```

## AGENT MODELS

> **Note:** This fork uses ProxyPal models by default for users with ProxyPal subscriptions.
> For Claude/Anthropic users, models fall back to `anthropic/` prefix.

| Agent | Default Model (ProxyPal) | Fallback | Purpose |
|-------|--------------------------|----------|---------|
| Sisyphus | proxypal/gemini-claude-opus-4-5-thinking | anthropic/claude-opus-4-5 | Primary orchestrator with extended thinking |
| oracle | proxypal/gpt-5.2-codex | anthropic/claude-opus-4-5 | Read-only consultation. High-IQ debugging, architecture |
| Momus (Plan Reviewer) | proxypal/gpt-5.2-codex | anthropic/claude-opus-4-5 | Expert plan review with rigorous standards |
| librarian | proxypal/gemini-claude-opus-4-5-thinking | anthropic/claude-sonnet-4-5 | Docs, OSS research, GitHub examples |
| explore | proxypal/gemini-3-flash-preview | anthropic/claude-haiku-4-5 | Fast contextual grep |
| frontend-ui-ux-engineer | proxypal/gemini-3-pro-preview | anthropic/claude-opus-4-5 | UI/UX code generation |
| document-writer | proxypal/gemini-3-flash-preview | anthropic/claude-opus-4-5 | Technical writing |
| multimodal-looker | proxypal/gemini-3-flash-preview | anthropic/claude-opus-4-5 | PDF/image analysis |
| orchestrator-sisyphus | proxypal/gemini-claude-sonnet-4-5-thinking | - | Task orchestration and delegation |
| Sisyphus-Junior | proxypal/gemini-claude-sonnet-4-5-thinking | - | Category-based task execution |

## HOW TO ADD AN AGENT

1. Create `src/agents/my-agent.ts`:
   ```typescript
   import type { AgentConfig } from "@opencode-ai/sdk"
   
   export const myAgent: AgentConfig = {
     model: "provider/model-name",
     temperature: 0.1,
     system: "Agent system prompt...",
     tools: { include: ["tool1", "tool2"] },  // or exclude: [...]
   }
   ```
2. Add to `builtinAgents` in `src/agents/index.ts`
3. Update `types.ts` if adding new config options

## AGENT CONFIG OPTIONS

| Option | Type | Description |
|--------|------|-------------|
| model | string | Model identifier (provider/model-name) |
| temperature | number | 0.0-1.0, most use 0.1 for consistency |
| system | string | System prompt (can be multiline template literal) |
| tools | object | `{ include: [...] }` or `{ exclude: [...] }` |
| top_p | number | Optional nucleus sampling |
| maxTokens | number | Optional max output tokens |

## MODEL FALLBACK LOGIC

`createBuiltinAgents()` in utils.ts handles model fallback:

1. Check user config override (`agents.{name}.model`)
2. Check installer settings (claude max20, gemini antigravity)
3. Use default model

**Fallback order for explore** (ProxyPal fork):
- If ProxyPal enabled → `proxypal/gemini-3-flash-preview` (default)
- If gemini antigravity enabled → `google/gemini-3-flash`
- If claude max20 enabled → `anthropic/claude-haiku-4-5`
- Otherwise → `opencode/grok-code` (free)

## ANTI-PATTERNS (AGENTS)

- **High temperature**: Don't use >0.3 for code-related agents
- **Broad tool access**: Prefer explicit `include` over unrestricted access
- **Monolithic prompts**: Keep prompts focused; delegate to specialized agents
- **Missing fallbacks**: Consider free/cheap fallbacks for rate-limited models

## SHARED PROMPTS

- **build-prompt.ts**: Base prompt for build agents (OpenCode default + Sisyphus variants)
- **plan-prompt.ts**: Base prompt for plan agents (legacy)
- **prometheus-prompt.ts**: System prompt for Prometheus (Planner) agent
- **metis.ts**: Metis (Plan Consultant) agent for pre-planning analysis

Used by `src/index.ts` when creating Builder-Sisyphus and Prometheus (Planner) variants.
