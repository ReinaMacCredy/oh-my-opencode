import { readBoulderState } from "../../features/boulder-state";

export const createContextInjectionHook = () => {
  return async (
    messages: Array<{ role: string; content: string }>,
    context: { sessionId?: string; agentName?: string }
  ): Promise<Array<{ role: string; content: string }>> => {
    const isBackgroundSession = context.agentName?.toLowerCase().includes("background");
    if (isBackgroundSession) {
      return messages;
    }

    const boulderState = readBoulderState(process.cwd());
    const hasActiveWorkflow = boulderState?.active_plan;
    if (!hasActiveWorkflow) {
      return messages;
    }

    const maestroContextBlock = `

## Maestro Workflow Context

**Design Phase**: N/A
**TDD State**: N/A
**Plan Progress**: In progress

`;

    const messagesWithContext = [...messages];
    const systemMessageIndex = messagesWithContext.findIndex((m) => m.role === "system");
    const hasSystemMessage = systemMessageIndex !== -1;

    if (hasSystemMessage) {
      messagesWithContext[systemMessageIndex] = {
        ...messagesWithContext[systemMessageIndex],
        content: messagesWithContext[systemMessageIndex].content + maestroContextBlock,
      };
    } else {
      messagesWithContext.unshift({
        role: "system",
        content: maestroContextBlock.trim(),
      });
    }

    return messagesWithContext;
  };
};
