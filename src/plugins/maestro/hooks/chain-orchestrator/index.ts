import type { PluginInput } from "@opencode-ai/plugin"
import { join } from "node:path"
import { watch } from "node:fs"
import type { MaestroConfig } from "../../schema"
import type { MaestroHooks } from "../../types"
import { maestroEventBus } from "../../events/bus"
import { createEventRelay } from "./event-relay"
import { createStateBridge } from "./state-bridge"
import { createPhaseGate } from "./phase-gate"
import { createContextInjector } from "./context-injector"
import { readBoulderState, getPlanProgress } from "../../features/boulder-state"
import { getWorkflowProgress } from "../sisyphus-bridge"

export function createChainOrchestratorHook(
	ctx: PluginInput,
	config?: MaestroConfig
) {
	const eventBus = maestroEventBus

	const relay = createEventRelay(eventBus)

	const boulderStatePath = join(ctx.directory, ".sisyphus", "boulder-state.json")

	let changeCallback: (() => void) | null = null

	const boulderStateAPI = {
		readBoulderState: () => readBoulderState(ctx.directory),
		getPlanProgress: (planPath: string) => getPlanProgress(planPath),
		onChange: (callback: () => void) => {
			changeCallback = callback
		},
	}

	let fileWatcher: ReturnType<typeof watch> | null = null
	try {
		fileWatcher = watch(boulderStatePath, (eventType) => {
			if (changeCallback && eventType === "change") {
				changeCallback()
			}
		})
	} catch {
		fileWatcher = null
	}

	const stateBridgeCleanup = createStateBridge(eventBus, boulderStateAPI)

	const gate = createPhaseGate(eventBus)

	const injector = createContextInjector(
		eventBus,
		() => {
			const state = readBoulderState(ctx.directory)
			if (!state) return null

			const progress = getPlanProgress(state.active_plan)
			return {
				planPath: state.active_plan,
				planName: state.plan_name,
				progress: {
					total: progress.total,
					completed: progress.completed,
				},
				sessionIds: state.session_ids,
			}
		},
		() => getWorkflowProgress()
	)

	const hooks = {
		"tool.execute.before": gate["tool.execute.before"],
		"tool.execute.after": relay["tool.execute.after"],
		"agent.prompt.before": injector["agent.prompt.before"],
	}

	const cleanup = () => {
		stateBridgeCleanup()
		if (fileWatcher) {
			fileWatcher.close()
		}
	}

	return { hooks, cleanup }
}
