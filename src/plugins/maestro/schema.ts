import { z } from "zod";

export const maestroConfigSchema = z
	.object({
		enabled: z.boolean().optional().describe("Enable Maestro workflow features"),
		boulder_state_enabled: z.boolean().optional().describe("Enable boulder state management"),
		tdd_enforcement_enabled: z.boolean().optional().describe("Enable TDD enforcement"),
	})
	.strict()
	.partial();

export type MaestroConfig = z.infer<typeof maestroConfigSchema>;
