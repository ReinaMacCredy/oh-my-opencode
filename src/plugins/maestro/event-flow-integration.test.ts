import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { maestroEventBus } from "./events";
import type { MaestroEvent } from "./events/types";
import { createMaestroPlugin } from "./index";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { readUnifiedState } from "./features/boulder-state";
import type { PluginInput } from "@opencode-ai/plugin";

const TEST_DIR = join(process.cwd(), ".test-event-flow-integration");
const PLANS_DIR = join(TEST_DIR, ".sisyphus", "plans");
const TEST_PLAN_PATH = join(PLANS_DIR, "event-test-plan.md");

describe("Event Flow Integration", () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(PLANS_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test("full lifecycle: plan → tasks → TDD → completion", async () => {
    const events: MaestroEvent[] = [];
    maestroEventBus.on((event: MaestroEvent) => {
      events.push(event);
    });

    const mockCtx = { 
      client: {}, 
      directory: TEST_DIR,
    } as unknown as PluginInput;

    const plugin = createMaestroPlugin(mockCtx, { enforceTdd: true });

    const sessionID = "test-session-flow";

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-1",
        tool: "todowrite",
        parameters: {
          todos: [
            { id: "1", content: "Task 1: Write test", status: "in_progress", priority: "high" },
          ],
        },
      },
      { result: [{ id: "1", content: "Task 1: Write test", status: "in_progress", priority: "high" }] }
    );

    await plugin["tool.execute.before"]?.(
      {
        sessionID,
        messageID: "msg-2",
        tool: "write",
        parameters: {
          filePath: join(TEST_DIR, "feature.test.ts"),
          content: "test content",
        },
      },
      {
        args: {
          filePath: join(TEST_DIR, "feature.test.ts"),
          content: "test content",
        },
      }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-2",
        tool: "todowrite",
        parameters: {
          todos: [
            { id: "task-1", status: "in_progress", content: "Implement feature X" }
          ]
        },
      },
      { result: { todos: [
        { id: "task-1", status: "in_progress", title: "Implement feature X" }
      ] } }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-3",
        tool: "write",
        parameters: {
          filePath: join(TEST_DIR, "feature.test.ts"),
          content: "test content",
        },
      },
      { result: "" }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-4",
        tool: "bash",
        parameters: {
          command: "bun test",
        },
      },
      { result: "FAIL: 1 test failed", exitCode: 1 }
    );

    await plugin["tool.execute.before"]?.(
      {
        sessionID,
        messageID: "msg-5",
        tool: "write",
        parameters: {
          filePath: join(TEST_DIR, "feature.ts"),
          content: "implementation",
        },
      },
      { args: { filePath: join(TEST_DIR, "feature.ts"), content: "implementation" } }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-6",
        tool: "bash",
        parameters: {
          command: "bun test",
        },
      },
      { result: "✓ 1 test passed", exitCode: 0 }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-5",
        tool: "todowrite",
        parameters: {
          todos: [
            { id: "task-1", status: "completed", content: "Implement feature X" }
          ]
        },
      },
      { result: { todos: [
        { id: "task-1", status: "completed", title: "Implement feature X" }
      ] } }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-4",
        tool: "write",
        parameters: {
          filePath: join(TEST_DIR, "src.ts"),
          content: "implementation",
        },
      },
      { result: "" }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-5",
        tool: "bash",
        parameters: {
          command: "bun test",
        },
      },
      { result: "PASS: All tests passed", exitCode: 0 }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-6",
        tool: "todowrite",
        parameters: {
          todos: [
            { id: "1", content: "Task 1: Write test", status: "completed", priority: "high" },
          ],
        },
      },
      { result: [{ id: "1", content: "Task 1: Write test", status: "completed", priority: "high" }] }
    );

    const tddPhaseEvents = events.filter((e) => e.type === "tdd:phase-changed");
    const taskEvents = events.filter((e) => e.type === "task:started" || e.type === "task:completed");
    const workflowEvents = events.filter((e) => e.type === "workflow:started" || e.type === "workflow:completed");

    expect(tddPhaseEvents.length).toBeGreaterThan(0);
    expect(taskEvents.some((e) => e.type === "task:started")).toBe(true);
    expect(taskEvents.some((e) => e.type === "task:completed")).toBe(true);

    const state = readUnifiedState(TEST_DIR);
    expect(state).toBeDefined();
    if (state) {
      expect(state.tdd.currentCycle).toBeDefined();
      expect(state.progress.completed).toBeGreaterThan(0);
    }
  });

  test("emits events in correct order", async () => {
    const events: MaestroEvent[] = [];
    maestroEventBus.on((event: MaestroEvent) => {
      events.push(event);
    });

    const mockCtx: any = {
      client: {},
      directory: TEST_DIR,
    };

    writeFileSync(TEST_PLAN_PATH, "# Test\n- [ ] Task 1\n");

    const plugin = createMaestroPlugin(mockCtx);
    const sessionID = "test-order";

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-1",
        tool: "todowrite",
        parameters: {
          todos: [{ id: "1", content: "Task 1", status: "in_progress", priority: "high" }],
        },
      },
      { result: [{ id: "1", content: "Task 1", status: "in_progress", priority: "high" }] }
    );

    await plugin["tool.execute.after"]?.(
      {
        sessionID,
        messageID: "msg-2",
        tool: "todowrite",
        parameters: {
          todos: [{ id: "1", content: "Task 1", status: "completed", priority: "high" }],
        },
      },
      { result: [{ id: "1", content: "Task 1", status: "completed", priority: "high" }] }
    );

    const eventTypes = events.map((e) => e.type);
    
    const taskStartedIndex = eventTypes.indexOf("task:started");
    const taskCompletedIndex = eventTypes.indexOf("task:completed");

    if (taskStartedIndex >= 0 && taskCompletedIndex >= 0) {
      expect(taskStartedIndex).toBeLessThan(taskCompletedIndex);
    }
  });
});
