const CHARS_PER_TOKEN = 4

interface ToolCall {
  id: string
  tool: string
  timestamp: number
  output?: string
  arguments?: { filePath?: string }
  taskContext?: string
  tddCycle?: number
  decisionContext?: string
  supersedes?: string
}

interface WorkflowState {
  currentTask: string
  completedTasks: string[]
  currentTddCycle: number
  tddPhase: "red" | "green" | "refactor"
}

interface PruningResult {
  prunableIds: string[]
  estimatedTokensSaved: number
}

export function identifyPrunable(
  toolCalls: ToolCall[],
  workflowState: WorkflowState
): PruningResult {
  const prunableIds: string[] = []
  let totalChars = 0
  const supersededDecisions = new Set<string>()

  for (const call of toolCalls) {
    if (call.supersedes) {
      supersededDecisions.add(call.supersedes)
    }
  }

  for (const call of toolCalls) {
    const isPrunable =
      isCompletedTaskContext(call, workflowState) ||
      isOldTddCycle(call, workflowState) ||
      isSupersededDecision(call, supersededDecisions)

    if (isPrunable) {
      prunableIds.push(call.id)
      totalChars += call.output?.length || 0
    }
  }

  return {
    prunableIds,
    estimatedTokensSaved: Math.floor(totalChars / CHARS_PER_TOKEN),
  }
}

function isCompletedTaskContext(
  call: ToolCall,
  state: WorkflowState
): boolean {
  if (!call.taskContext) return false
  return state.completedTasks.includes(call.taskContext)
}

function isOldTddCycle(call: ToolCall, state: WorkflowState): boolean {
  if (call.tddCycle === undefined) return false
  return call.tddCycle < state.currentTddCycle
}

function isSupersededDecision(
  call: ToolCall,
  supersededDecisions: Set<string>
): boolean {
  if (!call.decisionContext) return false
  return supersededDecisions.has(call.decisionContext)
}
