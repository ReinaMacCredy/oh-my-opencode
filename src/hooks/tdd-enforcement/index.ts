/**
 * TDD Enforcement Hook
 * 
 * Engine-level TDD gate that enforces RED-GREEN-REFACTOR cycle
 * when maestro.enforceTdd is enabled.
 */

import type { PluginInput } from "@opencode-ai/plugin"
import { HOOK_NAME, TDD_PHASES, TDD_GATE_PROMPTS, TEST_FILE_PATTERNS, type TddPhase } from "./constants"
import type { MaestroConfig } from "../../config/schema"
import { readUnifiedState, updateTddState } from "../../features/boulder-state"
import { log } from "../../shared/logger"

export * from "./constants"

interface TddHookInput {
  tool: string
  sessionID: string
  callID: string
}

interface TddHookOutput {
  args: Record<string, unknown>
  message?: string
  blocked?: boolean
}

// Track current TDD phase per session
const sessionTddPhase = new Map<string, TddPhase>()
const sessionHasFailingTest = new Map<string, boolean>()
const sessionTestsPassing = new Map<string, boolean>()

function isTestFile(filePath: string): boolean {
  return TEST_FILE_PATTERNS.some(pattern => filePath.includes(pattern))
}

function detectTddPhaseFromAction(toolName: string, args: Record<string, unknown>): TddPhase | null {
  const filePath = (args.filePath || args.path || args.file || "") as string
  const content = (args.content || args.newString || "") as string
  
  // Writing to test file suggests RED phase
  if ((toolName === "write" || toolName === "edit") && isTestFile(filePath)) {
    return TDD_PHASES.RED
  }
  
  // Running tests
  if (toolName === "bash") {
    const command = (args.command || "") as string
    if (command.includes("test") || command.includes("jest") || command.includes("vitest") || 
        command.includes("pytest") || command.includes("go test") || command.includes("npm test") ||
        command.includes("bun test")) {
      // Test run - could be any phase, check based on state
      return null
    }
  }
  
  // Writing to non-test file suggests GREEN or REFACTOR
  if ((toolName === "write" || toolName === "edit") && !isTestFile(filePath) && filePath) {
    // If we have a failing test, this is GREEN phase
    // Otherwise could be REFACTOR
    return TDD_PHASES.GREEN
  }
  
  return null
}

export function createTddEnforcementHook(ctx: PluginInput, maestroConfig?: MaestroConfig) {
  const enforceTdd = maestroConfig?.enforceTdd ?? false
  const tddGates = maestroConfig?.tddGates || {
    requireFailingTest: true,
    requirePassingTest: true,
    runFullSuiteAfterRefactor: true,
  }
  
  if (!enforceTdd) {
    // Return empty hooks if TDD enforcement is disabled
    return {}
  }
  
  log(`[${HOOK_NAME}] TDD enforcement enabled`, { tddGates })
  
  return {
    /**
     * Pre-tool hook to enforce TDD gates
     */
    "tool.execute.before": async (
      input: TddHookInput,
      output: TddHookOutput
    ): Promise<void> => {
      const { tool, sessionID } = input
      const args = output.args
      
      const currentPhase = sessionTddPhase.get(sessionID) || TDD_PHASES.RED
      const hasFailingTest = sessionHasFailingTest.get(sessionID) || false
      const testsPassing = sessionTestsPassing.get(sessionID) ?? true
      
      // Detect what phase this action belongs to
      const actionPhase = detectTddPhaseFromAction(tool, args)
      
      if (!actionPhase) {
        return // Not a TDD-relevant action
      }
      
      const filePath = (args.filePath || args.path || "") as string
      
      // Enforce RED phase: must have failing test before implementation
      if (actionPhase === TDD_PHASES.GREEN && tddGates.requireFailingTest) {
        if (!hasFailingTest && !isTestFile(filePath)) {
          log(`[${HOOK_NAME}] Blocking implementation - no failing test`, {
            sessionID,
            filePath,
            currentPhase,
          })
          
          output.message = (output.message || "") + "\n\n" + TDD_GATE_PROMPTS.BLOCK_IMPLEMENTATION_NO_TEST
          
          // Update unified state
          updateTddState(ctx.directory, TDD_PHASES.RED, false, undefined)
          
          // Don't block, but inject strong warning
          // output.blocked = true would fully block
        }
      }
      
      // Enforce REFACTOR phase: tests must be passing
      if (currentPhase === TDD_PHASES.REFACTOR && !testsPassing) {
        log(`[${HOOK_NAME}] Warning: refactoring with failing tests`, {
          sessionID,
          filePath,
        })
        
        output.message = (output.message || "") + "\n\n" + TDD_GATE_PROMPTS.BLOCK_REFACTOR_TESTS_FAILING
      }
      
      // Inject phase-appropriate guidance
      if (actionPhase === TDD_PHASES.RED && isTestFile(filePath)) {
        output.message = (output.message || "") + "\n\n" + TDD_GATE_PROMPTS.RED_REQUIRES_FAILING_TEST
        sessionTddPhase.set(sessionID, TDD_PHASES.RED)
      } else if (actionPhase === TDD_PHASES.GREEN) {
        output.message = (output.message || "") + "\n\n" + TDD_GATE_PROMPTS.GREEN_REQUIRES_PASSING_TEST
        sessionTddPhase.set(sessionID, TDD_PHASES.GREEN)
      }
    },

    /**
     * Post-tool hook to track test results
     */
    "tool.execute.after": async (
      input: TddHookInput,
      output: { result?: unknown; message?: string }
    ): Promise<void> => {
      const { tool, sessionID } = input
      
      // Track test run results
      if (tool === "bash") {
        const result = output.result as string | undefined
        const message = output.message || ""
        const fullOutput = `${result || ""} ${message}`
        
        // Detect test run
        if (fullOutput.includes("PASS") || fullOutput.includes("passed") || 
            fullOutput.includes("ok") || fullOutput.includes("✓")) {
          sessionTestsPassing.set(sessionID, true)
          sessionHasFailingTest.set(sessionID, false)
          
          // Transition from GREEN to REFACTOR
          if (sessionTddPhase.get(sessionID) === TDD_PHASES.GREEN) {
            sessionTddPhase.set(sessionID, TDD_PHASES.REFACTOR)
            output.message = (output.message || "") + "\n\n" + TDD_GATE_PROMPTS.REFACTOR_REQUIRES_GREEN_TESTS
            updateTddState(ctx.directory, TDD_PHASES.REFACTOR, true)
          }
          
          log(`[${HOOK_NAME}] Tests passing`, { sessionID })
        }
        
        if (fullOutput.includes("FAIL") || fullOutput.includes("failed") || 
            fullOutput.includes("error") || fullOutput.includes("✗")) {
          sessionTestsPassing.set(sessionID, false)
          sessionHasFailingTest.set(sessionID, true)
          
          // Transition to GREEN (we have a failing test, can implement)
          if (sessionTddPhase.get(sessionID) === TDD_PHASES.RED) {
            sessionTddPhase.set(sessionID, TDD_PHASES.GREEN)
            log(`[${HOOK_NAME}] Failing test detected, moving to GREEN phase`, { sessionID })
            updateTddState(ctx.directory, TDD_PHASES.GREEN, false, "detected from test output")
          }
        }
      }
    },
    
    /**
     * Inject TDD context into agent prompts
     */
    "agent.prompt.before": async (
      input: { agentName: string; sessionID: string },
      output: { systemPrompt?: string }
    ): Promise<void> => {
      const currentPhase = sessionTddPhase.get(input.sessionID) || TDD_PHASES.RED
      const hasFailingTest = sessionHasFailingTest.get(input.sessionID) || false
      
      const tddContext = `
## TDD Enforcement Active

Current TDD Phase: **${currentPhase.toUpperCase()}**
Failing Test: ${hasFailingTest ? "Yes (ready to implement)" : "No (write test first)"}

Remember the TDD cycle:
1. RED: Write a failing test
2. GREEN: Implement minimal code to pass
3. REFACTOR: Improve code quality (tests must stay green)

[maestro.enforceTdd: true]
`
      output.systemPrompt = (output.systemPrompt || "") + "\n\n" + tddContext
    },
  }
}
