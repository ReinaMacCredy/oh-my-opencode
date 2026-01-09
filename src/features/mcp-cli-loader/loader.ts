import { existsSync } from "node:fs"
import { join } from "node:path"
import { expandEnvVarsInObject } from "../../shared/env-expander"
import type {
  McpCliConfig,
  McpCliLoadResult,
  McpCliScope,
  LoadedMcpCliServer,
} from "./types"

interface McpCliConfigPath {
  path: string
  scope: McpCliScope
}

function getMcpCliConfigPaths(): McpCliConfigPath[] {
  const cwd = process.cwd()

  return [
    { path: join(cwd, ".claude", "mcp_servers.json"), scope: "claude" },
    { path: join(cwd, "mcp_servers.json"), scope: "project" },
    { path: join(cwd, ".opencode", "mcp_servers.json"), scope: "opencode" },
  ]
}

async function loadMcpCliConfigFile(
  filePath: string
): Promise<McpCliConfig | null> {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = await Bun.file(filePath).text()
    return JSON.parse(content) as McpCliConfig
  } catch {
    return null
  }
}

export async function loadMcpCliConfigs(): Promise<McpCliLoadResult> {
  const servers: McpCliLoadResult["servers"] = {}
  const loadedServers: LoadedMcpCliServer[] = []
  const paths = getMcpCliConfigPaths()

  for (const { path, scope } of paths) {
    const config = await loadMcpCliConfigFile(path)
    if (!config?.mcpServers) continue

    for (const [name, serverConfig] of Object.entries(config.mcpServers)) {
      if (serverConfig.disabled) {
        continue
      }

      const expanded = expandEnvVarsInObject(serverConfig)
      servers[name] = expanded

      const existingIndex = loadedServers.findIndex((s) => s.name === name)
      if (existingIndex !== -1) {
        loadedServers.splice(existingIndex, 1)
      }

      loadedServers.push({ name, scope, config: expanded })
    }
  }

  return { servers, loadedServers }
}
