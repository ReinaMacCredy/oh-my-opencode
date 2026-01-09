import { describe, test, expect, afterEach } from "bun:test"
import * as fs from "fs"
import * as path from "path"
import {
  AGENT_NAME_MAP,
  HOOK_NAME_MAP,
  GOOGLE_TO_PROXYPAL_MODEL_MAP,
  migrateAgentNames,
  migrateHookNames,
  migrateConfigFile,
  migrateAgentConfigToCategory,
  shouldDeleteAgentConfig,
  migrateGoogleToProxypalModel,
  migrateModelsInConfig,
} from "./migration"

describe("migrateAgentNames", () => {
  test("migrates legacy OmO names to Sisyphus", () => {
    // #given: Config with legacy OmO agent names
    const agents = {
      omo: { model: "anthropic/claude-opus-4-5" },
      OmO: { temperature: 0.5 },
      "OmO-Plan": { prompt: "custom prompt" },
    }

    // #when: Migrate agent names
    const { migrated, changed } = migrateAgentNames(agents)

    // #then: Legacy names should be migrated to Sisyphus/Prometheus
    expect(changed).toBe(true)
    expect(migrated["Sisyphus"]).toEqual({ temperature: 0.5 })
    expect(migrated["Prometheus (Planner)"]).toEqual({ prompt: "custom prompt" })
    expect(migrated["omo"]).toBeUndefined()
    expect(migrated["OmO"]).toBeUndefined()
    expect(migrated["OmO-Plan"]).toBeUndefined()
  })

  test("preserves current agent names unchanged", () => {
    // #given: Config with current agent names
    const agents = {
      oracle: { model: "proxypal/gpt-5.2-codex" },
      librarian: { model: "google/gemini-3-flash" },
      explore: { model: "opencode/grok-code" },
    }

    // #when: Migrate agent names
    const { migrated, changed } = migrateAgentNames(agents)

    // #then: Current names should remain unchanged
    expect(changed).toBe(false)
    expect(migrated["oracle"]).toEqual({ model: "proxypal/gpt-5.2-codex" })
    expect(migrated["librarian"]).toEqual({ model: "google/gemini-3-flash" })
    expect(migrated["explore"]).toEqual({ model: "opencode/grok-code" })
  })

  test("handles case-insensitive migration", () => {
    // #given: Config with mixed case agent names
    const agents = {
      SISYPHUS: { model: "test" },
      "planner-sisyphus": { prompt: "test" },
    }

    // #when: Migrate agent names
    const { migrated, changed } = migrateAgentNames(agents)

    // #then: Case-insensitive lookup should migrate correctly
    expect(migrated["Sisyphus"]).toEqual({ model: "test" })
    expect(migrated["Prometheus (Planner)"]).toEqual({ prompt: "test" })
  })

  test("passes through unknown agent names unchanged", () => {
    // #given: Config with unknown agent name
    const agents = {
      "custom-agent": { model: "custom/model" },
    }

    // #when: Migrate agent names
    const { migrated, changed } = migrateAgentNames(agents)

    // #then: Unknown names should pass through
    expect(changed).toBe(false)
    expect(migrated["custom-agent"]).toEqual({ model: "custom/model" })
  })
})

describe("migrateHookNames", () => {
  test("migrates anthropic-auto-compact to anthropic-context-window-limit-recovery", () => {
    // #given: Config with legacy hook name
    const hooks = ["anthropic-auto-compact", "comment-checker"]

    // #when: Migrate hook names
    const { migrated, changed } = migrateHookNames(hooks)

    // #then: Legacy hook name should be migrated
    expect(changed).toBe(true)
    expect(migrated).toContain("anthropic-context-window-limit-recovery")
    expect(migrated).toContain("comment-checker")
    expect(migrated).not.toContain("anthropic-auto-compact")
  })

  test("preserves current hook names unchanged", () => {
    // #given: Config with current hook names
    const hooks = [
      "anthropic-context-window-limit-recovery",
      "todo-continuation-enforcer",
      "session-recovery",
    ]

    // #when: Migrate hook names
    const { migrated, changed } = migrateHookNames(hooks)

    // #then: Current names should remain unchanged
    expect(changed).toBe(false)
    expect(migrated).toEqual(hooks)
  })

  test("handles empty hooks array", () => {
    // #given: Empty hooks array
    const hooks: string[] = []

    // #when: Migrate hook names
    const { migrated, changed } = migrateHookNames(hooks)

    // #then: Should return empty array with no changes
    expect(changed).toBe(false)
    expect(migrated).toEqual([])
  })

  test("migrates multiple legacy hook names", () => {
    // #given: Multiple legacy hook names (if more are added in future)
    const hooks = ["anthropic-auto-compact"]

    // #when: Migrate hook names
    const { migrated, changed } = migrateHookNames(hooks)

    // #then: All legacy names should be migrated
    expect(changed).toBe(true)
    expect(migrated).toEqual(["anthropic-context-window-limit-recovery"])
  })
})

describe("migrateConfigFile", () => {
  const testConfigPath = "/tmp/nonexistent-path-for-test.json"

  test("migrates omo_agent to sisyphus_agent", () => {
    // #given: Config with legacy omo_agent key
    const rawConfig: Record<string, unknown> = {
      omo_agent: { disabled: false },
    }

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: omo_agent should be migrated to sisyphus_agent
    expect(needsWrite).toBe(true)
    expect(rawConfig.sisyphus_agent).toEqual({ disabled: false })
    expect(rawConfig.omo_agent).toBeUndefined()
  })

  test("migrates legacy agent names in agents object", () => {
    // #given: Config with legacy agent names
    const rawConfig: Record<string, unknown> = {
      agents: {
        omo: { model: "test" },
        OmO: { temperature: 0.5 },
      },
    }

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: Agent names should be migrated
    expect(needsWrite).toBe(true)
    const agents = rawConfig.agents as Record<string, unknown>
    expect(agents["Sisyphus"]).toBeDefined()
  })

  test("migrates legacy hook names in disabled_hooks", () => {
    // #given: Config with legacy hook names
    const rawConfig: Record<string, unknown> = {
      disabled_hooks: ["anthropic-auto-compact", "comment-checker"],
    }

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: Hook names should be migrated
    expect(needsWrite).toBe(true)
    expect(rawConfig.disabled_hooks).toContain("anthropic-context-window-limit-recovery")
    expect(rawConfig.disabled_hooks).not.toContain("anthropic-auto-compact")
  })

  test("does not write if no migration needed", () => {
    // #given: Config with current names
    const rawConfig: Record<string, unknown> = {
      sisyphus_agent: { disabled: false },
      agents: {
        Sisyphus: { model: "test" },
      },
      disabled_hooks: ["anthropic-context-window-limit-recovery"],
    }

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: No write should be needed
    expect(needsWrite).toBe(false)
  })

  test("handles migration of all legacy items together", () => {
    // #given: Config with all legacy items
    const rawConfig: Record<string, unknown> = {
      omo_agent: { disabled: false },
      agents: {
        omo: { model: "test" },
        "OmO-Plan": { prompt: "custom" },
      },
      disabled_hooks: ["anthropic-auto-compact"],
    }

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: All legacy items should be migrated
    expect(needsWrite).toBe(true)
    expect(rawConfig.sisyphus_agent).toEqual({ disabled: false })
    expect(rawConfig.omo_agent).toBeUndefined()
    const agents = rawConfig.agents as Record<string, unknown>
    expect(agents["Sisyphus"]).toBeDefined()
    expect(agents["Prometheus (Planner)"]).toBeDefined()
    expect(rawConfig.disabled_hooks).toContain("anthropic-context-window-limit-recovery")
  })
})

describe("migration maps", () => {
  test("AGENT_NAME_MAP contains all expected legacy mappings", () => {
    // #given/#when: Check AGENT_NAME_MAP
    // #then: Should contain all legacy → current mappings
    expect(AGENT_NAME_MAP["omo"]).toBe("Sisyphus")
    expect(AGENT_NAME_MAP["OmO"]).toBe("Sisyphus")
    expect(AGENT_NAME_MAP["OmO-Plan"]).toBe("Prometheus (Planner)")
    expect(AGENT_NAME_MAP["omo-plan"]).toBe("Prometheus (Planner)")
    expect(AGENT_NAME_MAP["Planner-Sisyphus"]).toBe("Prometheus (Planner)")
    expect(AGENT_NAME_MAP["plan-consultant"]).toBe("Metis (Plan Consultant)")
  })

  test("HOOK_NAME_MAP contains anthropic-auto-compact migration", () => {
    // #given/#when: Check HOOK_NAME_MAP
    // #then: Should contain be legacy hook name mapping
    expect(HOOK_NAME_MAP["anthropic-auto-compact"]).toBe("anthropic-context-window-limit-recovery")
  })
})

describe("migrateAgentConfigToCategory", () => {
  test("does not migrate proxypal models (installer-generated)", () => {
    // #given: Config with proxypal model (set by installer, should not be migrated)
    const config = {
      model: "proxypal/gemini-3-pro-preview",
      temperature: 0.5,
      top_p: 0.9,
    }

    // #when: Migrate agent config to category
    const { migrated, changed } = migrateAgentConfigToCategory(config)

    // #then: Config should remain unchanged (proxypal models not in migration map)
    expect(changed).toBe(false)
    expect(migrated).toEqual(config)
  })

  test("does not migrate when model is not in map", () => {
    // #given: Config with a model that has no mapping
    const config = {
      model: "custom/model",
      temperature: 0.5,
    }

    // #when: Migrate agent config to category
    const { migrated, changed } = migrateAgentConfigToCategory(config)

    // #then: Config should remain unchanged
    expect(changed).toBe(false)
    expect(migrated).toEqual(config)
  })

  test("does not migrate when model is not a string", () => {
    // #given: Config with non-string model
    const config = {
      model: { name: "test" },
      temperature: 0.5,
    }

    // #when: Migrate agent config to category
    const { migrated, changed } = migrateAgentConfigToCategory(config)

    // #then: Config should remain unchanged
    expect(changed).toBe(false)
    expect(migrated).toEqual(config)
  })

  test("proxypal models are not migrated to categories", () => {
    // #given: Configs with proxypal models (intentionally set by installer)
    const configs = [
      { model: "proxypal/gemini-3-pro-preview" },
      { model: "proxypal/gpt-5.2-codex" },
      { model: "proxypal/gemini-3-flash-preview" },
      { model: "proxypal/gemini-claude-opus-4-5-thinking" },
      { model: "proxypal/gemini-claude-sonnet-4-5-thinking" },
    ]

    // #when: Migrate each config
    const results = configs.map(migrateAgentConfigToCategory)

    // #then: None should be migrated (MODEL_TO_CATEGORY_MAP is empty to prevent backup loop)
    results.forEach((result, index) => {
      expect(result.changed).toBe(false)
      expect(result.migrated).toEqual(configs[index])
    })
  })

  test("preserves all fields when no migration needed", () => {
    // #given: Config with multiple fields and proxypal model
    const config = {
      model: "proxypal/gpt-5.2-codex",
      temperature: 0.1,
      top_p: 0.95,
      maxTokens: 4096,
      prompt_append: "custom instruction",
    }

    // #when: Migrate agent config to category
    const { migrated, changed } = migrateAgentConfigToCategory(config)

    // #then: All fields should be preserved unchanged
    expect(changed).toBe(false)
    expect(migrated).toEqual(config)
  })
})

describe("shouldDeleteAgentConfig", () => {
  test("returns true when config only has category field", () => {
    // #given: Config with only category field (no overrides)
    const config = { category: "visual-engineering" }

    // #when: Check if config should be deleted
    const shouldDelete = shouldDeleteAgentConfig(config, "visual-engineering")

    // #then: Should return true (matches category defaults)
    expect(shouldDelete).toBe(true)
  })

  test("returns false when category does not exist", () => {
    // #given: Config with unknown category
    const config = { category: "unknown" }

    // #when: Check if config should be deleted
    const shouldDelete = shouldDeleteAgentConfig(config, "unknown")

    // #then: Should return false (category not found)
    expect(shouldDelete).toBe(false)
  })

  test("returns true when all fields match category defaults", () => {
    // #given: Config with fields matching category defaults (proxypal model)
    const config = {
      category: "visual-engineering",
      model: "proxypal/gemini-3-pro-preview",
      temperature: 0.7,
    }

    // #when: Check if config should be deleted
    const shouldDelete = shouldDeleteAgentConfig(config, "visual-engineering")

    // #then: Should return true (all fields match defaults)
    expect(shouldDelete).toBe(true)
  })

  test("returns false when fields differ from category defaults", () => {
    // #given: Config with custom temperature override
    const config = {
      category: "visual-engineering",
      temperature: 0.9, // Different from default (0.7)
    }

    // #when: Check if config should be deleted
    const shouldDelete = shouldDeleteAgentConfig(config, "visual-engineering")

    // #then: Should return false (has custom override)
    expect(shouldDelete).toBe(false)
  })

  test("handles different categories with their defaults", () => {
    // #given: Configs for different categories
    const configs = [
      { category: "ultrabrain", temperature: 0.1 },
      { category: "quick", temperature: 0.3 },
      { category: "most-capable", temperature: 0.1 },
      { category: "general", temperature: 0.3 },
    ]

    // #when: Check each config
    const results = configs.map((config) => shouldDeleteAgentConfig(config, config.category as string))

    // #then: All should be true (all match defaults)
    results.forEach((result) => {
      expect(result).toBe(true)
    })
  })

  test("returns false when additional fields are present", () => {
    // #given: Config with extra fields
    const config = {
      category: "visual-engineering",
      temperature: 0.7,
      custom_field: "value", // Extra field not in defaults
    }

    // #when: Check if config should be deleted
    const shouldDelete = shouldDeleteAgentConfig(config, "visual-engineering")

    // #then: Should return false (has extra field)
    expect(shouldDelete).toBe(false)
  })

  test("handles complex config with multiple overrides", () => {
    // #given: Config with multiple custom overrides
    const config = {
      category: "visual-engineering",
      temperature: 0.5, // Different from default
      top_p: 0.8, // Different from default
      prompt_append: "custom prompt", // Custom field
    }

    // #when: Check if config should be deleted
    const shouldDelete = shouldDeleteAgentConfig(config, "visual-engineering")

    // #then: Should return false (has overrides)
    expect(shouldDelete).toBe(false)
  })
})

describe("migrateConfigFile with backup", () => {
  const cleanupPaths: string[] = []

  afterEach(() => {
    cleanupPaths.forEach((p) => {
      try {
        fs.unlinkSync(p)
      } catch {
      }
    })
  })

  test("creates backup file when agent name migration needed", () => {
    // #given: Config file with legacy agent name needing migration
    const testConfigPath = "/tmp/test-config-migration.json"
    const testConfigContent = globalThis.JSON.stringify({ agents: { omo: { model: "anthropic/claude-opus-4-5" } } }, null, 2)
    const rawConfig: Record<string, unknown> = {
      agents: {
        omo: { model: "anthropic/claude-opus-4-5" },
      },
    }

    fs.writeFileSync(testConfigPath, testConfigContent)
    cleanupPaths.push(testConfigPath)

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: Backup file should be created with timestamp
    expect(needsWrite).toBe(true)

    const dir = path.dirname(testConfigPath)
    const basename = path.basename(testConfigPath)
    const files = fs.readdirSync(dir)
    const backupFiles = files.filter((f) => f.startsWith(`${basename}.bak.`))
    expect(backupFiles.length).toBeGreaterThan(0)

    const backupFile = backupFiles[0]
    const backupPath = path.join(dir, backupFile)
    cleanupPaths.push(backupPath)

    expect(backupFile).toMatch(/test-config-migration\.json\.bak\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/)

    const backupContent = fs.readFileSync(backupPath, "utf-8")
    expect(backupContent).toBe(testConfigContent)
  })

  test("does not migrate proxypal models (prevents backup loop)", () => {
    // #given: Config with proxypal model (set by installer)
    const testConfigPath = "/tmp/test-config-proxypal.json"
    const rawConfig: Record<string, unknown> = {
      agents: {
        oracle: { model: "proxypal/gpt-5.2-codex" },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify(rawConfig, null, 2))
    cleanupPaths.push(testConfigPath)

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: No migration should occur (prevents backup file loop)
    expect(needsWrite).toBe(false)

    const dir = path.dirname(testConfigPath)
    const basename = path.basename(testConfigPath)
    const files = fs.readdirSync(dir)
    const backupFiles = files.filter((f) => f.startsWith(`${basename}.bak.`))
    expect(backupFiles.length).toBe(0)
  })

  test("does not write when no migration needed", () => {
    // #given: Config with no migrations needed
    const testConfigPath = "/tmp/test-config-no-migration.json"
    const rawConfig: Record<string, unknown> = {
      agents: {
        Sisyphus: { model: "test" },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify({ agents: { Sisyphus: { model: "test" } } }, null, 2))
    cleanupPaths.push(testConfigPath)

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: Should not write or create backup
    expect(needsWrite).toBe(false)

    const dir = path.dirname(testConfigPath)
    const basename = path.basename(testConfigPath)
    const files = fs.readdirSync(dir)
    const backupFiles = files.filter((f) => f.startsWith(`${basename}.bak.`))
    expect(backupFiles.length).toBe(0)
  })

  test("multiple proxypal agents do not trigger migration", () => {
    // #given: Config with multiple proxypal models (all set by installer)
    const testConfigPath = "/tmp/test-config-multi-agent.json"
    const rawConfig: Record<string, unknown> = {
      agents: {
        oracle: { model: "proxypal/gpt-5.2-codex" },
        librarian: { model: "proxypal/gemini-claude-sonnet-4-5-thinking" },
        frontend: {
          model: "proxypal/gemini-3-pro-preview",
          temperature: 0.9,
        },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify(rawConfig, null, 2))
    cleanupPaths.push(testConfigPath)

    // #when: Migrate config file
    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    // #then: No migration should occur
    expect(needsWrite).toBe(false)

    const dir = path.dirname(testConfigPath)
    const basename = path.basename(testConfigPath)
    const files = fs.readdirSync(dir)
    const backupFiles = files.filter((f) => f.startsWith(`${basename}.bak.`))
    expect(backupFiles.length).toBe(0)
  })
})

describe("GOOGLE_TO_PROXYPAL_MODEL_MAP", () => {
  test("contains all expected google/ to proxypal/ mappings", () => {
    expect(GOOGLE_TO_PROXYPAL_MODEL_MAP["google/gemini-3-pro-preview"]).toBe("proxypal/gemini-3-pro-preview")
    expect(GOOGLE_TO_PROXYPAL_MODEL_MAP["google/gemini-3-flash-preview"]).toBe("proxypal/gemini-3-flash-preview")
    expect(GOOGLE_TO_PROXYPAL_MODEL_MAP["google/gemini-3-flash"]).toBe("proxypal/gemini-3-flash-preview")
    expect(GOOGLE_TO_PROXYPAL_MODEL_MAP["google/gemini-3-pro"]).toBe("proxypal/gemini-3-pro-preview")
    expect(GOOGLE_TO_PROXYPAL_MODEL_MAP["google/gemini-3-pro-high"]).toBe("proxypal/gemini-3-pro-preview")
    expect(GOOGLE_TO_PROXYPAL_MODEL_MAP["google/gemini-3-pro-low"]).toBe("proxypal/gemini-3-pro-preview")
  })
})

describe("migrateGoogleToProxypalModel", () => {
  test("migrates google/gemini-3-pro-preview to proxypal/gemini-3-pro-preview", () => {
    const { migrated, changed } = migrateGoogleToProxypalModel("google/gemini-3-pro-preview")
    expect(changed).toBe(true)
    expect(migrated).toBe("proxypal/gemini-3-pro-preview")
  })

  test("migrates google/gemini-3-flash to proxypal/gemini-3-flash-preview", () => {
    const { migrated, changed } = migrateGoogleToProxypalModel("google/gemini-3-flash")
    expect(changed).toBe(true)
    expect(migrated).toBe("proxypal/gemini-3-flash-preview")
  })

  test("preserves proxypal/ models unchanged", () => {
    const { migrated, changed } = migrateGoogleToProxypalModel("proxypal/gemini-3-pro-preview")
    expect(changed).toBe(false)
    expect(migrated).toBe("proxypal/gemini-3-pro-preview")
  })

  test("preserves unknown google/ models unchanged", () => {
    const { migrated, changed } = migrateGoogleToProxypalModel("google/unknown-model")
    expect(changed).toBe(false)
    expect(migrated).toBe("google/unknown-model")
  })

  test("preserves non-google models unchanged", () => {
    const { migrated, changed } = migrateGoogleToProxypalModel("anthropic/claude-opus-4-5")
    expect(changed).toBe(false)
    expect(migrated).toBe("anthropic/claude-opus-4-5")
  })
})

describe("migrateModelsInConfig", () => {
  test("migrates model field in config object", () => {
    const config = {
      model: "google/gemini-3-pro-preview",
      temperature: 0.7,
    }

    const { migrated, changed } = migrateModelsInConfig(config)

    expect(changed).toBe(true)
    expect(migrated.model).toBe("proxypal/gemini-3-pro-preview")
    expect(migrated.temperature).toBe(0.7)
  })

  test("preserves config when model is already proxypal/", () => {
    const config = {
      model: "proxypal/gemini-3-pro-preview",
      temperature: 0.7,
    }

    const { migrated, changed } = migrateModelsInConfig(config)

    expect(changed).toBe(false)
    expect(migrated.model).toBe("proxypal/gemini-3-pro-preview")
  })

  test("preserves config when model is not a string", () => {
    const config = {
      temperature: 0.7,
    }

    const { migrated, changed } = migrateModelsInConfig(config)

    expect(changed).toBe(false)
    expect(migrated).toEqual(config)
  })
})

describe("migrateConfigFile with google/ models", () => {
  const cleanupPaths: string[] = []

  afterEach(() => {
    cleanupPaths.forEach((p) => {
      try {
        fs.unlinkSync(p)
      } catch {
      }
    })
  })

  test("migrates google/ models in agents to proxypal/", () => {
    const testConfigPath = "/tmp/test-config-google-model.json"
    const rawConfig: Record<string, unknown> = {
      agents: {
        "frontend-ui-ux-engineer": { model: "google/gemini-3-pro-preview", temperature: 0.9 },
        "document-writer": { model: "google/gemini-3-flash", temperature: 0.5 },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify(rawConfig, null, 2))
    cleanupPaths.push(testConfigPath)

    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    expect(needsWrite).toBe(true)

    const agents = rawConfig.agents as Record<string, Record<string, unknown>>
    expect(agents["frontend-ui-ux-engineer"].model).toBe("proxypal/gemini-3-pro-preview")
    expect(agents["frontend-ui-ux-engineer"].temperature).toBe(0.9)
    expect(agents["document-writer"].model).toBe("proxypal/gemini-3-flash-preview")
    expect(agents["document-writer"].temperature).toBe(0.5)

    const dir = path.dirname(testConfigPath)
    const basename = path.basename(testConfigPath)
    const files = fs.readdirSync(dir)
    const backupFiles = files.filter((f) => f.startsWith(`${basename}.bak.`))
    backupFiles.forEach((f) => cleanupPaths.push(path.join(dir, f)))
  })

  test("migrates google/ models in categories to proxypal/", () => {
    const testConfigPath = "/tmp/test-config-google-category.json"
    const rawConfig: Record<string, unknown> = {
      categories: {
        "visual-engineering": { model: "google/gemini-3-pro-preview", temperature: 0.7 },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify(rawConfig, null, 2))
    cleanupPaths.push(testConfigPath)

    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    expect(needsWrite).toBe(true)

    const categories = rawConfig.categories as Record<string, Record<string, unknown>>
    expect(categories["visual-engineering"].model).toBe("proxypal/gemini-3-pro-preview")
    expect(categories["visual-engineering"].temperature).toBe(0.7)

    const dir = path.dirname(testConfigPath)
    const basename = path.basename(testConfigPath)
    const files = fs.readdirSync(dir)
    const backupFiles = files.filter((f) => f.startsWith(`${basename}.bak.`))
    backupFiles.forEach((f) => cleanupPaths.push(path.join(dir, f)))
  })

  test("does not migrate unknown google/ models", () => {
    const testConfigPath = "/tmp/test-config-google-unknown.json"
    const rawConfig: Record<string, unknown> = {
      agents: {
        "custom-agent": { model: "google/unknown-model" },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify(rawConfig, null, 2))
    cleanupPaths.push(testConfigPath)

    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    expect(needsWrite).toBe(false)

    const agents = rawConfig.agents as Record<string, Record<string, unknown>>
    expect(agents["custom-agent"].model).toBe("google/unknown-model")
  })

  test("does not migrate proxypal models with custom settings", () => {
    const testConfigPath = "/tmp/test-config-proxypal.json"
    const rawConfig: Record<string, unknown> = {
      agents: {
        "custom-agent": { model: "proxypal/gemini-claude-opus-4-5-thinking", prompt_append: "custom prompt" },
      },
    }

    fs.writeFileSync(testConfigPath, globalThis.JSON.stringify(rawConfig, null, 2))
    cleanupPaths.push(testConfigPath)

    const needsWrite = migrateConfigFile(testConfigPath, rawConfig)

    expect(needsWrite).toBe(false)

    const agents = rawConfig.agents as Record<string, Record<string, unknown>>
    expect(agents["custom-agent"].model).toBe("proxypal/gemini-claude-opus-4-5-thinking")
    expect(agents["custom-agent"].prompt_append).toBe("custom prompt")
  })
})
