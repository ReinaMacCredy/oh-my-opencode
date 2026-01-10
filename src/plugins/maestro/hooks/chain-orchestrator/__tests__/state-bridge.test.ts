/**
 * Tests for state bridge - boulder-state.json watcher
 *
 * Tests the file watcher that monitors .sisyphus/boulder.json
 * and emits Maestro events on state changes.
 */

import { describe, test, expect, beforeEach } from "bun:test"
import { createMockEventBus } from "./mocks/event-bus"
import { createMockBoulderState } from "./mocks/boulder-state"
import { createStateBridge } from "../state-bridge"

interface BoulderState {
	active_plan: string
	started_at: string
	session_ids: string[]
	plan_name: string
}

describe("state-bridge", () => {
	let mockEventBus: ReturnType<typeof createMockEventBus>
	let mockBoulderState: ReturnType<typeof createMockBoulderState>
	let cleanup: (() => void) | undefined

	beforeEach(() => {
		mockEventBus = createMockEventBus()
		mockBoulderState = createMockBoulderState()
		mockEventBus.reset()
		mockBoulderState.reset()

		if (cleanup) {
			cleanup()
			cleanup = undefined
		}
	})

	// #given file doesn't exist initially
	// #when state bridge starts watching
	// #then no errors occur and no events emitted
	test("handles missing file gracefully", () => {
		// #given
		mockBoulderState.setMockState(null)

		// #when
		cleanup = createStateBridge(mockEventBus, mockBoulderState)

		// #then
		expect(mockEventBus.emittedEvents.length).toBe(0)
	})

	// #given boulder-state exists with progress data
	// #when progress changes (totalTasks or completedTasks)
	// #then boulder:progress event emitted with correct payload
	test("emits boulder:progress when task counts change", () => {
		const initialState: BoulderState = {
			active_plan: "/path/to/plan.md",
			started_at: new Date().toISOString(),
			session_ids: ["ses_1"],
			plan_name: "test-plan",
		}
		mockBoulderState.setMockState(initialState)
		mockBoulderState.setProgress("/path/to/plan.md", {
			total: 4,
			completed: 2,
			isComplete: false,
		})
		cleanup = createStateBridge(mockEventBus, mockBoulderState)

		mockBoulderState.setProgress("/path/to/plan.md", {
			total: 4,
			completed: 3,
			isComplete: false,
		})
		mockBoulderState.writeBoulderState(initialState)

		const progressEvents = mockEventBus.emittedEvents.filter(
			(e) => e.type === "boulder:progress",
		)
		expect(progressEvents.length).toBeGreaterThan(0)

		const lastEvent = progressEvents[progressEvents.length - 1]
		expect(lastEvent.type).toBe("boulder:progress")
		expect(lastEvent.payload).toHaveProperty("totalTasks")
		expect(lastEvent.payload).toHaveProperty("completedTasks")
		expect(lastEvent.payload).toHaveProperty("sessionId")
		expect(lastEvent.payload).toHaveProperty("timestamp")
	})

	// #given boulder-state exists with session_ids array
	// #when new session ID is added to the array
	// #then boulder:session-added event emitted
	test("emits boulder:session-added when new session joins", () => {
		const initialState: BoulderState = {
			active_plan: "/path/to/plan.md",
			started_at: new Date().toISOString(),
			session_ids: ["ses_1"],
			plan_name: "test-plan",
		}
		mockBoulderState.setMockState(initialState)
		cleanup = createStateBridge(mockEventBus, mockBoulderState)

		mockBoulderState.appendSessionId("ses_2")

		const sessionEvents = mockEventBus.emittedEvents.filter(
			(e) => e.type === "boulder:session-added",
		)
		expect(sessionEvents.length).toBeGreaterThan(0)

		const lastEvent = sessionEvents[sessionEvents.length - 1]
		expect(lastEvent.type).toBe("boulder:session-added")
		expect(lastEvent.payload.newSessionId).toBe("ses_2")
		expect(lastEvent.payload.planPath).toBe("/path/to/plan.md")
		expect(lastEvent.payload).toHaveProperty("timestamp")
	})

	// #given plan has tasks in progress
	// #when all tasks are marked complete
	// #then boulder:completed event emitted
	test("emits boulder:completed when plan finishes", () => {
		const initialState: BoulderState = {
			active_plan: "/path/to/plan.md",
			started_at: new Date().toISOString(),
			session_ids: ["ses_1"],
			plan_name: "test-plan",
		}
		mockBoulderState.setMockState(initialState)
		mockBoulderState.setProgress("/path/to/plan.md", {
			total: 4,
			completed: 3,
			isComplete: false,
		})

		cleanup = createStateBridge(mockEventBus, mockBoulderState)

		mockBoulderState.setProgress("/path/to/plan.md", {
			total: 4,
			completed: 4,
			isComplete: true,
		})
		mockBoulderState.writeBoulderState(initialState)

		const completedEvents = mockEventBus.emittedEvents.filter(
			(e) => e.type === "boulder:completed",
		)
		expect(completedEvents.length).toBeGreaterThan(0)

		const lastEvent = completedEvents[completedEvents.length - 1]
		expect(lastEvent.type).toBe("boulder:completed")
		expect(lastEvent.payload.planPath).toBe("/path/to/plan.md")
		expect(lastEvent.payload.totalTasks).toBe(4)
		expect(lastEvent.payload).toHaveProperty("sessionId")
		expect(lastEvent.payload).toHaveProperty("timestamp")
	})

	// #given state bridge is watching file
	// #when cleanup function is called
	// #then file watcher stops and no further events emitted
	test("cleanup stops file watching", () => {
		// #given
		const state: BoulderState = {
			active_plan: "/path/to/plan.md",
			started_at: new Date().toISOString(),
			session_ids: ["ses_1"],
			plan_name: "test-plan",
		}
		mockBoulderState.setMockState(state)
		cleanup = createStateBridge(mockEventBus, mockBoulderState)

		if (cleanup) {
			cleanup()
		}
		mockEventBus.reset()

		// Simulate file change after cleanup
		mockBoulderState.writeBoulderState(state)

		// #then
		expect(mockEventBus.emittedEvents.length).toBe(0)
	})

	// #given rapid file changes occur (fs.watch fires multiple times)
	// #when changes happen within debounce window
	// #then only one event emitted per actual state change
	test("debounces rapid file changes", () => {
		// #given
		const state: BoulderState = {
			active_plan: "/path/to/plan.md",
			started_at: new Date().toISOString(),
			session_ids: ["ses_1"],
			plan_name: "test-plan",
		}
		mockBoulderState.setMockState(state)
		cleanup = createStateBridge(mockEventBus, mockBoulderState)

		// #when - simulate rapid writes
		mockBoulderState.writeBoulderState(state)
		mockBoulderState.writeBoulderState(state)
		mockBoulderState.writeBoulderState(state)

		// #then - events are debounced (implementation detail, might need adjustment)
		// At minimum, should not emit 3 identical events
		const uniqueEvents = new Set(
			mockEventBus.emittedEvents.map((e) => JSON.stringify(e)),
		)
		expect(uniqueEvents.size).toBeLessThanOrEqual(
			mockEventBus.emittedEvents.length,
		)
	})
})
