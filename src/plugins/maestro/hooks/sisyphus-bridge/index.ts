import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync, statSync, watch } from "node:fs"
import { join, basename } from "node:path"
import { HOOK_NAME, PLAN_READY_PROMPT, DESIGN_PHASE_CONTEXT, AUTO_EXECUTE_PROMPT } from "./constants"
import { log } from "../../../../shared/logger"
import { maestroEventBus } from "../../events"
import { createContextInjectionHook } from "../context-injection"
import type { MaestroConfig } from "../../schema"

export * from "./constants"

interface BridgeHookInput {
  sessionID: string
  messageID?: string
}

interface BridgeHookOutput {
  parts: Array<{ type: string; text?: string }>
  messages?: Array<{ role: string; content: string }>
}

// Track emitted plans to avoid duplicates
const emittedPlans = new Set<string>()

// Track previous todo states for event emission
const todoStates = new Map<string, string>()

// Design phase state (shared across hook calls)
const currentDesignPhases = new Map<string, number>()

// Workflow state for bidirectional events
interface WorkflowProgress {
  planPath: string
  planName: string
  totalTasks: number
  completedTasks: number
  currentTask?: string
  phase: number
  lastUpdated: string
}

let workflowProgress: WorkflowProgress | null = null

export function getWorkflowProgress(): WorkflowProgress | null {
  return workflowProgress
}

export function updateWorkflowProgress(update: Partial<WorkflowProgress>): void {
  if (workflowProgress) {
    workflowProgress = { ...workflowProgress, ...update, lastUpdated: new Date().toISOString() }
  } else if (update.planPath && update.planName) {
    workflowProgress = {
      planPath: update.planPath,
      planName: update.planName,
      totalTasks: update.totalTasks || 0,
      completedTasks: update.completedTasks || 0,
      currentTask: update.currentTask,
      phase: update.phase || 0,
      lastUpdated: new Date().toISOString(),
    }
  }
  log(`[${HOOK_NAME}] Workflow progress updated`, workflowProgress)
}

// Workflow state tracking for bidirectional events
const workflowState = new Map<string, {
  started: boolean
  completed: boolean
  lastTaskCount: number
}>()

export function createMaestroSisyphusBridgeHook(ctx: PluginInput, maestroConfig?: MaestroConfig) {
  const plansDir = join(ctx.directory, ".sisyphus", "plans")
  const autoExecute = maestroConfig?.autoExecute ?? false
  
  // Watch for new plan files
  if (existsSync(plansDir)) {
    try {
      watch(plansDir, (eventType, filename) => {
        if (eventType === "rename" && filename?.endsWith(".md")) {
          const planPath = join(plansDir, filename)
          if (existsSync(planPath) && !emittedPlans.has(planPath)) {
            emittedPlans.add(planPath)
            log(`[${HOOK_NAME}] Detected new plan: ${filename}`)
          }
        }
      })
    } catch {
      // Watch may fail in some environments
    }
  }

  return {
    /**
     * Inject plan ready notification into chat
     */
    "chat.message": async (
      input: BridgeHookInput,
      output: BridgeHookOutput
    ): Promise<void> => {
      // Check for new plans that need announcement
      if (existsSync(plansDir)) {
        const files = readdirSync(plansDir).filter(f => f.endsWith(".md"))
        
        for (const file of files) {
          const planPath = join(plansDir, file)
          if (!emittedPlans.has(planPath)) {
            const stat = statSync(planPath)
            const ageMs = Date.now() - stat.mtimeMs
            
            // Only announce plans created in the last 30 seconds
            if (ageMs < 30000) {
              emittedPlans.add(planPath)
              const planName = basename(file, ".md")
              
              // Use auto-execute or manual prompt based on config
              const promptTemplate = autoExecute ? AUTO_EXECUTE_PROMPT : PLAN_READY_PROMPT
              const prompt = promptTemplate
                .replace("$PLAN_NAME", planName)
                .replace("$PLAN_PATH", planPath)
              
              // Initialize workflow progress
              updateWorkflowProgress({
                planPath,
                planName,
                totalTasks: 0,
                completedTasks: 0,
                phase: 0,
              })
              
              // Emit plan:ready event
              maestroEventBus.emit({
                type: "plan:ready",
                payload: { planPath, planName },
              })
              
              // Inject as a system message
              output.messages = output.messages || []
              output.messages.push({
                role: "user",
                content: `[SYSTEM: MAESTRO-SISYPHUS BRIDGE]\n${prompt}`
              })
              
              log(`[${HOOK_NAME}] Announced plan ready: ${planName}`, {
                sessionID: input.sessionID,
                planPath,
                autoExecute,
              })
            }
          }
        }
      }
    },

    /**
     * Track design phase changes and task progress (bidirectional events)
     */
    "tool.execute.after": async (
      input: { tool: string; sessionID: string },
      output: { result?: unknown; message?: string }
    ): Promise<void> => {
      if (input.tool === "sisyphus_task" || input.tool === "task") {
        const result = output.result as Record<string, unknown> | undefined
        
        if (result?.designPhase) {
          const newPhase = result.designPhase as number
          const oldPhase = currentDesignPhases.get(input.sessionID)
          
          if (oldPhase !== newPhase) {
            currentDesignPhases.set(input.sessionID, newPhase)
            updateWorkflowProgress({ phase: newPhase })
            
            maestroEventBus.emit({
              type: "design:phase-changed",
              payload: {
                sessionID: input.sessionID,
                phase: newPhase,
                fromPhase: oldPhase || 0,
                timestamp: Date.now()
              }
            })
            log(`[${HOOK_NAME}] Design phase updated to: ${newPhase}`)
          }
        }
        
        if (result?.taskCompleted) {
          const taskInfo = result.taskCompleted as { id: string; title: string }
          if (workflowProgress) {
            updateWorkflowProgress({
              completedTasks: workflowProgress.completedTasks + 1,
              currentTask: undefined,
            })
          }
          log(`[${HOOK_NAME}] Task completed: ${taskInfo.title}`)
        }
        
        if (result?.currentTask) {
          const taskInfo = result.currentTask as { id: string; title: string }
          updateWorkflowProgress({ currentTask: taskInfo.title })
        }
      }
      
      if (input.tool === "todowrite") {
        const args = output.result as { todos?: Array<{ id: string; status: string; title: string }> } | undefined
        if (args?.todos) {
          const total = args.todos.length
          const completed = args.todos.filter(t => t.status === "completed").length
          const inProgress = args.todos.filter(t => t.status === "in_progress").length
          
          updateWorkflowProgress({ totalTasks: total, completedTasks: completed })
          
          for (const todo of args.todos) {
            const prevState = todoStates.get(todo.id)
            const newState = todo.status
            const todoTitle = todo.title || (todo as any).content || "Untitled Task"
            
            if (prevState !== "in_progress" && newState === "in_progress") {
              maestroEventBus.emit({
                type: "task:started",
                payload: {
                  taskId: todo.id,
                  title: todoTitle,
                  sessionId: input.sessionID,
                  timestamp: Date.now()
                }
              })
              log(`[${HOOK_NAME}] Task started: ${todo.id}`)
            }
            
            if (prevState === "in_progress" && newState === "completed") {
              maestroEventBus.emit({
                type: "task:completed",
                payload: {
                  taskId: todo.id,
                  title: todoTitle,
                  sessionId: input.sessionID,
                  timestamp: Date.now()
                }
              })
              log(`[${HOOK_NAME}] Task completed: ${todo.id}`)
            }
            
            todoStates.set(todo.id, newState)
          }
          
          const sessionState = workflowState.get(input.sessionID) || { started: false, completed: false, lastTaskCount: 0 }
          
          if (!sessionState.started && (inProgress > 0 || completed > 0) && total > 0) {
            sessionState.started = true
            workflowState.set(input.sessionID, sessionState)
            
            maestroEventBus.emit({
              type: "workflow:started",
              payload: {
                sessionID: input.sessionID,
                timestamp: Date.now(),
                totalTasks: total,
                completedTasks: completed
              }
            })
            log(`[${HOOK_NAME}] Workflow started`)
          }
          
          if (sessionState.started && !sessionState.completed && completed === total && total > 0) {
            sessionState.completed = true
            workflowState.set(input.sessionID, sessionState)
            
            maestroEventBus.emit({
              type: "workflow:completed",
              payload: {
                sessionID: input.sessionID,
                timestamp: Date.now(),
                totalTasks: total,
                completedTasks: completed
              }
            })
            log(`[${HOOK_NAME}] Workflow completed`)
          } else if (sessionState.completed && completed < total) {
            sessionState.completed = false
            workflowState.set(input.sessionID, sessionState)
          }
        }
      }
    },

    /**
     * Inject design phase context into Sisyphus agent prompts
     */
    "agent.prompt.before": async (
      input: { agentName: string; sessionID: string },
      output: { systemPrompt?: string }
    ): Promise<void> => {
      const sisyphusAgents = ["Sisyphus", "orchestrator-sisyphus", "Sisyphus-Junior"]
      if (!sisyphusAgents.some(a => input.agentName?.includes(a))) {
        return
      }

      // Inject design phase context
      const sessionDesignPhase = currentDesignPhases.get(input.sessionID)
      if (sessionDesignPhase && sessionDesignPhase >= 1 && sessionDesignPhase <= 10) {
        const phaseContext = DESIGN_PHASE_CONTEXT
          .replace("$PHASE", String(sessionDesignPhase))
          .replace(/\$P(\d+)/g, (_, num) => {
            const phase = parseInt(num)
            if (phase < sessionDesignPhase!) return "DONE"
            if (phase === sessionDesignPhase) return "CURRENT"
            return "PENDING"
          })

        output.systemPrompt = (output.systemPrompt || "") + "\n\n" + phaseContext
        log(`[${HOOK_NAME}] Injected phase ${sessionDesignPhase} context into ${input.agentName}`)
      }
      
      // Inject workflow progress context
      if (workflowProgress) {
        const progressContext = `
## Workflow Progress

**Plan**: ${workflowProgress.planName}
**Progress**: ${workflowProgress.completedTasks}/${workflowProgress.totalTasks} tasks completed
${workflowProgress.currentTask ? `**Current Task**: ${workflowProgress.currentTask}` : ""}
**Last Updated**: ${workflowProgress.lastUpdated}
`
        output.systemPrompt = (output.systemPrompt || "") + "\n\n" + progressContext
      }
    },

    "experimental.chat.messages.transform": createContextInjectionHook(),
  }
}
