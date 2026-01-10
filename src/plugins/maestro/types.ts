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
	  }
	| {
			type: "sisyphus:delegated";
			payload: {
				agentType: string;
				taskDescription: string;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "sisyphus:continuing";
			payload: {
				reason: string;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "sisyphus:blocked";
			payload: {
				toolName: string;
				reason: string;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "sisyphus:verifying";
			payload: {
				checkType: string;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "boulder:progress";
			payload: {
				totalTasks: number;
				completedTasks: number;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "boulder:session-added";
			payload: {
				newSessionId: string;
				planPath: string;
				timestamp: number;
			};
	  }
	| {
			type: "boulder:completed";
			payload: {
				planPath: string;
				totalTasks: number;
				sessionId: string;
				timestamp: number;
			};
	  }
	| {
			type: "context:pressure";
			payload: {
				currentTokens: number;
				maxTokens: number;
				percentage: number;
				sessionId: string;
			};
	  }
	| {
			type: "context:pruned";
			payload: {
				prunedToolIds: string[];
				tokensSaved: number;
				sessionId: string;
				timestamp: number;
			};
	  };
