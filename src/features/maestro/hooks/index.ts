import type { PluginInput } from "@opencode-ai/plugin"
import { parsePlanToBeads, detectMode, generateBeadSummary } from "../utils"
import { MODE_DESCRIPTIONS } from "../types"
import type { MaestroContext } from "../types"
import * as fs from "node:fs"
import * as path from "node:path"

export const MAESTRO_HOOK_NAME = "maestro-mode-detector"

interface MaestroHookInput {
  sessionID: string
  messageID?: string
}

interface MaestroHookOutput {
  parts: Array<{ type: string; text?: string }>
}

export function createMaestroModeDetectorHook(ctx: PluginInput) {
  return {
    "chat.message": async (input: MaestroHookInput, output: MaestroHookOutput): Promise<void> => {
      const parts = output.parts
      const promptText =
        parts
          ?.filter((p) => p.type === "text" && p.text)
          .map((p) => p.text)
          .join("\n")
          .trim() || ""

      const shouldEnhance =
        promptText.includes("Start Sisyphus work session") ||
        promptText.includes("<session-context>") ||
        promptText.includes("## Active Work Session Found") ||
        promptText.includes("## Auto-Selected Plan")

      if (!shouldEnhance) {
        return
      }

      const planPathMatch = promptText.match(/\*\*Path\*\*:\s*([^\n]+)/)
      if (!planPathMatch) {
        return
      }

      const planPath = planPathMatch[1].trim()
      const fullPlanPath = path.isAbsolute(planPath) ? planPath : path.join(ctx.directory, planPath)

      if (!fs.existsSync(fullPlanPath)) {
        return
      }

      const planContent = fs.readFileSync(fullPlanPath, "utf-8")
      const parsedPlan = parsePlanToBeads(planContent, planPath)
      const modeResult = detectMode(parsedPlan)
      const beadSummary = generateBeadSummary(parsedPlan)

      const maestroContext: MaestroContext = {
        mode: modeResult.mode,
        skills: modeResult.skills,
        planPath,
        epicCount: modeResult.epicCount,
        readyBeadCount: modeResult.readyBeadCount,
        beadSummary,
      }

      const contextInjection = `
<maestro-context>
MODE: ${modeResult.mode}
MODE_DESCRIPTION: ${MODE_DESCRIPTIONS[modeResult.mode]}
SKILLS: ${modeResult.skills.join(", ")}
REASON: ${modeResult.reason}

${beadSummary}

EXECUTION INSTRUCTIONS:
${getExecutionInstructions(modeResult.mode)}
</maestro-context>`

      const idx = output.parts.findIndex((p) => p.type === "text" && p.text)
      if (idx >= 0 && output.parts[idx].text) {
        output.parts[idx].text += `\n\n---\n${contextInjection}`
      }
    },
  }
}

function getExecutionInstructions(mode: "ci" | "co" | "ca"): string {
  switch (mode) {
    case "ci":
      return `Sequential TDD execution:
1. Get next ready bead: bd ready --limit 1
2. Claim: bd update {id} --status in_progress
3. Execute with TDD cycle (RED→GREEN→REFACTOR)
4. Close: bd close {id} --reason completed
5. Repeat until no ready beads`

    case "co":
      return `Parallel workers by epic:
1. Group ready beads by epic
2. For each epic, spawn worker:
   sisyphus_task(
     category="general",
     skills=["tdd", "agent-mail", "tracking"],
     run_in_background=true,
     prompt="Epic: {title}..."
   )
3. Monitor via background_output()
4. Close epics when all beads complete`

    case "ca":
      return `Autonomous ralph loop:
1. Loop while bd ready shows pending beads:
   a. Group ready beads by epic
   b. Spawn parallel workers (like co mode)
   c. Wait for all workers
   d. TDD gate check - fix failures
   e. Continue to next iteration
2. Exit when all beads complete`
  }
}

export { createMaestroModeDetectorHook as createMaestroHook }
