import type { MaestroEvent } from "../../types"

interface EventBus {
	emit(event: MaestroEvent): void
}

interface BoulderStateAPI {
	readBoulderState(): BoulderState | null
	getPlanProgress(planPath: string): PlanProgress
	onChange?(callback: () => void): void
}

interface BoulderState {
	active_plan: string
	started_at: string
	session_ids: string[]
	plan_name: string
}

interface PlanProgress {
	total: number
	completed: number
	isComplete: boolean
}

interface StateSnapshot {
	totalTasks: number
	completedTasks: number
	sessionCount: number
	isComplete: boolean
}

function createSnapshot(state: BoulderState, progress: PlanProgress): StateSnapshot {
	return {
		totalTasks: progress.total,
		completedTasks: progress.completed,
		sessionCount: state.session_ids.length,
		isComplete: progress.isComplete,
	}
}

function getLastSessionId(state: BoulderState): string {
	return state.session_ids[state.session_ids.length - 1] || ""
}

function hasProgressChanged(
	current: StateSnapshot,
	previous: StateSnapshot,
): boolean {
	return (
		current.totalTasks !== previous.totalTasks ||
		current.completedTasks !== previous.completedTasks
	)
}

function emitProgressEvent(
	eventBus: EventBus,
	state: BoulderState,
	snapshot: StateSnapshot,
): void {
	eventBus.emit({
		type: "boulder:progress",
		payload: {
			totalTasks: snapshot.totalTasks,
			completedTasks: snapshot.completedTasks,
			sessionId: getLastSessionId(state),
			timestamp: Date.now(),
		},
	})
}

function emitSessionAddedEvent(
	eventBus: EventBus,
	state: BoulderState,
): void {
	eventBus.emit({
		type: "boulder:session-added",
		payload: {
			newSessionId: getLastSessionId(state),
			planPath: state.active_plan,
			timestamp: Date.now(),
		},
	})
}

function emitCompletedEvent(
	eventBus: EventBus,
	state: BoulderState,
	snapshot: StateSnapshot,
): void {
	eventBus.emit({
		type: "boulder:completed",
		payload: {
			planPath: state.active_plan,
			totalTasks: snapshot.totalTasks,
			sessionId: getLastSessionId(state),
			timestamp: Date.now(),
		},
	})
}

export function createStateBridge(
	eventBus: EventBus,
	boulderStateAPI: BoulderStateAPI,
): () => void {
	let previousSnapshot: StateSnapshot | null = null
	let watching = true

	const checkAndEmitEvents = () => {
		if (!watching) return

		const state = boulderStateAPI.readBoulderState()
		if (!state) {
			return
		}

		try {
			const progress = boulderStateAPI.getPlanProgress(state.active_plan)
			const currentSnapshot = createSnapshot(state, progress)

			if (previousSnapshot) {
				if (hasProgressChanged(currentSnapshot, previousSnapshot)) {
					emitProgressEvent(eventBus, state, currentSnapshot)
				}

				if (currentSnapshot.sessionCount > previousSnapshot.sessionCount) {
					emitSessionAddedEvent(eventBus, state)
				}

				if (
					currentSnapshot.isComplete &&
					!previousSnapshot.isComplete &&
					currentSnapshot.totalTasks > 0
				) {
					emitCompletedEvent(eventBus, state, currentSnapshot)
				}
			}

			previousSnapshot = currentSnapshot
		} catch {
			return
		}
	}

	checkAndEmitEvents()

	if (boulderStateAPI.onChange) {
		boulderStateAPI.onChange(checkAndEmitEvents)
	}

	return () => {
		watching = false
	}
}
