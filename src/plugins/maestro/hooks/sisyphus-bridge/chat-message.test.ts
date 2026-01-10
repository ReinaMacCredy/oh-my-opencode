import { describe, it, expect, beforeEach, mock } from "bun:test";
import { maestroEventBus } from "../../events";
import type { MaestroEvent } from "../../types";
import { existsSync, mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";

describe("Maestro Sisyphus Bridge - chat.message hook", () => {
	const testDir = join(import.meta.dir, ".test-temp");
	const plansDir = join(testDir, ".sisyphus", "plans");

	beforeEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
		mkdirSync(plansDir, { recursive: true });
	});

	// given
	it("should emit plan:ready event when plan is announced", async () => {
		// given
		let receivedEvent: MaestroEvent | undefined;
		maestroEventBus.once((event) => {
			if (event.type === "plan:ready") {
				receivedEvent = event;
			}
		});

		const planPath = join(plansDir, "test-plan.md");
		writeFileSync(planPath, "# Test Plan\n- [ ] Task 1");

		// Dynamic import to ensure event listener is set up first
		const { createMaestroSisyphusBridgeHook } = await import("./index");

		const mockCtx = {
			directory: testDir,
			client: {} as never,
		} as never;

		const hooks = createMaestroSisyphusBridgeHook(mockCtx, {});

		// when
		await hooks["chat.message"]?.({
			sessionID: "test-session",
		} as never, {
			messages: [],
		} as never);

		// then
		expect(receivedEvent).toBeDefined();
		expect(receivedEvent!.type).toBe("plan:ready");
		if (receivedEvent?.type === "plan:ready") {
			expect(receivedEvent.payload.planName).toBe("test-plan");
			expect(receivedEvent.payload.planPath).toContain("test-plan.md");
		}
	});
});
