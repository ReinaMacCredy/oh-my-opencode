import { describe, test, expect, mock } from "bun:test"
import type { PluginInput } from "@opencode-ai/plugin"
import type { MaestroConfig } from "../../../schema"

describe("context-recovery/index", () => {
	describe("createContextRecoveryHook", () => {
		test("#given valid config #when hook created #then returns hooks object with provider.response.error", () => {
			const { createContextRecoveryHook } = require("../index")
			
			const mockCtx = {
				directory: "/test/directory",
				sessionId: "test-session",
			} as unknown as PluginInput
			
			const mockConfig: MaestroConfig = {
				enabled: true,
			}
			
			const result = createContextRecoveryHook(mockCtx, mockConfig)
			
			expect(result).toBeDefined()
			expect(result.hooks).toBeDefined()
			expect(result.hooks["provider.response.error"]).toBeDefined()
			expect(typeof result.hooks["provider.response.error"]).toBe("function")
		})
		
		test("#given token limit error #when provider.response.error hook called #then integrates all 3 components", async () => {
			const { createContextRecoveryHook } = require("../index")
			
			const mockCtx = {
				directory: "/test/directory",
				sessionId: "test-session",
			} as unknown as PluginInput
			
			const tokenLimitError = new Error("context_length_exceeded")
			const mockContext = {
				sessionId: "test-session",
				messages: [
					{
						id: "call-1",
						tool: "read",
						timestamp: Date.now() - 10000,
						output: "old output",
					},
				],
			}
			
			const result = createContextRecoveryHook(mockCtx)
			const hookResponse = await result.hooks["provider.response.error"](
				tokenLimitError,
				mockContext
			)
			
			expect(hookResponse).toBeDefined()
			expect(hookResponse.prunableToolIds).toBeDefined()
			expect(Array.isArray(hookResponse.prunableToolIds)).toBe(true)
		})
		
		test("#given non-token-limit error #when provider.response.error hook called #then returns undefined", async () => {
			const { createContextRecoveryHook } = require("../index")
			
			const mockCtx = {
				directory: "/test/directory",
				sessionId: "test-session",
			} as unknown as PluginInput
			
			const networkError = new Error("Network timeout")
			const mockContext = {
				sessionId: "test-session",
				messages: [],
			}
			
			const result = createContextRecoveryHook(mockCtx)
			const hookResponse = await result.hooks["provider.response.error"](
				networkError,
				mockContext
			)
			
			expect(hookResponse).toBeUndefined()
		})
		
		test("#given no config #when hook created #then uses defaults", () => {
			const { createContextRecoveryHook } = require("../index")
			
			const mockCtx = {
				directory: "/test/directory",
				sessionId: "test-session",
			} as unknown as PluginInput
			
			const result = createContextRecoveryHook(mockCtx)
			
			expect(result).toBeDefined()
			expect(result.hooks).toBeDefined()
			expect(result.hooks["provider.response.error"]).toBeDefined()
		})
	})
})
