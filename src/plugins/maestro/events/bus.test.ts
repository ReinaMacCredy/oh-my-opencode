import { describe, it, expect, beforeEach } from "bun:test";
import { maestroEventBus, MaestroEventBus } from "./bus";
import type { MaestroEvent } from "../types";

describe("MaestroEventBus", () => {
	let bus: MaestroEventBus;

	beforeEach(() => {
		bus = new MaestroEventBus();
	});

	// given
	it("should emit and receive events", () => {
		// given
		let received: MaestroEvent | undefined;
		const handler = (event: MaestroEvent) => {
			received = event;
		};

		// when
		bus.on(handler);
		bus.emit({ type: "plan:ready", payload: { planPath: "/test.md", planName: "test" } });

		// then
		expect(received).toBeDefined();
		expect(received!.type).toBe("plan:ready");
	});

	// given
	it("should support once listeners", () => {
		// given
		let callCount = 0;
		const handler = () => {
			callCount++;
		};

		// when
		bus.once(handler);
		bus.emit({ type: "plan:ready", payload: { planPath: "/test.md", planName: "test" } });
		bus.emit({ type: "plan:ready", payload: { planPath: "/test.md", planName: "test" } });

		// then
		expect(callCount).toBe(1);
	});

	// given
	it("should remove listeners with off", () => {
		// given
		let received = false;
		const handler = () => {
			received = true;
		};

		// when
		bus.on(handler);
		bus.off(handler);
		bus.emit({ type: "plan:ready", payload: { planPath: "/test.md", planName: "test" } });

		// then
		expect(received).toBe(false);
	});

	// given
	it("should not crash if handler throws error", () => {
		// given
		const errorHandler = () => {
			throw new Error("Test error");
		};
		let successfulHandler = false;
		const okHandler = () => {
			successfulHandler = true;
		};

		// when
		bus.on(errorHandler);
		bus.on(okHandler);
		
		// then - should not throw
		expect(() => {
			bus.emit({ type: "plan:ready", payload: { planPath: "/test.md", planName: "test" } });
		}).not.toThrow();
		
		expect(successfulHandler).toBe(true);
	});
});

describe("maestroEventBus singleton", () => {
	// given
	it("should be a singleton instance", () => {
		// when
		const bus1 = maestroEventBus;
		const bus2 = maestroEventBus;

		// then
		expect(bus1).toBe(bus2);
	});
});
