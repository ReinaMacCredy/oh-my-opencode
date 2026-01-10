import * as fs from "fs"
import { log } from "./logger"
import { GOOGLE_TO_PROXYPAL_MODEL_MAP as _GOOGLE_TO_PROXYPAL_MODEL_MAP } from "../fork/proxypal/models"

export const AGENT_NAME_MAP: Record<string, string> = {
	omo: "Sisyphus",
	"OmO": "Sisyphus",
	sisyphus: "Sisyphus",
	"OmO-Plan": "Prometheus (Planner)",
	"omo-plan": "Prometheus (Planner)",
	"Planner-Sisyphus": "Prometheus (Planner)",
	"planner-sisyphus": "Prometheus (Planner)",
	prometheus: "Prometheus (Planner)",
	"plan-consultant": "Metis (Plan Consultant)",
	metis: "Metis (Plan Consultant)",
	build: "build",
	oracle: "oracle",
	librarian: "librarian",
	explore: "explore",
	"frontend-ui-ux-engineer": "frontend-ui-ux-engineer",
	"document-writer": "document-writer",
	"multimodal-looker": "multimodal-looker",
}

export const HOOK_NAME_MAP: Record<string, string> = {
	"anthropic-auto-compact": "anthropic-context-window-limit-recovery",
}

export const GOOGLE_TO_PROXYPAL_MODEL_MAP = _GOOGLE_TO_PROXYPAL_MODEL_MAP

/**
 * LEGACY model to category mapping - only for deprecated models needing migration.
 * WARNING: Do NOT add installer-generated models (proxypal/*) - causes backup loop.
 */
export const MODEL_TO_CATEGORY_MAP: Record<string, string> = {}

export function migrateGoogleToProxypalModel(model: string): { migrated: string; changed: boolean } {
  const proxypalModel = GOOGLE_TO_PROXYPAL_MODEL_MAP[model]
  if (proxypalModel) {
    return { migrated: proxypalModel, changed: true }
  }
  return { migrated: model, changed: false }
}

export function migrateModelsInConfig(config: Record<string, unknown>): { migrated: Record<string, unknown>; changed: boolean } {
  let changed = false
  const migrated = { ...config }

  if (typeof migrated.model === "string") {
    const { migrated: newModel, changed: modelChanged } = migrateGoogleToProxypalModel(migrated.model)
    if (modelChanged) {
      migrated.model = newModel
      changed = true
    }
  }

  return { migrated, changed }
}

export function migrateAgentNames(agents: Record<string, unknown>): { migrated: Record<string, unknown>; changed: boolean } {
  const migrated: Record<string, unknown> = {}
  let changed = false

  for (const [key, value] of Object.entries(agents)) {
    const newKey = AGENT_NAME_MAP[key.toLowerCase()] ?? AGENT_NAME_MAP[key] ?? key
    if (newKey !== key) {
      changed = true
    }
    migrated[newKey] = value
  }

  return { migrated, changed }
}

export function migrateHookNames(hooks: string[]): { migrated: string[]; changed: boolean } {
  const migrated: string[] = []
  let changed = false

  for (const hook of hooks) {
    const newHook = HOOK_NAME_MAP[hook] ?? hook
    if (newHook !== hook) {
      changed = true
    }
    migrated.push(newHook)
  }

  return { migrated, changed }
}

export function migrateAgentConfigToCategory(config: Record<string, unknown>): {
  migrated: Record<string, unknown>
  changed: boolean
} {
  const { model, ...rest } = config
  if (typeof model !== "string") {
    return { migrated: config, changed: false }
  }

  const category = MODEL_TO_CATEGORY_MAP[model]
  if (!category) {
    return { migrated: config, changed: false }
  }

  return {
    migrated: { category, ...rest },
    changed: true,
  }
}

export function shouldDeleteAgentConfig(
  config: Record<string, unknown>,
  category: string
): boolean {
  const { DEFAULT_CATEGORIES } = require("../tools/sisyphus-task/constants")
  const defaults = DEFAULT_CATEGORIES[category]
  if (!defaults) return false

  const keys = Object.keys(config).filter((k) => k !== "category")
  if (keys.length === 0) return true

  for (const key of keys) {
    if (config[key] !== (defaults as Record<string, unknown>)[key]) {
      return false
    }
  }
  return true
}

export function migrateConfigFile(configPath: string, rawConfig: Record<string, unknown>): boolean {
  let needsWrite = false

  if (rawConfig.agents && typeof rawConfig.agents === "object") {
    const { migrated, changed } = migrateAgentNames(rawConfig.agents as Record<string, unknown>)
    if (changed) {
      rawConfig.agents = migrated
      needsWrite = true
    }
  }

  if (rawConfig.agents && typeof rawConfig.agents === "object") {
    const agents = rawConfig.agents as Record<string, Record<string, unknown>>
    for (const [name, config] of Object.entries(agents)) {
      const { migrated, changed } = migrateModelsInConfig(config)
      if (changed) {
        agents[name] = migrated
        needsWrite = true
      }
    }
  }

  if (rawConfig.categories && typeof rawConfig.categories === "object") {
    const categories = rawConfig.categories as Record<string, Record<string, unknown>>
    for (const [name, config] of Object.entries(categories)) {
      const { migrated, changed } = migrateModelsInConfig(config)
      if (changed) {
        categories[name] = migrated
        needsWrite = true
      }
    }
  }

  if (rawConfig.agents && typeof rawConfig.agents === "object") {
    const agents = rawConfig.agents as Record<string, Record<string, unknown>>
    for (const [name, config] of Object.entries(agents)) {
      const { migrated, changed } = migrateAgentConfigToCategory(config)
      if (changed) {
        const category = migrated.category as string
        if (shouldDeleteAgentConfig(migrated, category)) {
          delete agents[name]
        } else {
          agents[name] = migrated
        }
        needsWrite = true
      }
    }
  }

  if (rawConfig.omo_agent) {
    rawConfig.sisyphus_agent = rawConfig.omo_agent
    delete rawConfig.omo_agent
    needsWrite = true
  }

  if (rawConfig.disabled_hooks && Array.isArray(rawConfig.disabled_hooks)) {
    const { migrated, changed } = migrateHookNames(rawConfig.disabled_hooks as string[])
    if (changed) {
      rawConfig.disabled_hooks = migrated
      needsWrite = true
    }
  }

  if (needsWrite) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
      const backupPath = `${configPath}.bak.${timestamp}`
      fs.copyFileSync(configPath, backupPath)

      fs.writeFileSync(configPath, JSON.stringify(rawConfig, null, 2) + "\n", "utf-8")
      log(`Migrated config file: ${configPath} (backup: ${backupPath})`)
    } catch (err) {
      log(`Failed to write migrated config to ${configPath}:`, err)
    }
  }

  return needsWrite
}
