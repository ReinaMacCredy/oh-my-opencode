import type { AgentConfig } from "@opencode-ai/sdk"
import {
	isProxyPalGptModel as _isProxyPalGptModel,
	getGptReasoningEffort as _getGptReasoningEffort,
} from "../fork/proxypal/models"

export type AgentFactory = (model?: string) => AgentConfig

export type AgentCategory = "exploration" | "specialist" | "advisor" | "utility"

export type AgentCost = "FREE" | "CHEAP" | "EXPENSIVE"

export interface DelegationTrigger {
	domain: string
	trigger: string
}

export interface AgentPromptMetadata {
	category: AgentCategory
	cost: AgentCost
	triggers: DelegationTrigger[]
	useWhen?: string[]
	avoidWhen?: string[]
	dedicatedSection?: string
	promptAlias?: string
	keyTrigger?: string
}

export function isGptModel(model: string): boolean {
	return model.startsWith("openai/") || model.startsWith("github-copilot/gpt-") || model.includes("/gpt-")
}

export const isProxyPalGptModel = _isProxyPalGptModel
export const getGptReasoningEffort = _getGptReasoningEffort

export type BuiltinAgentName =
  | "Sisyphus"
  | "oracle"
  | "librarian"
  | "explore"
  | "frontend-ui-ux-engineer"
  | "document-writer"
  | "multimodal-looker"
  | "Metis (Plan Consultant)"
  | "Momus (Plan Reviewer)"
  | "orchestrator-sisyphus"

export type OverridableAgentName =
  | "build"
  | BuiltinAgentName

export type AgentName = BuiltinAgentName

export type AgentOverrideConfig = Partial<AgentConfig> & {
  prompt_append?: string
}

export type AgentOverrides = Partial<Record<OverridableAgentName, AgentOverrideConfig>>
