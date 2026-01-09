import type { SkillScope, LoadedSkill } from "../../features/opencode-skill-loader/types"

export interface SkillArgs {
  name: string
}

export interface SkillInfo {
  name: string
  description: string
  location?: string
  scope: SkillScope
  license?: string
  compatibility?: string
  metadata?: Record<string, string>
  allowedTools?: string[]
}

export interface SkillLoadOptions {
  opencodeOnly?: boolean
  skills?: LoadedSkill[]
}
