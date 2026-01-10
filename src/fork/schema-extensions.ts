/**
 * Fork-specific schema extensions
 * 
 * Defines additional configuration fields specific to this fork.
 * Keeps fork schema separate from upstream src/config/schema.ts
 */

import { z } from "zod";

/**
 * ProxyPal configuration schema
 * 
 * Will be merged into main config schema in Task 5
 */
export const proxypalConfigSchema = z
	.object({
		enabled: z.boolean().default(true).describe("Enable ProxyPal model overrides"),
	})
	.strict()
	.optional();

/**
 * Fork-specific config extensions
 * 
 * Add any additional fork-specific config fields here
 */
export const forkConfigSchema = z
	.object({
		proxypal: proxypalConfigSchema,
	})
	.strict()
	.partial();

/**
 * Type for fork configuration
 */
export type ForkConfig = z.infer<typeof forkConfigSchema>;
