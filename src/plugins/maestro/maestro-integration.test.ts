import { describe, test, expect } from "bun:test";
import { createMaestroPlugin } from "./index";
import type { PluginInput } from "@opencode-ai/plugin";
import type { MaestroConfig } from "./schema";

describe("Maestro Plugin Integration Tests", () => {
  // #given: Mock PluginInput context
  const mockContext: Partial<PluginInput> = {
    directory: "/test/project",
    client: {} as any,
  };

  describe("Plugin Creation", () => {
    test("should create plugin with default enabled state", () => {
      // #given: No maestro config provided
      const config: MaestroConfig | undefined = undefined;

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Plugin should be created with hooks
      expect(plugin).toBeDefined();
      expect(Object.keys(plugin).length).toBeGreaterThan(0);
    });

    test("should create plugin when explicitly enabled", () => {
      // #given: Maestro config with enabled: true
      const config: MaestroConfig = {
        enabled: true,
      };

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Plugin should have hooks
      expect(plugin).toBeDefined();
      expect(Object.keys(plugin).length).toBeGreaterThan(0);
    });

    test("should return empty object when disabled", () => {
      // #given: Maestro config with enabled: false
      const config: MaestroConfig = {
        enabled: false,
      };

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Plugin should be empty
      expect(plugin).toEqual({});
      expect(Object.keys(plugin).length).toBe(0);
    });
  });

  describe("Hook Integration", () => {
    test("should merge bridge and TDD hooks", () => {
      // #given: Default config
      const config: MaestroConfig = { enabled: true };

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Should have hooks from both bridge and TDD enforcement
      expect(plugin).toBeDefined();
      
      // Check for expected hook properties
      const hookKeys = Object.keys(plugin);
      expect(hookKeys.length).toBeGreaterThan(0);
    });
  });

  describe("Boulder State Integration", () => {
    test("should export boulder state functions", async () => {
      // #given: Import boulder state module
      const { readBoulderState, writeBoulderState } = await import("./features/boulder-state");

      // #then: Functions should be exported
      expect(readBoulderState).toBeDefined();
      expect(writeBoulderState).toBeDefined();
      expect(typeof readBoulderState).toBe("function");
      expect(typeof writeBoulderState).toBe("function");
    });
  });

  describe("TDD Gates Configuration", () => {
    test("should accept TDD gates config", () => {
      // #given: Config with TDD gates
      const config: MaestroConfig = {
        enabled: true,
        tddGates: {
          requireFailingTest: true,
          requirePassingTest: true,
          runFullSuiteAfterRefactor: true,
        },
      };

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Plugin should be created without errors
      expect(plugin).toBeDefined();
    });

    test("should work without TDD gates config", () => {
      // #given: Config without TDD gates
      const config: MaestroConfig = {
        enabled: true,
      };

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Plugin should still work
      expect(plugin).toBeDefined();
    });
  });

  describe("Auto Execute Configuration", () => {
    test("should accept autoExecute config", () => {
      // #given: Config with autoExecute
      const config: MaestroConfig = {
        enabled: true,
        autoExecute: true,
      };

      // #when: Create plugin
      const plugin = createMaestroPlugin(mockContext as PluginInput, config);

      // #then: Plugin should be created
      expect(plugin).toBeDefined();
    });
  });
});
