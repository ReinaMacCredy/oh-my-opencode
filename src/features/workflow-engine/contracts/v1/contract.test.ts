import { describe, expect, test, beforeEach } from "bun:test"
import type { WorkflowEngineContract_v1 } from "./engine.contract"
import type { WorkflowContext, EngineCapabilities, WorkflowPlan, DesignPhase } from "./types"
import { SisyphusAdapter } from "../../adapters/sisyphus"
import { MaestroAdapter } from "../../adapters/maestro"
import { MaestroEngine } from "../../engines/maestro-engine"

function createTestContext(): WorkflowContext {
  return {
    projectRoot: "/tmp/test-project",
    sessionId: "test-session-123",
  }
}

function createMockPlan(): WorkflowPlan {
  return {
    id: "test-plan",
    name: "Test Plan",
    tasks: [],
    tracks: [],
    progress: {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      isComplete: true,
      percentage: 100,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    sessionIds: [],
  }
}

function runContractTests(
  name: string,
  createEngine: () => WorkflowEngineContract_v1,
  expectedCapabilities: Partial<EngineCapabilities>
) {
  describe(`${name} - WorkflowEngineContract_v1`, () => {
    let engine: WorkflowEngineContract_v1
    let context: WorkflowContext

    beforeEach(() => {
      engine = createEngine()
      context = createTestContext()
    })

    describe("identity", () => {
      test("should have a name", () => {
        expect(engine.name).toBeDefined()
        expect(typeof engine.name).toBe("string")
        expect(engine.name.length).toBeGreaterThan(0)
      })

      test("should have a version", () => {
        expect(engine.version).toBeDefined()
        expect(typeof engine.version).toBe("string")
        expect(engine.version).toMatch(/^\d+\.\d+\.\d+$/)
      })
    })

    describe("capabilities", () => {
      test("should expose capabilities object", () => {
        expect(engine.capabilities).toBeDefined()
        expect(typeof engine.capabilities).toBe("object")
      })

      test("should have expected capabilities", () => {
        for (const [key, value] of Object.entries(expectedCapabilities)) {
          expect(engine.capabilities[key as keyof EngineCapabilities]).toBe(value)
        }
      })

      test("should have all required capability flags", () => {
        const requiredFlags: (keyof EngineCapabilities)[] = [
          "designPhases",
          "parallelExecution",
          "tdd",
          "externalTracking",
          "internalTracking",
          "sessionHandoff",
          "autonomousExecution",
          "skillRouting",
        ]
        for (const flag of requiredFlags) {
          expect(engine.capabilities).toHaveProperty(flag)
          expect(typeof engine.capabilities[flag]).toBe("boolean")
        }
      })
    })

    describe("lifecycle", () => {
      test("should initialize successfully", async () => {
        const result = await engine.initialize(context)
        expect(result).toBeDefined()
        expect(result.success).toBe(true)
      })

      test("should shutdown without error", async () => {
        await engine.initialize(context)
        await expect(engine.shutdown()).resolves.toBeUndefined()
      })
    })

    describe("plan operations", () => {
      test("should return null for active plan when none exists", async () => {
        await engine.initialize(context)
        const plan = await engine.getActivePlan(context)
        expect(plan).toBeNull()
      })

      test("should return empty array for ready tasks when no plan", async () => {
        await engine.initialize(context)
        const tasks = await engine.getReadyTasks("non-existent-plan")
        expect(Array.isArray(tasks)).toBe(true)
        expect(tasks.length).toBe(0)
      })

      test("should return empty array for tracks when no plan", async () => {
        await engine.initialize(context)
        const tracks = await engine.getTracks("non-existent-plan")
        expect(Array.isArray(tracks)).toBe(true)
        expect(tracks.length).toBe(0)
      })

      test("should return null for plan progress when plan not found", async () => {
        await engine.initialize(context)
        const progress = await engine.getPlanProgress("non-existent-plan")
        expect(progress).toBeNull()
      })
    })

    describe("session operations", () => {
      test("should return null for non-existent session state", async () => {
        await engine.initialize(context)
        const state = await engine.getSessionState("non-existent-session")
        expect(state).toBeNull()
      })
    })

    describe("event system", () => {
      test("should support event listeners", () => {
        const unsubscribe = engine.on(() => {})
        expect(typeof unsubscribe).toBe("function")
        unsubscribe()
      })

      test("should emit events to listeners", () => {
        let receivedEvent: unknown = null
        engine.on((event) => {
          receivedEvent = event
        })
        engine.emit({
          type: "plan:created",
          plan: createMockPlan(),
        })
        expect(receivedEvent).not.toBeNull()
      })

      test("should stop receiving events after unsubscribe", () => {
        let eventCount = 0
        const unsubscribe = engine.on(() => {
          eventCount++
        })
        engine.emit({
          type: "plan:created",
          plan: createMockPlan(),
        })
        expect(eventCount).toBe(1)
        unsubscribe()
        engine.emit({
          type: "plan:created",
          plan: createMockPlan(),
        })
        expect(eventCount).toBe(1)
      })
    })

    describe("parallel execution", () => {
      test("should report parallel capability correctly", async () => {
        await engine.initialize(context)
        const canParallel = await engine.canExecuteParallel("any-plan")
        expect(typeof canParallel).toBe("boolean")
      })
    })
  })
}

runContractTests(
  "SisyphusAdapter",
  () => new SisyphusAdapter(),
  {
    designPhases: false,
    parallelExecution: true,
    tdd: false,
    externalTracking: false,
    internalTracking: true,
    sessionHandoff: true,
    autonomousExecution: false,
    skillRouting: false,
  }
)

runContractTests(
  "MaestroAdapter",
  () => new MaestroAdapter(),
  {
    designPhases: true,
    parallelExecution: true,
    tdd: true,
    externalTracking: true,
    internalTracking: true,
    sessionHandoff: true,
    autonomousExecution: false,
    skillRouting: true,
  }
)

runContractTests(
  "MaestroEngine",
  () => new MaestroEngine(),
  {
    designPhases: true,
    parallelExecution: true,
    tdd: true,
    externalTracking: true,
    internalTracking: true,
    sessionHandoff: true,
    autonomousExecution: false,
    skillRouting: true,
  }
)

describe("MaestroAdapter - Design Session", () => {
  let engine: MaestroAdapter
  let context: WorkflowContext

  beforeEach(() => {
    engine = new MaestroAdapter()
    context = createTestContext()
  })

  test("should support design session methods", () => {
    expect(engine.startDesignSession).toBeDefined()
    expect(engine.advanceDesignPhase).toBeDefined()
    expect(engine.getDesignSessionState).toBeDefined()
  })

  test("should start design session", async () => {
    await engine.initialize(context)
    const result = await engine.startDesignSession!(context)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    const expectedPhase: DesignPhase = 1
    expect(result.data?.currentPhase).toBe(expectedPhase)
  })

  test("should return null for design state when no session active", async () => {
    await engine.initialize(context)
    const state = await engine.getDesignSessionState!()
    expect(state).toBeNull()
  })

  test("should track design session state after start", async () => {
    await engine.initialize(context)
    await engine.startDesignSession!(context)
    const state = await engine.getDesignSessionState!()
    expect(state).not.toBeNull()
    const expectedPhase: DesignPhase = 1
    expect(state?.currentPhase).toBe(expectedPhase)
  })
})

describe("MaestroEngine - Layered Architecture", () => {
  let engine: MaestroEngine
  let context: WorkflowContext

  beforeEach(() => {
    engine = new MaestroEngine()
    context = createTestContext()
  })

  test("should combine capabilities from both adapters", () => {
    expect(engine.capabilities.designPhases).toBe(true)
    expect(engine.capabilities.internalTracking).toBe(true)
  })

  test("should delegate to Maestro for design sessions", async () => {
    await engine.initialize(context)
    const result = await engine.startDesignSession!(context)
    expect(result.success).toBe(true)
  })

  test("should have MaestroEngine name", () => {
    expect(engine.name).toBe("MaestroEngine")
  })
})
