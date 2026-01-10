/**
 * Centralized ProxyPal model mappings
 * 
 * All ProxyPal model strings in ONE place.
 * This file will be the ONLY source of truth for ProxyPal models.
 * 
 * Future tasks will extract scattered model strings here.
 */

/**
 * ProxyPal provider identifier
 */
export const PROXYPAL_PROVIDER = "proxypal" as const;

export const PROXYPAL_AGENT_MODELS = {
	oracle: "proxypal/gpt-5.2-codex",
	"Momus (Plan Reviewer)": "proxypal/gpt-5.2-codex",
	"Metis (Plan Consultant)": "proxypal/gemini-claude-opus-4-5-thinking",
	librarian: "proxypal/gemini-claude-opus-4-5-thinking",
	explore: "proxypal/gemini-3-flash-preview",
	"frontend-ui-ux-engineer": "proxypal/gemini-3-pro-preview",
	"document-writer": "proxypal/gemini-3-flash-preview",
	"multimodal-looker": "proxypal/gemini-3-flash-preview",
	Sisyphus: "proxypal/gemini-claude-opus-4-5-thinking",
	"orchestrator-sisyphus": "proxypal/gemini-claude-sonnet-4-5-thinking",
	"Sisyphus-Junior": "proxypal/gemini-claude-sonnet-4-5-thinking",
} as const;

export const PROXYPAL_CATEGORY_MODELS = {
	"visual-engineering": "proxypal/gemini-3-pro-preview",
	ultrabrain: "proxypal/gpt-5.2-codex",
	artistry: "proxypal/gemini-3-pro-preview",
	quick: "proxypal/gemini-3-flash-preview",
	"most-capable": "proxypal/gemini-claude-opus-4-5-thinking",
	writing: "proxypal/gemini-3-flash-preview",
	general: "proxypal/gemini-claude-sonnet-4-5-thinking",
} as const;

export const GOOGLE_TO_PROXYPAL_MODEL_MAP: Record<string, string> = {
	"google/gemini-3-pro-preview": "proxypal/gemini-3-pro-preview",
	"google/gemini-3-flash-preview": "proxypal/gemini-3-flash-preview",
	"google/gemini-3-flash": "proxypal/gemini-3-flash-preview",
	"google/gemini-3-pro": "proxypal/gemini-3-pro-preview",
	"google/gemini-3-pro-high": "proxypal/gemini-3-pro-preview",
	"google/gemini-3-pro-low": "proxypal/gemini-3-pro-preview",
};

export function isProxyPalModel(model: string): boolean {
	return model.startsWith(`${PROXYPAL_PROVIDER}/`);
}

export function isProxyPalGptModel(model: string): boolean {
	return model.startsWith("proxypal/") && model.includes("gpt-");
}

export function getGptReasoningEffort(model: string): "medium" | "xhigh" {
	return isProxyPalGptModel(model) ? "xhigh" : "medium";
}
