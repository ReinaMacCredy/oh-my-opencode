import { describe, it, expect } from "bun:test"
import { readFileSync } from "node:fs"
import { join } from "node:path"

describe("agent prompts contain mcp-cli instructions", () => {
  it("should include mcp-cli usage in sisyphus prompt", () => {
    const sisyphusPath = join(__dirname, "sisyphus.ts")
    const content = readFileSync(sisyphusPath, "utf-8")

    expect(content).toContain("mcp-cli")
    expect(content).toContain("List all servers")
    expect(content).toContain("Show server tools")
    expect(content).toContain("Call tool with arguments")
  })

  it("should include mcp-cli usage in orchestrator-sisyphus prompt", () => {
    const orchestratorPath = join(__dirname, "orchestrator-sisyphus.ts")
    const content = readFileSync(orchestratorPath, "utf-8")

    expect(content).toContain("mcp-cli")
    expect(content).toContain("List all servers")
  })

  it("should include practical mcp-cli examples", () => {
    const sisyphusPath = join(__dirname, "sisyphus.ts")
    const content = readFileSync(sisyphusPath, "utf-8")

    expect(content).toContain("context7/query-docs")
    expect(content).toContain("libraryId")
  })
})
