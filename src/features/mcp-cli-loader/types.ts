export type McpCliScope = "opencode" | "project" | "claude"

export interface McpCliServerConfig {
  command: string
  args?: string[]
  env?: Record<string, string>
  disabled?: boolean
}

export interface McpCliConfig {
  mcpServers: Record<string, McpCliServerConfig>
}

export interface LoadedMcpCliServer {
  name: string
  scope: McpCliScope
  config: McpCliServerConfig
}

export interface McpCliLoadResult {
  servers: Record<string, McpCliServerConfig>
  loadedServers: LoadedMcpCliServer[]
}
