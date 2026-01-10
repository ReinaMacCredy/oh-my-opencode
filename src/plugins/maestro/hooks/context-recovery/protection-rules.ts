/**
 * Protection Rules for Context Recovery
 *
 * Defines which tool outputs must be preserved during context pruning.
 * Workflow-aware protection ensures critical task context is never lost.
 */

const DCP_PROTECTED_TOOLS = new Set([
	"task",
	"todowrite",
	"todoread",
	"lsp_rename",
	"lsp_code_action_resolve",
	"session_read",
	"session_write",
	"session_search",
])

export interface ToolCall {
	tool: string
	timestamp: number
	arguments?: {
		filePath?: string
		[key: string]: unknown
	}
}

export interface WorkflowState {
	currentTask: string
	completedTasks: string[]
	tddPhase: "red" | "green" | "refactor"
	sessionId: string
	planPath?: string
}

export interface ProtectionConfig {
	recencyThresholdMs?: number
}

const DEFAULT_RECENCY_THRESHOLD_MS = 5 * 60 * 1000

function isTestFile(filePath: string): boolean {
	return (
		/\.test\.ts$/.test(filePath) ||
		/\.spec\.ts$/.test(filePath) ||
		/__tests__\//.test(filePath)
	)
}

function extractTaskKeywords(task: string): string[] {
	return task
		.toLowerCase()
		.split(/\s+/)
		.filter((word) => word.length > 3)
}

function isCurrentTaskFile(filePath: string, currentTask: string): boolean {
	const taskKeywords = extractTaskKeywords(currentTask)
	const filePathLower = filePath.toLowerCase()

	return taskKeywords.some((keyword) => filePathLower.includes(keyword))
}

function isActiveTddArtifact(
	filePath: string,
	tddPhase: "red" | "green" | "refactor",
	currentTask: string,
): boolean {
	const isCurrentTask = isCurrentTaskFile(filePath, currentTask)

	if (tddPhase === "red") {
		return isTestFile(filePath) && isCurrentTask
	}

	if (tddPhase === "green") {
		return !isTestFile(filePath) && isCurrentTask
	}

	return false
}

function isRecent(timestamp: number, thresholdMs: number): boolean {
	return Date.now() - timestamp < thresholdMs
}

export function shouldProtect(
	toolCall: ToolCall,
	workflowState: WorkflowState,
	config: ProtectionConfig = {},
): boolean {
	const recencyThreshold = config.recencyThresholdMs ?? DEFAULT_RECENCY_THRESHOLD_MS

	if (DCP_PROTECTED_TOOLS.has(toolCall.tool)) {
		return true
	}

	if (isRecent(toolCall.timestamp, recencyThreshold)) {
		return true
	}

	const filePath = toolCall.arguments?.filePath
	if (!filePath) {
		return false
	}

	if (isCurrentTaskFile(filePath, workflowState.currentTask)) {
		return true
	}

	if (isActiveTddArtifact(filePath, workflowState.tddPhase, workflowState.currentTask)) {
		return true
	}

	return false
}
