import { describe, test, expect } from "bun:test"
import { identifyPrunable } from "../workflow-pruner"

describe("identifyPrunable", () => {
  // #given tool calls with task context
  test("identifies completed task context as prunable", () => {
    // #given
    const toolCalls = [
      {
        id: "call-1",
        tool: "read",
        timestamp: Date.now() - 5000,
        output: "file contents from task 1",
        taskContext: "task-1",
      },
      {
        id: "call-2",
        tool: "read",
        timestamp: Date.now() - 4000,
        output: "file contents from task 2",
        taskContext: "task-2",
      },
      {
        id: "call-3",
        tool: "read",
        timestamp: Date.now() - 1000,
        output: "file contents from current task",
        taskContext: "task-4",
      },
    ]

    const workflowState = {
      currentTask: "task-4",
      completedTasks: ["task-1", "task-2", "task-3"],
      currentTddCycle: 3,
      tddPhase: "green" as const,
    }

    // #when
    const result = identifyPrunable(toolCalls, workflowState)

    // #then completed task context should be prunable
    expect(result.prunableIds).toContain("call-1")
    expect(result.prunableIds).toContain("call-2")
    expect(result.prunableIds).not.toContain("call-3") // current task
  })

  // #given TDD cycles with phase transitions
  test("identifies old TDD cycle artifacts as prunable", () => {
    // #given
    const toolCalls = [
      {
        id: "call-red-1",
        tool: "write",
        timestamp: Date.now() - 10000,
        output: "test file written in cycle 1",
        tddCycle: 1,
        arguments: { filePath: "/test/auth.test.ts" },
      },
      {
        id: "call-red-2",
        tool: "bash",
        timestamp: Date.now() - 9000,
        output: "tests failed (RED phase)",
        tddCycle: 2,
      },
      {
        id: "call-green-2",
        tool: "write",
        timestamp: Date.now() - 8000,
        output: "implementation to pass tests",
        tddCycle: 2,
      },
      {
        id: "call-red-3",
        tool: "write",
        timestamp: Date.now() - 1000,
        output: "current cycle test",
        tddCycle: 3,
      },
    ]

    const workflowState = {
      currentTask: "task-4",
      completedTasks: ["task-1", "task-2"],
      currentTddCycle: 3,
      tddPhase: "red" as const,
    }

    // #when
    const result = identifyPrunable(toolCalls, workflowState)

    // #then old TDD cycles should be prunable
    expect(result.prunableIds).toContain("call-red-1")
    expect(result.prunableIds).toContain("call-red-2")
    expect(result.prunableIds).toContain("call-green-2")
    expect(result.prunableIds).not.toContain("call-red-3") // current cycle
  })

  // #given superseded design decisions
  test("identifies superseded design decisions as prunable", () => {
    // #given
    const toolCalls = [
      {
        id: "call-design-a",
        tool: "read",
        timestamp: Date.now() - 15000,
        output: "exploring approach A",
        decisionContext: "decision-1-approach-a",
      },
      {
        id: "call-design-b",
        tool: "read",
        timestamp: Date.now() - 10000,
        output: "exploring approach B (supersedes A)",
        decisionContext: "decision-1-approach-b",
        supersedes: "decision-1-approach-a",
      },
      {
        id: "call-current",
        tool: "write",
        timestamp: Date.now() - 1000,
        output: "implementing approach B",
        decisionContext: "decision-1-approach-b",
      },
    ]

    const workflowState = {
      currentTask: "task-1",
      completedTasks: [],
      currentTddCycle: 1,
      tddPhase: "green" as const,
    }

    // #when
    const result = identifyPrunable(toolCalls, workflowState)

    // #then superseded decisions should be prunable
    expect(result.prunableIds).toContain("call-design-a")
    expect(result.prunableIds).not.toContain("call-design-b")
    expect(result.prunableIds).not.toContain("call-current")
  })

  // #given token estimation
  test("calculates estimated tokens saved correctly", () => {
    // #given
    const toolCalls = [
      {
        id: "call-1",
        tool: "read",
        timestamp: Date.now() - 5000,
        output: "a".repeat(400), // 400 chars = 100 tokens (chars/4)
        taskContext: "task-1",
      },
      {
        id: "call-2",
        tool: "grep",
        timestamp: Date.now() - 4000,
        output: "b".repeat(800), // 800 chars = 200 tokens
        taskContext: "task-2",
      },
    ]

    const workflowState = {
      currentTask: "task-4",
      completedTasks: ["task-1", "task-2"],
      currentTddCycle: 1,
      tddPhase: "green" as const,
    }

    // #when
    const result = identifyPrunable(toolCalls, workflowState)

    // #then total tokens = (400 + 800) / 4 = 300
    expect(result.estimatedTokensSaved).toBe(300)
  })

  // #given no prunable items
  test("returns empty result when nothing is prunable", () => {
    // #given
    const toolCalls = [
      {
        id: "call-1",
        tool: "read",
        timestamp: Date.now() - 1000,
        output: "current task context",
        taskContext: "task-1",
      },
    ]

    const workflowState = {
      currentTask: "task-1",
      completedTasks: [],
      currentTddCycle: 1,
      tddPhase: "red" as const,
    }

    // #when
    const result = identifyPrunable(toolCalls, workflowState)

    // #then
    expect(result.prunableIds).toEqual([])
    expect(result.estimatedTokensSaved).toBe(0)
  })

  // #given edge case: undefined output
  test("handles tool calls with undefined output", () => {
    // #given
    const toolCalls = [
      {
        id: "call-1",
        tool: "bash",
        timestamp: Date.now() - 5000,
        // no output field
        taskContext: "task-1",
      },
    ]

    const workflowState = {
      currentTask: "task-2",
      completedTasks: ["task-1"],
      currentTddCycle: 1,
      tddPhase: "green" as const,
    }

    // #when
    const result = identifyPrunable(toolCalls, workflowState)

    // #then should be prunable but contribute 0 tokens
    expect(result.prunableIds).toContain("call-1")
    expect(result.estimatedTokensSaved).toBe(0)
  })

  // #given mixed conditions
  test("handles multiple pruning criteria simultaneously", () => {
    // #given
    const toolCalls = [
      {
        id: "completed-task",
        tool: "read",
        timestamp: Date.now() - 10000,
        output: "x".repeat(400),
        taskContext: "task-1",
      },
      {
        id: "old-tdd-cycle",
        tool: "bash",
        timestamp: Date.now() - 8000,
        output: "y".repeat(800),
        tddCycle: 1,
      },
      {
        id: "superseded-decision",
        tool: "read",
        timestamp: Date.now() - 6000,
        output: "z".repeat(1200),
        decisionContext: "decision-1-old",
        supersedes: undefined,
      },
      {
        id: "current-work",
        tool: "write",
        timestamp: Date.now() - 1000,
        output: "w".repeat(400),
        taskContext: "task-3",
        tddCycle: 2,
      },
    ]

    const workflowState = {
      currentTask: "task-3",
      completedTasks: ["task-1"],
      currentTddCycle: 2,
      tddPhase: "green" as const,
    }

    // Mock superseded decisions tracking
    const toolCallsWithSupersede = [
      ...toolCalls.slice(0, 2),
      toolCalls[2],
      {
        ...toolCalls[2],
        id: "new-decision",
        decisionContext: "decision-1-new",
        supersedes: "decision-1-old",
      },
      toolCalls[3],
    ]

    // #when
    const result = identifyPrunable(
      toolCallsWithSupersede,
      workflowState
    )

    // #then multiple criteria should work together
    expect(result.prunableIds).toContain("completed-task")
    expect(result.prunableIds).toContain("old-tdd-cycle")
    expect(result.prunableIds).toContain("superseded-decision")
    expect(result.prunableIds).not.toContain("current-work")
    expect(result.prunableIds).not.toContain("new-decision")

    // Tokens: 400 + 800 + 1200 = 2400 chars = 600 tokens
    expect(result.estimatedTokensSaved).toBe(600)
  })
})
