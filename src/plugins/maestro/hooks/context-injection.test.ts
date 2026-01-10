import { describe, test, expect } from "bun:test";
import { createContextInjectionHook } from "./context-injection";

describe("Context Injection Hook", () => {
  test("injects Maestro context into system messages", async () => {
    // given
    const hook = createContextInjectionHook();
    const messages = [
      { role: "system", content: "You are a helpful assistant" },
      { role: "user", content: "Hello" },
    ];

    // when
    const result = await hook(messages, { sessionId: "test" });

    // then
    expect(result[0].content).toContain("## Maestro Workflow Context");
  });

  test("skips injection for background sessions", async () => {
    // given
    const hook = createContextInjectionHook();
    const messages = [{ role: "system", content: "Original" }];

    // when
    const result = await hook(messages, { agentName: "background-explore" });

    // then
    expect(result[0].content).toBe("Original");
  });

  test("injects plan progress when workflow active", async () => {
    // given
    const hook = createContextInjectionHook();
    const messages = [{ role: "system", content: "System" }];

    // when
    const result = await hook(messages, { sessionId: "test" });

    // then
    expect(result[0].content).toContain("**Plan Progress**:");
  });
});
