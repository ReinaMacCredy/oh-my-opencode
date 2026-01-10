import type { MaestroEventBus } from "../../events"
import type { MaestroHooks } from "../../types"

const BOULDER_CONTINUATION_PROMPT = "[SYSTEM REMINDER - BOULDER CONTINUATION]"
const ORCHESTRATOR_DELEGATION_REQUIRED = "[CRITICAL SYSTEM DIRECTIVE - DELEGATION REQUIRED]"
const VERIFICATION_REMINDER = "**MANDATORY VERIFICATION - SUBAGENTS LIE**"

function isSisyphusTask(toolName: string): boolean {
	return toolName === "sisyphus_task" || toolName === "call_omo_agent"
}

function hasBoulderContinuation(content: string): boolean {
	return content.includes(BOULDER_CONTINUATION_PROMPT)
}

function hasOrchestrationBlock(content: string): boolean {
	return content.includes(ORCHESTRATOR_DELEGATION_REQUIRED)
}

function hasVerificationReminder(content: string): boolean {
	return content.includes(VERIFICATION_REMINDER)
}

function extractAgentType(args: any): string {
	return args?.category || args?.agent || "unknown"
}

function extractTaskDescription(args: any): string {
	return args?.description || args?.prompt || ""
}

export function createEventRelay(eventBus: MaestroEventBus): MaestroHooks {
	return {
		"tool.execute.after": async (input, output) => {
			const toolName = (input as any).tool
			const sessionId = (input as any).sessionID
			const args = (input as any).args
			const messages = (output as any).messages || []

			if (isSisyphusTask(toolName) && args) {
				eventBus.emit({
					type: "sisyphus:delegated",
					payload: {
						agentType: extractAgentType(args),
						taskDescription: extractTaskDescription(args),
						sessionId,
						timestamp: Date.now(),
					},
				})
			}

			for (const message of messages) {
				const content = message?.content || ""

				if (hasBoulderContinuation(content)) {
					eventBus.emit({
						type: "sisyphus:continuing",
						payload: {
							reason: "boulder-continuation",
							sessionId,
							timestamp: Date.now(),
						},
					})
				}

				if (hasOrchestrationBlock(content)) {
					eventBus.emit({
						type: "sisyphus:blocked",
						payload: {
							toolName,
							reason: "orchestrator-delegation-required",
							sessionId,
							timestamp: Date.now(),
						},
					})
				}

				if (hasVerificationReminder(content)) {
					eventBus.emit({
						type: "sisyphus:verifying",
						payload: {
							checkType: "mandatory-verification",
							sessionId,
							timestamp: Date.now(),
						},
					})
				}
			}
		},
	}
}
