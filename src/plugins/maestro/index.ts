import type { PluginInput } from "@opencode-ai/plugin";
import type { MaestroConfig } from "./schema";
import { createMaestroSisyphusBridgeHook } from "./hooks/sisyphus-bridge";
import { createTddEnforcementHook } from "./hooks/tdd-enforcement";

export * from "./schema";
export * from "./features/boulder-state";
export * from "./types";

export function createMaestroPlugin(ctx: PluginInput, maestroConfig?: MaestroConfig) {
	const enabled = maestroConfig?.enabled ?? true;
	
	if (!enabled) {
		return {};
	}
	
	const bridgeHooks = createMaestroSisyphusBridgeHook(ctx, maestroConfig as any);
	const tddHooks = createTddEnforcementHook(ctx, maestroConfig as any);
	
	return {
		...bridgeHooks,
		...tddHooks,
	};
}

export const maestroPlugin = {
	name: "@reinamaccredy/maestro-plugin",
	version: "1.0.0",
	create: createMaestroPlugin,
};



