import { writeFileSync, mkdirSync, existsSync } from "node:fs"
import { join } from "node:path"
import type {
  McpCliConfig,
  McpCliServerConfig,
  SkillMcpConfig,
  ClaudeCodeMcpServer,
} from "./types"

interface SkillWithMcp {
  name: string
  mcpConfig: SkillMcpConfig | undefined
}

let mergedConfigPath: string | null = null

function convertClaudeCodeMcpToMcpCli(
  claudeServer: ClaudeCodeMcpServer
): McpCliServerConfig {
  return {
    command: claudeServer.command || claudeServer.url || "",
    args: claudeServer.args,
    env: claudeServer.env,
    disabled: claudeServer.disabled,
  }
}

export async function mergeSkillMcpsIntoConfig(
  baseConfig: McpCliConfig,
  skills: SkillWithMcp[]
): Promise<McpCliConfig> {
  const merged: McpCliConfig = {
    mcpServers: { ...baseConfig.mcpServers },
  }

  for (const skill of skills) {
    if (!skill.mcpConfig) continue

    for (const [serverName, serverConfig] of Object.entries(skill.mcpConfig)) {
      if (merged.mcpServers[serverName]) {
        continue
      }

      merged.mcpServers[serverName] = convertClaudeCodeMcpToMcpCli(serverConfig)
    }
  }

  const cwd = process.cwd()
  const opencodeDir = join(cwd, ".opencode")
  mergedConfigPath = join(opencodeDir, "mcp_servers.runtime.json")

  try {
    if (!existsSync(opencodeDir)) {
      mkdirSync(opencodeDir, { recursive: true })
    }
    writeFileSync(mergedConfigPath, JSON.stringify(merged, null, 2))
  } catch {
  }

  return merged
}

export function getMergedConfigPath(): string {
  if (!mergedConfigPath) {
    const cwd = process.cwd()
    return join(cwd, ".opencode", "mcp_servers.runtime.json")
  }
  return mergedConfigPath
}
