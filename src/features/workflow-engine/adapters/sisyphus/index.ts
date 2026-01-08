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
  PlanProgress,
  TaskStatus,
} from "../../contracts/v1"
import { CONTRACT_VERSION } from "../../contracts/v1"
import {
  readBoulderState,
  writeBoulderState,
  createBoulderState,
  findPrometheusPlans,
  getPlanProgress as getBoulderPlanProgress,
  getPlanName,
  appendSessionId,
} from "../../../boulder-state"
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join, basename } from "node:path"

const ADAPTER_NAME = "SisyphusAdapter"
const ADAPTER_VERSION = "1.0.0"

export class SisyphusAdapter implements WorkflowEngineContract_v1 {
  readonly name = ADAPTER_NAME
  readonly version = ADAPTER_VERSION

  readonly capabilities: EngineCapabilities = {
    tdd: false,
    parallelExecution: true,
    designPhases: false,
    sessionHandoff: true,
    externalTracking: false,
    internalTracking: true,
    autonomousExecution: false,
    skillRouting: false,
  }

  private listeners: Set<WorkflowEventListener> = new Set()
  private projectRoot: string = process.cwd()
  private activePlanCache: WorkflowPlan | null = null

  async initialize(context: WorkflowContext): Promise<WorkflowResult> {
    this.projectRoot = context.projectRoot

    const boulderState = readBoulderState(this.projectRoot)
    if (boulderState) {
      appendSessionId(this.projectRoot, context.sessionId)
    }

    return { success: true }
  }

  async shutdown(): Promise<void> {
    this.listeners.clear()
    this.activePlanCache = null
  }

  async createPlan(
    request: CreatePlanRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult<WorkflowPlan>> {
    const plansDir = join(this.projectRoot, ".sisyphus", "plans")
    if (!existsSync(plansDir)) {
      mkdirSync(plansDir, { recursive: true })
    }

    const planFileName = `${request.name.toLowerCase().replace(/\s+/g, "-")}.md`
    const planPath = join(plansDir, planFileName)

    const tasks: WorkflowTask[] = (request.initialTasks || []).map((t, i) => ({
      ...t,
      id: `task-${Date.now()}-${i}`,
      dependencies: t.dependencies || [],
      dependents: t.dependents || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }))

    const planContent = this.generatePlanMarkdown(request.name, tasks)
    writeFileSync(planPath, planContent, "utf-8")

    const boulderState = createBoulderState(planPath, context.sessionId)
    writeBoulderState(this.projectRoot, boulderState)

    const now = new Date().toISOString()
    const plan: WorkflowPlan = {
      id: `plan-${Date.now()}`,
      name: request.name,
      filePath: planPath,
      tasks,
      tracks: [],
      progress: this.calculateProgress(tasks),
      createdAt: now,
      updatedAt: now,
      sessionIds: [context.sessionId],
    }

    this.activePlanCache = plan
    this.emit({ type: "plan:created", plan })

    return { success: true, data: plan }
  }

  async getActivePlan(context: WorkflowContext): Promise<WorkflowPlan | null> {
    if (this.activePlanCache) return this.activePlanCache

    const boulderState = readBoulderState(this.projectRoot)
    if (!boulderState) return null

    const planPath = boulderState.active_plan
    if (!existsSync(planPath)) return null

    const tasks = this.parseTasksFromPlan(planPath)
    const progress = getBoulderPlanProgress(planPath)

    const plan: WorkflowPlan = {
      id: `plan-${basename(planPath, ".md")}`,
      name: boulderState.plan_name,
      filePath: planPath,
      tasks,
      tracks: [],
      progress: {
        total: progress.total,
        completed: progress.completed,
        inProgress: 0,
        blocked: 0,
        isComplete: progress.isComplete,
        percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 100,
      },
      createdAt: boulderState.started_at,
      updatedAt: new Date().toISOString(),
      sessionIds: boulderState.session_ids,
    }

    this.activePlanCache = plan
    return plan
  }

  async getPlanProgress(planId: string): Promise<PlanProgress | null> {
    const plan = await this.getActivePlan({ sessionId: "", projectRoot: this.projectRoot })
    if (!plan || !plan.filePath) return null

    const progress = getBoulderPlanProgress(plan.filePath)
    return {
      total: progress.total,
      completed: progress.completed,
      inProgress: 0,
      blocked: 0,
      isComplete: progress.isComplete,
      percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 100,
    }
  }

  async getReadyTasks(planId: string): Promise<WorkflowTask[]> {
    const plan = await this.getActivePlan({ sessionId: "", projectRoot: this.projectRoot })
    if (!plan) return []

    return plan.tasks.filter(
      (t) => t.status === "pending" && t.dependencies.every((depId) => {
        const dep = plan.tasks.find((task) => task.id === depId)
        return dep?.status === "completed"
      })
    )
  }

  async updateTask(request: UpdateTaskRequest): Promise<WorkflowResult<WorkflowTask>> {
    const plan = await this.getActivePlan({ sessionId: "", projectRoot: this.projectRoot })
    if (!plan) return { success: false, error: "No active plan" }

    const task = plan.tasks.find((t) => t.id === request.taskId)
    if (!task) return { success: false, error: `Task ${request.taskId} not found` }

    const previousStatus = task.status

    if (request.status) task.status = request.status
    if (request.note) {
      task.notes = task.notes || []
      task.notes.push(request.note)
    }
    if (request.addFiles) {
      task.fileScope = [...(task.fileScope || []), ...request.addFiles]
    }

    task.updatedAt = new Date().toISOString()
    if (request.status === "completed") {
      task.completedAt = task.updatedAt
    }

    if (plan.filePath) {
      this.updatePlanFile(plan.filePath, plan.tasks)
    }

    this.emit({ type: "task:updated", task, previousStatus })
    if (request.status === "completed") {
      this.emit({ type: "task:completed", task })
    }

    return { success: true, data: task }
  }

  async getTracks(planId: string): Promise<WorkflowTrack[]> {
    const plan = await this.getActivePlan({ sessionId: "", projectRoot: this.projectRoot })
    return plan?.tracks || []
  }

  async getReadyTracks(planId: string): Promise<WorkflowTrack[]> {
    const tracks = await this.getTracks(planId)
    return tracks.filter((t) => t.isReady && t.phase === "ready")
  }

  async execute(
    request: ExecutePlanRequest,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    const plan = await this.getActivePlan(context)
    if (!plan) return { success: false, error: "No active plan" }

    this.emit({
      type: "execution:started",
      mode: request.mode,
      trackIds: request.trackId ? [request.trackId] : plan.tracks.map((t) => t.id),
    })

    return {
      success: true,
      warnings: ["Sisyphus adapter delegates execution to background agents via sisyphus_task tool"],
    }
  }

  async canExecuteParallel(planId: string): Promise<boolean> {
    const tracks = await this.getReadyTracks(planId)
    return tracks.length >= 2
  }

  async getSessionState(sessionId: string): Promise<SessionState | null> {
    const boulderState = readBoulderState(this.projectRoot)
    if (!boulderState || !boulderState.session_ids.includes(sessionId)) {
      return null
    }

    const plan = await this.getActivePlan({ sessionId, projectRoot: this.projectRoot })

    return {
      sessionId,
      activePlan: plan ? { planId: plan.id } : undefined,
      timestamp: new Date().toISOString(),
    }
  }

  async createHandoff(context: WorkflowContext): Promise<WorkflowResult<HandoffPayload>> {
    const state = await this.getSessionState(context.sessionId)
    if (!state) {
      return { success: false, error: "No session state to hand off" }
    }

    const plan = await this.getActivePlan(context)
    const summary = plan
      ? `Active plan: ${plan.name} (${plan.progress.completed}/${plan.progress.total} tasks completed)`
      : "No active plan"

    const payload: HandoffPayload = {
      previousState: state,
      summary,
      recommendedAction: plan && !plan.progress.isComplete
        ? `Continue working on plan "${plan.name}"`
        : undefined,
    }

    this.emit({ type: "handoff:created", payload })
    return { success: true, data: payload }
  }

  async restoreFromHandoff(
    payload: HandoffPayload,
    context: WorkflowContext
  ): Promise<WorkflowResult> {
    if (payload.previousState.activePlan) {
      appendSessionId(this.projectRoot, context.sessionId)
    }
    return { success: true }
  }

  on(listener: WorkflowEventListener): () => void {
    this.listeners.add(listener)
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

  private generatePlanMarkdown(name: string, tasks: WorkflowTask[]): string {
    const lines = [`# ${name}`, "", "## Tasks", ""]
    for (const task of tasks) {
      const checkbox = task.status === "completed" ? "[x]" : "[ ]"
      lines.push(`- ${checkbox} ${task.title}`)
      if (task.description) {
        lines.push(`  - ${task.description}`)
      }
    }
    return lines.join("\n")
  }

  private parseTasksFromPlan(planPath: string): WorkflowTask[] {
    const content = readFileSync(planPath, "utf-8")
    const tasks: WorkflowTask[] = []
    const taskRegex = /^[-*]\s*\[([ xX])\]\s*(.+)$/gm
    let match: RegExpExecArray | null
    let index = 0

    while ((match = taskRegex.exec(content)) !== null) {
      const isCompleted = match[1].toLowerCase() === "x"
      const title = match[2].trim()
      const now = new Date().toISOString()

      tasks.push({
        id: `task-${index++}`,
        title,
        status: isCompleted ? "completed" : "pending",
        priority: "medium",
        dependencies: [],
        dependents: [],
        createdAt: now,
        updatedAt: now,
        completedAt: isCompleted ? now : undefined,
      })
    }

    return tasks
  }

  private updatePlanFile(planPath: string, tasks: WorkflowTask[]): void {
    let content = readFileSync(planPath, "utf-8")

    for (const task of tasks) {
      const escapedTitle = task.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      const uncheckedPattern = new RegExp(
        `^([-*]\\s*)\\[\\s*\\](\\s*${escapedTitle})`,
        "gm"
      )
      const checkedPattern = new RegExp(
        `^([-*]\\s*)\\[[xX]\\](\\s*${escapedTitle})`,
        "gm"
      )

      if (task.status === "completed") {
        content = content.replace(uncheckedPattern, "$1[x]$2")
      } else {
        content = content.replace(checkedPattern, "$1[ ]$2")
      }
    }

    writeFileSync(planPath, content, "utf-8")
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

export function createSisyphusAdapter(): SisyphusAdapter {
  return new SisyphusAdapter()
}
