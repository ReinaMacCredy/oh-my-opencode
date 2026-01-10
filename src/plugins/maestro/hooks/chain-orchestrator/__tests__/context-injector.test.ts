import { describe, test, expect, beforeEach } from "bun:test"
import { createMockEventBus } from "./mocks/event-bus"
import { createContextInjector } from "../context-injector"

interface WorkflowProgress {
	planPath: string
	planName: string
	totalTasks: number
	completedTasks: number
	currentTask?: string
	phase: number
	lastUpdated: string
}

interface BoulderState {
	planPath: string
	planName: string
	progress: { total: number; completed: number }
	sessionIds: string[]
}

interface AgentPromptInput {
	agentName: string
	sessionID: string
	prompt: string
}

interface AgentPromptOutput {
	prompt?: string
}

describe("context-injector", () => {
	let mockEventBus: ReturnType<typeof createMockEventBus>
	let contextInjector: ReturnType<typeof createContextInjector>
	let mockBoulderState: BoulderState | null
	let mockWorkflowProgress: WorkflowProgress | null
	let mockTddPhase: "red" | "green" | "refactor" | null

	const mockBoulderStateReader = () => mockBoulderState
	const mockWorkflowProgressReader = () => mockWorkflowProgress

	beforeEach(() => {
		mockEventBus = createMockEventBus()
		mockEventBus.reset()
		mockBoulderState = null
		mockWorkflowProgress = null
		mockTddPhase = null
		contextInjector = createContextInjector(mockEventBus, mockBoulderStateReader, mockWorkflowProgressReader)

		// Track TDD phase via events
		mockEventBus.on((event) => {
			if (event.type === "tdd:phase-changed") {
				mockTddPhase = event.payload.phase as "red" | "green" | "refactor"
			}
		})
	})

	test("injects unified context when all data sources available", async () => {
		// #given boulder-state with plan data
		mockBoulderState = {
			planPath: "/project/.sisyphus/plans/test-plan.md",
			planName: "test-plan",
			progress: { total: 10, completed: 4 },
			sessionIds: ["session-1"],
		}

		// #given workflow progress with current task
		mockWorkflowProgress = {
			planPath: "/project/.sisyphus/plans/test-plan.md",
			planName: "test-plan",
			totalTasks: 10,
			completedTasks: 4,
			currentTask: "Implement authentication",
			phase: 2,
			lastUpdated: "2026-01-10T12:00:00Z",
		}

		// #given TDD phase is RED
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "session-1" },
		})

		// #when agent.prompt.before hook called
		const input: AgentPromptInput = {
			agentName: "Sisyphus",
			sessionID: "session-1",
			prompt: "Original prompt content",
		}

		const output: AgentPromptOutput = {}

		await contextInjector["agent.prompt.before"]?.(input, output)

		// #then unified context block should be prepended
		expect(output.prompt).toBeDefined()
		expect(output.prompt).toContain("[WORKFLOW CONTEXT]")
		expect(output.prompt).toContain("Plan: test-plan")
		expect(output.prompt).toContain("Progress: 4/10 tasks")
		expect(output.prompt).toContain("40%")
		expect(output.prompt).toContain("TDD Phase: RED")
		expect(output.prompt).toContain("Write failing test first")
		expect(output.prompt).toContain("Current Task: Implement authentication")
		expect(output.prompt).toContain("Original prompt content")

		// Context should be prepended, not appended
		const contextIndex = output.prompt!.indexOf("[WORKFLOW CONTEXT]")
		const originalIndex = output.prompt!.indexOf("Original prompt content")
		expect(contextIndex).toBeLessThan(originalIndex)
	})

	test("gracefully degrades when boulder-state missing", async () => {
		// #given no boulder-state
		mockBoulderState = null

		// #given workflow progress available
		mockWorkflowProgress = {
			planPath: "/project/.sisyphus/plans/test-plan.md",
			planName: "test-plan",
			totalTasks: 5,
			completedTasks: 2,
			currentTask: "Write tests",
			phase: 1,
			lastUpdated: "2026-01-10T12:00:00Z",
		}

		// #when agent.prompt.before hook called
		const input: AgentPromptInput = {
			agentName: "Sisyphus",
			sessionID: "session-1",
			prompt: "Original prompt",
		}

		const output: AgentPromptOutput = {}

		await contextInjector["agent.prompt.before"]?.(input, output)

		// #then should inject what's available (workflow progress only)
		expect(output.prompt).toBeDefined()
		expect(output.prompt).toContain("[WORKFLOW CONTEXT]")
		expect(output.prompt).toContain("Plan: test-plan")
		expect(output.prompt).toContain("Progress: 2/5 tasks")
	})

	test("includes TDD RED phase warning", async () => {
		// #given TDD RED phase
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "session-1" },
		})

		// #given minimal workflow data
		mockWorkflowProgress = {
			planPath: "/project/.sisyphus/plans/test-plan.md",
			planName: "test-plan",
			totalTasks: 3,
			completedTasks: 0,
			phase: 1,
			lastUpdated: "2026-01-10T12:00:00Z",
		}

		// #when agent.prompt.before hook called
		const input: AgentPromptInput = {
			agentName: "Sisyphus",
			sessionID: "session-1",
			prompt: "Implement feature X",
		}

		const output: AgentPromptOutput = {}

		await contextInjector["agent.prompt.before"]?.(input, output)

		// #then should include RED phase warning
		expect(output.prompt).toContain("TDD Phase: RED")
		expect(output.prompt).toMatch(/write.*test.*first/i)
	})

	test("shows progress visualization", async () => {
		// #given 50% progress
		mockWorkflowProgress = {
			planPath: "/project/.sisyphus/plans/test-plan.md",
			planName: "test-plan",
			totalTasks: 10,
			completedTasks: 5,
			phase: 1,
			lastUpdated: "2026-01-10T12:00:00Z",
		}

		// #when agent.prompt.before hook called
		const input: AgentPromptInput = {
			agentName: "Sisyphus",
			sessionID: "session-1",
			prompt: "Continue work",
		}

		const output: AgentPromptOutput = {}

		await contextInjector["agent.prompt.before"]?.(input, output)

		// #then should show progress percentage
		expect(output.prompt).toContain("50%")
		expect(output.prompt).toContain("5/10")
	})

	test("does not inject when no workflow data available", async () => {
		// #given no boulder-state and no workflow progress
		mockBoulderState = null
		mockWorkflowProgress = null

		// #when agent.prompt.before hook called
		const input: AgentPromptInput = {
			agentName: "Sisyphus",
			sessionID: "session-1",
			prompt: "Original prompt",
		}

		const output: AgentPromptOutput = {}

		await contextInjector["agent.prompt.before"]?.(input, output)

		// #then should not inject context (nothing to inject)
		expect(output.prompt).toBeUndefined()
	})

	test("handles all TDD phases correctly", async () => {
		mockWorkflowProgress = {
			planPath: "/project/.sisyphus/plans/test-plan.md",
			planName: "test-plan",
			totalTasks: 3,
			completedTasks: 1,
			phase: 1,
			lastUpdated: "2026-01-10T12:00:00Z",
		}

		const input: AgentPromptInput = {
			agentName: "Sisyphus",
			sessionID: "session-1",
			prompt: "Work",
		}

		// Test RED phase
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "session-1" },
		})

		let output: AgentPromptOutput = {}
		await contextInjector["agent.prompt.before"]?.(input, output)
		expect(output.prompt).toContain("TDD Phase: RED")

		// Test GREEN phase
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "green", sessionId: "session-1" },
		})

		output = {}
		await contextInjector["agent.prompt.before"]?.(input, output)
		expect(output.prompt).toContain("TDD Phase: GREEN")

		// Test REFACTOR phase
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "refactor", sessionId: "session-1" },
		})

		output = {}
		await contextInjector["agent.prompt.before"]?.(input, output)
		expect(output.prompt).toContain("TDD Phase: REFACTOR")
	})
})
