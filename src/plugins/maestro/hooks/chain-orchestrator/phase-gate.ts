import type { MaestroEventBus } from "../../events/bus"

type TddPhase = "red" | "green" | "refactor"

function isTestFile(filePath: string): boolean {
	return (
		/\.test\.ts$/.test(filePath) ||
		/\.spec\.ts$/.test(filePath) ||
		/__tests__\//.test(filePath)
	)
}

function shouldBlock(phase: TddPhase, tool: string, filePath: string): boolean {
	const isWriteTool = tool === "write" || tool === "edit"
	if (!isWriteTool) {
		return false
	}

	if (phase === "red" && !isTestFile(filePath)) {
		return true
	}

	return false
}

function getPhaseReminder(phase: TddPhase): string | undefined {
	if (phase === "green") {
		return "\n\nMake tests pass!"
	}
	if (phase === "refactor") {
		return "\n\nKeep tests green!"
	}
	return undefined
}

export function createPhaseGate(eventBus: MaestroEventBus) {
	const sessionPhases = new Map<string, TddPhase>()

	eventBus.on((event) => {
		if (event.type === "tdd:phase-changed") {
			const { sessionId, phase } = event.payload
			sessionPhases.set(sessionId, phase)
		}
	})

	return {
		"tool.execute.before": async (
			input: { tool: string; sessionID: string; callID: string },
			output: { args: Record<string, unknown>; message?: string },
		): Promise<void> => {
			const phase = sessionPhases.get(input.sessionID)
			if (!phase) {
				return
			}

			const { tool } = input
			const filePath = (output.args.filePath || "") as string

			if (shouldBlock(phase, tool, filePath)) {
				throw new Error("TDD RED phase: write test first!")
			}

			const reminder = getPhaseReminder(phase)
			if (reminder) {
				output.message = (output.message || "") + reminder
			}
		},
	}
}
