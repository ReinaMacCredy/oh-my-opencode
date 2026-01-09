export const HOOK_NAME = "tdd-enforcement"

export const TDD_PHASES = {
  RED: "red",
  GREEN: "green",
  REFACTOR: "refactor",
} as const

export type TddPhase = typeof TDD_PHASES[keyof typeof TDD_PHASES]

export const TDD_GATE_PROMPTS = {
  RED_REQUIRES_FAILING_TEST: `
## TDD Gate: RED Phase

You are in the RED phase of TDD. Before writing any implementation:

1. **Write a failing test FIRST**
2. Run the test to confirm it FAILS
3. Only then proceed to implementation

The test must fail for the right reason (missing implementation, not syntax error).

[TDD enforcement enabled: maestro.enforceTdd: true]
`,

  GREEN_REQUIRES_PASSING_TEST: `
## TDD Gate: GREEN Phase

You are in the GREEN phase of TDD. The test must pass before proceeding:

1. Write the **minimal** code to make the test pass
2. Do NOT add extra features or refactoring
3. Run the test to confirm it PASSES

Only proceed to REFACTOR after the test passes.

[TDD enforcement enabled: maestro.enforceTdd: true]
`,

  REFACTOR_REQUIRES_GREEN_TESTS: `
## TDD Gate: REFACTOR Phase

You are in the REFACTOR phase of TDD. Keep tests green while refactoring:

1. Improve code quality (naming, structure, duplication)
2. Run tests after EACH change
3. If a test fails, UNDO the last change

Do NOT add new functionality during refactoring.

[TDD enforcement enabled: maestro.enforceTdd: true]
`,

  BLOCK_IMPLEMENTATION_NO_TEST: `
## TDD BLOCKED: No Failing Test Detected

You attempted to write implementation code without a failing test.

**This is blocked by TDD enforcement.**

Next steps:
1. Write a test for the functionality you want to implement
2. Run the test and confirm it FAILS
3. Then you may implement the code

[TDD enforcement enabled: maestro.enforceTdd: true]
`,

  BLOCK_REFACTOR_TESTS_FAILING: `
## TDD BLOCKED: Tests Failing During Refactor

You attempted to refactor but tests are failing.

**This is blocked by TDD enforcement.**

Next steps:
1. Undo the last refactoring change
2. Ensure all tests pass (GREEN state)
3. Make smaller refactoring changes
4. Test after each change

[TDD enforcement enabled: maestro.enforceTdd: true]
`,
}

export const IMPLEMENTATION_INDICATORS = [
  "function ",
  "class ",
  "const ",
  "let ",
  "export ",
  "async function",
  "=> {",
  "module.exports",
]

export const TEST_FILE_PATTERNS = [
  ".test.ts",
  ".test.js",
  ".spec.ts",
  ".spec.js",
  "_test.go",
  "_test.py",
  "test_",
]
