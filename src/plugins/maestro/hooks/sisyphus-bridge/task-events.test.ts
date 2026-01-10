
import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { createMaestroSisyphusBridgeHook } from "./index";
import { maestroEventBus } from "../../events";
import type { PluginInput } from "@opencode-ai/plugin";

// Mock the event bus emit method
const mockEmit = mock((event: any) => {});
const originalEmit = maestroEventBus.emit;

describe("Maestro Sisyphus Bridge - Task Events", () => {
  let bridgeHook: ReturnType<typeof createMaestroSisyphusBridgeHook>;
  const mockCtx = { directory: "/tmp/test" } as PluginInput;

  beforeEach(() => {
    maestroEventBus.emit = mockEmit;
    mockEmit.mockClear();
    bridgeHook = createMaestroSisyphusBridgeHook(mockCtx);
  });

  afterEach(() => {
    maestroEventBus.emit = originalEmit;
  });

  it("should emit task:started when a task moves to in_progress", async () => {
    const hook = bridgeHook["tool.execute.after"];
    if (!hook) throw new Error("Hook not defined");

    // First call: Task is pending (initial state)
    await hook(
      { tool: "todowrite", sessionID: "test-session" },
      { 
        result: { 
          todos: [
            { id: "1", content: "Task 1", status: "pending" }
          ] 
        } 
      }
    );

    // 2. Update: in_progress
    await hook(
      { tool: "todowrite", sessionID: "test-session" },
      { 
        result: { 
          todos: [
            { id: "1", content: "Task 1", status: "in_progress" }
          ] 
        } 
      }
    );

    // Should emit task:started
    expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
      type: "task:started",
      payload: expect.objectContaining({
        taskId: "1",
        title: "Task 1",
        sessionId: "test-session"
      })
    }));
  });

  it("should emit task:completed when a task moves to completed", async () => {
    const hook = bridgeHook["tool.execute.after"];
    if (!hook) throw new Error("Hook not defined");

    // 1. Initial state: in_progress
    await hook(
      { tool: "todowrite", sessionID: "test-session" },
      { 
        result: { 
          todos: [
            { id: "1", content: "Task 1", status: "in_progress" }
          ] 
        } 
      }
    );
    
    // Clear previous emits
    mockEmit.mockClear();

    // 2. Update: completed
    await hook(
      { tool: "todowrite", sessionID: "test-session" },
      { 
        result: { 
          todos: [
            { id: "1", content: "Task 1", status: "completed" }
          ] 
        } 
      }
    );

    // Should emit task:completed
    expect(mockEmit).toHaveBeenCalledWith(expect.objectContaining({
      type: "task:completed",
      payload: expect.objectContaining({
        taskId: "1",
        title: "Task 1",
        sessionId: "test-session"
      })
    }));
  });

  it("should not emit events if status hasn't changed", async () => {
    const hook = bridgeHook["tool.execute.after"];
    if (!hook) throw new Error("Hook not defined");

    // 1. Initial state: in_progress
    await hook(
      { tool: "todowrite", sessionID: "test-session" },
      { 
        result: { 
          todos: [
            { id: "1", content: "Task 1", status: "in_progress" }
          ] 
        } 
      }
    );
    
    mockEmit.mockClear();

    // 2. Update: still in_progress
    await hook(
      { tool: "todowrite", sessionID: "test-session" },
      { 
        result: { 
          todos: [
            { id: "1", content: "Task 1", status: "in_progress" }
          ] 
        } 
      }
    );

    expect(mockEmit).not.toHaveBeenCalled();
  });
});
