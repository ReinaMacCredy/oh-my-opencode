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

/**
 * ProxyPal model identifiers (to be populated from scattered references)
 */
export const PROXYPAL_MODELS = {
	// Will be populated in Task 2
} as const;

/**
 * Type helper for ProxyPal model names
 */
export type ProxyPalModel = keyof typeof PROXYPAL_MODELS;

/**
 * Check if a model string is a ProxyPal model
 */
export function isProxyPalModel(model: string): boolean {
	return model.startsWith(`${PROXYPAL_PROVIDER}/`);
}
