import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { loadMcpCliConfigs } from "./loader"
import type { McpCliConfig } from "./types"

describe("mcp_servers.json config loader", () => {
  let tempDir: string
  let originalCwd: string
  let originalHome: string | undefined

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "mcp-cli-loader-test-"))
    originalCwd = process.cwd()
    originalHome = process.env.HOME
    process.chdir(tempDir)
    process.env.HOME = tempDir
  })

  afterEach(() => {
    process.chdir(originalCwd)
    process.env.HOME = originalHome
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("should load config from .opencode/ first (highest priority)", async () => {
    // #given - config in .opencode/
    const opencodeDir = join(tempDir, ".opencode")
    mkdirSync(opencodeDir)
    const config: McpCliConfig = {
      mcpServers: {
        "test-server": {
          command: "test-cmd",
          args: ["--arg"],
        },
      },
    }
    writeFileSync(
      join(opencodeDir, "mcp_servers.json"),
      JSON.stringify(config)
    )

    // #when - load configs
    const result = await loadMcpCliConfigs()

    // #then - should load from .opencode/
    expect(result.servers["test-server"]).toBeDefined()
    expect(result.servers["test-server"].command).toBe("test-cmd")
    expect(result.loadedServers).toHaveLength(1)
    expect(result.loadedServers[0].scope).toBe("opencode")
  })

  it("should fall back to ./ then .claude/ when .opencode/ not found", async () => {
    // #given - config in project root
    const projectConfig: McpCliConfig = {
      mcpServers: {
        "project-server": {
          command: "project-cmd",
        },
      },
    }
    writeFileSync(
      join(tempDir, "mcp_servers.json"),
      JSON.stringify(projectConfig)
    )

    // #when - load configs
    const result = await loadMcpCliConfigs()

    // #then - should load from project root
    expect(result.servers["project-server"]).toBeDefined()
    expect(result.loadedServers[0].scope).toBe("project")
  })

  it("should merge configs with later overriding earlier", async () => {
    // #given - configs in multiple locations
    const claudeDir = join(tempDir, ".claude")
    mkdirSync(claudeDir)
    writeFileSync(
      join(claudeDir, "mcp_servers.json"),
      JSON.stringify({
        mcpServers: {
          shared: { command: "claude-cmd" },
          "claude-only": { command: "claude-cmd" },
        },
      })
    )

    writeFileSync(
      join(tempDir, "mcp_servers.json"),
      JSON.stringify({
        mcpServers: {
          shared: { command: "project-cmd" },
          "project-only": { command: "project-cmd" },
        },
      })
    )

    // #when - load configs
    const result = await loadMcpCliConfigs()

    // #then - project should override claude
    expect(result.servers.shared.command).toBe("project-cmd")
    expect(result.servers["claude-only"].command).toBe("claude-cmd")
    expect(result.servers["project-only"].command).toBe("project-cmd")
  })

  it("should expand ${ENV_VAR} syntax in config", async () => {
    // #given - config with env var
    process.env.TEST_VAR = "test-value"
    const config: McpCliConfig = {
      mcpServers: {
        "env-server": {
          command: "${TEST_VAR}/bin/server",
          env: {
            API_KEY: "${TEST_VAR}",
          },
        },
      },
    }
    writeFileSync(
      join(tempDir, "mcp_servers.json"),
      JSON.stringify(config)
    )

    // #when - load configs
    const result = await loadMcpCliConfigs()

    // #then - env vars should be expanded
    expect(result.servers["env-server"].command).toBe("test-value/bin/server")
    expect(result.servers["env-server"].env?.API_KEY).toBe("test-value")
  })

  it("should return empty config if no files exist", async () => {
    // #given - no config files

    // #when - load configs
    const result = await loadMcpCliConfigs()

    // #then - should return empty
    expect(Object.keys(result.servers)).toHaveLength(0)
    expect(result.loadedServers).toHaveLength(0)
  })

  it("should skip disabled servers", async () => {
    // #given - config with disabled server
    const config: McpCliConfig = {
      mcpServers: {
        enabled: { command: "enabled-cmd" },
        disabled: { command: "disabled-cmd", disabled: true },
      },
    }
    writeFileSync(
      join(tempDir, "mcp_servers.json"),
      JSON.stringify(config)
    )

    // #when - load configs
    const result = await loadMcpCliConfigs()

    // #then - disabled server should not be loaded
    expect(result.servers.enabled).toBeDefined()
    expect(result.servers.disabled).toBeUndefined()
    expect(result.loadedServers).toHaveLength(1)
  })
})
