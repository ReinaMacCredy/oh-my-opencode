/**
 * Workflow Engine Contract Types (v1)
 *
 * Shared types for the Workflow Engine abstraction layer.
 * Enables multiple workflow engines (Sisyphus, Maestro) to implement
 * a common interface for orchestration, planning, and task execution.
 */

// =============================================================================
// CAPABILITY FLAGS
// =============================================================================

/**
 * Engine capability flags for feature detection.
 * Allows runtime checking of what features an engine supports.
 */
export interface EngineCapabilities {
  /** Supports TDD cycle (RED → GREEN → REFACTOR) */
  tdd: boolean
  /** Supports parallel track execution via orchestrator */
  parallelExecution: boolean
  /** Supports Double Diamond design phases */
  designPhases: boolean
  /** Supports session handoff/preservation */
  sessionHandoff: boolean
  /** Supports external issue tracking (Beads CLI) */
  externalTracking: boolean
  /** Supports internal state tracking (Boulder) */
  internalTracking: boolean
  /** Supports autonomous execution loops (Ralph) */
  autonomousExecution: boolean
  /** Supports skill-based workflow routing */
  skillRouting: boolean
}

// =============================================================================
// WORKFLOW STATE
// =============================================================================

/**
 * Status of a workflow task/bead.
 */
export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "blocked"
  | "cancelled"
  | "skipped"

/**
 * Priority levels for tasks.
 */
export type TaskPriority = "critical" | "high" | "medium" | "low"

/**
 * A single task/bead in the workflow.
 */
export interface WorkflowTask {
  /** Unique identifier */
  id: string
  /** Human-readable title */
  title: string
  /** Detailed description */
  description?: string
  /** Current status */
  status: TaskStatus
  /** Priority level */
  priority: TaskPriority
  /** Task IDs this task depends on (blockers) */
  dependencies: string[]
  /** Task IDs that depend on this task */
  dependents: string[]
  /** File paths this task affects (for parallel grouping) */
  fileScope?: string[]
  /** Labels/tags for categorization */
  labels?: string[]
  /** Progress notes and history */
  notes?: string[]
  /** ISO timestamp when created */
  createdAt: string
  /** ISO timestamp when last updated */
  updatedAt: string
  /** ISO timestamp when completed */
  completedAt?: string
  /** Track ID this task belongs to */
  trackId?: string
}

/**
 * A track is a grouping of related tasks for parallel execution.
 */
export interface WorkflowTrack {
  /** Unique identifier (e.g., "BlueLake", "GreenCastle") */
  id: string
  /** Human-readable name */
  name: string
  /** Description of the track's purpose */
  description?: string
  /** Task IDs in this track */
  taskIds: string[]
  /** Current phase of the track */
  phase: TrackPhase
  /** Whether this track is ready for execution */
  isReady: boolean
  /** Assigned agent/worker for parallel execution */
  assignedAgent?: string
  /** File paths this track exclusively owns */
  fileReservations?: string[]
}

/**
 * Phase of a track in the workflow pipeline.
 */
export type TrackPhase =
  | "design"       // Phases 1-4: Double Diamond
  | "planning"     // Phases 5-7: Beads, validation, assignment
  | "ready"        // Phase 8: Ready for execution
  | "executing"    // Phase 9: Implementation in progress
  | "completed"    // Phase 10: Finished and archived

// =============================================================================
// PLAN MANAGEMENT
// =============================================================================

/**
 * A workflow plan containing tasks and tracks.
 */
export interface WorkflowPlan {
  /** Unique plan identifier */
  id: string
  /** Plan name */
  name: string
  /** Path to plan file (if file-based) */
  filePath?: string
  /** All tasks in this plan */
  tasks: WorkflowTask[]
  /** Tracks for parallel execution grouping */
  tracks: WorkflowTrack[]
  /** Overall progress */
  progress: PlanProgress
  /** ISO timestamp when plan was created */
  createdAt: string
  /** ISO timestamp when plan was last updated */
  updatedAt: string
  /** Session IDs that have worked on this plan */
  sessionIds: string[]
  /** Metadata for extensibility */
  metadata?: Record<string, unknown>
}

/**
 * Plan progress summary.
 */
export interface PlanProgress {
  /** Total number of tasks */
  total: number
  /** Number of completed tasks */
  completed: number
  /** Number of in-progress tasks */
  inProgress: number
  /** Number of blocked tasks */
  blocked: number
  /** Whether all tasks are done */
  isComplete: boolean
  /** Completion percentage (0-100) */
  percentage: number
}

// =============================================================================
// EXECUTION CONTEXT
// =============================================================================

/**
 * Context passed to workflow operations.
 */
export interface WorkflowContext {
  /** Current session ID */
  sessionId: string
  /** Project root directory */
  projectRoot: string
  /** Active plan (if any) */
  activePlan?: WorkflowPlan
  /** Current track being worked on */
  currentTrack?: WorkflowTrack
  /** Available skills for routing */
  availableSkills?: string[]
  /** User preferences/configuration */
  config?: WorkflowConfig
}

/**
 * Workflow engine configuration.
 */
export interface WorkflowConfig {
  /** Enable TDD by default */
  tddEnabled?: boolean
  /** Maximum parallel tracks */
  maxParallelTracks?: number
  /** Enable autonomous execution */
  autonomousEnabled?: boolean
  /** Custom tracking backend */
  trackingBackend?: "boulder" | "beads" | "both"
  /** Skill routing mode */
  skillRoutingMode?: "maestro" | "sisyphus" | "auto"
}

// =============================================================================
// OPERATION REQUESTS & RESULTS
// =============================================================================

/**
 * Request to create a new plan.
 */
export interface CreatePlanRequest {
  /** Plan name */
  name: string
  /** Optional source document (PRD, design.md) */
  sourceDocument?: string
  /** Initial tasks to include */
  initialTasks?: Omit<WorkflowTask, "id" | "createdAt" | "updatedAt">[]
  /** Skip design phases (SPEED mode) */
  skipDesign?: boolean
}

/**
 * Request to execute a plan or track.
 */
export interface ExecutePlanRequest {
  /** Plan ID to execute */
  planId: string
  /** Specific track ID (optional, defaults to all ready tracks) */
  trackId?: string
  /** Execution mode */
  mode: ExecutionMode
  /** Skills to use during execution */
  skills?: string[]
  /** Maximum iterations for autonomous mode */
  maxIterations?: number
}

/**
 * Execution mode for plan/track execution.
 */
export type ExecutionMode =
  | "sequential"   // ci: Single-track TDD execution
  | "parallel"     // co: Multi-agent parallel execution
  | "autonomous"   // ca: Ralph loop (not implemented initially)

/**
 * Request to update a task.
 */
export interface UpdateTaskRequest {
  /** Task ID to update */
  taskId: string
  /** New status */
  status?: TaskStatus
  /** Add a progress note */
  note?: string
  /** Completion reason (for close) */
  completionReason?: "completed" | "skipped" | "blocked"
  /** File paths to add to scope */
  addFiles?: string[]
}

/**
 * Result of a workflow operation.
 */
export interface WorkflowResult<T = void> {
  /** Whether the operation succeeded */
  success: boolean
  /** Result data (if successful) */
  data?: T
  /** Error message (if failed) */
  error?: string
  /** Warnings (non-fatal issues) */
  warnings?: string[]
}

// =============================================================================
// SESSION & HANDOFF
// =============================================================================

/**
 * Session state for handoff between sessions.
 */
export interface SessionState {
  /** Session ID */
  sessionId: string
  /** Active plan state */
  activePlan?: {
    planId: string
    currentTaskId?: string
    currentTrackId?: string
  }
  /** Important context to preserve */
  context?: {
    /** Key decisions made */
    decisions?: string[]
    /** Blockers encountered */
    blockers?: string[]
    /** Next steps planned */
    nextSteps?: string[]
  }
  /** ISO timestamp */
  timestamp: string
}

/**
 * Handoff payload for session continuation.
 */
export interface HandoffPayload {
  /** Previous session state */
  previousState: SessionState
  /** Summary for the next session */
  summary: string
  /** Recommended first action */
  recommendedAction?: string
}

// =============================================================================
// DESIGN PHASES (MAESTRO-SPECIFIC, BUT IN CONTRACT FOR COMPATIBILITY)
// =============================================================================

/**
 * Design phase in the unified pipeline.
 */
export type DesignPhase =
  | 1  // DISCOVER - Diverge
  | 2  // DEFINE - Converge
  | 3  // DEVELOP - Diverge
  | 4  // VERIFY - Converge (Oracle audit)
  | 5  // DECOMPOSE - Create beads
  | 6  // VALIDATE - Dependency check
  | 7  // ASSIGN - Track assignments
  | 8  // READY - Handoff
  | 9  // EXECUTE - Implementation
  | 10 // FINISH - Archive

/**
 * Design session state.
 */
export interface DesignSessionState {
  /** Current phase */
  currentPhase: DesignPhase
  /** Complexity score for mode routing */
  complexityScore?: number
  /** Design mode (SPEED < 4, ASK 4-6, FULL > 6) */
  mode: "speed" | "ask" | "full"
  /** Design document path */
  designDocPath?: string
  /** Research findings from hooks */
  researchFindings?: string[]
  /** Oracle verification result */
  oracleVerification?: {
    approved: boolean
    concerns?: string[]
  }
}

// =============================================================================
// EVENT TYPES
// =============================================================================

/**
 * Events emitted by the workflow engine.
 */
export type WorkflowEvent =
  | { type: "plan:created"; plan: WorkflowPlan }
  | { type: "plan:updated"; plan: WorkflowPlan }
  | { type: "task:created"; task: WorkflowTask }
  | { type: "task:updated"; task: WorkflowTask; previousStatus: TaskStatus }
  | { type: "task:completed"; task: WorkflowTask }
  | { type: "track:ready"; track: WorkflowTrack }
  | { type: "track:executing"; track: WorkflowTrack; agent?: string }
  | { type: "track:completed"; track: WorkflowTrack }
  | { type: "design:phase-changed"; phase: DesignPhase; previousPhase?: DesignPhase }
  | { type: "execution:started"; mode: ExecutionMode; trackIds: string[] }
  | { type: "execution:completed"; success: boolean; summary?: string }
  | { type: "handoff:created"; payload: HandoffPayload }

/**
 * Event listener type.
 */
export type WorkflowEventListener = (event: WorkflowEvent) => void | Promise<void>
