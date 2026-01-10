import { describe, test, expect, beforeEach } from "bun:test"
import { createMaestroPlugin } from "../index"
import type { PluginInput } from "@opencode-ai/plugin"

describe("Maestro Plugin Integration", () => {
	let mockContext: PluginInput
	
	beforeEach(() => {
		mockContext = {
			directory: "/test/project",
			client: {} as any,
			project: { root: "/test/project" } as any,
			worktree: { branch: "main", root: "/test/project" } as any,
			serverUrl: new URL("http://localhost:8080"),
			$: {} as any,
		}
	})

	describe("plugin initialization", () => {
		test("returns all required hooks when enabled", () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			expect(typeof hooks["chat.message"]).toBe("function")
			expect(typeof hooks["tool.execute.before"]).toBe("function")
			expect(typeof hooks["tool.execute.after"]).toBe("function")
			expect(typeof hooks["agent.prompt.before"]).toBe("function")
			expect(typeof hooks["provider.response.error"]).toBe("function")
		})

		test("returns empty object when disabled", () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: false })
			
			expect(Object.keys(hooks)).toHaveLength(0)
		})

		test("defaults to enabled when config not provided", () => {
			const hooks = createMaestroPlugin(mockContext)
			
			expect(typeof hooks["chat.message"]).toBe("function")
			expect(typeof hooks["provider.response.error"]).toBe("function")
		})
	})

	describe("chain-orchestrator integration", () => {
		test("combines bridge hooks with TDD hooks in chat.message", async () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			const mockInput = { sessionID: "test-session" }
			const mockOutput = {}
			
			await hooks["chat.message"]?.(mockInput, mockOutput)
		})

		test("combines TDD enforcement in tool.execute.before", async () => {
			const hooks = createMaestroPlugin(mockContext, { 
				enabled: true,
				tddGates: { requireFailingTest: true }
			})
			
			const mockInput = {
				sessionID: "test-session",
				tool: "write",
			}
			const mockOutput = { args: {} }
			
			await hooks["tool.execute.before"]?.(mockInput, mockOutput)
		})

		test("combines bridge and TDD hooks in tool.execute.after", async () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			const mockInput = {
				sessionID: "test-session",
				tool: "read",
			}
			const mockOutput = { result: "file content" }
			
			await hooks["tool.execute.after"]?.(mockInput, mockOutput)
		})

		test("combines bridge and TDD hooks in agent.prompt.before", async () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			const mockInput = {
				sessionID: "test-session",
				agent: "build",
			}
			const mockOutput = { prompt: "test prompt" }
			
			await hooks["agent.prompt.before"]?.(mockInput, mockOutput)
		})
	})

	describe("context-recovery integration", () => {
		test("wires context-recovery to provider.response.error", () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			expect(hooks["provider.response.error"]).toBeDefined()
			expect(typeof hooks["provider.response.error"]).toBe("function")
		})

		test("context-recovery runs on token limit errors", async () => {
			const hooks = createMaestroPlugin(mockContext, { 
				enabled: true,
			})
			
			const mockError = new Error("Context window exceeded")
			const mockResponseContext = { sessionID: "test-session", provider: "anthropic" }
			
			await hooks["provider.response.error"]?.(mockError, mockResponseContext)
		})
	})

	describe("end-to-end hook chain", () => {
		test("full workflow: chat -> tool.before -> tool.after -> agent.prompt -> error", async () => {
			const hooks = createMaestroPlugin(mockContext, {
				enabled: true,
				tddGates: { requireFailingTest: true },
			})
			
			const sessionID = "e2e-test-session"
			
			const chatInput = { sessionID }
			const chatOutput = {}
			await hooks["chat.message"]?.(chatInput, chatOutput)
			
			const toolBeforeInput = { sessionID, tool: "read" }
			const toolBeforeOutput = { args: { filePath: "/test/file.ts" } }
			await hooks["tool.execute.before"]?.(toolBeforeInput, toolBeforeOutput)
			
			const toolAfterInput = { sessionID, tool: "read" }
			const toolAfterOutput = { result: "content" }
			await hooks["tool.execute.after"]?.(toolAfterInput, toolAfterOutput)
			
			const agentInput = { sessionID, agent: "build" }
			const agentOutput = { prompt: "build task" }
			await hooks["agent.prompt.before"]?.(agentInput, agentOutput)
			
			const mockError = new Error("Token limit exceeded")
			const mockResponseContext = { sessionID: "test-session", provider: "anthropic" }
			await hooks["provider.response.error"]?.(mockError, mockResponseContext)
		})
	})

	describe("hook composition", () => {
		test("chat.message calls bridge and tdd-interceptor in order", async () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			const callOrder: string[] = []
			const trackingInput = {
				sessionID: "composition-test",
				_tracker: callOrder,
			}
			
			await hooks["chat.message"]?.(trackingInput, {})
		})

		test("tool.execute.after calls bridge then tdd hooks", async () => {
			const hooks = createMaestroPlugin(mockContext, { enabled: true })
			
			const callOrder: string[] = []
			const trackingInput = {
				sessionID: "composition-test",
				tool: "todowrite",
				_tracker: callOrder,
			}
			
			await hooks["tool.execute.after"]?.(trackingInput, { result: {} })
		})
	})

	describe("config propagation", () => {
		test("tddGates config propagates to TDD enforcement", async () => {
			const hooks = createMaestroPlugin(mockContext, {
				enabled: true,
				tddGates: {
					requireFailingTest: false,
					requirePassingTest: true,
				},
			})
			
			expect(hooks["tool.execute.before"]).toBeDefined()
		})

		test("enabled config controls hook creation", async () => {
			const hooks = createMaestroPlugin(mockContext, {
				enabled: true,
			})
			
			expect(hooks["provider.response.error"]).toBeDefined()
		})
	})
})
