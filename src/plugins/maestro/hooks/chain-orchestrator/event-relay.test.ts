import { describe, test, expect, beforeEach } from "bun:test"
import type { MaestroEventBus } from "../../events"
import { createEventRelay } from "./event-relay"

describe("Event Relay", () => {
	let mockEventBus: MaestroEventBus
	let emittedEvents: Array<{ type: string; payload: unknown }>

	beforeEach(() => {
		emittedEvents = []
		mockEventBus = {
			emit: (event: any) => {
				emittedEvents.push(event)
			},
			on: () => {},
		} as unknown as MaestroEventBus
	})

	describe("sisyphus_task detection", () => {
		test("emits sisyphus:delegated when sisyphus_task tool is called", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered with sisyphus_task
			const input = {
				tool: "sisyphus_task",
				sessionID: "test-session-123",
				args: {
					category: "business-logic",
					description: "Implement authentication flow",
				},
			}
			const output = {
				result: { taskId: "task-456" },
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: sisyphus:delegated event is emitted with correct payload
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]?.type).toBe("sisyphus:delegated")
			expect(emittedEvents[0]?.payload).toMatchObject({
				agentType: "business-logic",
				taskDescription: "Implement authentication flow",
				sessionId: "test-session-123",
			})
			expect((emittedEvents[0]?.payload as any).timestamp).toBeTypeOf("number")
		})

		test("emits sisyphus:delegated when call_omo_agent tool is called", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered with call_omo_agent
			const input = {
				tool: "call_omo_agent",
				sessionID: "test-session-456",
				args: {
					agent: "oracle",
					prompt: "Review architecture design",
				},
			}
			const output = {
				result: { taskId: "task-789" },
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: sisyphus:delegated event is emitted with agent type
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]?.type).toBe("sisyphus:delegated")
			expect(emittedEvents[0]?.payload).toMatchObject({
				agentType: "oracle",
				taskDescription: "Review architecture design",
				sessionId: "test-session-456",
			})
		})

		test("does not emit when non-delegation tool is called", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered with read tool
			const input = {
				tool: "read",
				sessionID: "test-session-789",
				args: { filePath: "/test/file.ts" },
			}
			const output = {
				result: { content: "file content" },
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: no events are emitted
			expect(emittedEvents).toHaveLength(0)
		})
	})

	describe("BOULDER_CONTINUATION_PROMPT detection", () => {
		test("emits sisyphus:continuing when BOULDER_CONTINUATION_PROMPT is in messages", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered with continuation prompt in output
			const input = {
				tool: "todowrite",
				sessionID: "test-session-abc",
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content: "[SYSTEM REMINDER - BOULDER CONTINUATION]\n\nYou have an active work plan...",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: sisyphus:continuing event is emitted
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]?.type).toBe("sisyphus:continuing")
			expect(emittedEvents[0]?.payload).toMatchObject({
				reason: "boulder-continuation",
				sessionId: "test-session-abc",
			})
			expect((emittedEvents[0]?.payload as any).timestamp).toBeTypeOf("number")
		})

		test("does not emit when BOULDER_CONTINUATION_PROMPT is not present", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered without continuation prompt
			const input = {
				tool: "todowrite",
				sessionID: "test-session-def",
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content: "Regular message without continuation prompt",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: no events are emitted
			expect(emittedEvents).toHaveLength(0)
		})
	})

	describe("ORCHESTRATOR_DELEGATION_REQUIRED detection", () => {
		test("emits sisyphus:blocked when ORCHESTRATOR_DELEGATION_REQUIRED is in messages", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered with delegation required warning
			const input = {
				tool: "edit",
				sessionID: "test-session-ghi",
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content:
							"⚠️⚠️⚠️ [CRITICAL SYSTEM DIRECTIVE - DELEGATION REQUIRED] ⚠️⚠️⚠️\n\nYou are attempting to directly modify...",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: sisyphus:blocked event is emitted
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]?.type).toBe("sisyphus:blocked")
			expect(emittedEvents[0]?.payload).toMatchObject({
				toolName: "edit",
				reason: "orchestrator-delegation-required",
				sessionId: "test-session-ghi",
			})
			expect((emittedEvents[0]?.payload as any).timestamp).toBeTypeOf("number")
		})

		test("does not emit when ORCHESTRATOR_DELEGATION_REQUIRED is not present", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered without delegation warning
			const input = {
				tool: "edit",
				sessionID: "test-session-jkl",
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content: "Regular edit result",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: no events are emitted
			expect(emittedEvents).toHaveLength(0)
		})
	})

	describe("VERIFICATION_REMINDER detection", () => {
		test("emits sisyphus:verifying when VERIFICATION_REMINDER is in messages", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered with verification reminder
			const input = {
				tool: "sisyphus_task",
				sessionID: "test-session-mno",
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content: "**MANDATORY VERIFICATION - SUBAGENTS LIE**\n\nSubagents FREQUENTLY claim completion...",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: sisyphus:verifying event is emitted
			expect(emittedEvents).toHaveLength(1)
			expect(emittedEvents[0]?.type).toBe("sisyphus:verifying")
			expect(emittedEvents[0]?.payload).toMatchObject({
				checkType: "mandatory-verification",
				sessionId: "test-session-mno",
			})
			expect((emittedEvents[0]?.payload as any).timestamp).toBeTypeOf("number")
		})

		test("does not emit when VERIFICATION_REMINDER is not present", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after hook is triggered without verification reminder
			const input = {
				tool: "sisyphus_task",
				sessionID: "test-session-pqr",
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content: "Task completed successfully",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: no events are emitted
			expect(emittedEvents).toHaveLength(0)
		})
	})

	describe("multiple detections in single call", () => {
		test("emits multiple events when multiple patterns are detected", async () => {
			// #given: Event relay hook
			const relay = createEventRelay(mockEventBus)

			// #when: tool.execute.after with both sisyphus_task AND verification reminder
			const input = {
				tool: "sisyphus_task",
				sessionID: "test-session-stu",
				args: {
					agent: "librarian",
					prompt: "Research documentation",
				},
			}
			const output = {
				result: {},
				messages: [
					{
						role: "user",
						content: "**MANDATORY VERIFICATION - SUBAGENTS LIE**\n\nYou must verify everything...",
					},
				],
			}

			await relay["tool.execute.after"]?.(input, output)

			// #then: both sisyphus:delegated and sisyphus:verifying events are emitted
			expect(emittedEvents).toHaveLength(2)

			const eventTypes = emittedEvents.map((e) => e.type)
			expect(eventTypes).toContain("sisyphus:delegated")
			expect(eventTypes).toContain("sisyphus:verifying")
		})
	})
})
