interface EventBus {
	emit: (event: {
		type: string
		payload: {
			prunedToolIds?: string[]
			tokensSaved?: number
			sessionId?: string
			timestamp?: number
		}
	}) => void
}

interface ProtectionRules {
	shouldProtect: (
		toolCall: {
			tool: string
			timestamp: number
			arguments?: { filePath?: string; [key: string]: unknown }
		},
		workflowState: {
			currentTask: string
			completedTasks: string[]
			tddPhase: string
			sessionId: string
		},
	) => boolean
}

interface WorkflowPruner {
	identifyPrunable: (
		toolCalls: Array<{
			id: string
			tool: string
			timestamp: number
			output?: string
			arguments?: { filePath?: string }
		}>,
		workflowState: {
			currentTask: string
			completedTasks: string[]
			currentTddCycle: number
			tddPhase: string
		},
	) => {
		prunableIds: string[]
		estimatedTokensSaved: number
	}
}

interface WorkflowState {
	currentTask: string
	completedTasks: string[]
	currentTddCycle: number
	tddPhase: "red" | "green" | "refactor"
	sessionId: string
}

interface ToolCall {
	id: string
	tool: string
	timestamp: number
	output?: string
	arguments?: { filePath?: string }
}

interface Context {
	sessionId: string
	messages: ToolCall[]
}

function isTokenLimitError(error: Error): boolean {
	const message = error.message.toLowerCase()
	return (
		message.includes("context_length_exceeded") ||
		message.includes("maximum context length") ||
		message.includes("context window")
	)
}

function getWorkflowState(sessionId: string): WorkflowState {
	return {
		currentTask: "Unknown task",
		completedTasks: [],
		currentTddCycle: 1,
		tddPhase: "green",
		sessionId,
	}
}

function filterUnprotectedCalls(
	calls: ToolCall[],
	workflowState: WorkflowState,
	protectionRules: ProtectionRules,
): ToolCall[] {
	return calls.filter((call) => {
		return !protectionRules.shouldProtect(call, {
			currentTask: workflowState.currentTask,
			completedTasks: workflowState.completedTasks,
			tddPhase: workflowState.tddPhase,
			sessionId: workflowState.sessionId,
		})
	})
}

function emitPrunedEvent(
	eventBus: EventBus,
	prunableIds: string[],
	tokensSaved: number,
	sessionId: string,
): void {
	eventBus.emit({
		type: "context:pruned",
		payload: {
			prunedToolIds: prunableIds,
			tokensSaved,
			sessionId,
			timestamp: Date.now(),
		},
	})
}

export function createDcpIntegration(
	eventBus: EventBus,
	protectionRules: ProtectionRules,
	workflowPruner: WorkflowPruner,
) {
	return {
		"provider.response.error": async (error: Error, context: Context) => {
			if (!isTokenLimitError(error)) {
				return
			}

			try {
				const workflowState = getWorkflowState(context.sessionId)

				const unprotectedCalls = filterUnprotectedCalls(
					context.messages,
					workflowState,
					protectionRules,
				)

				const { prunableIds, estimatedTokensSaved } =
					workflowPruner.identifyPrunable(unprotectedCalls, workflowState)

				if (prunableIds.length > 0) {
					emitPrunedEvent(
						eventBus,
						prunableIds,
						estimatedTokensSaved,
						context.sessionId,
					)
				}

				return {
					prunableToolIds: prunableIds,
				}
			} catch {
				return {
					prunableToolIds: [],
				}
			}
		},
	}
}
