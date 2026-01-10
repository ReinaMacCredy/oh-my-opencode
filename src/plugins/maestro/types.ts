/**
 * Hook signatures for Maestro-Sisyphus integration
 */
export interface MaestroHooks {
	/**
	 * Called when chat message is received
	 */
	"chat.message"?: (
		input: Record<string, unknown>,
		output: Record<string, unknown>,
	) => Promise<void>;

	/**
	 * Called before tool execution
	 */
	"tool.execute.before"?: (
		input: Record<string, unknown>,
		output: Record<string, unknown>,
	) => Promise<void>;

	/**
	 * Called after tool execution
	 */
	"tool.execute.after"?: (
		input: Record<string, unknown>,
		output: Record<string, unknown>,
	) => Promise<void>;

	/**
	 * Called to transform chat messages before sending to LLM
	 */
	"experimental.chat.messages.transform"?: (
		input: Record<string, never>,
		output: { messages: Array<{ info: unknown; parts: unknown[] }> },
	) => Promise<void>;
}

/**
 * Event types for Maestro event bus
 */
export type MaestroEvent =
	| { type: "plan:ready"; payload: { planPath: string; planName: string } }
	| { type: "task:started"; payload: { taskId: string; title: string } }
	| { type: "task:completed"; payload: { taskId: string; title: string } }
	| {
			type: "tdd:phase-changed";
			payload: { phase: "red" | "green" | "refactor"; sessionId: string };
	  }
	| { type: "design:phase-changed"; payload: { from: number; to: number } }
	| {
			type: "workflow:started";
			payload: { planPath: string; sessionId: string };
	  }
	| { type: "workflow:completed"; payload: { planPath: string } };
