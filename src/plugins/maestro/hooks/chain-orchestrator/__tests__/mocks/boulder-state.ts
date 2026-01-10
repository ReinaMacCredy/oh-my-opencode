import type { BoulderState, PlanProgress } from "../../../../features/boulder-state/types"

export class MockBoulderState {
  private state: BoulderState | null = null
  private changeCallbacks: Array<() => void> = []
  private progressMap: Map<string, PlanProgress> = new Map()

  readBoulderState(): BoulderState | null {
    return this.state
  }

  writeBoulderState(state: BoulderState): boolean {
    this.state = state
    this.triggerChange()
    return true
  }

  appendSessionId(sessionId: string): BoulderState | null {
    if (!this.state) return null

    if (!this.state.session_ids.includes(sessionId)) {
      this.state.session_ids.push(sessionId)
      this.triggerChange()
    }

    return this.state
  }

  getPlanProgress(planPath: string): PlanProgress {
    return this.progressMap.get(planPath) || {
      total: 4,
      completed: 2,
      isComplete: false,
    }
  }

  setProgress(planPath: string, progress: PlanProgress): void {
    this.progressMap.set(planPath, progress)
  }

  onChange(callback: () => void): void {
    this.changeCallbacks.push(callback)
  }

  private triggerChange(): void {
    for (const cb of this.changeCallbacks) {
      cb()
    }
  }

  reset(): void {
    this.state = null
    this.changeCallbacks = []
    this.progressMap.clear()
  }

  setMockState(state: BoulderState | null): void {
    this.state = state
  }
}

export function createMockBoulderState(): MockBoulderState {
  return new MockBoulderState()
}
