import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test"
import { createTddEnforcementHook } from "./index"
import { maestroEventBus } from "../../events/bus"
import { TDD_PHASES } from "./constants"
import type { PluginInput } from "@opencode-ai/plugin"

// #given mock dependencies
const mockCtx = {
  directory: "/tmp/test",
  config: {},
  client: {},
  project: {},
  worktree: {},
  serverUrl: "http://mock",
  $: {}
} as unknown as PluginInput

const mockMaestroConfig = {
  enforceTdd: true,
  tddGates: {
    requireFailingTest: true,
    requirePassingTest: true,
    runFullSuiteAfterRefactor: true
  }
}

describe("TDD Enforcement - Phase Emission", () => {
  let emitSpy: any
  
  beforeEach(() => {
    // #given event bus spy
    emitSpy = spyOn(maestroEventBus, "emit")
  })
  
  afterEach(() => {
    mock.restore()
  })
  
  it("should emit tdd:phase-changed when transitioning from RED to GREEN", async () => {
    const hook = createTddEnforcementHook(mockCtx, mockMaestroConfig)
    const sessionID = "test-session-red-green"
    
    // #given initial state set to RED (via before hook)
    if (hook["tool.execute.before"]) {
        await hook["tool.execute.before"]({
            tool: "write",
            sessionID,
            callID: "setup-1"
        }, {
            args: { filePath: "src/test.test.ts", content: "test" } as any
        })
    }

    // #given failing test output (RED -> GREEN transition trigger)
    const input = {
      tool: "bash",
      sessionID,
      callID: "call-1"
    }
    
    const output = {
      result: "FAIL: test failed",
      message: "Tests failed"
    }
    
    // #when executing hook with failing test
    if (hook["tool.execute.after"]) {
      await hook["tool.execute.after"](input, output)
    }
    
    // #then should emit phase change event
    expect(emitSpy).toHaveBeenCalledWith({
      type: "tdd:phase-changed",
      payload: expect.objectContaining({
        phase: TDD_PHASES.GREEN,
        sessionId: sessionID,
        from: TDD_PHASES.RED,
        to: TDD_PHASES.GREEN
      })
    })
  })
  
  it("should emit tdd:phase-changed when transitioning from GREEN to REFACTOR", async () => {
    const hook = createTddEnforcementHook(mockCtx, mockMaestroConfig)
    const sessionID = "test-session-green-refactor"
    
    // #given sequence to reach GREEN phase
    // 1. Set RED
    if (hook["tool.execute.before"]) {
        await hook["tool.execute.before"]({
            tool: "write",
            sessionID,
            callID: "setup-1"
        }, {
            args: { filePath: "src/test.test.ts", content: "test" } as any
        })
    }
    
    // 2. Set GREEN (failing test)
    if (hook["tool.execute.after"]) {
      await hook["tool.execute.after"]({
        tool: "bash",
        sessionID,
        callID: "call-1"
      }, {
        result: "FAIL: test failed",
        message: "Failed"
      })
    }
    
    emitSpy.mockClear()
    
    // #when passing test encountered (GREEN -> REFACTOR transition)
    const input = {
      tool: "bash",
      sessionID,
      callID: "call-2"
    }
    
    const output = {
      result: "PASS: all tests passed",
      message: "Tests passed"
    }
    
    if (hook["tool.execute.after"]) {
      await hook["tool.execute.after"](input, output)
    }
    
    // #then should emit REFACTOR phase event
    expect(emitSpy).toHaveBeenCalledWith({
      type: "tdd:phase-changed",
      payload: expect.objectContaining({
        phase: TDD_PHASES.REFACTOR,
        sessionId: sessionID,
        from: TDD_PHASES.GREEN,
        to: TDD_PHASES.REFACTOR
      })
    })
  })

  it("should emit tdd:phase-changed when transitioning from REFACTOR to RED", async () => {
    const hook = createTddEnforcementHook(mockCtx, mockMaestroConfig)
    const sessionID = "test-session-refactor-red"
    
    // #given sequence to reach REFACTOR phase
    // 1. Set RED (write test)
    if (hook["tool.execute.before"]) {
        await hook["tool.execute.before"]({
            tool: "write",
            sessionID,
            callID: "setup-1"
        }, {
            args: { filePath: "src/test.test.ts", content: "test" } as any
        })
    }
    
    // 2. Set GREEN (fail test)
    if (hook["tool.execute.after"]) {
      await hook["tool.execute.after"]({
        tool: "bash",
        sessionID,
        callID: "setup-2"
      }, {
        result: "FAIL: test failed",
        message: "Failed"
      })
    }

    // 3. Set REFACTOR (pass test)
    if (hook["tool.execute.after"]) {
        await hook["tool.execute.after"]({
          tool: "bash",
          sessionID,
          callID: "setup-3"
        }, {
          result: "PASS: all tests passed",
          message: "Passed"
        })
    }
    
    emitSpy.mockClear()
    
    // #when writing to test file (REFACTOR -> RED transition)
    const input = {
        tool: "write",
        sessionID,
        callID: "call-red"
    }
    
    const output = {
        args: { filePath: "src/new-feature.test.ts", content: "test" } as any
    }
    
    if (hook["tool.execute.before"]) {
        await hook["tool.execute.before"](input, output)
    }
    
    // #then should emit RED phase event
    expect(emitSpy).toHaveBeenCalledWith({
      type: "tdd:phase-changed",
      payload: expect.objectContaining({
        phase: TDD_PHASES.RED,
        sessionId: sessionID,
      })
    })
  })
})
