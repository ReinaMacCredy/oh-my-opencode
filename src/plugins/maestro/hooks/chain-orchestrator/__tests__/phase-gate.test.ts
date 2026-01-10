import { describe, test, expect, beforeEach } from "bun:test"
import { createMockEventBus } from "./mocks/event-bus"
import { createPhaseGate } from "../phase-gate"

interface ToolInput {
	tool: string
	sessionID: string
	callID: string
}

interface ToolOutput {
	args: Record<string, unknown>
	message?: string
}

describe("phase-gate", () => {
	let mockEventBus: ReturnType<typeof createMockEventBus>
	let phaseGate: ReturnType<typeof createPhaseGate>

	beforeEach(() => {
		mockEventBus = createMockEventBus()
		mockEventBus.reset()
		phaseGate = createPhaseGate(mockEventBus)
	})

	test("RED phase blocks Write to non-test file", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "test-session-1" },
		})

		const input: ToolInput = {
			tool: "write",
			sessionID: "test-session-1",
			callID: "call-1",
		}

		const output: ToolOutput = {
			args: {
				filePath: "/project/src/app.ts",
				content: "console.log('hello')",
			},
		}

		let errorThrown = false
		try {
			await phaseGate["tool.execute.before"]?.(input, output)
		} catch (error) {
			errorThrown = true
			expect((error as Error).message).toContain("RED phase")
			expect((error as Error).message).toContain("test first")
		}

		expect(errorThrown).toBe(true)
	})

	test("RED phase allows Write to test file", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "test-session-2" },
		})

		const input: ToolInput = {
			tool: "write",
			sessionID: "test-session-2",
			callID: "call-2",
		}

		const output: ToolOutput = {
			args: {
				filePath: "/project/src/app.test.ts",
				content: "describe('test', () => {})",
			},
		}

		let errorThrown = false
		try {
			await phaseGate["tool.execute.before"]?.(input, output)
		} catch (error) {
			errorThrown = true
		}

		expect(errorThrown).toBe(false)
	})

	test("GREEN phase allows Write with reminder", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "green", sessionId: "test-session-3" },
		})

		const input: ToolInput = {
			tool: "write",
			sessionID: "test-session-3",
			callID: "call-3",
		}

		const output: ToolOutput = {
			args: {
				filePath: "/project/src/app.ts",
				content: "export function hello() {}",
			},
		}

		await phaseGate["tool.execute.before"]?.(input, output)

		expect(output.message).toBeDefined()
		expect(output.message).toContain("Make tests pass")
	})

	test("REFACTOR phase allows Edit with reminder", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "refactor", sessionId: "test-session-4" },
		})

		const input: ToolInput = {
			tool: "edit",
			sessionID: "test-session-4",
			callID: "call-4",
		}

		const output: ToolOutput = {
			args: {
				filePath: "/project/src/app.ts",
				oldString: "old",
				newString: "new",
			},
		}

		await phaseGate["tool.execute.before"]?.(input, output)

		expect(output.message).toBeDefined()
		expect(output.message).toContain("Keep tests green")
	})

	test("tracks TDD phase state per session", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "session-1" },
		})

		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "green", sessionId: "session-2" },
		})

		const session1Output: ToolOutput = {
			args: {
				filePath: "/project/src/code.ts",
				content: "impl",
			},
		}

		let session1Blocked = false
		try {
			await phaseGate["tool.execute.before"]?.(
				{ tool: "write", sessionID: "session-1", callID: "call-1" },
				session1Output,
			)
		} catch (error) {
			session1Blocked = true
		}

		const session2Output: ToolOutput = {
			args: {
				filePath: "/project/src/code.ts",
				content: "impl",
			},
		}

		let session2Blocked = false
		try {
			await phaseGate["tool.execute.before"]?.(
				{ tool: "write", sessionID: "session-2", callID: "call-2" },
				session2Output,
			)
		} catch (error) {
			session2Blocked = true
		}

		expect(session1Blocked).toBe(true)
		expect(session2Blocked).toBe(false)
		expect(session2Output.message).toContain("Make tests pass")
	})

	test("recognizes all test file patterns", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "test-session-5" },
		})

		const testFiles = [
			"/project/src/app.test.ts",
			"/project/src/app.spec.ts",
			"/project/src/__tests__/app.ts",
			"/project/__tests__/integration.spec.ts",
		]

		for (const filePath of testFiles) {
			let errorThrown = false
			const output: ToolOutput = { args: { filePath, content: "test" } }
			try {
				await phaseGate["tool.execute.before"]?.(
					{ tool: "write", sessionID: "test-session-5", callID: `call-${filePath}` },
					output,
				)
			} catch (error) {
				errorThrown = true
			}

			expect(errorThrown).toBe(false)
		}
	})

	test("RED phase allows Read operations", async () => {
		mockEventBus.emit({
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "test-session-6" },
		})

		const input: ToolInput = {
			tool: "read",
			sessionID: "test-session-6",
			callID: "call-6",
		}

		const output: ToolOutput = {
			args: {
				filePath: "/project/src/app.ts",
			},
		}

		let errorThrown = false
		try {
			await phaseGate["tool.execute.before"]?.(input, output)
		} catch (error) {
			errorThrown = true
		}

		expect(errorThrown).toBe(false)
	})
})
