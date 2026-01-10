import type { PluginInput } from "@opencode-ai/plugin"
import { existsSync, readdirSync, statSync, watch } from "node:fs"
import { join, basename } from "node:path"
import { HOOK_NAME, PLAN_READY_PROMPT, DESIGN_PHASE_CONTEXT, AUTO_EXECUTE_PROMPT } from "./constants"
import { log } from "../../../../shared/logger"
import { maestroEventBus } from "../../events"

type MaestroConfig = { autoExecute?: boolean }

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

// Design phase state (shared across hook calls)
let currentDesignPhase: number | null = null

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
        
        // Track design phase
        if (result?.designPhase) {
          currentDesignPhase = result.designPhase as number
          updateWorkflowProgress({ phase: currentDesignPhase })
          log(`[${HOOK_NAME}] Design phase updated to: ${currentDesignPhase}`)
        }
        
        // Track task completion (bidirectional event)
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
        
        // Track current task
        if (result?.currentTask) {
          const taskInfo = result.currentTask as { id: string; title: string }
          updateWorkflowProgress({ currentTask: taskInfo.title })
        }
      }
      
      // Track todowrite updates for progress
      if (input.tool === "todowrite") {
        const args = output.result as { todos?: Array<{ status: string }> } | undefined
        if (args?.todos) {
          const total = args.todos.length
          const completed = args.todos.filter(t => t.status === "completed").length
          updateWorkflowProgress({ totalTasks: total, completedTasks: completed })
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
      if (currentDesignPhase && currentDesignPhase >= 1 && currentDesignPhase <= 10) {
        const phaseContext = DESIGN_PHASE_CONTEXT
          .replace("$PHASE", String(currentDesignPhase))
          .replace(/\$P(\d+)/g, (_, num) => {
            const phase = parseInt(num)
            if (phase < currentDesignPhase!) return "DONE"
            if (phase === currentDesignPhase) return "CURRENT"
            return "PENDING"
          })

        output.systemPrompt = (output.systemPrompt || "") + "\n\n" + phaseContext
        log(`[${HOOK_NAME}] Injected phase ${currentDesignPhase} context into ${input.agentName}`)
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
  }
}
