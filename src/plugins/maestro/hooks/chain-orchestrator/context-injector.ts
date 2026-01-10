import type { MaestroEvent } from "../../types"

type TddPhase = "red" | "green" | "refactor"

interface EventBus {
	on(handler: (event: MaestroEvent) => void): void
	emit(event: MaestroEvent): void
}

interface BoulderState {
	planPath: string
	planName: string
	progress: { total: number; completed: number }
	sessionIds: string[]
}

interface WorkflowProgress {
	planPath: string
	planName: string
	totalTasks: number
	completedTasks: number
	currentTask?: string
	phase: number
	lastUpdated: string
}

export interface AgentPromptInput {
	agentName: string
	sessionID: string
	prompt: string
}

export interface AgentPromptOutput {
	prompt?: string
}

const sessionTddPhases = new Map<string, TddPhase>()

function getTddPhaseGuidance(phase: TddPhase): string {
	switch (phase) {
		case "red":
			return "Write failing test first!"
		case "green":
			return "Make tests pass"
		case "refactor":
			return "Keep tests green while refactoring"
	}
}

function buildProgressBar(percent: number): string {
	const filled = Math.floor(percent / 10)
	const empty = 10 - filled
	return "█".repeat(filled) + "░".repeat(empty)
}

function buildWorkflowContext(
	boulderState: BoulderState | null,
	workflowProgress: WorkflowProgress | null,
	tddPhase: TddPhase | null,
	currentTask?: string
): string | null {
	if (!boulderState && !workflowProgress) {
		return null
	}

	const planName = boulderState?.planName || workflowProgress?.planName
	const total = boulderState?.progress.total || workflowProgress?.totalTasks || 0
	const completed = boulderState?.progress.completed || workflowProgress?.completedTasks || 0
	const taskDescription = currentTask || workflowProgress?.currentTask

	if (!planName) {
		return null
	}

	const percent = total > 0 ? Math.round((completed / total) * 100) : 0
	const progressBar = buildProgressBar(percent)

	const lines = [
		"[WORKFLOW CONTEXT]",
		"",
		`Plan: ${planName}`,
		`Progress: ${completed}/${total} tasks (${percent}%) ${progressBar}`,
	]

	if (tddPhase) {
		const phaseUpper = tddPhase.toUpperCase()
		const guidance = getTddPhaseGuidance(tddPhase)
		lines.push(`TDD Phase: ${phaseUpper} - ${guidance}`)
	}

	if (taskDescription) {
		lines.push(`Current Task: ${taskDescription}`)
	}

	if (tddPhase === "red") {
		lines.push("")
		lines.push("Constraints:")
		lines.push("• Only test files allowed until test fails")
		lines.push(`• Run: bun test [test-file]`)
	}

	return lines.join("\n")
}

export function createContextInjector(
	eventBus: EventBus,
	boulderStateReader: () => BoulderState | null,
	workflowProgressReader: () => WorkflowProgress | null
) {
	eventBus.on((event: MaestroEvent) => {
		if (event.type === "tdd:phase-changed") {
			const { phase, sessionId } = event.payload as { phase: TddPhase; sessionId: string }
			sessionTddPhases.set(sessionId, phase)
		}
	})

	return {
		"agent.prompt.before": async (
			input: AgentPromptInput,
			output: AgentPromptOutput
		): Promise<void> => {
			const boulderState = boulderStateReader()
			const workflowProgress = workflowProgressReader()
			const tddPhase = sessionTddPhases.get(input.sessionID) || null

			const context = buildWorkflowContext(
				boulderState,
				workflowProgress,
				tddPhase,
				workflowProgress?.currentTask
			)

			if (context) {
				output.prompt = context + "\n\n" + input.prompt
			}
		},
	}
}
