import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { mergeSkillMcpsIntoConfig, getMergedConfigPath } from "./skill-merger"
import { existsSync, rmSync, mkdtempSync, readFileSync } from "fs"
import { join } from "path"
import { tmpdir } from "os"
import type { McpCliConfig, SkillMcpConfig } from "./types"

describe("skill MCP merger", () => {
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "skill-merger-test-"))
    originalCwd = process.cwd()
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
  })

  it("should merge skill MCP into base config", async () => {
    // #given - base config and skill MCP
    const baseConfig: McpCliConfig = {
      mcpServers: {
        "base-server": {
          command: "base-cmd",
        },
      },
    }

    const skillMcps: SkillMcpConfig = {
      "skill-server": {
        command: "skill-cmd",
        args: ["--skill"],
      },
    }

    // #when - merge skill MCPs
    const result = await mergeSkillMcpsIntoConfig(baseConfig, [
      { name: "test-skill", mcpConfig: skillMcps },
    ])

    // #then - both servers should be present
    expect(result.mcpServers["base-server"]).toBeDefined()
    expect(result.mcpServers["skill-server"]).toBeDefined()
    expect(result.mcpServers["skill-server"].command).toBe("skill-cmd")
  })

  it("should handle multiple skills with different MCPs", async () => {
    // #given - base config and multiple skills
    const baseConfig: McpCliConfig = {
      mcpServers: {
        "base-server": {
          command: "base-cmd",
        },
      },
    }

    const skill1Mcps: SkillMcpConfig = {
      "skill1-server": {
        command: "skill1-cmd",
      },
    }

    const skill2Mcps: SkillMcpConfig = {
      "skill2-server": {
        command: "skill2-cmd",
      },
    }

    // #when - merge multiple skills
    const result = await mergeSkillMcpsIntoConfig(baseConfig, [
      { name: "skill1", mcpConfig: skill1Mcps },
      { name: "skill2", mcpConfig: skill2Mcps },
    ])

    // #then - all servers should be present
    expect(result.mcpServers["base-server"]).toBeDefined()
    expect(result.mcpServers["skill1-server"]).toBeDefined()
    expect(result.mcpServers["skill2-server"]).toBeDefined()
  })

  it("should not override base config (additive behavior)", async () => {
    // #given - base and skill with same server name
    const baseConfig: McpCliConfig = {
      mcpServers: {
        "shared-server": {
          command: "base-cmd",
          args: ["--base"],
        },
      },
    }

    const skillMcps: SkillMcpConfig = {
      "shared-server": {
        command: "skill-cmd",
        args: ["--skill"],
      },
    }

    // #when - merge skill MCPs
    const result = await mergeSkillMcpsIntoConfig(baseConfig, [
      { name: "test-skill", mcpConfig: skillMcps },
    ])

    // #then - base config should win (not overridden)
    expect(result.mcpServers["shared-server"].command).toBe("base-cmd")
    expect(result.mcpServers["shared-server"].args).toEqual(["--base"])
  })

  it("should return path to merged config file", async () => {
    // #given - base config and skill
    const baseConfig: McpCliConfig = {
      mcpServers: {
        "base-server": {
          command: "base-cmd",
        },
      },
    }

    const skillMcps: SkillMcpConfig = {
      "skill-server": {
        command: "skill-cmd",
      },
    }

    // #when - merge and write config
    await mergeSkillMcpsIntoConfig(baseConfig, [
      { name: "test-skill", mcpConfig: skillMcps },
    ])

    const configPath = getMergedConfigPath()

    // #then - file should exist and contain merged config
    expect(configPath).toContain("mcp_servers.runtime.json")
    const writtenConfig = JSON.parse(readFileSync(configPath, "utf-8"))
    expect(writtenConfig.mcpServers["base-server"]).toBeDefined()
    expect(writtenConfig.mcpServers["skill-server"]).toBeDefined()
  })

  it("should handle empty skill MCP list", async () => {
    // #given - base config only
    const baseConfig: McpCliConfig = {
      mcpServers: {
        "base-server": {
          command: "base-cmd",
        },
      },
    }

    // #when - merge with no skills
    const result = await mergeSkillMcpsIntoConfig(baseConfig, [])

    // #then - only base config should remain
    expect(result.mcpServers["base-server"]).toBeDefined()
    expect(Object.keys(result.mcpServers)).toHaveLength(1)
  })

  it("should skip skills without mcpConfig", async () => {
    // #given - base config and skill without MCP
    const baseConfig: McpCliConfig = {
      mcpServers: {
        "base-server": {
          command: "base-cmd",
        },
      },
    }

    // #when - merge with skill that has no mcpConfig
    const result = await mergeSkillMcpsIntoConfig(baseConfig, [
      { name: "no-mcp-skill", mcpConfig: undefined },
    ])

    // #then - only base config should remain
    expect(result.mcpServers["base-server"]).toBeDefined()
    expect(Object.keys(result.mcpServers)).toHaveLength(1)
  })
})
