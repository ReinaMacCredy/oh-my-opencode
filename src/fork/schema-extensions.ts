/**
 * Fork-specific schema extensions
 * 
 * Defines additional configuration fields specific to this fork.
 * Keeps fork schema separate from upstream src/config/schema.ts
 */

import { z } from "zod";

/**
 * ProxyPal mode field
 * Simple boolean to enable/disable ProxyPal models
 */
export const proxypalModeSchema = z
	.boolean()
	.optional()
	.describe("Enable ProxyPal models for all agents (fork-specific)");

/**
 * Fork-specific config extensions
 * These fields are added to the main config schema
 */
export const forkConfigSchema = z
	.object({
		proxypal_mode: proxypalModeSchema,
	})
	.strict()
	.partial();

/**
 * Type for fork configuration
 */
export type ForkConfig = z.infer<typeof forkConfigSchema>;
