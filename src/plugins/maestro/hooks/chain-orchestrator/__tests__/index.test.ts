import { describe, test, expect, mock } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import type { MaestroConfig } from "../../../schema"

describe("Chain Orchestrator", () => {
	const mockCtx: PluginInput = {
		directory: "/test/project",
	} as PluginInput

	const mockConfig: MaestroConfig = {
		enabled: true,
	}

	// #given chain-orchestrator module exists
	test("createChainOrchestratorHook factory function exists", async () => {
		// #when importing the module
		const module = await import("../index")

		// #then factory function is exported
		expect(module.createChainOrchestratorHook).toBeDefined()
		expect(typeof module.createChainOrchestratorHook).toBe("function")
	})

	// #given factory function is called
	test("createChainOrchestratorHook returns object with hooks and cleanup", async () => {
		const { createChainOrchestratorHook } = await import("../index")

		// #when creating chain orchestrator
		const result = createChainOrchestratorHook(mockCtx, mockConfig)

		// #then returns object with hooks and cleanup function
		expect(result).toBeDefined()
		expect(result.hooks).toBeDefined()
		expect(typeof result.cleanup).toBe("function")
	})

	// #given chain orchestrator is created
	test("hooks object contains all required hook types", async () => {
		const { createChainOrchestratorHook } = await import("../index")
		const { hooks } = createChainOrchestratorHook(mockCtx, mockConfig)

		// #when checking hook types
		// #then has tool.execute.before from phase-gate
		expect(hooks["tool.execute.before"]).toBeDefined()
		expect(typeof hooks["tool.execute.before"]).toBe("function")

		// #then has tool.execute.after from event-relay
		expect(hooks["tool.execute.after"]).toBeDefined()
		expect(typeof hooks["tool.execute.after"]).toBe("function")

		// #then has agent.prompt.before from context-injector
		expect(hooks["agent.prompt.before"]).toBeDefined()
		expect(typeof hooks["agent.prompt.before"]).toBe("function")
	})

	// #given chain orchestrator with cleanup function
	test("cleanup function stops watchers", async () => {
		const { createChainOrchestratorHook } = await import("../index")
		const { cleanup } = createChainOrchestratorHook(mockCtx, mockConfig)

		// #when calling cleanup
		// #then should not throw
		expect(() => cleanup()).not.toThrow()
	})

	// #given all 4 components are initialized
	test("all components are wired together with shared eventBus", async () => {
		const { createChainOrchestratorHook } = await import("../index")
		const { hooks } = createChainOrchestratorHook(mockCtx, mockConfig)

		// #when checking hooks
		// #then all hooks are present (event-relay, state-bridge, phase-gate, context-injector)
		expect(hooks["tool.execute.before"]).toBeDefined() // phase-gate
		expect(hooks["tool.execute.after"]).toBeDefined() // event-relay
		expect(hooks["agent.prompt.before"]).toBeDefined() // context-injector

		// State-bridge watcher is started internally (no direct hook, uses file watcher)
	})

	// #given integration test scenario
	test("integration: all components work together", async () => {
		const { createChainOrchestratorHook } = await import("../index")
		const { hooks, cleanup } = createChainOrchestratorHook(mockCtx, mockConfig)

		// #when simulating hook calls
		const toolInput = {
			tool: "write",
			sessionID: "test-session",
			callID: "call-1",
		}
		const toolOutput = {
			args: { filePath: "/test/file.ts" },
		}

		const agentInput = {
			agentName: "Sisyphus",
			sessionID: "test-session",
			prompt: "Test prompt",
		}
		const agentOutput = {
			prompt: undefined,
		}

		// #then hooks should execute without errors
		if (hooks["tool.execute.before"]) {
			await expect(
				hooks["tool.execute.before"](toolInput, toolOutput)
			).resolves.toBeUndefined()
		}

		if (hooks["agent.prompt.before"]) {
			await expect(
				hooks["agent.prompt.before"](agentInput, agentOutput)
			).resolves.toBeUndefined()
		}

		if (hooks["tool.execute.after"]) {
			const afterInput = { ...toolInput, args: {} }
			const afterOutput = { messages: [] }
			await expect(
				hooks["tool.execute.after"](afterInput, afterOutput)
			).resolves.toBeUndefined()
		}

		// #then cleanup should work
		expect(() => cleanup()).not.toThrow()
	})
})
