import type { CheckResult, CheckDefinition } from "../types"
import { CHECK_IDS, CHECK_NAMES } from "../constants"

export async function checkMcpCli(): Promise<CheckResult> {
  const mcpCliPath = Bun.which("mcp-cli")

  if (!mcpCliPath) {
    return {
      name: CHECK_NAMES[CHECK_IDS.MCP_CLI],
      status: "fail",
      message: "mcp-cli not found",
      details: [
        "Install mcp-cli to use CLI-based MCP server management:",
        "  bun install -g @philschmid/mcp-cli",
        "",
        "For more information:",
        "  https://github.com/philschmid/mcp-cli",
      ],
    }
  }

  return {
    name: CHECK_NAMES[CHECK_IDS.MCP_CLI],
    status: "pass",
    message: `mcp-cli installed at ${mcpCliPath}`,
  }
}

export function getMcpCliCheckDefinition(): CheckDefinition {
  return {
    id: CHECK_IDS.MCP_CLI,
    name: CHECK_NAMES[CHECK_IDS.MCP_CLI],
    category: "tools",
    check: checkMcpCli,
    critical: false,
  }
}
