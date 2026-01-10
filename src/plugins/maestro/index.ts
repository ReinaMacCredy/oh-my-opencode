import type { PluginInput } from "@opencode-ai/plugin";
import type { MaestroConfig } from "./schema";
import { createMaestroSisyphusBridgeHook } from "./hooks/sisyphus-bridge";
import { createTddEnforcementHook } from "./hooks/tdd-enforcement";
import { createTodoTddInterceptor } from "./hooks/todo-tdd-wrapper";

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
	
	const combinedChatMessage = async (input: any, output: any) => {
		await bridgeHooks["chat.message"]?.(input, output);
		await tddInterceptor["chat.message"]?.(input, output);
	};
	
	return {
		...tddHooks,
		"chat.message": combinedChatMessage,
	};
}

export const maestroPlugin = {
	name: "@reinamaccredy/maestro-plugin",
	version: "1.0.0",
	create: createMaestroPlugin,
};



