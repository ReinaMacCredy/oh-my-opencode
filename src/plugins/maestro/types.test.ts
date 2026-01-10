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

	it("should accept sisyphus:delegated event", () => {
		const event: MaestroEvent = {
			type: "sisyphus:delegated",
			payload: { agentType: "oracle", taskDescription: "Review architecture", sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("sisyphus:delegated");
		expect(event.payload.agentType).toBe("oracle");
	});

	it("should accept sisyphus:continuing event", () => {
		const event: MaestroEvent = {
			type: "sisyphus:continuing",
			payload: { reason: "boulder continuation", sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("sisyphus:continuing");
	});

	it("should accept sisyphus:blocked event", () => {
		const event: MaestroEvent = {
			type: "sisyphus:blocked",
			payload: { toolName: "write", reason: "orchestrator delegation required", sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("sisyphus:blocked");
	});

	it("should accept sisyphus:verifying event", () => {
		const event: MaestroEvent = {
			type: "sisyphus:verifying",
			payload: { checkType: "test completion", sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("sisyphus:verifying");
	});

	it("should accept boulder:progress event", () => {
		const event: MaestroEvent = {
			type: "boulder:progress",
			payload: { totalTasks: 10, completedTasks: 5, sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("boulder:progress");
		expect(event.payload.completedTasks).toBe(5);
	});

	it("should accept boulder:session-added event", () => {
		const event: MaestroEvent = {
			type: "boulder:session-added",
			payload: { newSessionId: "ses_456", planPath: "/path/to/plan.md", timestamp: Date.now() },
		};

		expect(event.type).toBe("boulder:session-added");
	});

	it("should accept boulder:completed event", () => {
		const event: MaestroEvent = {
			type: "boulder:completed",
			payload: { planPath: "/path/to/plan.md", totalTasks: 10, sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("boulder:completed");
	});

	it("should accept context:pressure event", () => {
		const event: MaestroEvent = {
			type: "context:pressure",
			payload: { currentTokens: 150000, maxTokens: 200000, percentage: 0.75, sessionId: "ses_123" },
		};

		expect(event.type).toBe("context:pressure");
		expect(event.payload.percentage).toBe(0.75);
	});

	it("should accept context:pruned event", () => {
		const event: MaestroEvent = {
			type: "context:pruned",
			payload: { prunedToolIds: ["tool-1", "tool-2"], tokensSaved: 5000, sessionId: "ses_123", timestamp: Date.now() },
		};

		expect(event.type).toBe("context:pruned");
		expect(event.payload.tokensSaved).toBe(5000);
	});
});

describe("Event type guards", () => {
	it("should identify sisyphus events", () => {
		// given
		const delegated: MaestroEvent = {
			type: "sisyphus:delegated",
			payload: { agentType: "oracle", taskDescription: "test", sessionId: "ses_123", timestamp: Date.now() },
		};
		const taskStarted: MaestroEvent = {
			type: "task:started",
			payload: { taskId: "task-1", title: "Test", sessionId: "ses_123", timestamp: Date.now() },
		};

		// when/then
		expect(delegated.type.startsWith("sisyphus:")).toBe(true);
		expect(taskStarted.type.startsWith("sisyphus:")).toBe(false);
	});

	it("should identify boulder events", () => {
		// given
		const progress: MaestroEvent = {
			type: "boulder:progress",
			payload: { totalTasks: 10, completedTasks: 5, sessionId: "ses_123", timestamp: Date.now() },
		};
		const taskStarted: MaestroEvent = {
			type: "task:started",
			payload: { taskId: "task-1", title: "Test", sessionId: "ses_123", timestamp: Date.now() },
		};

		// when/then
		expect(progress.type.startsWith("boulder:")).toBe(true);
		expect(taskStarted.type.startsWith("boulder:")).toBe(false);
	});

	it("should identify context events", () => {
		// given
		const pressure: MaestroEvent = {
			type: "context:pressure",
			payload: { currentTokens: 150000, maxTokens: 200000, percentage: 0.75, sessionId: "ses_123" },
		};
		const taskStarted: MaestroEvent = {
			type: "task:started",
			payload: { taskId: "task-1", title: "Test", sessionId: "ses_123", timestamp: Date.now() },
		};

		// when/then
		expect(pressure.type.startsWith("context:")).toBe(true);
		expect(taskStarted.type.startsWith("context:")).toBe(false);
	});
});
