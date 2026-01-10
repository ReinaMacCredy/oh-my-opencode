import { describe, it, expect, mock, beforeEach } from "bun:test"
import { createMaestroSisyphusBridgeHook } from "./index"
import { maestroEventBus } from "../../events"

const emitMock = mock()
maestroEventBus.emit = emitMock

describe("Design Phase Events", () => {
  let bridgeHook: ReturnType<typeof createMaestroSisyphusBridgeHook>

  beforeEach(() => {
    emitMock.mockClear()
    bridgeHook = createMaestroSisyphusBridgeHook({
      directory: "/tmp/test-project",
    } as any)
  })

  it("should emit design:phase-changed when phase changes", async () => {
    await bridgeHook["tool.execute.after"]!(
      { tool: "sisyphus_task", sessionID: "session-1" },
      { result: { designPhase: 1 } }
    )
    
    expect(emitMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "design:phase-changed",
        payload: expect.objectContaining({
            fromPhase: 0,
            phase: 1
        })
    }))
    
    emitMock.mockClear()

    await bridgeHook["tool.execute.after"]!(
      { tool: "sisyphus_task", sessionID: "session-1" },
      { result: { designPhase: 2 } }
    )

    expect(emitMock).toHaveBeenCalledWith({
      type: "design:phase-changed",
      payload: expect.objectContaining({
        fromPhase: 1,
        phase: 2,
        sessionID: "session-1"
      })
    })
  })

  it("should not emit when phase stays the same", async () => {
    await bridgeHook["tool.execute.after"]!(
      { tool: "sisyphus_task", sessionID: "session-2" },
      { result: { designPhase: 2 } }
    )
    emitMock.mockClear()

    await bridgeHook["tool.execute.after"]!(
      { tool: "sisyphus_task", sessionID: "session-2" },
      { result: { designPhase: 2 } }
    )

    expect(emitMock).not.toHaveBeenCalledWith(expect.objectContaining({
        type: "design:phase-changed"
    }))
  })

  it("should track phases independently per session", async () => {
    await bridgeHook["tool.execute.after"]!(
        { tool: "sisyphus_task", sessionID: "session-A" },
        { result: { designPhase: 1 } }
    )
    
    await bridgeHook["tool.execute.after"]!(
        { tool: "sisyphus_task", sessionID: "session-B" },
        { result: { designPhase: 5 } }
    )
    
    emitMock.mockClear()
    
    await bridgeHook["tool.execute.after"]!(
        { tool: "sisyphus_task", sessionID: "session-A" },
        { result: { designPhase: 2 } }
    )
    
    expect(emitMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "design:phase-changed",
        payload: expect.objectContaining({
            fromPhase: 1,
            phase: 2,
            sessionID: "session-A"
        })
    }))
    
    await bridgeHook["tool.execute.after"]!(
        { tool: "sisyphus_task", sessionID: "session-B" },
        { result: { designPhase: 6 } }
    )
     expect(emitMock).toHaveBeenCalledWith(expect.objectContaining({
        type: "design:phase-changed",
        payload: expect.objectContaining({
            fromPhase: 5,
            phase: 6,
            sessionID: "session-B"
        })
    }))
  })
})
