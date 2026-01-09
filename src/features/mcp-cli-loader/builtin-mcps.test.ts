import { describe, it, expect, beforeEach, afterEach } from "bun:test"
import { getBuiltinMcpCliConfig } from "./builtin-mcps"

describe("built-in MCPs", () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it("should return all 3 built-in MCPs by default", () => {
    // #given - no disabled MCPs

    // #when - get built-in config
    const config = getBuiltinMcpCliConfig()

    // #then - all 3 should be present
    expect(config.mcpServers.context7).toBeDefined()
    expect(config.mcpServers.websearch).toBeDefined()
    expect(config.mcpServers.grep_app).toBeDefined()
    expect(Object.keys(config.mcpServers)).toHaveLength(3)
  })

  it("should respect disabled_mcps config", () => {
    // #given - websearch disabled

    // #when - get built-in config with disabled list
    const config = getBuiltinMcpCliConfig(["websearch"])

    // #then - websearch should not be present
    expect(config.mcpServers.context7).toBeDefined()
    expect(config.mcpServers.grep_app).toBeDefined()
    expect(config.mcpServers.websearch).toBeUndefined()
    expect(Object.keys(config.mcpServers)).toHaveLength(2)
  })

  it("should expand EXA_API_KEY for websearch when present", () => {
    // #given - EXA_API_KEY set
    process.env.EXA_API_KEY = "test-key-123"

    // #when - get built-in config
    const config = getBuiltinMcpCliConfig()

    // #then - websearch should have env with API key
    expect(config.mcpServers.websearch.env).toBeDefined()
    expect(config.mcpServers.websearch.env?.["x-api-key"]).toBe("test-key-123")
  })

  it("should omit env for websearch when EXA_API_KEY not set", () => {
    // #given - EXA_API_KEY not set
    delete process.env.EXA_API_KEY

    // #when - get built-in config
    const config = getBuiltinMcpCliConfig()

    // #then - websearch should not have env
    expect(config.mcpServers.websearch.env).toBeUndefined()
  })

  it("should use correct URLs for all MCPs", () => {
    // #given - default state

    // #when - get built-in config
    const config = getBuiltinMcpCliConfig()

    // #then - URLs should match spec
    expect(config.mcpServers.context7.command).toBe(
      "https://mcp.context7.com/mcp"
    )
    expect(config.mcpServers.websearch.command).toBe(
      "https://mcp.exa.ai/mcp?tools=web_search_exa"
    )
    expect(config.mcpServers.grep_app.command).toBe("https://mcp.grep.app")
  })

  it("should handle multiple disabled MCPs", () => {
    // #given - multiple MCPs disabled

    // #when - get built-in config
    const config = getBuiltinMcpCliConfig(["context7", "grep_app"])

    // #then - only websearch should remain
    expect(config.mcpServers.websearch).toBeDefined()
    expect(config.mcpServers.context7).toBeUndefined()
    expect(config.mcpServers.grep_app).toBeUndefined()
    expect(Object.keys(config.mcpServers)).toHaveLength(1)
  })

  it("should return empty config when all MCPs disabled", () => {
    // #given - all MCPs disabled

    // #when - get built-in config
    const config = getBuiltinMcpCliConfig(["context7", "websearch", "grep_app"])

    // #then - no MCPs should be present
    expect(Object.keys(config.mcpServers)).toHaveLength(0)
  })
})
