/**
 * Unified Workflow State
 *
 * Merges boulder.json (Sisyphus), conductor tracks (Maestro), and design phases
 * into a single unified state for seamless Maestro-Sisyphus integration.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs"
import { join, dirname, basename } from "node:path"
import type { BoulderState, PlanProgress } from "./types"
import { BOULDER_DIR } from "./constants"
import { readBoulderState, writeBoulderState, getPlanProgress, getPlanName } from "./storage"
import { log } from "../../shared/logger"

const UNIFIED_STATE_FILE = "workflow-state.json"
const CONDUCTOR_DIR = "conductor"
const TRACKS_DIR = "tracks"

/**
 * Unified workflow state combining boulder, conductor, and design phases
 */
export interface UnifiedWorkflowState {
  /** Version for migration support */
  version: "1.0.0"
  
  /** Boulder state (Sisyphus plan tracking) */
  boulder: {
    activePlan: string | null
    planName: string | null
    startedAt: string | null
    sessionIds: string[]
  }
  
  /** Plan progress */
  progress: {
    total: number
    completed: number
    inProgress: number
    blocked: number
    isComplete: boolean
    percentage: number
  }
  
  /** Maestro design phase state */
  designPhase: {
    currentPhase: number | null
    mode: "speed" | "ask" | "full" | null
    complexityScore: number | null
    oracleApproved: boolean | null
  }
  
  /** Conductor tracks (for parallel execution) */
  tracks: Array<{
    id: string
    name: string
    phase: "design" | "planning" | "ready" | "executing" | "completed"
    taskCount: number
    completedCount: number
  }>
  
  /** TDD state (for enforcement) */
  tdd: {
    currentCycle: "red" | "green" | "refactor" | null
    lastTestRun: string | null
    testsPassing: boolean | null
    failingTestName: string | null
  }
  
  /** Timestamps */
  createdAt: string
  updatedAt: string
}

/**
 * Get the unified state file path
 */
export function getUnifiedStateFilePath(directory: string): string {
  return join(directory, BOULDER_DIR, UNIFIED_STATE_FILE)
}

/**
 * Read unified workflow state
 */
export function readUnifiedState(directory: string): UnifiedWorkflowState | null {
  const filePath = getUnifiedStateFilePath(directory)
  
  if (!existsSync(filePath)) {
    // Try to migrate from boulder state
    return migrateFromBoulderState(directory)
  }
  
  try {
    const content = readFileSync(filePath, "utf-8")
    return JSON.parse(content) as UnifiedWorkflowState
  } catch {
    return null
  }
}

/**
 * Write unified workflow state
 */
export function writeUnifiedState(directory: string, state: UnifiedWorkflowState): boolean {
  const filePath = getUnifiedStateFilePath(directory)
  
  try {
    const dir = dirname(filePath)
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
    
    state.updatedAt = new Date().toISOString()
    writeFileSync(filePath, JSON.stringify(state, null, 2), "utf-8")
    
    // Also update legacy boulder.json for backward compatibility
    syncToBoulderState(directory, state)
    
    return true
  } catch (error) {
    log("[unified-state] Failed to write state", { error })
    return false
  }
}

/**
 * Create empty unified state
 */
export function createEmptyUnifiedState(): UnifiedWorkflowState {
  const now = new Date().toISOString()
  return {
    version: "1.0.0",
    boulder: {
      activePlan: null,
      planName: null,
      startedAt: null,
      sessionIds: [],
    },
    progress: {
      total: 0,
      completed: 0,
      inProgress: 0,
      blocked: 0,
      isComplete: false,
      percentage: 0,
    },
    designPhase: {
      currentPhase: null,
      mode: null,
      complexityScore: null,
      oracleApproved: null,
    },
    tracks: [],
    tdd: {
      currentCycle: null,
      lastTestRun: null,
      testsPassing: null,
      failingTestName: null,
    },
    createdAt: now,
    updatedAt: now,
  }
}

/**
 * Migrate from legacy boulder.json to unified state
 */
function migrateFromBoulderState(directory: string): UnifiedWorkflowState | null {
  const boulderState = readBoulderState(directory)
  
  if (!boulderState) {
    return null
  }
  
  const progress = getPlanProgress(boulderState.active_plan)
  const tracks = readConductorTracks(directory)
  
  const unified = createEmptyUnifiedState()
  unified.boulder = {
    activePlan: boulderState.active_plan,
    planName: boulderState.plan_name,
    startedAt: boulderState.started_at,
    sessionIds: boulderState.session_ids,
  }
  unified.progress = {
    total: progress.total,
    completed: progress.completed,
    inProgress: 0,
    blocked: 0,
    isComplete: progress.isComplete,
    percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
  }
  unified.tracks = tracks
  
  // Write the migrated state
  writeUnifiedState(directory, unified)
  log("[unified-state] Migrated from boulder.json", { planName: boulderState.plan_name })
  
  return unified
}

/**
 * Sync unified state back to legacy boulder.json
 */
function syncToBoulderState(directory: string, state: UnifiedWorkflowState): void {
  if (!state.boulder.activePlan || !state.boulder.planName) {
    return
  }
  
  const boulderState: BoulderState = {
    active_plan: state.boulder.activePlan,
    plan_name: state.boulder.planName,
    started_at: state.boulder.startedAt || new Date().toISOString(),
    session_ids: state.boulder.sessionIds,
  }
  
  writeBoulderState(directory, boulderState)
}

/**
 * Read conductor tracks from conductor/tracks/*.json
 */
function readConductorTracks(directory: string): UnifiedWorkflowState["tracks"] {
  const tracksDir = join(directory, CONDUCTOR_DIR, TRACKS_DIR)
  
  if (!existsSync(tracksDir)) {
    return []
  }
  
  try {
    const files = readdirSync(tracksDir).filter(f => f.endsWith(".json"))
    const tracks: UnifiedWorkflowState["tracks"] = []
    
    for (const file of files) {
      try {
        const content = readFileSync(join(tracksDir, file), "utf-8")
        const track = JSON.parse(content)
        tracks.push({
          id: track.id || basename(file, ".json"),
          name: track.name || track.id || basename(file, ".json"),
          phase: track.phase || "ready",
          taskCount: track.tasks?.length || 0,
          completedCount: track.tasks?.filter((t: { status: string }) => t.status === "completed").length || 0,
        })
      } catch {
        // Skip invalid track files
      }
    }
    
    return tracks
  } catch {
    return []
  }
}

/**
 * Update design phase in unified state
 */
export function updateDesignPhase(
  directory: string,
  phase: number,
  mode?: "speed" | "ask" | "full"
): boolean {
  let state = readUnifiedState(directory)
  if (!state) {
    state = createEmptyUnifiedState()
  }
  
  state.designPhase.currentPhase = phase
  if (mode) {
    state.designPhase.mode = mode
  }
  
  return writeUnifiedState(directory, state)
}

/**
 * Update TDD cycle state
 */
export function updateTddState(
  directory: string,
  cycle: "red" | "green" | "refactor",
  testsPassing?: boolean,
  failingTestName?: string
): boolean {
  let state = readUnifiedState(directory)
  if (!state) {
    state = createEmptyUnifiedState()
  }
  
  state.tdd.currentCycle = cycle
  state.tdd.lastTestRun = new Date().toISOString()
  if (testsPassing !== undefined) {
    state.tdd.testsPassing = testsPassing
  }
  if (failingTestName !== undefined) {
    state.tdd.failingTestName = failingTestName
  }
  
  return writeUnifiedState(directory, state)
}

/**
 * Update progress in unified state
 */
export function updateProgress(
  directory: string,
  progress: Partial<UnifiedWorkflowState["progress"]>
): boolean {
  let state = readUnifiedState(directory)
  if (!state) {
    state = createEmptyUnifiedState()
  }
  
  state.progress = { ...state.progress, ...progress }
  if (state.progress.total > 0) {
    state.progress.percentage = Math.round((state.progress.completed / state.progress.total) * 100)
    state.progress.isComplete = state.progress.completed >= state.progress.total
  }
  
  return writeUnifiedState(directory, state)
}

/**
 * Start a new workflow from a plan
 */
export function startWorkflow(
  directory: string,
  planPath: string,
  sessionId: string
): UnifiedWorkflowState {
  const planName = getPlanName(planPath)
  const progress = getPlanProgress(planPath)
  const tracks = readConductorTracks(directory)
  const now = new Date().toISOString()
  
  const state: UnifiedWorkflowState = {
    version: "1.0.0",
    boulder: {
      activePlan: planPath,
      planName,
      startedAt: now,
      sessionIds: [sessionId],
    },
    progress: {
      total: progress.total,
      completed: progress.completed,
      inProgress: 0,
      blocked: 0,
      isComplete: progress.isComplete,
      percentage: progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0,
    },
    designPhase: {
      currentPhase: 9, // EXECUTE phase
      mode: null,
      complexityScore: null,
      oracleApproved: null,
    },
    tracks,
    tdd: {
      currentCycle: null,
      lastTestRun: null,
      testsPassing: null,
      failingTestName: null,
    },
    createdAt: now,
    updatedAt: now,
  }
  
  writeUnifiedState(directory, state)
  log("[unified-state] Started new workflow", { planName, sessionId })
  
  return state
}
