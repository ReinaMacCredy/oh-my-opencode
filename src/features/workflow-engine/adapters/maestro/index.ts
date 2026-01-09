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
} from "../../contracts/v1"
import { SisyphusAdapter } from "../sisyphus"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { join, dirname } from "node:path"

const ADAPTER_NAME = "MaestroAdapter"
const ADAPTER_VERSION = "1.0.0"

const CONDUCTOR_DIR = "conductor"
const TRACKS_DIR = "tracks"
const HANDOFFS_DIR = "handoffs"

interface MaestroTrackMetadata {
  id: string
  name: string
  phase: "design" | "planning" | "ready" | "executing" | "completed"
  orchestrated: boolean
  ralphEnabled: boolean
  beadsFileScopes?: Record<string, string[]>
  createdAt: string
  updatedAt: string
}

export class MaestroAdapter implements WorkflowEngineContract_v1 {
  readonly name = ADAPTER_NAME
  readonly version = ADAPTER_VERSION

  readonly capabilities: EngineCapabilities = {
    tdd: true,
    parallelExecution: true,
    designPhases: true,
    sessionHandoff: true,
    externalTracking: true,
    internalTracking: true,
    autonomousExecution: false,
    skillRouting: true,
  }

  private sisyphusAdapter: SisyphusAdapter
  private listeners: Set<WorkflowEventListener> = new Set()
  private projectRoot: string = process.cwd()
  private designSession: DesignSessionState | null = null

  constructor(sisyphusAdapter?: SisyphusAdapter) {
    this.sisyphusAdapter = sisyphusAdapter || new SisyphusAdapter()
  }

  async initialize(context: WorkflowContext): Promise<WorkflowResult> {
    this.projectRoot = context.projectRoot

    await this.sisyphusAdapter.initialize(context)
    this.ensureConductorStructure()

    return { success: true }
  }

  async shutdown(): Promise<void> {
    await this.sisyphusAdapter.shutdown()
    this.listeners.clear()
    this.designSession = null
  }

  async createPlan(
    request: CreatePlanRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult<WorkflowPlan>> {
    const trackId = this.generateTrackId(request.name)
    const trackDir = this.getTrackDir(trackId)

    if (!existsSync(trackDir)) {
      mkdirSync(trackDir, { recursive: true })
    }

    const designPath = join(trackDir, "design.md")
    const specPath = join(trackDir, "spec.md")
    const planPath = join(trackDir, "plan.md")
    const metadataPath = join(trackDir, "metadata.json")

    const designContent = request.sourceDocument || this.generateDesignTemplate(request.name)
    writeFileSync(designPath, designContent, "utf-8")

    const metadata: MaestroTrackMetadata = {
      id: trackId,
      name: request.name,
      phase: request.skipDesign ? "planning" : "design",
      orchestrated: false,
      ralphEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8")

    const tasks: WorkflowTask[] = (request.initialTasks || []).map((t, i) => ({
      ...t,
      id: `${trackId}-task-${i}`,
      dependencies: t.dependencies || [],
      dependents: t.dependents || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trackId,
    }))

    const now = new Date().toISOString()
    const track: WorkflowTrack = {
      id: trackId,
      name: request.name,
      taskIds: tasks.map((t) => t.id),
      phase: metadata.phase,
      isReady: false,
    }

    const plan: WorkflowPlan = {
      id: `maestro-plan-${trackId}`,
      name: request.name,
      filePath: planPath,
      tasks,
      tracks: [track],
      progress: this.calculateProgress(tasks),
      createdAt: now,
      updatedAt: now,
      sessionIds: [context.sessionId],
      metadata: {
        conductorDir: trackDir,
        designPath,
        specPath,
        planPath,
      },
    }

    this.emit({ type: "plan:created", plan })
    return { success: true, data: plan }
  }

  async getActivePlan(context: WorkflowContext): Promise<WorkflowPlan | null> {
    const handoffPath = this.getLatestHandoffPath()
    if (handoffPath && existsSync(handoffPath)) {
      const handoff = JSON.parse(readFileSync(handoffPath, "utf-8")) as HandoffPayload
      if (handoff.previousState.activePlan) {
        const trackId = handoff.previousState.activePlan.currentTrackId
        if (trackId) {
          return this.loadPlanFromTrack(trackId, context)
        }
      }
    }

    return this.sisyphusAdapter.getActivePlan(context)
  }

  async getPlanProgress(planId: string): Promise<PlanProgress | null> {
    return this.sisyphusAdapter.getPlanProgress(planId)
  }

  async getReadyTasks(planId: string): Promise<WorkflowTask[]> {
    return this.sisyphusAdapter.getReadyTasks(planId)
  }

  async updateTask(request: UpdateTaskRequest): Promise<WorkflowResult<WorkflowTask>> {
    const result = await this.sisyphusAdapter.updateTask(request)
    if (result.success && result.data) {
      this.emit({ type: "task:updated", task: result.data, previousStatus: "pending" })
    }
    return result
  }

  async getTracks(planId: string): Promise<WorkflowTrack[]> {
    const tracksDir = join(this.projectRoot, CONDUCTOR_DIR, TRACKS_DIR)
    if (!existsSync(tracksDir)) return []

    const tracks: WorkflowTrack[] = []
    const { readdirSync } = require("node:fs")

    for (const trackId of readdirSync(tracksDir)) {
      const metadataPath = join(tracksDir, trackId, "metadata.json")
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as MaestroTrackMetadata
        tracks.push({
          id: metadata.id,
          name: metadata.name,
          taskIds: [],
          phase: metadata.phase,
          isReady: metadata.phase === "ready",
        })
      }
    }

    return tracks
  }

  async getReadyTracks(planId: string): Promise<WorkflowTrack[]> {
    const tracks = await this.getTracks(planId)
    return tracks.filter((t) => t.phase === "ready" && t.isReady)
  }

  async execute(
    request: ExecutePlanRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const trackIds = request.trackId ? [request.trackId] : (await this.getReadyTracks(request.planId)).map((t) => t.id)

    this.emit({
      type: "execution:started",
      mode: request.mode,
      trackIds,
    })

    if (request.mode === "parallel" && trackIds.length >= 2) {
      return {
        success: true,
        warnings: [`Parallel execution initiated for ${trackIds.length} tracks. Use co mode with agent-mail skill.`],
      }
    }

    return this.sisyphusAdapter.execute(request, context)
  }

  async canExecuteParallel(planId: string): Promise<boolean> {
    const readyTracks = await this.getReadyTracks(planId)
    if (readyTracks.length < 2) return false

    const fileScopes = await this.getTrackFileScopes(readyTracks)
    return this.hasNonOverlappingScopes(fileScopes)
  }

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    const handoffPath = join(this.projectRoot, CONDUCTOR_DIR, HANDOFFS_DIR, `${sessionId}.json`)
    if (existsSync(handoffPath)) {
      const handoff = JSON.parse(readFileSync(handoffPath, "utf-8")) as HandoffPayload
      return handoff.previousState
    }

    return this.sisyphusAdapter.getSessionState(sessionId)
  }

  async createHandoff(context: WorkflowContext): Promise<WorkflowResult<HandoffPayload>> {
    const plan = await this.getActivePlan(context)
    const designState = this.designSession

    const state: SessionState = {
      sessionId: context.sessionId,
      activePlan: plan ? {
        planId: plan.id,
        currentTrackId: plan.tracks[0]?.id,
      } : undefined,
      context: {
        decisions: [],
        blockers: [],
        nextSteps: designState ? [`Continue design phase ${designState.currentPhase}`] : [],
      },
      timestamp: new Date().toISOString(),
    }

    const summary = this.generateHandoffSummary(plan, designState)
    const payload: HandoffPayload = {
      previousState: state,
      summary,
      recommendedAction: this.getRecommendedAction(plan, designState),
    }

    const handoffsDir = join(this.projectRoot, CONDUCTOR_DIR, HANDOFFS_DIR)
    if (!existsSync(handoffsDir)) {
      mkdirSync(handoffsDir, { recursive: true })
    }

    const handoffPath = join(handoffsDir, `${context.sessionId}.json`)
    writeFileSync(handoffPath, JSON.stringify(payload, null, 2), "utf-8")

    this.emit({ type: "handoff:created", payload })
    return { success: true, data: payload }
  }

  async restoreFromHandoff(
    payload: HandoffPayload,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    await this.sisyphusAdapter.restoreFromHandoff(payload, context)
    return { success: true }
  }

  async startDesignSession(context: WorkflowContext): Promise<WorkflowResult<DesignSessionState>> {
    this.designSession = {
      currentPhase: 1,
      complexityScore: undefined,
      mode: "full",
      designDocPath: undefined,
      researchFindings: [],
      oracleVerification: undefined,
    }

    this.emit({ type: "design:phase-changed", phase: 1 })
    return { success: true, data: this.designSession }
  }

  async advanceDesignPhase(currentPhase: DesignPhase): Promise<WorkflowResult<DesignSessionState>> {
    if (!this.designSession) {
      return { success: false, error: "No active design session" }
    }

    const nextPhase = (currentPhase + 1) as DesignPhase
    if (nextPhase > 10) {
      return { success: false, error: "Already at final phase" }
    }

    const previousPhase = this.designSession.currentPhase
    this.designSession.currentPhase = nextPhase

    this.emit({ type: "design:phase-changed", phase: nextPhase, previousPhase })
    return { success: true, data: this.designSession }
  }

  async getDesignSessionState(): Promise<DesignSessionState | null> {
    return this.designSession
  }

  on(listener: WorkflowEventListener): () => void {
    this.listeners.add(listener)
    this.sisyphusAdapter.on(listener)
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

  private ensureConductorStructure(): void {
    const dirs = [
      join(this.projectRoot, CONDUCTOR_DIR),
      join(this.projectRoot, CONDUCTOR_DIR, TRACKS_DIR),
      join(this.projectRoot, CONDUCTOR_DIR, HANDOFFS_DIR),
    ]

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
    }
  }

  private generateTrackId(name: string): string {
    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    const timestamp = Date.now().toString(36)
    return `${slug}-${timestamp}`
  }

  private getTrackDir(trackId: string): string {
    return join(this.projectRoot, CONDUCTOR_DIR, TRACKS_DIR, trackId)
  }

  private generateDesignTemplate(name: string): string {
    return `# ${name}

## Problem Statement

_What problem are we solving?_

## Goals

- [ ] Goal 1
- [ ] Goal 2

## Non-Goals

- _What are we NOT doing?_

## Proposed Solution

_High-level approach_

## Open Questions

- _What do we need to figure out?_
`
  }

  private async loadPlanFromTrack(trackId: string, context: WorkflowContext): Promise<WorkflowPlan | null> {
    const trackDir = this.getTrackDir(trackId)
    const metadataPath = join(trackDir, "metadata.json")

    if (!existsSync(metadataPath)) return null

    const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as MaestroTrackMetadata
    const planPath = join(trackDir, "plan.md")

    const now = new Date().toISOString()
    return {
      id: `maestro-plan-${trackId}`,
      name: metadata.name,
      filePath: existsSync(planPath) ? planPath : undefined,
      tasks: [],
      tracks: [{
        id: trackId,
        name: metadata.name,
        taskIds: [],
        phase: metadata.phase,
        isReady: metadata.phase === "ready",
      }],
      progress: { total: 0, completed: 0, inProgress: 0, blocked: 0, isComplete: true, percentage: 100 },
      createdAt: metadata.createdAt,
      updatedAt: now,
      sessionIds: [context.sessionId],
      metadata: { conductorDir: trackDir },
    }
  }

  private getLatestHandoffPath(): string | null {
    const handoffsDir = join(this.projectRoot, CONDUCTOR_DIR, HANDOFFS_DIR)
    if (!existsSync(handoffsDir)) return null

    const { readdirSync, statSync } = require("node:fs")
    const files = readdirSync(handoffsDir)
      .filter((f: string) => f.endsWith(".json"))
      .map((f: string) => join(handoffsDir, f))
      .sort((a: string, b: string) => statSync(b).mtimeMs - statSync(a).mtimeMs)

    return files[0] || null
  }

  private async getTrackFileScopes(tracks: WorkflowTrack[]): Promise<Map<string, string[]>> {
    const scopes = new Map<string, string[]>()

    for (const track of tracks) {
      const metadataPath = join(this.getTrackDir(track.id), "metadata.json")
      if (existsSync(metadataPath)) {
        const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as MaestroTrackMetadata
        const files = metadata.beadsFileScopes
          ? Object.values(metadata.beadsFileScopes).flat()
          : []
        scopes.set(track.id, files)
      }
    }

    return scopes
  }

  private hasNonOverlappingScopes(scopes: Map<string, string[]>): boolean {
    const allFiles = new Set<string>()
    const scopeValues = Array.from(scopes.values())
    for (const files of scopeValues) {
      for (const file of files) {
        if (allFiles.has(file)) return false
        allFiles.add(file)
      }
    }
    return true
  }

  private generateHandoffSummary(plan: WorkflowPlan | null, designState: DesignSessionState | null): string {
    const parts: string[] = []

    if (plan) {
      parts.push(`Plan: ${plan.name} (${plan.progress.completed}/${plan.progress.total} tasks)`)
    }

    if (designState) {
      parts.push(`Design Phase: ${designState.currentPhase}/10 (${designState.mode} mode)`)
    }

    return parts.length > 0 ? parts.join(" | ") : "No active work"
  }

  private getRecommendedAction(plan: WorkflowPlan | null, designState: DesignSessionState | null): string | undefined {
    if (designState && designState.currentPhase < 8) {
      return `Continue design session at phase ${designState.currentPhase}`
    }

    if (plan && !plan.progress.isComplete) {
      const readyTracks = plan.tracks.filter((t) => t.phase === "ready")
      if (readyTracks.length >= 2) {
        return "Run 'co' for parallel execution"
      }
      return "Run 'ci' to continue implementation"
    }

    return undefined
  }

  private calculateProgress(tasks: WorkflowTask[]): PlanProgress {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completed").length
    const inProgress = tasks.filter((t) => t.status === "in_progress").length
    const blocked = tasks.filter((t) => t.status === "blocked").length

    return {
      total,
      completed,
      inProgress,
      blocked,
      isComplete: total === 0 || completed === total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 100,
    }
  }
}

export function createMaestroAdapter(sisyphusAdapter?: SisyphusAdapter): MaestroAdapter {
  return new MaestroAdapter(sisyphusAdapter)
}
