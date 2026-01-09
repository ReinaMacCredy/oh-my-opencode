import type { MaestroMode, ModeDetectionResult, ParsedBead, ParsedEpic, ParsedPlan } from "../types"
import { MODE_SKILLS } from "../types"

export function parsePlanToBeads(planContent: string, planPath: string): ParsedPlan {
  const lines = planContent.split("\n")
  const epics: ParsedEpic[] = []
  const allBeads: ParsedBead[] = []

  let currentEpic: ParsedEpic | null = null
  let beadCounter = 0
  let epicCounter = 0

  const hasAutonomousFlag =
    planContent.includes("<!-- autonomous -->") ||
    planContent.includes("<!-- continuous -->") ||
    planContent.toLowerCase().includes("autonomous mode")

  for (const line of lines) {
    const epicMatch = line.match(/^##\s+(?:Epic:\s*)?(.+)$/i)
    if (epicMatch) {
      if (currentEpic) {
        epics.push(currentEpic)
      }
      epicCounter++
      currentEpic = {
        id: `epic-${epicCounter}`,
        title: epicMatch[1].trim(),
        beads: [],
        fileScope: [],
      }
      continue
    }

    const taskMatch = line.match(/^-\s+\[([ x])\]\s+(.+)$/i)
    if (taskMatch) {
      beadCounter++
      const isComplete = taskMatch[1].toLowerCase() === "x"
      const title = taskMatch[2].trim()

      const fileMatch = title.match(/\(([^)]+\.[a-z]+)\)/i)
      const fileScope = fileMatch ? [fileMatch[1]] : []

      const bead: ParsedBead = {
        id: `bead-${beadCounter}`,
        title,
        epicId: currentEpic?.id,
        epicTitle: currentEpic?.title,
        priority: beadCounter,
        dependencies: [],
        fileScope,
        status: isComplete ? "completed" : "ready",
      }

      allBeads.push(bead)
      if (currentEpic) {
        currentEpic.beads.push(bead)
        if (fileScope.length > 0) {
          currentEpic.fileScope.push(...fileScope)
        }
      }
    }
  }

  if (currentEpic) {
    epics.push(currentEpic)
  }

  const planName = planPath.split("/").pop()?.replace(".md", "") || "unknown"

  return {
    name: planName,
    path: planPath,
    epics,
    allBeads,
    hasAutonomousFlag,
  }
}

export function detectMode(plan: ParsedPlan): ModeDetectionResult {
  const readyBeads = plan.allBeads.filter((b) => b.status === "ready")
  const epicCount = plan.epics.length

  if (plan.hasAutonomousFlag) {
    return {
      mode: "ca",
      reason: "Autonomous flag detected in plan",
      epicCount,
      readyBeadCount: readyBeads.length,
      parallelGroups: plan.epics.map((e) => e.beads.map((b) => b.id)),
      skills: MODE_SKILLS.ca,
    }
  }

  const epicsWithReadyBeads = plan.epics.filter((e) => e.beads.some((b) => b.status === "ready"))

  if (epicsWithReadyBeads.length >= 2) {
    const hasNonOverlappingScopes = checkNonOverlappingScopes(epicsWithReadyBeads)
    if (hasNonOverlappingScopes) {
      return {
        mode: "co",
        reason: `${epicsWithReadyBeads.length} epics with non-overlapping file scopes`,
        epicCount,
        readyBeadCount: readyBeads.length,
        parallelGroups: epicsWithReadyBeads.map((e) => e.beads.filter((b) => b.status === "ready").map((b) => b.id)),
        skills: MODE_SKILLS.co,
      }
    }
  }

  return {
    mode: "ci",
    reason: "Sequential execution - single epic or overlapping file scopes",
    epicCount,
    readyBeadCount: readyBeads.length,
    parallelGroups: [],
    skills: MODE_SKILLS.ci,
  }
}

function checkNonOverlappingScopes(epics: ParsedEpic[]): boolean {
  const allScopes = new Set<string>()

  for (const epic of epics) {
    for (const scope of epic.fileScope) {
      if (allScopes.has(scope)) {
        return false
      }
      allScopes.add(scope)
    }
  }

  return true
}

export function generateBeadSummary(plan: ParsedPlan): string {
  const readyCount = plan.allBeads.filter((b) => b.status === "ready").length
  const completedCount = plan.allBeads.filter((b) => b.status === "completed").length
  const totalCount = plan.allBeads.length

  const epicSummaries = plan.epics.map((e) => {
    const epicReady = e.beads.filter((b) => b.status === "ready").length
    return `  - ${e.title}: ${epicReady} ready`
  })

  return `Beads: ${completedCount}/${totalCount} complete, ${readyCount} ready
Epics: ${plan.epics.length}
${epicSummaries.join("\n")}`
}
