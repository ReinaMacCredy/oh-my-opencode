import type { PluginInput } from "@opencode-ai/plugin";
import type { MaestroConfig } from "./schema";
import { createMaestroSisyphusBridgeHook } from "./hooks/sisyphus-bridge";
import { createTddEnforcementHook } from "./hooks/tdd-enforcement";
import { createTodoTddInterceptor } from "./hooks/todo-tdd-wrapper";
import { createStateSyncHook } from "./hooks/state-sync";

export * from "./schema";
export * from "./features/boulder-state";
export * from "./types";

export function createMaestroPlugin(ctx: PluginInput, maestroConfig?: MaestroConfig) {
	const enabled = maestroConfig?.enabled ?? true;
	
	if (!enabled) {
		return {};
	}
	
	const bridgeHooks = createMaestroSisyphusBridgeHook(ctx, maestroConfig);
	const tddHooks = createTddEnforcementHook(ctx, maestroConfig);
	const tddInterceptor = createTodoTddInterceptor(ctx);
	createStateSyncHook(ctx);
	
	const combinedChatMessage = async (input: any, output: any) => {
		await bridgeHooks["chat.message"]?.(input, output);
		await tddInterceptor["chat.message"]?.(input, output);
	};
	
	const combinedToolExecuteAfter = async (input: any, output: any) => {
		await bridgeHooks["tool.execute.after"]?.(input, output);
		await tddHooks["tool.execute.after"]?.(input, output);
	};
	
	const combinedToolExecuteBefore = async (input: any, output: any) => {
		await tddHooks["tool.execute.before"]?.(input, output);
	};
	
	const combinedAgentPromptBefore = async (input: any, output: any) => {
		await bridgeHooks["agent.prompt.before"]?.(input, output);
		await tddHooks["agent.prompt.before"]?.(input, output);
	};
	
	return {
		"chat.message": combinedChatMessage,
		"tool.execute.after": combinedToolExecuteAfter,
		"tool.execute.before": combinedToolExecuteBefore,
		"agent.prompt.before": combinedAgentPromptBefore,
	};
}

export const maestroPlugin = {
	name: "@reinamaccredy/maestro-plugin",
	version: "1.0.0",
	create: createMaestroPlugin,
};



