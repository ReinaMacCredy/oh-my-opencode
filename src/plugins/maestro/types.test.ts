import { describe, it, expect } from "bun:test";
import type { MaestroHooks, MaestroEvent } from "./types";

describe("MaestroHooks interface", () => {
	// given
	it("should have correct shape with all hook methods", () => {
		// when
		const hooks: Partial<MaestroHooks> = {
			"chat.message": async () => {},
			"tool.execute.before": async () => {},
			"tool.execute.after": async () => {},
			"experimental.chat.messages.transform": async () => {},
		};

		// then
		expect(hooks).toBeDefined();
		expect(hooks["chat.message"]).toBeTypeOf("function");
		expect(hooks["tool.execute.before"]).toBeTypeOf("function");
		expect(hooks["tool.execute.after"]).toBeTypeOf("function");
		expect(hooks["experimental.chat.messages.transform"]).toBeTypeOf("function");
	});

	it("should allow optional hooks", () => {
		const emptyHooks: MaestroHooks = {};
		expect(emptyHooks).toBeDefined();
	});
});

describe("MaestroEvent union type", () => {
	// given
	it("should accept plan:ready event", () => {
		// when
		const event: MaestroEvent = {
			type: "plan:ready",
			payload: { planPath: "/path/to/plan.md", planName: "test-plan" },
		};

		// then
		expect(event.type).toBe("plan:ready");
	});

	it("should accept task:started event", () => {
		const event: MaestroEvent = {
			type: "task:started",
			payload: { taskId: "task-1", title: "Test Task", sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("task:started");
	});

	it("should accept task:completed event", () => {
		const event: MaestroEvent = {
			type: "task:completed",
			payload: { taskId: "task-1", title: "Test Task", sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("task:completed");
	});

	it("should accept tdd:phase-changed event", () => {
		const event: MaestroEvent = {
			type: "tdd:phase-changed",
			payload: { phase: "red", sessionId: "ses_123" },
		};

		expect(event.type).toBe("tdd:phase-changed");
		expect(event.payload.phase).toBe("red");
	});

	it("should accept design:phase-changed event", () => {
		const event: MaestroEvent = {
			type: "design:phase-changed",
			payload: { fromPhase: 1, phase: 2, sessionID: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("design:phase-changed");
	});

	it("should accept workflow:started event", () => {
		const event: MaestroEvent = {
			type: "workflow:started",
			payload: { sessionID: "ses_123", timestamp: Date.now(), totalTasks: 5, completedTasks: 0 },
		};

		expect(event.type).toBe("workflow:started");
	});

	it("should accept workflow:completed event", () => {
		const event: MaestroEvent = {
			type: "workflow:completed",
			payload: { sessionID: "ses_123", timestamp: Date.now(), totalTasks: 5, completedTasks: 5 },
		};

		expect(event.type).toBe("workflow:completed");
	});
});
