export const EVENT_TYPES = {
	PLAN_READY: "plan:ready",
	TASK_STARTED: "task:started",
	TASK_COMPLETED: "task:completed",
	TDD_PHASE_CHANGED: "tdd:phase-changed",
	DESIGN_PHASE_CHANGED: "design:phase-changed",
	WORKFLOW_STARTED: "workflow:started",
	WORKFLOW_COMPLETED: "workflow:completed",
} as const;
