import type { MaestroEvent } from "./types";
import { log } from "../../../shared/logger";

type EventHandler = (event: MaestroEvent) => void;

export class MaestroEventBus {
	private handlers: Set<EventHandler> = new Set();
	private onceHandlers: Map<EventHandler, EventHandler> = new Map();

	on(handler: EventHandler): void {
		this.handlers.add(handler);
	}

	once(handler: EventHandler): void {
		const wrappedHandler: EventHandler = (event) => {
			handler(event);
			this.handlers.delete(wrappedHandler);
			this.onceHandlers.delete(handler);
		};
		this.onceHandlers.set(handler, wrappedHandler);
		this.handlers.add(wrappedHandler);
	}

	off(handler: EventHandler): void {
		this.handlers.delete(handler);
		
		const wrappedHandler = this.onceHandlers.get(handler);
		if (wrappedHandler) {
			this.handlers.delete(wrappedHandler);
			this.onceHandlers.delete(handler);
		}
	}

	emit(event: MaestroEvent): void {
		for (const handler of this.handlers) {
			try {
				handler(event);
			} catch (error) {
				log("[maestro-event-bus] Handler error", { error, eventType: event.type });
			}
		}
	}
}

let instance: MaestroEventBus | null = null;

export const maestroEventBus = (() => {
	if (!instance) {
		instance = new MaestroEventBus();
	}
	return instance;
})();
