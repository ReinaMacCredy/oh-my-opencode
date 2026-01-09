export const HOOK_NAME = "maestro-sisyphus-bridge"

export const PLAN_READY_PROMPT = `
## Plan Ready for Execution

A new work plan has been created by Prometheus:
- **Plan**: $PLAN_NAME
- **Path**: $PLAN_PATH

Would you like to start execution now? 
- Type "yes" or "start" to begin Sisyphus execution
- Type "no" to review the plan first

[Auto-execution can be enabled in config: maestro.autoExecute: true]
`

export const AUTO_EXECUTE_PROMPT = `
## Plan Ready - Auto-Executing

A new work plan has been created by Prometheus:
- **Plan**: $PLAN_NAME
- **Path**: $PLAN_PATH

**Auto-execution is enabled (maestro.autoExecute: true)**

Starting Sisyphus execution automatically...

Run /start-work now to begin executing the plan.
`

export const DESIGN_PHASE_CONTEXT = `
## Current Maestro Design Phase

You are operating within a Maestro workflow at **Phase $PHASE/10**:
| Phase | Name | Status |
|-------|------|--------|
| 1 | DISCOVER (Diverge) | $P1 |
| 2 | DEFINE (Converge) | $P2 |
| 3 | DEVELOP (Diverge) | $P3 |
| 4 | VERIFY (Oracle) | $P4 |
| 5 | DECOMPOSE (Beads) | $P5 |
| 6 | VALIDATE (Dependencies) | $P6 |
| 7 | ASSIGN (Tracks) | $P7 |
| 8 | READY (Handoff) | $P8 |
| 9 | EXECUTE (Implementation) | $P9 |
| 10 | FINISH (Archive) | $P10 |

Respect the current phase constraints. Do not skip ahead.
`

export const TDD_GATE_MESSAGES = {
  RED_NO_FAILING_TEST: `
## TDD Gate: RED Phase Blocked

You are in the RED phase of TDD, but no failing test was detected.

**Required**: Write a failing test FIRST before implementing any code.

The TDD cycle is:
1. RED: Write a failing test (you are here - test must FAIL)
2. GREEN: Write minimal code to pass
3. REFACTOR: Clean up while keeping tests green

[TDD enforcement is enabled: maestro.enforceTdd: true]
`,

  GREEN_TEST_NOT_PASSING: `
## TDD Gate: GREEN Phase Blocked

You are in the GREEN phase of TDD, but tests are not passing.

**Required**: Fix the implementation until the test passes.

Do not proceed to REFACTOR until all tests pass.

[TDD enforcement is enabled: maestro.enforceTdd: true]
`,

  REFACTOR_TESTS_FAILED: `
## TDD Gate: REFACTOR Phase Blocked

You are in the REFACTOR phase, but tests have regressed.

**Required**: Undo or fix refactoring until all tests pass again.

The REFACTOR phase must maintain green tests at all times.

[TDD enforcement is enabled: maestro.enforceTdd: true]
`,
}
