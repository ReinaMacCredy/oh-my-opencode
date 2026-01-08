import type {
  WorkflowEngineContract_v1,
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
  WorkflowConfig,
} from "../contracts/v1"
import { SisyphusAdapter, createSisyphusAdapter } from "../adapters/sisyphus"
import { MaestroAdapter, createMaestroAdapter } from "../adapters/maestro"

const ENGINE_NAME = "MaestroEngine"
const ENGINE_VERSION = "1.0.0"

export interface MaestroEngineConfig {
  useMaestroDesign?: boolean
  useMaestroTracking?: boolean
  preferredExecutionMode?: "sisyphus" | "maestro"
}

export class MaestroEngine implements WorkflowEngineContract_v1 {
  readonly name = ENGINE_NAME
  readonly version = ENGINE_VERSION

  readonly capabilities: EngineCapabilities

  private sisyphusAdapter: SisyphusAdapter
  private maestroAdapter: MaestroAdapter
  private config: MaestroEngineConfig
  private listeners: Set<WorkflowEventListener> = new Set()

  constructor(config: MaestroEngineConfig = {}) {
    this.config = {
      useMaestroDesign: true,
      useMaestroTracking: true,
      preferredExecutionMode: "maestro",
      ...config,
    }

    this.sisyphusAdapter = createSisyphusAdapter()
    this.maestroAdapter = createMaestroAdapter(this.sisyphusAdapter)

    this.capabilities = {
      tdd: this.maestroAdapter.capabilities.tdd,
      parallelExecution: true,
      designPhases: this.config.useMaestroDesign ?? true,
      sessionHandoff: true,
      externalTracking: this.config.useMaestroTracking ?? true,
      internalTracking: true,
      autonomousExecution: false,
      skillRouting: true,
    }
  }

  async initialize(context: WorkflowContext): Promise<WorkflowResult> {
    const maestroResult = await this.maestroAdapter.initialize(context)
    if (!maestroResult.success) {
      return maestroResult
    }

    return { success: true }
  }

  async shutdown(): Promise<void> {
    await this.maestroAdapter.shutdown()
    this.listeners.clear()
  }

  async createPlan(
    request: CreatePlanRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult<WorkflowPlan>> {
    if (this.config.useMaestroDesign && !request.skipDesign) {
      return this.maestroAdapter.createPlan(request, context)
    }
    return this.sisyphusAdapter.createPlan(request, context)
  }

  async getActivePlan(context: WorkflowContext): Promise<WorkflowPlan | null> {
    const maestroPlan = await this.maestroAdapter.getActivePlan(context)
    if (maestroPlan) return maestroPlan

    return this.sisyphusAdapter.getActivePlan(context)
  }

  async getPlanProgress(planId: string): Promise<PlanProgress | null> {
    return this.maestroAdapter.getPlanProgress(planId)
  }

  async getReadyTasks(planId: string): Promise<WorkflowTask[]> {
    return this.maestroAdapter.getReadyTasks(planId)
  }

  async updateTask(request: UpdateTaskRequest): Promise<WorkflowResult<WorkflowTask>> {
    return this.maestroAdapter.updateTask(request)
  }

  async getTracks(planId: string): Promise<WorkflowTrack[]> {
    return this.maestroAdapter.getTracks(planId)
  }

  async getReadyTracks(planId: string): Promise<WorkflowTrack[]> {
    return this.maestroAdapter.getReadyTracks(planId)
  }

  async execute(
    request: ExecutePlanRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    if (this.config.preferredExecutionMode === "maestro") {
      return this.maestroAdapter.execute(request, context)
    }
    return this.sisyphusAdapter.execute(request, context)
  }

  async canExecuteParallel(planId: string): Promise<boolean> {
    return this.maestroAdapter.canExecuteParallel(planId)
  }

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    const maestroState = await this.maestroAdapter.getSessionState(sessionId)
    if (maestroState) return maestroState

    return this.sisyphusAdapter.getSessionState(sessionId)
  }

  async createHandoff(context: WorkflowContext): Promise<WorkflowResult<HandoffPayload>> {
    return this.maestroAdapter.createHandoff(context)
  }

  async restoreFromHandoff(
    payload: HandoffPayload,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    return this.maestroAdapter.restoreFromHandoff(payload, context)
  }

  async startDesignSession(context: WorkflowContext): Promise<WorkflowResult<DesignSessionState>> {
    if (!this.config.useMaestroDesign) {
      return { success: false, error: "Maestro design phases are disabled" }
    }
    return this.maestroAdapter.startDesignSession!(context)
  }

  async advanceDesignPhase(currentPhase: DesignPhase): Promise<WorkflowResult<DesignSessionState>> {
    if (!this.config.useMaestroDesign) {
      return { success: false, error: "Maestro design phases are disabled" }
    }
    return this.maestroAdapter.advanceDesignPhase!(currentPhase)
  }

  async getDesignSessionState(): Promise<DesignSessionState | null> {
    return this.maestroAdapter.getDesignSessionState!()
  }

  on(listener: WorkflowEventListener): () => void {
    this.listeners.add(listener)
    this.maestroAdapter.on(listener)
    return () => this.listeners.delete(listener)
  }

  emit(event: WorkflowEvent): void {
    Array.from(this.listeners).forEach((listener) => {
      try {
        listener(event)
      } catch {
      }
    })
  }

  getSisyphusAdapter(): SisyphusAdapter {
    return this.sisyphusAdapter
  }

  getMaestroAdapter(): MaestroAdapter {
    return this.maestroAdapter
  }
}

export function createMaestroEngine(config?: MaestroEngineConfig): MaestroEngine {
  return new MaestroEngine(config)
}
