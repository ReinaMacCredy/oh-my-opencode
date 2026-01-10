import type { MaestroEvent } from "../../../../types"

type EventHandler = (event: MaestroEvent) => void

export class MockMaestroEventBus {
  private handlers: Set<EventHandler> = new Set()
  private onceHandlers: Map<EventHandler, EventHandler> = new Map()
  public emittedEvents: MaestroEvent[] = []

  on(handler: EventHandler): void {
    this.handlers.add(handler)
  }

  once(handler: EventHandler): void {
    const wrappedHandler: EventHandler = (event) => {
      handler(event)
      this.handlers.delete(wrappedHandler)
      this.onceHandlers.delete(handler)
    }
    this.onceHandlers.set(handler, wrappedHandler)
    this.handlers.add(wrappedHandler)
  }

  off(handler: EventHandler): void {
    this.handlers.delete(handler)

    const wrappedHandler = this.onceHandlers.get(handler)
    if (wrappedHandler) {
      this.handlers.delete(wrappedHandler)
      this.onceHandlers.delete(handler)
    }
  }

  emit(event: MaestroEvent): void {
    this.emittedEvents.push(event)
    for (const handler of this.handlers) {
      try {
        handler(event)
      } catch {
      }
    }
  }

  reset(): void {
    this.handlers.clear()
    this.onceHandlers.clear()
    this.emittedEvents = []
  }
}

export function createMockEventBus(): MockMaestroEventBus {
  return new MockMaestroEventBus()
}
