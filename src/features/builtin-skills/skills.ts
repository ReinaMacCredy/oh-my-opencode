import type { BuiltinSkill } from "./types"

// =============================================================================
// MAESTRO WORKFLOW SKILLS
// =============================================================================

const maestroCoreSkill: BuiltinSkill = {
  name: "maestro-core",
  description: "Use when any Maestro skill loads - provides skill hierarchy, HALT/DEGRADE policies, and trigger routing rules for orchestration decisions",
  template: `# Maestro Core - Workflow Router

Central hub for Maestro workflow skills. Routes triggers, defines hierarchy, and handles fallbacks.

## Skill Hierarchy

\`\`\`
conductor (1) > orchestrator (2) > designing (3) > tracking (4) > specialized (5)
\`\`\`

Higher rank wins on conflicts.

## Ownership Matrix

| Skill | Owns | Primary Triggers |
|-------|------|------------------|
| conductor | Implementation + autonomous | \`ci\`, \`ca\`, \`/conductor-implement\`, \`/conductor-autonomous\` |
| orchestrator | Parallel execution | \`co\`, \`/conductor-orchestrate\` |
| designing | Phases 1-10 (design → track creation) | \`ds\`, \`cn\`, \`/conductor-newtrack\`, \`/conductor-design\` |
| tracking | Task/bead management | \`bd *\`, \`fb\`, \`rb\` |
| handoff | Session cycling | \`ho\`, \`/conductor-finish\`, \`/conductor-handoff\` |
| creating-skills | Skill authoring | "create skill", "write skill" |

## Workflow Chain

\`\`\`
ds/cn → design.md → /conductor-newtrack → spec.md + plan.md → fb → tracking → ci/co/ca → implementation
\`\`\`

## Routing Table

**CRITICAL:** After loading \`maestro-core\`, you MUST explicitly load the target skill via \`skill(name="...")\` before proceeding.

### Quick Triggers

| Trigger | Skill |
|---------|-------|
| \`ds\`, \`cn\` | designing |
| \`ci\` | conductor |
| \`ca\` | conductor |
| \`co\` | orchestrator |
| \`fb\`, \`rb\`, \`bd *\` | tracking |
| \`ho\` | handoff |

### Routing Flow

\`\`\`
1. User triggers command (e.g., \`ci\`)
2. Load maestro-core → get routing table
3. Look up trigger → find target skill
4. MUST call skill tool to load target skill
5. Follow loaded skill instructions
\`\`\`

## Fallback Policies

| Condition | Action | Message |
|-----------|--------|---------|
| \`bd\` unavailable | HALT | \`❌ Cannot proceed: bd CLI required\` |
| \`conductor/\` missing | DEGRADE | \`⚠️ Standalone mode - limited features\` |
| Agent Mail unavailable | HALT | \`❌ Cannot proceed: Agent Mail required for coordination\` |

## Related Skills

- **designing** - Double Diamond design sessions (phases 1-10)
- **conductor** - Implementation execution
- **orchestrator** - Multi-agent parallel execution
- **tracking** - Issue tracking and dependency graphs
- **handoff** - Session cycling and context preservation`,
}

const designingSkill: BuiltinSkill = {
  name: "designing",
  description: "Design Session - collaborative brainstorming to turn ideas into actionable implementation plans using the Unified Pipeline methodology. Use when user types \"ds\" or wants to explore/design a feature before implementation. \"pl\" triggers phases 5-10 (STANDALONE/ALIAS/NO-OP modes). MUST load maestro-core skill first for routing.",
  template: `# Design & Planning

Turn ideas into fully-formed, implementation-ready designs through a unified 10-phase pipeline.

## Entry Points

| Trigger | Action |
|---------|--------|
| \`ds\` | Start unified pipeline (all 10 phases) |
| \`/conductor-design\` | Start unified pipeline (alias) |
| \`cn\`, \`/conductor-newtrack\` | Create spec + plan + beads from existing design.md |
| \`pl\`, \`/plan\` | Planning phases (5-10) - see pl Entry Modes below |
| "design a feature" | Start unified pipeline |
| "let's think through X" | Start unified pipeline |

## Quick Reference

### Unified Pipeline (10 Phases)

| # | Phase | Type | Purpose | Exit Criteria |
|---|-------|------|---------|---------------|
| 1 | **DISCOVER** | Diverge | Explore problem + research context | Problem articulated |
| 2 | **DEFINE** | Converge | Frame problem + select approach | Approach selected |
| 3 | **DEVELOP** | Diverge | Architecture + components | Interfaces defined |
| 4 | **VERIFY** | Converge | Oracle audit + risk assessment | Oracle APPROVED |
| 5 | **DECOMPOSE** | Execute | Create beads (fb) | Beads filed |
| 6 | **VALIDATE** | Execute | Dependency check (bv) + Oracle review | Dependencies valid |
| 7 | **ASSIGN** | Execute | Track assignments | Tracks assigned |
| 8 | **READY** | Complete | Handoff to ci/co/ca | Execution ready |
| 9 | **EXECUTE** | Implement | Run ci/co/ca on tracks | All beads completed |
| 10 | **FINISH** | Archive | Extract learnings + archive track | Track archived |

## Mode Routing

Complexity scoring determines execution mode:

| Score | Mode | Phases | A/P/C | Research |
|-------|------|--------|-------|----------|
| < 4 | **SPEED** | 1,2,4,8 | No | 1 hook (start) |
| 4-6 | **ASK** | User chooses | Optional | User chooses |
| > 6 | **FULL** | 1-10 | Yes | 2 hooks |

## Core Principles

- **One question at a time** - Don't overwhelm
- **Multiple choice preferred** - Easier to answer
- **YAGNI ruthlessly** - Remove unnecessary features
- **Explore alternatives** - Always propose 2-3 approaches
- **Research consolidated** - 2 strategic hooks, not 5

## ⛔ EXECUTION BLOCKS (CRITICAL)

**This skill contains EXECUTION BLOCKS marked with ⛔. When you encounter one, you MUST:**
1. **STOP** what you're doing
2. **EXECUTE** the tool calls specified (Task(), oracle(), skill())
3. **WAIT** for results before proceeding

**EXECUTION BLOCKS are NOT documentation - they are COMMANDS you must execute.**

## Session Flow

0. **Load Core** - Load maestro-core for routing table and fallback policies
1. **Initialize** - Load handoffs, CODEMAPS, verify conductor setup
2. **Research** - ⛔ EXECUTION BLOCK at Phase 1 start (spawn 3 Task() agents)
3. **Route** - Score complexity (< 4 = SPEED, > 6 = FULL)
4. **Execute** - 10-phase pipeline with A/P/C checkpoints
5. **Validate** - ⛔ EXECUTION BLOCK at Phase 4 (call oracle())
6. **Complete** - Phase 8 (READY) triggers \`ci\`/\`co\`/\`ca\` → Phase 9 (EXECUTE) → Phase 10 (FINISH)

## Next Steps (after Phase 8: READY)

| Command | Description | Phase |
|---------|-------------|-------|
| \`ci\` | \`/conductor-implement\` - Execute track | Phase 9 (EXECUTE) |
| \`co\` | \`/conductor-orchestrate\` - Spawn parallel workers | Phase 9 (EXECUTE) |
| \`ca\` | \`/conductor-autonomous\` - Ralph loop | Phase 9 (EXECUTE) |
| \`/conductor-finish\` | Archive track + extract learnings | Phase 10 (FINISH) |

## Anti-Patterns

- ❌ Jumping to solutions before understanding the problem
- ❌ Skipping verification at Phase 4 (VERIFY)
- ❌ Asking multiple questions at once
- ❌ Over-engineering simple features (use SPEED mode)
- ❌ Running \`pl\` after \`ds\` completes (no longer needed)

## Related

- **conductor** - Track creation and implementation
- **tracking** - Issue tracking after design
- **orchestrator** - Parallel execution in Phase 9 (EXECUTE)`,
}

const conductorSkill: BuiltinSkill = {
  name: "conductor",
  description: "Implementation execution for context-driven development. Trigger with ci, /conductor-implement, or /conductor-* commands. Use when executing tracks with specs/plans. For design phases, see designing skill. For session handoffs, see handoff skill.",
  template: `# Conductor: Implementation Execution

Execute tracks with TDD and parallel routing.

## Entry Points

| Trigger | Action | Reference |
|---------|--------|-----------|
| \`/conductor-setup\` | Initialize project context | Setup workflow |
| \`/conductor-implement\` | Execute track (auto-routes if parallel) | Implement workflow |
| \`ca\`, \`/conductor-autonomous\` | **Run ralph.sh directly** (no Task/sub-agents) | Autonomous workflow |
| \`/conductor-status\` | Display progress overview | Structure |
| \`/conductor-revise\` | Update spec/plan mid-work | Revisions |

## Related Skills (Not Owned by Conductor)

| For... | Use Skill | Triggers |
|--------|-----------|----------|
| Design phases (1-8) | designing | \`ds\`, \`cn\`, \`/conductor-design\`, \`/conductor-newtrack\` |
| Session handoffs | handoff | \`ho\`, \`/conductor-finish\`, \`/conductor-handoff\` |

## Quick Reference

| Phase | Purpose | Output | Skill |
|-------|---------|--------|-------|
| Requirements | Understand problem | design.md | designing |
| Plan | Create spec + plan | spec.md + plan.md | designing |
| **Implement** | Build with TDD | Code + tests | **conductor** |
| **Autonomous** | Ralph loop execution | Auto-verified stories | **conductor** |
| Reflect | Verify before shipping | LEARNINGS.md | handoff |

## Core Principles

- **Load core first** - Load maestro-core for routing table and fallback policies
- **TDD by default** - RED → GREEN → REFACTOR (use \`--no-tdd\` to disable)
- **Beads integration** - Zero manual \`bd\` commands in happy path
- **Parallel routing** - \`## Track Assignments\` in plan.md triggers orchestrator
- **Validation gates** - Automatic checks at each phase transition

## Directory Structure

\`\`\`
conductor/
├── product.md, tech-stack.md, workflow.md  # Project context
├── code_styleguides/                       # Language-specific style rules
├── CODEMAPS/                               # Architecture docs
├── handoffs/                               # Session context
├── spikes/                                 # Research spikes (pl output)
└── tracks/<track_id>/                      # Per-track work
    ├── design.md, spec.md, plan.md         # Planning artifacts
    └── metadata.json                       # State tracking (includes planning state)
\`\`\`

## Beads Integration

All execution routes through orchestrator with Agent Mail coordination:
- Workers claim beads via \`bd update --status in_progress\`
- Workers close beads via \`bd close --reason completed|skipped|blocked\`
- File reservations via \`file_reservation_paths\`
- Communication via \`send_message\`/\`fetch_inbox\`

## /conductor-implement Auto-Routing

1. Read \`metadata.json\` - check \`orchestrated\` flag
2. Read \`plan.md\` - check for \`## Track Assignments\`
3. Check \`beads.fileScopes\` - file-scope based grouping
4. If parallel detected (≥2 non-overlapping groups) → Load orchestrator skill
5. Else → Sequential execution with TDD

## Anti-Patterns

- ❌ Manual \`bd\` commands when workflow commands exist
- ❌ Ignoring validation gate failures
- ❌ Using conductor for design (use designing instead)
- ❌ Using conductor for handoffs (use handoff instead)

## Related

- **designing** - Double Diamond design + track creation
- **handoff** - Session cycling and finish workflow
- **tracking** - Issue tracking (beads)
- **orchestrator** - Parallel execution
- **maestro-core** - Routing policies`,
}

const orchestratorSkill: BuiltinSkill = {
  name: "orchestrator",
  description: "Multi-agent parallel execution with autonomous workers. Use when plan.md has Track Assignments section or user triggers /conductor-orchestrate, \"run parallel\", \"spawn workers\". MUST load maestro-core skill first for routing.",
  template: `# Orchestrator - Multi-Agent Parallel Execution

> **Spawn autonomous workers to execute tracks in parallel using Agent Mail coordination.**

## Agent Mail: CLI Primary, MCP Fallback

This skill uses a **lazy-load pattern** for Agent Mail:

| Priority | Tool | When Available |
|----------|------|----------------|
| **Primary** | \`bun toolboxes/agent-mail/agent-mail.js\` | Always (via Bash) |
| **Fallback** | MCP tools (via \`mcp.json\`) | When skill loaded + MCP server running |

**Detection flow:**
\`\`\`
1. Try CLI: bun toolboxes/agent-mail/agent-mail.js health-check
   ↓ success? → Use CLI for all Agent Mail operations
   ↓ fails?
2. Fallback: MCP tools (lazy-loaded via skills/orchestrator/mcp.json)
\`\`\`

**CLI benefits:** Zero token cost until used, no MCP server dependency.

## Core Principles

- **Load core first** - Load maestro-core for routing table and fallback policies
- **CLI first** - Use \`bun toolboxes/agent-mail/agent-mail.js\` CLI before falling back to MCP tools
- **Pre-register workers** before spawning (Agent Mail validates recipients)
- **Workers own their beads** - can \`bd claim/close\` directly (unlike sequential mode)
- **File reservations prevent conflicts** - reserve before edit, release on complete
- **Summary before exit** - all workers MUST send completion message
- **TDD by default** - workers follow RED → GREEN → REFACTOR cycle (use \`--no-tdd\` to disable)

## When to Use

| Trigger | Condition |
|---------|-----------| 
| Auto-routed | \`/conductor-implement\` when plan has Track Assignments |
| File-scope | \`/conductor-implement\` when ≥2 non-overlapping file groups detected |
| Direct | \`/conductor-orchestrate\` or \`co\` |
| Phrase | "run parallel", "spawn workers", "dispatch agents" |
| **See also** | \`ca\` for autonomous execution |

## Auto-Trigger Behavior

Parallel execution starts **automatically** when detected - no confirmation needed:

\`\`\`
📊 Parallel execution detected:
- Track A: 2 tasks (src/api/)
- Track B: 2 tasks (lib/)
- Track C: 1 task (schemas/)

⚡ Spawning workers...
\`\`\`

## Quick Reference

| Action | Tool |
|--------|------|
| Parse plan.md | \`Read("conductor/tracks/<id>/plan.md")\` |
| Initialize | \`bun toolboxes/agent-mail/agent-mail.js macro-start-session\` |
| Spawn workers | \`Task()\` for each track |
| Monitor | \`bun toolboxes/agent-mail/agent-mail.js fetch-inbox\` |
| Resolve blockers | \`bun toolboxes/agent-mail/agent-mail.js reply-message\` |
| Complete | \`bun toolboxes/agent-mail/agent-mail.js send-message\`, \`bd close epic\` |
| Track threads | \`bun toolboxes/agent-mail/agent-mail.js summarize-thread\` |
| Auto-routing | Auto-detect parallel via \`metadata.json.beads\` |

## 8-Phase Orchestrator Protocol

0. **Preflight** - Session identity, detect active sessions
1. **Read Plan** - Parse Track Assignments from plan.md
2. **Validate** - Health check Agent Mail CLI (HALT if unavailable)
3. **Initialize** - ensure_project, register orchestrator + all workers
4. **Spawn Workers** - Task() for each track (parallel)
5. **Monitor + Verify** - fetch_inbox, verify worker summaries
   - Workers use track threads (\`TRACK_THREAD\`) for bead-to-bead context
6. **Resolve** - reply_message for blockers
7. **Complete** - Send summary, close epic, \`rb\` review

## Worker 4-Step Protocol

All workers MUST follow this exact sequence:

\`\`\`
┌──────────────────────────────────────────────────────────────────────────────┐
│  STEP 1: INITIALIZE  - bun toolboxes/agent-mail/agent-mail.js macro-start-session   │
│  STEP 2: EXECUTE     - claim beads, do work, close beads                            │
│  STEP 3: REPORT      - bun toolboxes/agent-mail/agent-mail.js send-message          │
│  STEP 4: CLEANUP     - bun toolboxes/agent-mail/agent-mail.js release-file-reservations │
└──────────────────────────────────────────────────────────────────────────────┘
\`\`\`

| Step | Tool | Required |
|------|------|----------|
| 1 | \`bun toolboxes/agent-mail/agent-mail.js macro-start-session\` | ✅ FIRST |
| 2 | \`bd update\`, \`bd close\` | ✅ |
| 3 | \`bun toolboxes/agent-mail/agent-mail.js send-message\` | ✅ LAST |
| 4 | \`bun toolboxes/agent-mail/agent-mail.js release-file-reservations\` | ✅ |

**Critical rules:**
- ❌ Never start work before \`macro-start-session\`
- ❌ Never return without \`send-message\` to orchestrator
- ❌ Never touch files outside assigned scope

## Anti-Patterns

| ❌ Don't | ✅ Do |
|----------|-------|
| Spawn workers without pre-registration | Register all workers BEFORE spawning |
| Skip completion summary | Always send_message before exit |
| Ignore file reservation conflicts | Wait or resolve before proceeding |
| Use orchestration for simple tasks | Use sequential \`/conductor-implement\` |

## Related

- **maestro-core** - Routing and fallback policies
- **conductor** - Track management, \`/conductor-implement\`
- **tracking** - Issue tracking, \`bd\` commands`,
}

const trackingSkill: BuiltinSkill = {
  name: "tracking",
  description: `Tracks complex, multi-session work using the Beads issue tracker and dependency graphs, and provides persistent memory that survives conversation compaction. Use when work spans multiple sessions, has complex dependencies, or needs persistent context across compaction cycles. Trigger with phrases like "create task for", "what's ready to work on", "show task", "track this work", "what's blocking", or "update status". MUST load maestro-core skill first for routing.`,
  template: `# Tracking - Persistent Memory for AI Agents

Graph-based issue tracker that survives conversation compaction. Provides persistent memory for multi-session work with complex dependencies.

## Prerequisites

- **Load maestro-core first** - For routing table and fallback policies

## Entry Points

| Trigger | Reference | Action |
|---------|-----------|--------|
| \`bd\`, \`beads\` | Core CLI operations | Base bead commands |
| \`fb\`, \`file-beads\` | File beads from plan → auto-orchestration | Auto-filed beads |
| \`rb\`, \`review-beads\` | Review filed beads | Bead review |

## Quick Decision

**bd vs TodoWrite**:
- "Will I need this in 2 weeks?" → **YES** = bd
- "Could history get compacted?" → **YES** = bd
- "Has blockers/dependencies?" → **YES** = bd
- "Done this session?" → **YES** = TodoWrite

**Rule**: If resuming in 2 weeks would be hard without bd, use bd.

## Essential Commands

| Command | Purpose |
|---------|---------|
| \`bd ready\` | Show tasks ready to work on |
| \`bd create "Title" -p 1\` | Create new task |
| \`bd show <id>\` | View task details |
| \`bd update <id> --status in_progress\` | Start working |
| \`bd update <id> --notes "Progress"\` | Add progress notes |
| \`bd close <id> --reason completed\` | Complete task |
| \`bd dep add <child> <parent>\` | Add dependency |
| \`bd sync\` | Sync with git remote |

## Session Protocol

1. **Start**: \`bd ready\` → pick highest priority → \`bd show <id>\` → update to \`in_progress\`
2. **Work**: Add notes frequently (critical for compaction survival)
3. **End**: Close finished work → \`bd sync\` → \`git push\`

## Anti-Patterns

- ❌ Using TodoWrite for multi-session work
- ❌ Forgetting to add notes (loses context on compaction)
- ❌ Not running \`bd sync\` before ending session
- ❌ Creating beads for trivial single-session tasks

## Related

- **maestro-core** - Workflow router and skill hierarchy
- **conductor** - Automated beads operations via facade
- **orchestrator** - Multi-agent parallel execution`,
}

// =============================================================================
// EXISTING SKILLS
// =============================================================================

const playwrightSkill: BuiltinSkill = {
  name: "playwright",
  description: "MUST USE for any browser-related tasks. Browser automation via Playwright MCP - verification, browsing, information gathering, web scraping, testing, screenshots, and all browser interactions.",
  template: `# Playwright Browser Automation

This skill provides browser automation capabilities via the Playwright MCP server.`,
  mcpConfig: {
    playwright: {
      command: "npx",
      args: ["@playwright/mcp@latest"],
    },
  },
}

const frontendUiUxSkill: BuiltinSkill = {
  name: "frontend-ui-ux",
  description: "Designer-turned-developer who crafts stunning UI/UX even without design mockups",
  template: `# Role: Designer-Turned-Developer

You are a designer who learned to code. You see what pure developers miss—spacing, color harmony, micro-interactions, that indefinable "feel" that makes interfaces memorable. Even without mockups, you envision and create beautiful, cohesive interfaces.

**Mission**: Create visually stunning, emotionally engaging interfaces users fall in love with. Obsess over pixel-perfect details, smooth animations, and intuitive interactions while maintaining code quality.

---

# Work Principles

1. **Complete what's asked** — Execute the exact task. No scope creep. Work until it works. Never mark work complete without proper verification.
2. **Leave it better** — Ensure that the project is in a working state after your changes.
3. **Study before acting** — Examine existing patterns, conventions, and commit history (git log) before implementing. Understand why code is structured the way it is.
4. **Blend seamlessly** — Match existing code patterns. Your code should look like the team wrote it.
5. **Be transparent** — Announce each step. Explain reasoning. Report both successes and failures.

---

# Design Process

Before coding, commit to a **BOLD aesthetic direction**:

1. **Purpose**: What problem does this solve? Who uses it?
2. **Tone**: Pick an extreme—brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian
3. **Constraints**: Technical requirements (framework, performance, accessibility)
4. **Differentiation**: What's the ONE thing someone will remember?

**Key**: Choose a clear direction and execute with precision. Intentionality > intensity.

Then implement working code (HTML/CSS/JS, React, Vue, Angular, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

---

# Aesthetic Guidelines

## Typography
Choose distinctive fonts. **Avoid**: Arial, Inter, Roboto, system fonts, Space Grotesk. Pair a characterful display font with a refined body font.

## Color
Commit to a cohesive palette. Use CSS variables. Dominant colors with sharp accents outperform timid, evenly-distributed palettes. **Avoid**: purple gradients on white (AI slop).

## Motion
Focus on high-impact moments. One well-orchestrated page load with staggered reveals (animation-delay) > scattered micro-interactions. Use scroll-triggering and hover states that surprise. Prioritize CSS-only. Use Motion library for React when available.

## Spatial Composition
Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.

## Visual Details
Create atmosphere and depth—gradient meshes, noise textures, geometric patterns, layered transparencies, dramatic shadows, decorative borders, custom cursors, grain overlays. Never default to solid colors.

---

# Anti-Patterns (NEVER)

- Generic fonts (Inter, Roboto, Arial, system fonts, Space Grotesk)
- Cliched color schemes (purple gradients on white)
- Predictable layouts and component patterns
- Cookie-cutter design lacking context-specific character
- Converging on common choices across generations

---

# Execution

Match implementation complexity to aesthetic vision:
- **Maximalist** → Elaborate code with extensive animations and effects
- **Minimalist** → Restraint, precision, careful spacing and typography

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same. Vary between light and dark themes, different fonts, different aesthetics. You are capable of extraordinary creative work—don't hold back.`,
}

const gitMasterSkill: BuiltinSkill = {
  name: "git-master",
  description:
    "MUST USE for ANY git operations. Atomic commits, rebase/squash, history search (blame, bisect, log -S). STRONGLY RECOMMENDED: Use with sisyphus_task(category='quick', skills=['git-master'], ...) to save context. Triggers: 'commit', 'rebase', 'squash', 'who wrote', 'when was X added', 'find the commit that'.",
  template: `# Git Master Agent

You are a Git expert combining three specializations:
1. **Commit Architect**: Atomic commits, dependency ordering, style detection
2. **Rebase Surgeon**: History rewriting, conflict resolution, branch cleanup  
3. **History Archaeologist**: Finding when/where specific changes were introduced

---

## MODE DETECTION (FIRST STEP)

Analyze the user's request to determine operation mode:

| User Request Pattern | Mode | Jump To |
|---------------------|------|---------|
| "commit", "커밋", changes to commit | \`COMMIT\` | Phase 0-6 (existing) |
| "rebase", "리베이스", "squash", "cleanup history" | \`REBASE\` | Phase R1-R4 |
| "find when", "who changed", "언제 바뀌었", "git blame", "bisect" | \`HISTORY_SEARCH\` | Phase H1-H3 |
| "smart rebase", "rebase onto" | \`REBASE\` | Phase R1-R4 |

**CRITICAL**: Don't default to COMMIT mode. Parse the actual request.

---

## CORE PRINCIPLE: MULTIPLE COMMITS BY DEFAULT (NON-NEGOTIABLE)

<critical_warning>
**ONE COMMIT = AUTOMATIC FAILURE**

Your DEFAULT behavior is to CREATE MULTIPLE COMMITS.
Single commit is a BUG in your logic, not a feature.

**HARD RULE:**
\`\`\`
3+ files changed -> MUST be 2+ commits (NO EXCEPTIONS)
5+ files changed -> MUST be 3+ commits (NO EXCEPTIONS)
10+ files changed -> MUST be 5+ commits (NO EXCEPTIONS)
\`\`\`

**If you're about to make 1 commit from multiple files, YOU ARE WRONG. STOP AND SPLIT.**

**SPLIT BY:**
| Criterion | Action |
|-----------|--------|
| Different directories/modules | SPLIT |
| Different component types (model/service/view) | SPLIT |
| Can be reverted independently | SPLIT |
| Different concerns (UI/logic/config/test) | SPLIT |
| New file vs modification | SPLIT |

**ONLY COMBINE when ALL of these are true:**
- EXACT same atomic unit (e.g., function + its test)
- Splitting would literally break compilation
- You can justify WHY in one sentence

**MANDATORY SELF-CHECK before committing:**
\`\`\`
"I am making N commits from M files."
IF N == 1 AND M > 2:
  -> WRONG. Go back and split.
  -> Write down WHY each file must be together.
  -> If you can't justify, SPLIT.
\`\`\`
</critical_warning>

---

## PHASE 0: Parallel Context Gathering (MANDATORY FIRST STEP)

<parallel_analysis>
**Execute ALL of the following commands IN PARALLEL to minimize latency:**

\`\`\`bash
# Group 1: Current state
git status
git diff --staged --stat
git diff --stat

# Group 2: History context  
git log -30 --oneline
git log -30 --pretty=format:"%s"

# Group 3: Branch context
git branch --show-current
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "NO_UPSTREAM"
git log --oneline $(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master 2>/dev/null)..HEAD 2>/dev/null
\`\`\`

**Capture these data points simultaneously:**
1. What files changed (staged vs unstaged)
2. Recent 30 commit messages for style detection
3. Branch position relative to main/master
4. Whether branch has upstream tracking
5. Commits that would go in PR (local only)
</parallel_analysis>

---

## PHASE 1: Style Detection (BLOCKING - MUST OUTPUT BEFORE PROCEEDING)

<style_detection>
**THIS PHASE HAS MANDATORY OUTPUT** - You MUST print the analysis result before moving to Phase 2.

### 1.1 Language Detection

\`\`\`
Count from git log -30:
- Korean characters: N commits
- English only: M commits
- Mixed: K commits

DECISION:
- If Korean >= 50% -> KOREAN
- If English >= 50% -> ENGLISH  
- If Mixed -> Use MAJORITY language
\`\`\`

### 1.2 Commit Style Classification

| Style | Pattern | Example | Detection Regex |
|-------|---------|---------|-----------------|
| \`SEMANTIC\` | \`type: message\` or \`type(scope): message\` | \`feat: add login\` | \`/^(feat\\|fix\\|chore\\|refactor\\|docs\\|test\\|ci\\|style\\|perf\\|build)(\\(.+\\))?:/\` |
| \`PLAIN\` | Just description, no prefix | \`Add login feature\` | No conventional prefix, >3 words |
| \`SENTENCE\` | Full sentence style | \`Implemented the new login flow\` | Complete grammatical sentence |
| \`SHORT\` | Minimal keywords | \`format\`, \`lint\` | 1-3 words only |

**Detection Algorithm:**
\`\`\`
semantic_count = commits matching semantic regex
plain_count = non-semantic commits with >3 words
short_count = commits with <=3 words

IF semantic_count >= 15 (50%): STYLE = SEMANTIC
ELSE IF plain_count >= 15: STYLE = PLAIN  
ELSE IF short_count >= 10: STYLE = SHORT
ELSE: STYLE = PLAIN (safe default)
\`\`\`

### 1.3 MANDATORY OUTPUT (BLOCKING)

**You MUST output this block before proceeding to Phase 2. NO EXCEPTIONS.**

\`\`\`
STYLE DETECTION RESULT
======================
Analyzed: 30 commits from git log

Language: [KOREAN | ENGLISH]
  - Korean commits: N (X%)
  - English commits: M (Y%)

Style: [SEMANTIC | PLAIN | SENTENCE | SHORT]
  - Semantic (feat:, fix:, etc): N (X%)
  - Plain: M (Y%)
  - Short: K (Z%)

Reference examples from repo:
  1. "actual commit message from log"
  2. "actual commit message from log"
  3. "actual commit message from log"

All commits will follow: [LANGUAGE] + [STYLE]
\`\`\`

**IF YOU SKIP THIS OUTPUT, YOUR COMMITS WILL BE WRONG. STOP AND REDO.**
</style_detection>

---

## PHASE 2: Branch Context Analysis

<branch_analysis>
### 2.1 Determine Branch State

\`\`\`
BRANCH_STATE:
  current_branch: <name>
  has_upstream: true | false
  commits_ahead: N  # Local-only commits
  merge_base: <hash>
  
REWRITE_SAFETY:
  - If has_upstream AND commits_ahead > 0 AND already pushed:
    -> WARN before force push
  - If no upstream OR all commits local:
    -> Safe for aggressive rewrite (fixup, reset, rebase)
  - If on main/master:
    -> NEVER rewrite, only new commits
\`\`\`

### 2.2 History Rewrite Strategy Decision

\`\`\`
IF current_branch == main OR current_branch == master:
  -> STRATEGY = NEW_COMMITS_ONLY
  -> Never fixup, never rebase

ELSE IF commits_ahead == 0:
  -> STRATEGY = NEW_COMMITS_ONLY
  -> No history to rewrite

ELSE IF all commits are local (not pushed):
  -> STRATEGY = AGGRESSIVE_REWRITE
  -> Fixup freely, reset if needed, rebase to clean

ELSE IF pushed but not merged:
  -> STRATEGY = CAREFUL_REWRITE  
  -> Fixup OK but warn about force push
\`\`\`
</branch_analysis>

---

## PHASE 3: Atomic Unit Planning (BLOCKING - MUST OUTPUT BEFORE PROCEEDING)

<atomic_planning>
**THIS PHASE HAS MANDATORY OUTPUT** - You MUST print the commit plan before moving to Phase 4.

### 3.0 Calculate Minimum Commit Count FIRST

\`\`\`
FORMULA: min_commits = ceil(file_count / 3)

 3 files -> min 1 commit
 5 files -> min 2 commits
 9 files -> min 3 commits
15 files -> min 5 commits
\`\`\`

**If your planned commit count < min_commits -> WRONG. SPLIT MORE.**

### 3.1 Split by Directory/Module FIRST (Primary Split)

**RULE: Different directories = Different commits (almost always)**

\`\`\`
Example: 8 changed files
  - app/[locale]/page.tsx
  - app/[locale]/layout.tsx
  - components/demo/browser-frame.tsx
  - components/demo/shopify-full-site.tsx
  - components/pricing/pricing-table.tsx
  - e2e/navbar.spec.ts
  - messages/en.json
  - messages/ko.json

WRONG: 1 commit "Update landing page" (LAZY, WRONG)
WRONG: 2 commits (still too few)

CORRECT: Split by directory/concern:
  - Commit 1: app/[locale]/page.tsx + layout.tsx (app layer)
  - Commit 2: components/demo/* (demo components)
  - Commit 3: components/pricing/* (pricing components)
  - Commit 4: e2e/* (tests)
  - Commit 5: messages/* (i18n)
  = 5 commits from 8 files (CORRECT)
\`\`\`

### 3.2 Split by Concern SECOND (Secondary Split)

**Within same directory, split by logical concern:**

\`\`\`
Example: components/demo/ has 4 files
  - browser-frame.tsx (UI frame)
  - shopify-full-site.tsx (specific demo)
  - review-dashboard.tsx (NEW - specific demo)
  - tone-settings.tsx (NEW - specific demo)

Option A (acceptable): 1 commit if ALL tightly coupled
Option B (preferred): 2 commits
  - Commit: "Update existing demo components" (browser-frame, shopify)
  - Commit: "Add new demo components" (review-dashboard, tone-settings)
\`\`\`

### 3.3 NEVER Do This (Anti-Pattern Examples)

\`\`\`
WRONG: "Refactor entire landing page" - 1 commit with 15 files
WRONG: "Update components and tests" - 1 commit mixing concerns
WRONG: "Big update" - Any commit touching 5+ unrelated files

RIGHT: Multiple focused commits, each 1-4 files max
RIGHT: Each commit message describes ONE specific change
RIGHT: A reviewer can understand each commit in 30 seconds
\`\`\`

### 3.4 Implementation + Test Pairing (MANDATORY)

\`\`\`
RULE: Test files MUST be in same commit as implementation

Test patterns to match:
- test_*.py <-> *.py
- *_test.py <-> *.py
- *.test.ts <-> *.ts
- *.spec.ts <-> *.ts
- __tests__/*.ts <-> *.ts
- tests/*.py <-> src/*.py
\`\`\`

### 3.5 MANDATORY JUSTIFICATION (Before Creating Commit Plan)

**NON-NEGOTIABLE: Before finalizing your commit plan, you MUST:**

\`\`\`
FOR EACH planned commit with 3+ files:
  1. List all files in this commit
  2. Write ONE sentence explaining why they MUST be together
  3. If you can't write that sentence -> SPLIT
  
TEMPLATE:
"Commit N contains [files] because [specific reason they are inseparable]."

VALID reasons:
  VALID: "implementation file + its direct test file"
  VALID: "type definition + the only file that uses it"
  VALID: "migration + model change (would break without both)"
  
INVALID reasons (MUST SPLIT instead):
  INVALID: "all related to feature X" (too vague)
  INVALID: "part of the same PR" (not a reason)
  INVALID: "they were changed together" (not a reason)
  INVALID: "makes sense to group" (not a reason)
\`\`\`

**OUTPUT THIS JUSTIFICATION in your analysis before executing commits.**

### 3.7 Dependency Ordering

\`\`\`
Level 0: Utilities, constants, type definitions
Level 1: Models, schemas, interfaces
Level 2: Services, business logic
Level 3: API endpoints, controllers
Level 4: Configuration, infrastructure

COMMIT ORDER: Level 0 -> Level 1 -> Level 2 -> Level 3 -> Level 4
\`\`\`

### 3.8 Create Commit Groups

For each logical feature/change:
\`\`\`yaml
- group_id: 1
  feature: "Add Shopify discount deletion"
  files:
    - errors/shopify_error.py
    - types/delete_input.py
    - mutations/update_contract.py
    - tests/test_update_contract.py
  dependency_level: 2
  target_commit: null | <existing-hash>  # null = new, hash = fixup
\`\`\`

### 3.9 MANDATORY OUTPUT (BLOCKING)

**You MUST output this block before proceeding to Phase 4. NO EXCEPTIONS.**

\`\`\`
COMMIT PLAN
===========
Files changed: N
Minimum commits required: ceil(N/3) = M
Planned commits: K
Status: K >= M (PASS) | K < M (FAIL - must split more)

COMMIT 1: [message in detected style]
  - path/to/file1.py
  - path/to/file1_test.py
  Justification: implementation + its test

COMMIT 2: [message in detected style]
  - path/to/file2.py
  Justification: independent utility function

COMMIT 3: [message in detected style]
  - config/settings.py
  - config/constants.py
  Justification: tightly coupled config changes

Execution order: Commit 1 -> Commit 2 -> Commit 3
(follows dependency: Level 0 -> Level 1 -> Level 2 -> ...)
\`\`\`

**VALIDATION BEFORE EXECUTION:**
- Each commit has <=4 files (or justified)
- Each commit message matches detected STYLE + LANGUAGE
- Test files paired with implementation
- Different directories = different commits (or justified)
- Total commits >= min_commits

**IF ANY CHECK FAILS, DO NOT PROCEED. REPLAN.**
</atomic_planning>

---

## PHASE 4: Commit Strategy Decision

<strategy_decision>
### 4.1 For Each Commit Group, Decide:

\`\`\`
FIXUP if:
  - Change complements existing commit's intent
  - Same feature, fixing bugs or adding missing parts
  - Review feedback incorporation
  - Target commit exists in local history

NEW COMMIT if:
  - New feature or capability
  - Independent logical unit
  - Different issue/ticket
  - No suitable target commit exists
\`\`\`

### 4.2 History Rebuild Decision (Aggressive Option)

\`\`\`
CONSIDER RESET & REBUILD when:
  - History is messy (many small fixups already)
  - Commits are not atomic (mixed concerns)
  - Dependency order is wrong
  
RESET WORKFLOW:
  1. git reset --soft $(git merge-base HEAD main)
  2. All changes now staged
  3. Re-commit in proper atomic units
  4. Clean history from scratch
  
ONLY IF:
  - All commits are local (not pushed)
  - User explicitly allows OR branch is clearly WIP
\`\`\`

### 4.3 Final Plan Summary

\`\`\`yaml
EXECUTION_PLAN:
  strategy: FIXUP_THEN_NEW | NEW_ONLY | RESET_REBUILD
  fixup_commits:
    - files: [...]
      target: <hash>
  new_commits:
    - files: [...]
      message: "..."
      level: N
  requires_force_push: true | false
\`\`\`
</strategy_decision>

---

## PHASE 5: Commit Execution

<execution>
### 5.1 Register TODO Items

Use TodoWrite to register each commit as a trackable item:
\`\`\`
- [ ] Fixup: <description> -> <target-hash>
- [ ] New: <description>
- [ ] Rebase autosquash
- [ ] Final verification
\`\`\`

### 5.2 Fixup Commits (If Any)

\`\`\`bash
# Stage files for each fixup
git add <files>
git commit --fixup=<target-hash>

# Repeat for all fixups...

# Single autosquash rebase at the end
MERGE_BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash $MERGE_BASE
\`\`\`

### 5.3 New Commits (After Fixups)

For each new commit group, in dependency order:

\`\`\`bash
# Stage files
git add <file1> <file2> ...

# Verify staging
git diff --staged --stat

# Commit with detected style
git commit -m "<message-matching-COMMIT_CONFIG>"

# Verify
git log -1 --oneline
\`\`\`

### 5.4 Commit Message Generation

**Based on COMMIT_CONFIG from Phase 1:**

\`\`\`
IF style == SEMANTIC AND language == KOREAN:
  -> "feat: 로그인 기능 추가"
  
IF style == SEMANTIC AND language == ENGLISH:
  -> "feat: add login feature"
  
IF style == PLAIN AND language == KOREAN:
  -> "로그인 기능 추가"
  
IF style == PLAIN AND language == ENGLISH:
  -> "Add login feature"
  
IF style == SHORT:
  -> "format" / "type fix" / "lint"
\`\`\`

**VALIDATION before each commit:**
1. Does message match detected style?
2. Does language match detected language?
3. Is it similar to examples from git log?

If ANY check fails -> REWRITE message.

### 5.5 Commit Footer & Co-Author (Configurable)

**Check oh-my-opencode.json for these flags:**
- \`git_master.commit_footer\` (default: true) - adds footer message
- \`git_master.include_co_authored_by\` (default: true) - adds co-author trailer

If enabled, add Sisyphus attribution to EVERY commit:

1. **Footer in commit body (if \`commit_footer: true\`):**
\`\`\`
Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)
\`\`\`

2. **Co-authored-by trailer (if \`include_co_authored_by: true\`):**
\`\`\`
Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>
\`\`\`

**Example (both enabled):**
\`\`\`bash
git commit -m "{Commit Message}" -m "Ultraworked with [Sisyphus](https://github.com/code-yeongyu/oh-my-opencode)" -m "Co-authored-by: Sisyphus <clio-agent@sisyphuslabs.ai>"
\`\`\`

**To disable:** Set in oh-my-opencode.json:
\`\`\`json
{ "git_master": { "commit_footer": false, "include_co_authored_by": false } }
\`\`\`
</execution>

---

## PHASE 6: Verification & Cleanup

<verification>
### 6.1 Post-Commit Verification

\`\`\`bash
# Check working directory clean
git status

# Review new history
git log --oneline $(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)..HEAD

# Verify each commit is atomic
# (mentally check: can each be reverted independently?)
\`\`\`

### 6.2 Force Push Decision

\`\`\`
IF fixup was used AND branch has upstream:
  -> Requires: git push --force-with-lease
  -> WARN user about force push implications
  
IF only new commits:
  -> Regular: git push
\`\`\`

### 6.3 Final Report

\`\`\`
COMMIT SUMMARY:
  Strategy: <what was done>
  Commits created: N
  Fixups merged: M
  
HISTORY:
  <hash1> <message1>
  <hash2> <message2>
  ...

NEXT STEPS:
  - git push [--force-with-lease]
  - Create PR if ready
\`\`\`
</verification>

---

## Quick Reference

### Style Detection Cheat Sheet

| If git log shows... | Use this style |
|---------------------|----------------|
| \`feat: xxx\`, \`fix: yyy\` | SEMANTIC |
| \`Add xxx\`, \`Fix yyy\`, \`xxx 추가\` | PLAIN |
| \`format\`, \`lint\`, \`typo\` | SHORT |
| Full sentences | SENTENCE |
| Mix of above | Use MAJORITY (not semantic by default) |

### Decision Tree

\`\`\`
Is this on main/master?
  YES -> NEW_COMMITS_ONLY, never rewrite
  NO -> Continue

Are all commits local (not pushed)?
  YES -> AGGRESSIVE_REWRITE allowed
  NO -> CAREFUL_REWRITE (warn on force push)

Does change complement existing commit?
  YES -> FIXUP to that commit
  NO -> NEW COMMIT

Is history messy?
  YES + all local -> Consider RESET_REBUILD
  NO -> Normal flow
\`\`\`

### Anti-Patterns (AUTOMATIC FAILURE)

1. **NEVER make one giant commit** - 3+ files MUST be 2+ commits
2. **NEVER default to semantic commits** - detect from git log first
3. **NEVER separate test from implementation** - same commit always
4. **NEVER group by file type** - group by feature/module
5. **NEVER rewrite pushed history** without explicit permission
6. **NEVER leave working directory dirty** - complete all changes
7. **NEVER skip JUSTIFICATION** - explain why files are grouped
8. **NEVER use vague grouping reasons** - "related to X" is NOT valid

---

## FINAL CHECK BEFORE EXECUTION (BLOCKING)

\`\`\`
STOP AND VERIFY - Do not proceed until ALL boxes checked:

[] File count check: N files -> at least ceil(N/3) commits?
  - 3 files -> min 1 commit
  - 5 files -> min 2 commits
  - 10 files -> min 4 commits
  - 20 files -> min 7 commits

[] Justification check: For each commit with 3+ files, did I write WHY?

[] Directory split check: Different directories -> different commits?

[] Test pairing check: Each test with its implementation?

[] Dependency order check: Foundations before dependents?
\`\`\`

**HARD STOP CONDITIONS:**
- Making 1 commit from 3+ files -> **WRONG. SPLIT.**
- Making 2 commits from 10+ files -> **WRONG. SPLIT MORE.**
- Can't justify file grouping in one sentence -> **WRONG. SPLIT.**
- Different directories in same commit (without justification) -> **WRONG. SPLIT.**

---
---

# REBASE MODE (Phase R1-R4)

## PHASE R1: Rebase Context Analysis

<rebase_context>
### R1.1 Parallel Information Gathering

\`\`\`bash
# Execute ALL in parallel
git branch --show-current
git log --oneline -20
git merge-base HEAD main 2>/dev/null || git merge-base HEAD master
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || echo "NO_UPSTREAM"
git status --porcelain
git stash list
\`\`\`

### R1.2 Safety Assessment

| Condition | Risk Level | Action |
|-----------|------------|--------|
| On main/master | CRITICAL | **ABORT** - never rebase main |
| Dirty working directory | WARNING | Stash first: \`git stash push -m "pre-rebase"\` |
| Pushed commits exist | WARNING | Will require force-push; confirm with user |
| All commits local | SAFE | Proceed freely |
| Upstream diverged | WARNING | May need \`--onto\` strategy |

### R1.3 Determine Rebase Strategy

\`\`\`
USER REQUEST -> STRATEGY:

"squash commits" / "cleanup" / "정리"
  -> INTERACTIVE_SQUASH

"rebase on main" / "update branch" / "메인에 리베이스"
  -> REBASE_ONTO_BASE

"autosquash" / "apply fixups"
  -> AUTOSQUASH

"reorder commits" / "커밋 순서"
  -> INTERACTIVE_REORDER

"split commit" / "커밋 분리"
  -> INTERACTIVE_EDIT
\`\`\`
</rebase_context>

---

## PHASE R2: Rebase Execution

<rebase_execution>
### R2.1 Interactive Rebase (Squash/Reorder)

\`\`\`bash
# Find merge-base
MERGE_BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)

# Start interactive rebase
# NOTE: Cannot use -i interactively. Use GIT_SEQUENCE_EDITOR for automation.

# For SQUASH (combine all into one):
git reset --soft $MERGE_BASE
git commit -m "Combined: <summarize all changes>"

# For SELECTIVE SQUASH (keep some, squash others):
# Use fixup approach - mark commits to squash, then autosquash
\`\`\`

### R2.2 Autosquash Workflow

\`\`\`bash
# When you have fixup! or squash! commits:
MERGE_BASE=$(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)
GIT_SEQUENCE_EDITOR=: git rebase -i --autosquash $MERGE_BASE

# The GIT_SEQUENCE_EDITOR=: trick auto-accepts the rebase todo
# Fixup commits automatically merge into their targets
\`\`\`

### R2.3 Rebase Onto (Branch Update)

\`\`\`bash
# Scenario: Your branch is behind main, need to update

# Simple rebase onto main:
git fetch origin
git rebase origin/main

# Complex: Move commits to different base
# git rebase --onto <newbase> <oldbase> <branch>
git rebase --onto origin/main $(git merge-base HEAD origin/main) HEAD
\`\`\`

### R2.4 Handling Conflicts

\`\`\`
CONFLICT DETECTED -> WORKFLOW:

1. Identify conflicting files:
   git status | grep "both modified"

2. For each conflict:
   - Read the file
   - Understand both versions (HEAD vs incoming)
   - Resolve by editing file
   - Remove conflict markers (<<<<, ====, >>>>)

3. Stage resolved files:
   git add <resolved-file>

4. Continue rebase:
   git rebase --continue

5. If stuck or confused:
   git rebase --abort  # Safe rollback
\`\`\`

### R2.5 Recovery Procedures

| Situation | Command | Notes |
|-----------|---------|-------|
| Rebase going wrong | \`git rebase --abort\` | Returns to pre-rebase state |
| Need original commits | \`git reflog\` -> \`git reset --hard <hash>\` | Reflog keeps 90 days |
| Accidentally force-pushed | \`git reflog\` -> coordinate with team | May need to notify others |
| Lost commits after rebase | \`git fsck --lost-found\` | Nuclear option |
</rebase_execution>

---

## PHASE R3: Post-Rebase Verification

<rebase_verify>
\`\`\`bash
# Verify clean state
git status

# Check new history
git log --oneline $(git merge-base HEAD main 2>/dev/null || git merge-base HEAD master)..HEAD

# Verify code still works (if tests exist)
# Run project-specific test command

# Compare with pre-rebase if needed
git diff ORIG_HEAD..HEAD --stat
\`\`\`

### Push Strategy

\`\`\`
IF branch never pushed:
  -> git push -u origin <branch>

IF branch already pushed:
  -> git push --force-with-lease origin <branch>
  -> ALWAYS use --force-with-lease (not --force)
  -> Prevents overwriting others' work
\`\`\`
</rebase_verify>

---

## PHASE R4: Rebase Report

\`\`\`
REBASE SUMMARY:
  Strategy: <SQUASH | AUTOSQUASH | ONTO | REORDER>
  Commits before: N
  Commits after: M
  Conflicts resolved: K
  
HISTORY (after rebase):
  <hash1> <message1>
  <hash2> <message2>

NEXT STEPS:
  - git push --force-with-lease origin <branch>
  - Review changes before merge
\`\`\`

---
---

# HISTORY SEARCH MODE (Phase H1-H3)

## PHASE H1: Determine Search Type

<history_search_type>
### H1.1 Parse User Request

| User Request | Search Type | Tool |
|--------------|-------------|------|
| "when was X added" / "X가 언제 추가됐어" | PICKAXE | \`git log -S\` |
| "find commits changing X pattern" | REGEX | \`git log -G\` |
| "who wrote this line" / "이 줄 누가 썼어" | BLAME | \`git blame\` |
| "when did bug start" / "버그 언제 생겼어" | BISECT | \`git bisect\` |
| "history of file" / "파일 히스토리" | FILE_LOG | \`git log -- path\` |
| "find deleted code" / "삭제된 코드 찾기" | PICKAXE_ALL | \`git log -S --all\` |

### H1.2 Extract Search Parameters

\`\`\`
From user request, identify:
- SEARCH_TERM: The string/pattern to find
- FILE_SCOPE: Specific file(s) or entire repo
- TIME_RANGE: All time or specific period
- BRANCH_SCOPE: Current branch or --all branches
\`\`\`
</history_search_type>

---

## PHASE H2: Execute Search

<history_search_exec>
### H2.1 Pickaxe Search (git log -S)

**Purpose**: Find commits that ADD or REMOVE a specific string

\`\`\`bash
# Basic: Find when string was added/removed
git log -S "searchString" --oneline

# With context (see the actual changes):
git log -S "searchString" -p

# In specific file:
git log -S "searchString" -- path/to/file.py

# Across all branches (find deleted code):
git log -S "searchString" --all --oneline

# With date range:
git log -S "searchString" --since="2024-01-01" --oneline

# Case insensitive:
git log -S "searchstring" -i --oneline
\`\`\`

**Example Use Cases:**
\`\`\`bash
# When was this function added?
git log -S "def calculate_discount" --oneline

# When was this constant removed?
git log -S "MAX_RETRY_COUNT" --all --oneline

# Find who introduced a bug pattern
git log -S "== None" -- "*.py" --oneline  # Should be "is None"
\`\`\`

### H2.2 Regex Search (git log -G)

**Purpose**: Find commits where diff MATCHES a regex pattern

\`\`\`bash
# Find commits touching lines matching pattern
git log -G "pattern.*regex" --oneline

# Find function definition changes
git log -G "def\\s+my_function" --oneline -p

# Find import changes
git log -G "^import\\s+requests" -- "*.py" --oneline

# Find TODO additions/removals
git log -G "TODO|FIXME|HACK" --oneline
\`\`\`

**-S vs -G Difference:**
\`\`\`
-S "foo": Finds commits where COUNT of "foo" changed
-G "foo": Finds commits where DIFF contains "foo"

Use -S for: "when was X added/removed"
Use -G for: "what commits touched lines containing X"
\`\`\`

### H2.3 Git Blame

**Purpose**: Line-by-line attribution

\`\`\`bash
# Basic blame
git blame path/to/file.py

# Specific line range
git blame -L 10,20 path/to/file.py

# Show original commit (ignoring moves/copies)
git blame -C path/to/file.py

# Ignore whitespace changes
git blame -w path/to/file.py

# Show email instead of name
git blame -e path/to/file.py

# Output format for parsing
git blame --porcelain path/to/file.py
\`\`\`

**Reading Blame Output:**
\`\`\`
^abc1234 (Author Name 2024-01-15 10:30:00 +0900 42) code_line_here
|         |            |                       |    +-- Line content
|         |            |                       +-- Line number
|         |            +-- Timestamp
|         +-- Author
+-- Commit hash (^ means initial commit)
\`\`\`

### H2.4 Git Bisect (Binary Search for Bugs)

**Purpose**: Find exact commit that introduced a bug

\`\`\`bash
# Start bisect session
git bisect start

# Mark current (bad) state
git bisect bad

# Mark known good commit (e.g., last release)
git bisect good v1.0.0

# Git checkouts middle commit. Test it, then:
git bisect good  # if this commit is OK
git bisect bad   # if this commit has the bug

# Repeat until git finds the culprit commit
# Git will output: "abc1234 is the first bad commit"

# When done, return to original state
git bisect reset
\`\`\`

**Automated Bisect (with test script):**
\`\`\`bash
# If you have a test that fails on bug:
git bisect start
git bisect bad HEAD
git bisect good v1.0.0
git bisect run pytest tests/test_specific.py

# Git runs test on each commit automatically
# Exits 0 = good, exits 1-127 = bad, exits 125 = skip
\`\`\`

### H2.5 File History Tracking

\`\`\`bash
# Full history of a file
git log --oneline -- path/to/file.py

# Follow file across renames
git log --follow --oneline -- path/to/file.py

# Show actual changes
git log -p -- path/to/file.py

# Files that no longer exist
git log --all --full-history -- "**/deleted_file.py"

# Who changed file most
git shortlog -sn -- path/to/file.py
\`\`\`
</history_search_exec>

---

## PHASE H3: Present Results

<history_results>
### H3.1 Format Search Results

\`\`\`
SEARCH QUERY: "<what user asked>"
SEARCH TYPE: <PICKAXE | REGEX | BLAME | BISECT | FILE_LOG>
COMMAND USED: git log -S "..." ...

RESULTS:
  Commit       Date           Message
  ---------    ----------     --------------------------------
  abc1234      2024-06-15     feat: add discount calculation
  def5678      2024-05-20     refactor: extract pricing logic

MOST RELEVANT COMMIT: abc1234
DETAILS:
  Author: John Doe <john@example.com>
  Date: 2024-06-15
  Files changed: 3
  
DIFF EXCERPT (if applicable):
  + def calculate_discount(price, rate):
  +     return price * (1 - rate)
\`\`\`

### H3.2 Provide Actionable Context

Based on search results, offer relevant follow-ups:

\`\`\`
FOUND THAT commit abc1234 introduced the change.

POTENTIAL ACTIONS:
- View full commit: git show abc1234
- Revert this commit: git revert abc1234
- See related commits: git log --ancestry-path abc1234..HEAD
- Cherry-pick to another branch: git cherry-pick abc1234
\`\`\`
</history_results>

---

## Quick Reference: History Search Commands

| Goal | Command |
|------|---------|
| When was "X" added? | \`git log -S "X" --oneline\` |
| When was "X" removed? | \`git log -S "X" --all --oneline\` |
| What commits touched "X"? | \`git log -G "X" --oneline\` |
| Who wrote line N? | \`git blame -L N,N file.py\` |
| When did bug start? | \`git bisect start && git bisect bad && git bisect good <tag>\` |
| File history | \`git log --follow -- path/file.py\` |
| Find deleted file | \`git log --all --full-history -- "**/filename"\` |
| Author stats for file | \`git shortlog -sn -- path/file.py\` |

---

## Anti-Patterns (ALL MODES)

### Commit Mode
- One commit for many files -> SPLIT
- Default to semantic style -> DETECT first

### Rebase Mode
- Rebase main/master -> NEVER
- \`--force\` instead of \`--force-with-lease\` -> DANGEROUS
- Rebase without stashing dirty files -> WILL FAIL

### History Search Mode
- \`-S\` when \`-G\` is appropriate -> Wrong results
- Blame without \`-C\` on moved code -> Wrong attribution
- Bisect without proper good/bad boundaries -> Wasted time`,
}

export function createBuiltinSkills(): BuiltinSkill[] {
  return [
    maestroCoreSkill,
    designingSkill,
    conductorSkill,
    orchestratorSkill,
    trackingSkill,
    playwrightSkill,
    frontendUiUxSkill,
    gitMasterSkill,
  ]
}
