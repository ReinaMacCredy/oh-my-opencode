import { describe, test, expect, mock } from "bun:test"
import { createDcpIntegration } from "../dcp-integration"

describe("createDcpIntegration", () => {
	describe("token limit error detection", () => {
		test("detects context_length_exceeded error", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: ["call-1", "call-2"],
					estimatedTokensSaved: 5000,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error(
				"Error: context_length_exceeded - maximum context length exceeded",
			)
			const context = {
				sessionId: "test-session",
				messages: [],
			}

			// #when
			const result = hook["provider.response.error"]?.(error, context)

			// #then
			expect(result).toBeDefined()
		})

		test("detects maximum context length error", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: ["call-1"],
					estimatedTokensSaved: 3000,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("maximum context length is 200000")
			const context = {
				sessionId: "test-session",
				messages: [],
			}

			// #when
			const result = hook["provider.response.error"]?.(error, context)

			// #then
			expect(result).toBeDefined()
		})

		test("detects context window error", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: [],
					estimatedTokensSaved: 0,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context window size exceeded")
			const context = {
				sessionId: "test-session",
				messages: [],
			}

			// #when
			const result = hook["provider.response.error"]?.(error, context)

			// #then
			expect(result).toBeDefined()
		})

		test("ignores non-token errors (passthrough)", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: [],
					estimatedTokensSaved: 0,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("Network timeout")
			const context = {
				sessionId: "test-session",
				messages: [],
			}

			// #when
			const result = hook["provider.response.error"]?.(error, context)

			// #then - should passthrough (undefined or empty result)
			expect(workflowPruner.identifyPrunable).not.toHaveBeenCalled()
			expect(eventBus.emit).not.toHaveBeenCalled()
		})
	})

	describe("workflow-aware pruning", () => {
		test("calls protection rules for each tool", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = {
				shouldProtect: mock((call, state) => call.tool === "todowrite"),
			}
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: ["call-2"],
					estimatedTokensSaved: 2000,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [
					{ id: "call-1", tool: "todowrite", timestamp: Date.now() },
					{ id: "call-2", tool: "read", timestamp: Date.now() - 10000 },
				],
			}

			// #when
			hook["provider.response.error"]?.(error, context)

			// #then protection rules should be called for each tool
			expect(protectionRules.shouldProtect).toHaveBeenCalledTimes(2)
		})

		test("excludes protected items from prunable list", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = {
				shouldProtect: mock((call) => call.tool === "todowrite"),
			}
			const workflowPruner = {
				identifyPrunable: mock((calls: Array<{ id: string }>) => ({
					prunableIds: calls.map((c) => c.id),
					estimatedTokensSaved: 3000,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [
					{ id: "call-1", tool: "todowrite", timestamp: Date.now() },
					{ id: "call-2", tool: "read", timestamp: Date.now() - 10000 },
				],
			}

			// #when
			hook["provider.response.error"]?.(error, context)

			// #then workflow pruner should only receive unprotected calls
			expect(workflowPruner.identifyPrunable).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({ id: "call-2", tool: "read" }),
				]),
				expect.any(Object),
			)
			const receivedCalls = workflowPruner.identifyPrunable.mock.calls[0][0]
			expect(receivedCalls).toHaveLength(1)
			expect(receivedCalls[0].id).toBe("call-2")
		})

		test("calls workflow pruner with workflow state", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: ["call-1"],
					estimatedTokensSaved: 1000,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [{ id: "call-1", tool: "read", timestamp: Date.now() }],
			}

			// #when
			hook["provider.response.error"]?.(error, context)

			// #then workflow pruner should receive workflow state
			expect(workflowPruner.identifyPrunable).toHaveBeenCalledWith(
				expect.any(Array),
				expect.objectContaining({
					sessionId: "test-session",
					currentTask: expect.any(String),
					completedTasks: expect.any(Array),
					tddPhase: expect.any(String),
				}),
			)
		})
	})

	describe("event emission", () => {
		test("emits context:pruned event with itemsPruned count", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: ["call-1", "call-2", "call-3"],
					estimatedTokensSaved: 7500,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [
					{ id: "call-1", tool: "read", timestamp: Date.now() },
					{ id: "call-2", tool: "grep", timestamp: Date.now() },
					{ id: "call-3", tool: "bash", timestamp: Date.now() },
				],
			}

			// #when
			hook["provider.response.error"]?.(error, context)

			// #then event should be emitted with correct payload
			expect(eventBus.emit).toHaveBeenCalledWith({
				type: "context:pruned",
				payload: {
					prunedToolIds: ["call-1", "call-2", "call-3"],
					tokensSaved: 7500,
					sessionId: "test-session",
					timestamp: expect.any(Number),
				},
			})
		})

		test("does not emit event when no items pruned", () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => true) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: [],
					estimatedTokensSaved: 0,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [{ id: "call-1", tool: "todowrite", timestamp: Date.now() }],
			}

			// #when
			hook["provider.response.error"]?.(error, context)

			// #then no event should be emitted
			expect(eventBus.emit).not.toHaveBeenCalled()
		})
	})

	describe("DCP integration (additive approach)", () => {
		test("returns prunable IDs for DCP to use", async () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: ["call-1", "call-2"],
					estimatedTokensSaved: 4000,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [
					{ id: "call-1", tool: "read", timestamp: Date.now() },
					{ id: "call-2", tool: "grep", timestamp: Date.now() },
				],
			}

			// #when
			const result = await hook["provider.response.error"]?.(error, context)

			// #then should return prunable IDs for DCP
			expect(result).toEqual({
				prunableToolIds: ["call-1", "call-2"],
			})
		})

		test("returns empty result when no items to prune", async () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => true) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: [],
					estimatedTokensSaved: 0,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [{ id: "call-1", tool: "todowrite", timestamp: Date.now() }],
			}

			// #when
			const result = await hook["provider.response.error"]?.(error, context)

			// #then should return empty result (DCP handles it)
			expect(result).toEqual({
				prunableToolIds: [],
			})
		})
	})

	describe("graceful degradation", () => {
		test("handles missing workflow state gracefully", async () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => {
					throw new Error("Workflow state unavailable")
				}),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [{ id: "call-1", tool: "read", timestamp: Date.now() }],
			}

			// #when
			const result = await hook["provider.response.error"]?.(error, context)

			// #then should return empty list (let DCP handle it)
			expect(result).toEqual({
				prunableToolIds: [],
			})
			expect(eventBus.emit).not.toHaveBeenCalled()
		})

		test("handles empty messages array", async () => {
			// #given
			const eventBus = { emit: mock(() => {}) }
			const protectionRules = { shouldProtect: mock(() => false) }
			const workflowPruner = {
				identifyPrunable: mock(() => ({
					prunableIds: [],
					estimatedTokensSaved: 0,
				})),
			}

			const hook = createDcpIntegration(
				eventBus,
				protectionRules,
				workflowPruner,
			)

			const error = new Error("context_length_exceeded")
			const context = {
				sessionId: "test-session",
				messages: [],
			}

			// #when
			const result = await hook["provider.response.error"]?.(error, context)

			// #then should handle gracefully
			expect(result).toEqual({
				prunableToolIds: [],
			})
		})
	})
})
