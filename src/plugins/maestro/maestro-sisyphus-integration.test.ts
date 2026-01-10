import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { maestroEventBus } from "./events";
import { createMaestroSisyphusBridgeHook } from "./hooks/sisyphus-bridge";
import { createTddEnforcementHook } from "./hooks/tdd-enforcement";
import { createContextInjectionHook } from "./hooks/context-injection";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import type { MaestroEvent } from "./types";

const TEST_DIR = join(process.cwd(), ".test-maestro-integration");
const PLANS_DIR = join(TEST_DIR, ".sisyphus", "plans");
const BOULDER_PATH = join(TEST_DIR, ".sisyphus", "boulder.json");

describe("Maestro-Sisyphus Integration", () => {
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

  test("emits plan:ready event when new plan detected", async () => {
    // given
    const events: MaestroEvent[] = [];
    maestroEventBus.on((event: MaestroEvent) => {
      if (event.type === "plan:ready") events.push(event);
    });

    const mockCtx: any = {
      client: {},
      directory: TEST_DIR,
    };

    createMaestroSisyphusBridgeHook(mockCtx, { autoExecute: false });

    writeFileSync(
      join(PLANS_DIR, "test-plan.md"),
      "# Test Plan\n- [ ] Task 1\n- [ ] Task 2"
    );

    // when
    const hook = createMaestroSisyphusBridgeHook(mockCtx, { autoExecute: false });
    await hook["chat.message"]?.(
      { sessionID: "test-session", messageID: "msg-1" },
      { parts: [], messages: [] }
    );

    // then
    await new Promise((r) => setTimeout(r, 100));
    expect(events.length).toBeGreaterThanOrEqual(1);
    const firstEvent = events[0];
    if (firstEvent.type === "plan:ready") {
      expect(firstEvent.payload.planName).toBe("test-plan");
    }
  });

  test("injects context into system messages when workflow active", async () => {
    // given
    writeFileSync(BOULDER_PATH, JSON.stringify({ active_plan: join(PLANS_DIR, "test.md") }));

    const hook = createContextInjectionHook();
    const messages = [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" },
    ];

    // when
    const result = await hook(messages, { sessionId: "test" });

    // then
    expect(result[0].content).toContain("## Maestro Workflow Context");
    expect(result[0].content).toContain("**Plan Progress**:");
  });

  test("skips context injection for background sessions", async () => {
    // given
    writeFileSync(BOULDER_PATH, JSON.stringify({ active_plan: join(PLANS_DIR, "test.md") }));

    const hook = createContextInjectionHook();
    const messages = [{ role: "system", content: "Original" }];

    // when
    const result = await hook(messages, { agentName: "background-explore" });

    // then
    expect(result[0].content).toBe("Original");
    expect(result[0].content).not.toContain("Maestro Workflow Context");
  });

  test("event bus handles errors in listeners without crashing", () => {
    // given
    const events: string[] = [];
    maestroEventBus.on(() => {
      throw new Error("Handler failed");
    });
    maestroEventBus.on((event: MaestroEvent) => {
      events.push("second-handler-ran");
    });

    // when
    maestroEventBus.emit({ type: "test:event" as any, payload: {} as any });

    // then
    expect(events).toContain("second-handler-ran");
  });

  test("hooks chain executes in correct order", async () => {
    // given
    const executionOrder: string[] = [];
    const mockCtx: any = {
      client: {},
      directory: TEST_DIR,
    };

    maestroEventBus.on((event: MaestroEvent) => {
      if (event.type === "plan:ready") executionOrder.push("event-emitted");
    });

    const bridgeHook = createMaestroSisyphusBridgeHook(mockCtx, { autoExecute: false });

    writeFileSync(join(PLANS_DIR, "order-test.md"), "# Test\n- [ ] Task");

    // when
    await bridgeHook["chat.message"]?.(
      { sessionID: "order-test", messageID: "msg-1" },
      { parts: [], messages: [] }
    );

    // then
    await new Promise((r) => setTimeout(r, 100));
    expect(executionOrder).toContain("event-emitted");
  });
});
