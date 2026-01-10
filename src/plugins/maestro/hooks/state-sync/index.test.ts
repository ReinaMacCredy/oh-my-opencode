import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { createStateSyncHook } from "./index"
import { maestroEventBus } from "../../events"
import * as boulderState from "../../features/boulder-state"
import type { MaestroEvent } from "../../types"

mock.module("../../features/boulder-state", () => ({
  updateTddState: mock(() => true),
  updateDesignPhase: mock(() => true),
  updateProgress: mock(() => true),
  startWorkflow: mock(() => ({})),
  readUnifiedState: mock(() => ({ boulder: { sessionIds: [] } })),
  writeUnifiedState: mock(() => true),
  getPlanProgress: mock(() => ({ total: 10, completed: 5, isComplete: false })),
  createEmptyUnifiedState: mock(() => ({ boulder: { sessionIds: [] } })),
}))

describe("State Sync Hook", () => {
  const mockCtx: any = {
    directory: "/tmp/test-project",
  }
  
  let handlers: Array<(event: MaestroEvent) => void> = []
  
  const originalOn = maestroEventBus.on
  
  beforeEach(() => {
    handlers = []
    maestroEventBus.on = (handler) => {
      handlers.push(handler)
      return () => {}
    }
    
    ;(boulderState.updateTddState as any).mockClear()
    ;(boulderState.updateDesignPhase as any).mockClear()
    ;(boulderState.updateProgress as any).mockClear()
    ;(boulderState.startWorkflow as any).mockClear()
  })
  
  afterEach(() => {
    maestroEventBus.on = originalOn
  })
  
  it("should register event listener on initialization", () => {
    createStateSyncHook(mockCtx)
    expect(handlers.length).toBe(1)
  })
  
  it("should handle tdd:phase-changed event", () => {
    createStateSyncHook(mockCtx)
    
    const event: MaestroEvent = {
      type: "tdd:phase-changed",
      payload: { phase: "red", sessionId: "session-1" }
    }
    
    handlers.forEach(h => h(event))
    
    expect(boulderState.updateTddState).toHaveBeenCalledWith(
      mockCtx.directory,
      "red",
      undefined,
      undefined
    )
  })
  
  it("should handle design:phase-changed event", () => {
    createStateSyncHook(mockCtx)
    
    const event: MaestroEvent = {
      type: "design:phase-changed",
      payload: { fromPhase: 0, phase: 2, sessionID: "s-1", timestamp: 123 }
    }
    
    handlers.forEach(h => h(event))
    
    expect(boulderState.updateDesignPhase).toHaveBeenCalledWith(
      mockCtx.directory,
      2
    )
  })
  
  it("should handle workflow:started event", () => {
    createStateSyncHook(mockCtx)
    
    const event: MaestroEvent = {
      type: "workflow:started",
      payload: { 
        sessionID: "s-1", 
        timestamp: 123,
        totalTasks: 10,
        completedTasks: 0
      }
    }
    
    handlers.forEach(h => h(event))
    
    expect(boulderState.updateProgress).toHaveBeenCalledWith(
      mockCtx.directory,
      { total: 10, completed: 0 }
    )
  })
  
  it("should handle task:completed event", () => {
    createStateSyncHook(mockCtx)
    
    const event: MaestroEvent = {
      type: "task:completed",
      payload: { taskId: "t-1", title: "Task 1", sessionId: "s-1", timestamp: 123 }
    }
    
    handlers.forEach(h => h(event))
    
    expect(boulderState.readUnifiedState).toHaveBeenCalled()
  })
})
