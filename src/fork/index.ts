import type { OhMyOpenCodeConfig } from "../config";
import type { ForkConfig } from "./schema-extensions";
import { PROXYPAL_AGENT_MODELS, PROXYPAL_CATEGORY_MODELS } from "./proxypal/models";

export * from "./proxypal/models";
export * from "./proxypal/apply";
export * from "./schema-extensions";

type ConfigWithFork = OhMyOpenCodeConfig & ForkConfig;

export function initFork(config: ConfigWithFork): ConfigWithFork {
	const proxypalMode = config.proxypal_mode ?? false;
	
	if (!proxypalMode) {
		return config;
	}
	
	config.agents = config.agents || {};
	config.categories = config.categories || {};
	
	Object.assign(config.agents, {
		"Sisyphus": { ...config.agents["Sisyphus"], model: PROXYPAL_AGENT_MODELS.Sisyphus },
		"librarian": { ...config.agents["librarian"], model: PROXYPAL_AGENT_MODELS.librarian },
		"explore": { ...config.agents["explore"], model: PROXYPAL_AGENT_MODELS.explore },
		"frontend-ui-ux-engineer": { ...config.agents["frontend-ui-ux-engineer"], model: PROXYPAL_AGENT_MODELS["frontend-ui-ux-engineer"] },
		"document-writer": { ...config.agents["document-writer"], model: PROXYPAL_AGENT_MODELS["document-writer"] },
		"multimodal-looker": { ...config.agents["multimodal-looker"], model: PROXYPAL_AGENT_MODELS["multimodal-looker"] },
		"orchestrator-sisyphus": { ...config.agents["orchestrator-sisyphus"], model: PROXYPAL_AGENT_MODELS["orchestrator-sisyphus"] },
		"Prometheus (Planner)": { ...config.agents["Prometheus (Planner)"], model: PROXYPAL_AGENT_MODELS.Sisyphus },
		"Metis (Plan Consultant)": { ...config.agents["Metis (Plan Consultant)"], model: PROXYPAL_AGENT_MODELS.Sisyphus },
		"oracle": { ...config.agents["oracle"], model: PROXYPAL_AGENT_MODELS.oracle },
		"Momus (Plan Reviewer)": { ...config.agents["Momus (Plan Reviewer)"], model: PROXYPAL_AGENT_MODELS["Momus (Plan Reviewer)"] },
	});
	
	Object.assign(config.categories, {
		"visual-engineering": { model: PROXYPAL_CATEGORY_MODELS["visual-engineering"] },
		"ultrabrain": { model: PROXYPAL_CATEGORY_MODELS.ultrabrain },
		"artistry": { model: PROXYPAL_CATEGORY_MODELS.artistry },
		"quick": { model: PROXYPAL_CATEGORY_MODELS.quick },
		"most-capable": { model: PROXYPAL_CATEGORY_MODELS["most-capable"] },
		"writing": { model: PROXYPAL_CATEGORY_MODELS.writing },
		"general": { model: PROXYPAL_CATEGORY_MODELS.general },
	});
	
	return config;
}
