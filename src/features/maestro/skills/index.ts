import type { BuiltinSkill } from "../../builtin-skills/types"

export const tddSkill: BuiltinSkill = {
  name: "tdd",
  description:
    "TDD methodology for implementation tasks. Enforces RED→GREEN→REFACTOR cycle. Auto-injected for ci/co/ca modes.",
  template: `# TDD - Test-Driven Development

Enforce RED → GREEN → REFACTOR cycle for all implementation work.

## Cycle

| Phase | Action | Gate |
|-------|--------|------|
| RED | Write failing test first | Test must FAIL |
| GREEN | Implement minimal code to pass | Test must PASS |
| REFACTOR | Clean up while tests pass | All tests PASS |

## Protocol

1. **Before implementation**: Write test that captures expected behavior
2. **Run test**: Verify it fails for the right reason
3. **Implement**: Write minimal code to make test pass
4. **Verify**: Run test, must pass
5. **Refactor**: Clean up code, run tests after each change
6. **Repeat**: Next behavior/requirement

## Commands

\`\`\`bash
# Run tests (detect project type)
bun test || npm test || pnpm test || yarn test

# Run specific test file
bun test {file} || npm test -- {file}

# Watch mode (if supported)
bun test --watch || npm test -- --watch
\`\`\`

## Gate Rules

- Cannot mark task complete if tests fail
- Cannot skip RED phase (write test first)
- Cannot proceed to next task with failing tests
- Must run tests after REFACTOR

## Anti-Patterns

- Writing implementation before test (violates RED)
- Writing more code than needed to pass (violates GREEN)
- Skipping REFACTOR phase
- Ignoring test failures`,
}

export const agentMailSkill: BuiltinSkill = {
  name: "agent-mail",
  description:
    "Worker coordination for parallel execution. Provides messaging, file reservations, and session management. Auto-injected for co/ca modes.",
  template: `# Agent Mail - Worker Coordination

CLI-based coordination for parallel workers in co/ca modes.

## CLI Location

\`\`\`bash
bun toolboxes/agent-mail/agent-mail.js <command>
\`\`\`

## Worker 4-Step Protocol

| Step | Command | Required |
|------|---------|----------|
| 1. INIT | \`macro-start-session\` | FIRST |
| 2. WORK | (do assigned tasks) | - |
| 3. REPORT | \`send-message\` | LAST |
| 4. CLEANUP | \`release-file-reservations\` | LAST |

## Commands

### Session Management
\`\`\`bash
# Initialize worker session
bun toolboxes/agent-mail/agent-mail.js macro-start-session

# Health check
bun toolboxes/agent-mail/agent-mail.js health-check
\`\`\`

### Messaging
\`\`\`bash
# Send message to orchestrator
bun toolboxes/agent-mail/agent-mail.js send-message --to orchestrator --body "Epic complete"

# Check inbox for blockers/instructions
bun toolboxes/agent-mail/agent-mail.js fetch-inbox

# Reply to message
bun toolboxes/agent-mail/agent-mail.js reply-message --id <msg-id> --body "Acknowledged"
\`\`\`

### File Reservations
\`\`\`bash
# Reserve files before editing
bun toolboxes/agent-mail/agent-mail.js reserve-files --paths "src/api/user.ts,src/api/auth.ts"

# Release reservations when done
bun toolboxes/agent-mail/agent-mail.js release-file-reservations
\`\`\`

## Rules

- Never start work before \`macro-start-session\`
- Never exit without \`send-message\` to orchestrator
- Never touch files outside assigned scope
- Always release reservations on completion
- Report blockers immediately via \`send-message\``,
}

export function createMaestroSkills(): BuiltinSkill[] {
  return [tddSkill, agentMailSkill]
}
