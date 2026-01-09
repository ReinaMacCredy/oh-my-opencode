import type { McpCliConfig } from "./types"

function getBuiltinMcpDefinitions() {
  return {
    context7: {
      command: "https://mcp.context7.com/mcp",
    },
    websearch: {
      command: "https://mcp.exa.ai/mcp?tools=web_search_exa",
      env: process.env.EXA_API_KEY
        ? { "x-api-key": process.env.EXA_API_KEY }
        : undefined,
    },
    grep_app: {
      command: "https://mcp.grep.app",
    },
  }
}

export function getBuiltinMcpCliConfig(
  disabledMcps: string[] = []
): McpCliConfig {
  const mcpServers: McpCliConfig["mcpServers"] = {}
  const builtinMcps = getBuiltinMcpDefinitions()

  for (const [name, config] of Object.entries(builtinMcps)) {
    if (!disabledMcps.includes(name)) {
      mcpServers[name] = config
    }
  }

  return { mcpServers }
}
