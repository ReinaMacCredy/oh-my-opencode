import { describe, test, expect } from "bun:test";
import { createMaestroPlugin } from "./index";
import type { PluginInput } from "@opencode-ai/plugin";
import type { MaestroConfig } from "./schema";

describe("Hook Merging - No Shadowing", () => {
	const mockContext: Partial<PluginInput> = {
		directory: "/test/project",
		client: {} as any,
	};

	test("should expose tool.execute.after hook from merged sources", async () => {
		const config: MaestroConfig = { enabled: true, enforceTdd: true };
		const plugin = createMaestroPlugin(mockContext as PluginInput, config);

		const mockInput = {
			tool: "sisyphus_task",
			sessionID: "test-session",
			callID: "test-call",
		};
		const mockOutput = {
			title: "Test Task",
			output: "Task completed",
			metadata: {},
		};

		const toolExecuteAfter = plugin["tool.execute.after"] as ((input: any, output: any) => Promise<void>) | undefined;
		
		expect(toolExecuteAfter).toBeDefined();

		if (toolExecuteAfter) {
			await toolExecuteAfter(mockInput, mockOutput);
		}
		
		expect(toolExecuteAfter).toBeDefined();
	});

	test("should expose tool.execute.before hook from tdd enforcement", async () => {
		const config: MaestroConfig = { 
			enabled: true,
			enforceTdd: true,
		};
		const plugin = createMaestroPlugin(mockContext as PluginInput, config);

		const mockInput = {
			tool: "write",
			sessionID: "test-session",
			callID: "test-call",
		};
		const mockOutput = {
			args: { filePath: "test.ts" },
			message: "",
		};

		const toolExecuteBefore = plugin["tool.execute.before"] as ((input: any, output: any) => Promise<void>) | undefined;
		
		expect(toolExecuteBefore).toBeDefined();

		if (toolExecuteBefore) {
			await toolExecuteBefore(mockInput, mockOutput);
		}

		expect(toolExecuteBefore).toBeDefined();
	});
});
