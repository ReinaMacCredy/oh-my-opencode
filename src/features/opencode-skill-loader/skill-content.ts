import { createBuiltinSkills } from "../builtin-skills/skills"

// Maestro skills that should auto-load maestro-core first
const MAESTRO_SKILLS = new Set([
	"designing",
	"conductor",
	"orchestrator",
	"tracking",
])

export function resolveSkillContent(skillName: string): string | null {
	const skills = createBuiltinSkills()
	const skill = skills.find((s) => s.name === skillName)
	
	if (!skill) return null
	
	// Auto-prepend maestro-core content for Maestro skills
	if (MAESTRO_SKILLS.has(skillName)) {
		const maestroCore = skills.find((s) => s.name === "maestro-core")
		if (maestroCore) {
			return `${maestroCore.template}\n\n---\n\n${skill.template}`
		}
	}
	
	return skill.template
}

export function resolveMultipleSkills(skillNames: string[]): {
	resolved: Map<string, string>
	notFound: string[]
} {
	const skills = createBuiltinSkills()
	const skillMap = new Map(skills.map((s) => [s.name, s.template]))

	const resolved = new Map<string, string>()
	const notFound: string[] = []
	
	// Check if any Maestro skill is requested - auto-include maestro-core
	const hasMaestroSkill = skillNames.some(name => MAESTRO_SKILLS.has(name))
	if (hasMaestroSkill && !skillNames.includes("maestro-core")) {
		const maestroCoreTemplate = skillMap.get("maestro-core")
		if (maestroCoreTemplate) {
			resolved.set("maestro-core", maestroCoreTemplate)
		}
	}

	for (const name of skillNames) {
		const template = skillMap.get(name)
		if (template) {
			resolved.set(name, template)
		} else {
			notFound.push(name)
		}
	}

	return { resolved, notFound }
}
