import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test"
import { createMaestroSisyphusBridgeHook } from "./index"
import { maestroEventBus } from "../../events"

describe("Maestro Sisyphus Bridge - Workflow Events", () => {
  const mockCtx: any = {
    directory: "/tmp/test-dir",
  }
  
  const mockConfig: any = {
    autoExecute: false
  }

  // Mock event bus emit
  const originalEmit = maestroEventBus.emit
  const emitMock = mock((event: any) => {
    // console.log("Event emitted:", event)
  })

  beforeEach(() => {
    maestroEventBus.emit = emitMock
    emitMock.mockClear()
  })

  afterEach(() => {
    maestroEventBus.emit = originalEmit
  })

  it("should emit workflow:started when first task goes in_progress", async () => {
    const hook = createMaestroSisyphusBridgeHook(mockCtx, mockConfig)
    const sessionId = "session-123"

    // 1. Initial state: 0 tasks
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [] } }
    )
    expect(emitMock).not.toHaveBeenCalled()

    // 2. Add tasks, but none in progress yet (pending)
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "pending" }] } }
    )
    expect(emitMock).not.toHaveBeenCalled()

    // 3. Mark task as in_progress -> Should emit workflow:started
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "in_progress" }] } }
    )

    expect(emitMock).toHaveBeenCalledWith(expect.objectContaining({
      type: "workflow:started",
      payload: expect.objectContaining({
        sessionID: sessionId,
        totalTasks: 1,
        completedTasks: 0
      })
    }))
  })

  it("should not emit workflow:started multiple times", async () => {
    const hook = createMaestroSisyphusBridgeHook(mockCtx, mockConfig)
    const sessionId = "session-456"

    // First emission
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "in_progress" }] } }
    )
    expect(emitMock).toHaveBeenCalledTimes(1)
    
    emitMock.mockClear()

    // Subsequent update (e.g. adding another task) shouldn't emit started again
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "in_progress" }, { id: "2", status: "pending" }] } }
    )
    expect(emitMock).not.toHaveBeenCalled()
  })

  it("should emit workflow:completed when all tasks are completed", async () => {
    const hook = createMaestroSisyphusBridgeHook(mockCtx, mockConfig)
    const sessionId = "session-789"

    // 1. In progress
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "in_progress" }, { id: "2", status: "pending" }] } }
    )
    emitMock.mockClear()

    // 2. One completed, one pending -> Not completed yet
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "completed" }, { id: "2", status: "pending" }] } }
    )
    expect(emitMock).not.toHaveBeenCalledWith(expect.objectContaining({ type: "workflow:completed" }))

    // 3. All completed -> Should emit workflow:completed
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "completed" }, { id: "2", status: "completed" }] } }
    )
    
    expect(emitMock).toHaveBeenCalledWith(expect.objectContaining({
      type: "workflow:completed",
      payload: expect.objectContaining({
        sessionID: sessionId,
        totalTasks: 2,
        completedTasks: 2
      })
    }))
  })

  it("should not emit workflow:completed if there are no tasks", async () => {
    const hook = createMaestroSisyphusBridgeHook(mockCtx, mockConfig)
    const sessionId = "session-empty"

    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [] } }
    )
    
    expect(emitMock).not.toHaveBeenCalled()
  })

  it("should not emit workflow:completed multiple times", async () => {
    const hook = createMaestroSisyphusBridgeHook(mockCtx, mockConfig)
    const sessionId = "session-dup-complete"

    // Complete all
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "completed" }] } }
    )
    expect(emitMock).toHaveBeenCalledWith(expect.objectContaining({ type: "workflow:completed" }))
    emitMock.mockClear()

    // Update again (still completed)
    await hook["tool.execute.after"](
      { tool: "todowrite", sessionID: sessionId },
      { result: { todos: [{ id: "1", status: "completed" }] } }
    )
    expect(emitMock).not.toHaveBeenCalled()
  })
})
