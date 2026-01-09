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

// Legacy types for backward compatibility (from deleted skill-mcp-manager and claude-code-mcp-loader)
export interface ClaudeCodeMcpServer {
  command?: string
  url?: string
  args?: string[]
  env?: Record<string, string>
  disabled?: boolean
}

export type SkillMcpConfig = Record<string, ClaudeCodeMcpServer>

export interface ClaudeCodeMcpConfig {
  mcpServers?: Record<string, ClaudeCodeMcpServer>
}

export interface McpServerConfig extends ClaudeCodeMcpServer {}
