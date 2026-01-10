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
	| {
			type: "task:started";
			payload: {
				taskId: string;
				title: string;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "task:completed";
			payload: {
				taskId: string;
				title: string;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "tdd:phase-changed";
			payload: {
				phase: "red" | "green" | "refactor";
				sessionId: string;
				from?: "red" | "green" | "refactor";
				to?: "red" | "green" | "refactor";
			};
	  }
	| {
			type: "design:phase-changed";
			payload: {
				fromPhase: number;
				phase: number;
				sessionID: string;
				timestamp: number;
			};
	  }
	| {
			type: "workflow:started";
			payload: {
				sessionID: string;
				timestamp: number;
				totalTasks: number;
				completedTasks: number;
			};
	  }
	| {
			type: "workflow:completed";
			payload: {
				sessionID: string;
				timestamp: number;
				totalTasks: number;
				completedTasks: number;
			};
	  };
