import type { PluginInput } from "@opencode-ai/plugin"
import type { MaestroConfig } from "../../schema"
import type { MaestroHooks } from "../../types"
import { maestroEventBus } from "../../events/bus"
import { shouldProtect } from "./protection-rules"
import { identifyPrunable } from "./workflow-pruner"
import { createDcpIntegration } from "./dcp-integration"

export function createContextRecoveryHook(
	ctx: PluginInput,
	config?: MaestroConfig
): { hooks: MaestroHooks } {
	const protectionRules = { shouldProtect }
	const workflowPruner = { identifyPrunable }
	
	const dcpHooks = createDcpIntegration(
		maestroEventBus as any,
		protectionRules as any,
		workflowPruner as any
	)
	
	const hooks: MaestroHooks = {
		"provider.response.error": dcpHooks["provider.response.error"] as any
	}
	
	return { hooks }
}
