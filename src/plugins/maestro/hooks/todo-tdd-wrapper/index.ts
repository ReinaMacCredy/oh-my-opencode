import type { PluginInput } from "@opencode-ai/plugin"
import { maestroEventBus } from "../../events"
import { log } from "../../../../shared/logger"

const TDD_RED_PHASE_PROMPT = `[SYSTEM REMINDER - TDD RED PHASE]

You are in TDD RED phase. Before continuing with implementation:

1. Write a FAILING test first
2. Run the test to confirm it fails
3. Only then implement the minimum code to pass

Do NOT write implementation code without a failing test.`

interface SessionTddState {
  phase: "red" | "green" | "refactor" | null
}

const sessionStates = new Map<string, SessionTddState>()

export function createTodoTddInterceptor(ctx: PluginInput) {
  maestroEventBus.on((event) => {
    if (event.type === "tdd:phase-changed") {
      const { phase, sessionId } = event.payload
      let state = sessionStates.get(sessionId)
      if (!state) {
        state = { phase: null }
        sessionStates.set(sessionId, state)
      }
      state.phase = phase
      log("[maestro-tdd-interceptor] TDD phase updated", { sessionId, phase })
    }
  })

  return {
    "chat.message": async (input: Record<string, unknown>, output: Record<string, unknown>) => {
      const sessionID = input.sessionID as string
      const state = sessionStates.get(sessionID)
      
      if (state?.phase === "red") {
        const parts = (output.parts as any[]) || []
        const hasTodoReminder = parts.some((part: any) => 
          part.type === "text" && part.text?.includes("TODO CONTINUATION")
        )
        
        if (hasTodoReminder) {
          const index = parts.findIndex((part: any) => 
            part.type === "text" && part.text?.includes("TODO CONTINUATION")
          )
          if (index !== -1) {
            parts[index] = {
              type: "text",
              text: TDD_RED_PHASE_PROMPT
            }
            log("[maestro-tdd-interceptor] Replaced TODO prompt with TDD RED prompt", { sessionID })
          }
        }
      }
    }
  }
}
