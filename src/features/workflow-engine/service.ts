import { MaestroEngine } from "./engines/maestro-engine"
import type { WorkflowEngineContract_v1 } from "./contracts/v1"

let engineInstance: MaestroEngine | null = null

export function getWorkflowEngine(): WorkflowEngineContract_v1 {
	if (!engineInstance) {
		engineInstance = new MaestroEngine()
	}
	return engineInstance
}

export async function resetWorkflowEngine(): Promise<void> {
	if (engineInstance) {
		await engineInstance.shutdown()
		engineInstance = null
	}
}

export { MaestroEngine } from "./engines/maestro-engine"
export { SisyphusAdapter } from "./adapters/sisyphus"
export { MaestroAdapter } from "./adapters/maestro"
