import type { BoulderState, PlanProgress } from "../../../../features/boulder-state/types"

export class MockBoulderState {
  private state: BoulderState | null = null

  readBoulderState(): BoulderState | null {
    return this.state
  }

  writeBoulderState(state: BoulderState): boolean {
    this.state = state
    return true
  }

  appendSessionId(sessionId: string): BoulderState | null {
    if (!this.state) return null

    if (!this.state.session_ids.includes(sessionId)) {
      this.state.session_ids.push(sessionId)
    }

    return this.state
  }

  getPlanProgress(planPath: string): PlanProgress {
    return {
      total: 4,
      completed: 2,
      isComplete: false,
    }
  }

  reset(): void {
    this.state = null
  }

  setMockState(state: BoulderState | null): void {
    this.state = state
  }
}

export function createMockBoulderState(): MockBoulderState {
  return new MockBoulderState()
}
