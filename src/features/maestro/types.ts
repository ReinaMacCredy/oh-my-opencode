export type MaestroMode = "ci" | "co" | "ca"

export interface ModeDetectionResult {
  mode: MaestroMode
  reason: string
  epicCount: number
  readyBeadCount: number
  parallelGroups: string[][]
  skills: string[]
}

export interface ParsedBead {
  id: string
  title: string
  epicId?: string
  epicTitle?: string
  priority: number
  dependencies: string[]
  fileScope?: string[]
  status: "pending" | "ready" | "in_progress" | "completed" | "blocked"
}

export interface ParsedEpic {
  id: string
  title: string
  beads: ParsedBead[]
  fileScope: string[]
}

export interface ParsedPlan {
  name: string
  path: string
  epics: ParsedEpic[]
  allBeads: ParsedBead[]
  hasAutonomousFlag: boolean
}

export interface MaestroContext {
  mode: MaestroMode
  skills: string[]
  planPath: string
  epicCount: number
  readyBeadCount: number
  beadSummary: string
}

export const MODE_SKILLS: Record<MaestroMode, string[]> = {
  ci: ["tdd", "tracking"],
  co: ["tdd", "agent-mail", "tracking"],
  ca: ["tdd", "agent-mail", "tracking"],
}

export const MODE_DESCRIPTIONS: Record<MaestroMode, string> = {
  ci: "Sequential TDD execution - one bead at a time, RED→GREEN→REFACTOR cycle",
  co: "Parallel workers by epic - spawn background agents with Agent Mail coordination",
  ca: "Autonomous ralph loop - continuous parallel execution until all beads complete",
}
