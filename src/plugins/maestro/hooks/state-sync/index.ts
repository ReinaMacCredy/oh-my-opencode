import type { PluginInput } from "@opencode-ai/plugin"
import { maestroEventBus } from "../../events"
import {
  updateDesignPhase,
  updateTddState,
  updateProgress,
  readUnifiedState,
} from "../../features/boulder-state"

export function createStateSyncHook(ctx: PluginInput) {
  const projectDir = ctx.directory

	maestroEventBus.on(async (event) => {
		if (event.type === "tdd:phase-changed") {
			const { phase } = event.payload
			await updateTddState(projectDir, phase as "red" | "green" | "refactor", undefined, undefined)
		}

		if (event.type === "design:phase-changed") {
			const { phase } = event.payload
			await updateDesignPhase(projectDir, phase as number)
		}

		if (event.type === "workflow:started") {
			const { totalTasks, completedTasks } = event.payload
			await updateProgress(projectDir, {
				total: totalTasks,
				completed: completedTasks,
			})
		}

	if (event.type === "task:completed") {
		const state = await readUnifiedState(projectDir)
		if (state?.progress) {
			await updateProgress(projectDir, {
				total: state.progress.total,
				completed: state.progress.completed + 1,
			})
		}
	}
	})

	return {}
}
