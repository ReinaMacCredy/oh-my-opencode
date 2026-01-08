import type {
  EngineCapabilities,
  WorkflowContext,
  WorkflowPlan,
  WorkflowTask,
  WorkflowTrack,
  WorkflowResult,
  WorkflowEvent,
  WorkflowEventListener,
  CreatePlanRequest,
  ExecutePlanRequest,
  UpdateTaskRequest,
  SessionState,
  HandoffPayload,
  DesignSessionState,
  DesignPhase,
  PlanProgress,
} from "./types"

export const CONTRACT_VERSION = "1.0.0" as const

export interface WorkflowEngineContract_v1 {
  readonly name: string
  readonly version: string
  readonly capabilities: EngineCapabilities

  initialize(context: WorkflowContext): Promise<WorkflowResult>
  shutdown(): Promise<void>

  createPlan(request: CreatePlanRequest, context: WorkflowContext): Promise<WorkflowResult<WorkflowPlan>>
  getActivePlan(context: WorkflowContext): Promise<WorkflowPlan | null>
  getPlanProgress(planId: string): Promise<PlanProgress | null>

  getReadyTasks(planId: string): Promise<WorkflowTask[]>
  updateTask(request: UpdateTaskRequest): Promise<WorkflowResult<WorkflowTask>>

  getTracks(planId: string): Promise<WorkflowTrack[]>
  getReadyTracks(planId: string): Promise<WorkflowTrack[]>

  execute(request: ExecutePlanRequest, context: WorkflowContext): Promise<WorkflowResult>
  canExecuteParallel(planId: string): Promise<boolean>

  getSessionState(sessionId: string): Promise<SessionState | null>
  createHandoff(context: WorkflowContext): Promise<WorkflowResult<HandoffPayload>>
  restoreFromHandoff(payload: HandoffPayload, context: WorkflowContext): Promise<WorkflowResult>

  startDesignSession?(context: WorkflowContext): Promise<WorkflowResult<DesignSessionState>>
  advanceDesignPhase?(currentPhase: DesignPhase): Promise<WorkflowResult<DesignSessionState>>
  getDesignSessionState?(): Promise<DesignSessionState | null>

  on(listener: WorkflowEventListener): () => void
  emit(event: WorkflowEvent): void
}

export type WorkflowEngineFactory = (config?: Record<string, unknown>) => WorkflowEngineContract_v1
