import { describe, test, expect } from "bun:test"
import { shouldProtect } from "../protection-rules"

interface ToolCall {
	tool: string
	timestamp: number
	arguments?: {
		filePath?: string
		[key: string]: unknown
	}
}

interface WorkflowState {
	currentTask: string
	completedTasks: string[]
	tddPhase: "red" | "green" | "refactor"
	sessionId: string
	planPath?: string
}

describe("protection-rules", () => {
	const now = Date.now()
	const oneMinuteAgo = now - 60 * 1000
	const tenMinutesAgo = now - 10 * 60 * 1000
	const thirtyMinutesAgo = now - 30 * 60 * 1000

	const workflowState: WorkflowState = {
		currentTask: "Task 7: Implement protection rules",
		completedTasks: ["Task 1", "Task 2", "Task 3"],
		tddPhase: "red",
		sessionId: "test-session-1",
		planPath: "/project/.sisyphus/plans/maestro-sisyphus-chain.md",
	}

	describe("DCP protected tools", () => {
		test("protects task tool", () => {
			const toolCall: ToolCall = {
				tool: "task",
				timestamp: thirtyMinutesAgo,
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(true)
		})

		test("protects todowrite tool", () => {
			const toolCall: ToolCall = {
				tool: "todowrite",
				timestamp: thirtyMinutesAgo,
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(true)
		})

		test("protects lsp_rename tool", () => {
			const toolCall: ToolCall = {
				tool: "lsp_rename",
				timestamp: thirtyMinutesAgo,
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(true)
		})

		test("protects session_read tool", () => {
			const toolCall: ToolCall = {
				tool: "session_read",
				timestamp: thirtyMinutesAgo,
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(true)
		})
	})

	describe("recency-based protection", () => {
		test("protects tool from 1 minute ago", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: oneMinuteAgo,
				arguments: {
					filePath: "/random/file.ts",
				},
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(true)
		})

		test("does not protect tool from 30 minutes ago", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/random/file.ts",
				},
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(false)
		})

		test("does not protect tool from 10 minutes ago", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: tenMinutesAgo,
				arguments: {
					filePath: "/random/file.ts",
				},
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(false)
		})
	})

	describe("current task file protection", () => {
		test("protects file mentioned in current task", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/plugins/maestro/hooks/context-recovery/protection-rules.ts",
				},
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(true)
		})

		test("does not protect file from completed task", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/plugins/maestro/hooks/chain-orchestrator/index.ts",
				},
			}

			const completedTaskState: WorkflowState = {
				...workflowState,
				currentTask: "Task 8: Different task",
				completedTasks: [
					"Task 1",
					"Task 2",
					"Task 7: chain-orchestrator implementation",
				],
			}

			const result = shouldProtect(toolCall, completedTaskState)
			expect(result).toBe(false)
		})

		test("does not protect unrelated file", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/unrelated/module.ts",
				},
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(false)
		})
	})

	describe("TDD phase artifact protection", () => {
		test("RED phase protects test file read", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/plugins/maestro/hooks/context-recovery/__tests__/protection-rules.test.ts",
				},
			}

			const redPhaseState: WorkflowState = {
				...workflowState,
				tddPhase: "red",
			}

			const result = shouldProtect(toolCall, redPhaseState)
			expect(result).toBe(true)
		})

		test("RED phase does not protect implementation file read", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/some/impl.ts",
				},
			}

			const redPhaseState: WorkflowState = {
				...workflowState,
				tddPhase: "red",
			}

			const result = shouldProtect(toolCall, redPhaseState)
			expect(result).toBe(false)
		})

		test("GREEN phase protects implementation file read", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/plugins/maestro/hooks/context-recovery/protection-rules.ts",
				},
			}

			const greenPhaseState: WorkflowState = {
				...workflowState,
				tddPhase: "green",
			}

			const result = shouldProtect(toolCall, greenPhaseState)
			expect(result).toBe(true)
		})

		test("GREEN phase does not protect test file read", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/some/__tests__/impl.test.ts",
				},
			}

			const greenPhaseState: WorkflowState = {
				...workflowState,
				tddPhase: "green",
			}

			const result = shouldProtect(toolCall, greenPhaseState)
			expect(result).toBe(false)
		})

		test("REFACTOR phase does not add extra protection", () => {
			const testFileCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/some/__tests__/impl.test.ts",
				},
			}

			const implFileCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/some/impl.ts",
				},
			}

			const refactorState: WorkflowState = {
				...workflowState,
				tddPhase: "refactor",
			}

			const testResult = shouldProtect(testFileCall, refactorState)
			const implResult = shouldProtect(implFileCall, refactorState)

			expect(testResult).toBe(false)
			expect(implResult).toBe(false)
		})
	})

	describe("edge cases", () => {
		test("handles missing filePath gracefully", () => {
			const toolCall: ToolCall = {
				tool: "bash",
				timestamp: thirtyMinutesAgo,
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(false)
		})

		test("handles missing arguments gracefully", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
			}

			const result = shouldProtect(toolCall, workflowState)
			expect(result).toBe(false)
		})

		test("handles missing planPath gracefully", () => {
			const toolCall: ToolCall = {
				tool: "read",
				timestamp: thirtyMinutesAgo,
				arguments: {
					filePath: "/project/src/some/file.ts",
				},
			}

			const noPlanState: WorkflowState = {
				...workflowState,
				planPath: undefined,
			}

			const result = shouldProtect(toolCall, noPlanState)
			expect(result).toBe(false)
		})
	})
})
