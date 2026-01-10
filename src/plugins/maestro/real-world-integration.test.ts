import { describe, test, expect, beforeAll } from "bun:test";
import { readBoulderState, writeBoulderState } from "./features/boulder-state";
import { existsSync, mkdirSync, rmSync } from "fs";
import { join } from "path";

describe("Maestro Real-World Integration Tests", () => {
  const testDir = join(import.meta.dir, ".test-fixtures");
  const boulderPath = join(testDir, ".sisyphus");

  beforeAll(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(boulderPath, { recursive: true });
  });

  describe("Boulder State Operations", () => {
    test("should write and read boulder state", () => {
      // #given: Boulder state data
      const testState = {
        active_plan: join(testDir, "test-plan.md"),
        started_at: new Date().toISOString(),
        session_ids: ["ses_test_123"],
        plan_name: "test-plan",
      };

      // #when: Write then read boulder state
      writeBoulderState(testDir, testState);
      const readState = readBoulderState(testDir);

      // #then: State should match
      expect(readState).toBeDefined();
      expect(readState?.plan_name).toBe("test-plan");
      expect(readState?.session_ids).toContain("ses_test_123");
    });

    test("should return null for non-existent boulder state", () => {
      // #given: Non-existent directory
      const nonExistentDir = join(testDir, "non-existent");

      // #when: Read boulder state
      const state = readBoulderState(nonExistentDir);

      // #then: Should return null
      expect(state).toBeNull();
    });

    test("should update existing boulder state", () => {
      // #given: Existing boulder state
      const initialState = {
        active_plan: join(testDir, "plan.md"),
        started_at: new Date().toISOString(),
        session_ids: ["ses_1"],
        plan_name: "initial",
      };
      writeBoulderState(testDir, initialState);

      // #when: Update with new session
      const updatedState = {
        ...initialState,
        session_ids: ["ses_1", "ses_2"],
      };
      writeBoulderState(testDir, updatedState);
      const result = readBoulderState(testDir);

      // #then: Should have both sessions
      expect(result?.session_ids).toHaveLength(2);
      expect(result?.session_ids).toContain("ses_1");
      expect(result?.session_ids).toContain("ses_2");
    });
  });

  describe("Boulder State Schema Validation", () => {
    test("should handle all required fields", () => {
      // #given: Complete boulder state
      const completeState = {
        active_plan: join(testDir, "complete.md"),
        started_at: new Date().toISOString(),
        session_ids: ["ses_complete"],
        plan_name: "complete",
      };

      // #when: Write and read
      writeBoulderState(testDir, completeState);
      const result = readBoulderState(testDir);

      // #then: All fields should be present
      expect(result?.active_plan).toBe(completeState.active_plan);
      expect(result?.started_at).toBe(completeState.started_at);
      expect(result?.session_ids).toEqual(completeState.session_ids);
      expect(result?.plan_name).toBe(completeState.plan_name);
    });

    test("should preserve ISO timestamp format", () => {
      // #given: State with ISO timestamp
      const timestamp = new Date().toISOString();
      const state = {
        active_plan: join(testDir, "time.md"),
        started_at: timestamp,
        session_ids: ["ses_time"],
        plan_name: "time-test",
      };

      // #when: Write and read
      writeBoulderState(testDir, state);
      const result = readBoulderState(testDir);

      // #then: Timestamp should be preserved
      expect(result?.started_at).toBe(timestamp);
      expect(new Date(result?.started_at || "").toISOString()).toBe(timestamp);
    });
  });
});
