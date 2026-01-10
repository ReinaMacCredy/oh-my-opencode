import { z } from "zod";

export const tddGatesConfigSchema = z
	.object({
		requireFailingTest: z.boolean().optional().describe("Require failing test before implementation"),
		requirePassingTest: z.boolean().optional().describe("Require passing test after implementation"),
		runFullSuiteAfterRefactor: z.boolean().optional().describe("Run full test suite after refactoring"),
	})
	.strict()
	.partial();

export const maestroConfigSchema = z
	.object({
		enabled: z.boolean().optional().describe("Enable Maestro workflow features"),
		boulder_state_enabled: z.boolean().optional().describe("Enable boulder state management"),
		tdd_enforcement_enabled: z.boolean().optional().describe("Enable TDD enforcement"),
		auto_execute: z.boolean().optional().describe("Auto-execute Sisyphus on plan ready"),
		tdd_gates: tddGatesConfigSchema.optional().describe("TDD gate configuration"),
	})
	.strict()
	.partial();

export type TddGatesConfig = z.infer<typeof tddGatesConfigSchema>;
export type MaestroConfig = z.infer<typeof maestroConfigSchema>;

