import { describe, it, expect, spyOn, beforeEach, afterEach } from "bun:test"
import { checkMcpCli } from "./mcp-cli"
import { CHECK_IDS } from "../constants"
import type { CheckResult } from "../types"

describe("mcp-cli doctor check", () => {
  let whichSpy: ReturnType<typeof spyOn>

  beforeEach(() => {
    whichSpy = spyOn(Bun, "which")
  })

  afterEach(() => {
    whichSpy.mockRestore()
  })

  it("should return pass when mcp-cli binary exists", async () => {
    // #given - mcp-cli is installed
    whichSpy.mockReturnValue("/usr/local/bin/mcp-cli")

    // #when - check is executed
    const result: CheckResult = await checkMcpCli()

    // #then - should pass
    expect(result.status).toBe("pass")
    expect(result.message).toContain("mcp-cli")
    expect(result.message).toContain("installed")
  })

  it("should return fail when mcp-cli binary is missing", async () => {
    // #given - mcp-cli is NOT installed
    whichSpy.mockReturnValue(null)

    // #when - check is executed
    const result: CheckResult = await checkMcpCli()

    // #then - should fail with installation instructions
    expect(result.status).toBe("fail")
    expect(result.message).toContain("not found")
    expect(result.details).toBeDefined()
    expect(result.details?.some((d) => d.includes("install"))).toBe(true)
  })

  it("should include installation instructions in failure details", async () => {
    // #given - mcp-cli is missing
    whichSpy.mockReturnValue(null)

    // #when - check is executed
    const result: CheckResult = await checkMcpCli()

    // #then - details should contain actionable instructions
    expect(result.details).toBeDefined()
    const details = result.details?.join(" ") || ""
    expect(details).toContain("bun install")
    expect(details).toContain("https://github.com/philschmid/mcp-cli")
  })
})
