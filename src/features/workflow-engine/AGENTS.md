# WORKFLOW ENGINE KNOWLEDGE BASE

## OVERVIEW

Abstraction layer for structured development workflows. Provides a common interface (`WorkflowEngineContract_v1`) for workflow engines, with adapters for Sisyphus and Maestro methodologies.

## STRUCTURE

```
workflow-engine/
├── contracts/v1/
│   ├── types.ts              # Shared types: WorkflowState, PhaseConfig, ValidationResult
│   ├── engine.contract.ts    # WorkflowEngineContract_v1 interface
│   ├── contract.test.ts      # 55 comprehensive tests
│   └── index.ts              # Barrel exports
├── adapters/
│   ├── sisyphus/index.ts     # SisyphusAdapter - wraps boulder-state
│   ├── maestro/index.ts      # MaestroAdapter - design phases, TDD
│   └── index.ts
├── engines/
│   ├── maestro-engine.ts     # MaestroEngine - layered plugin
│   └── index.ts
├── service.ts                # Singleton access to workflow engine
└── index.ts                  # Barrel exports
```

## CONTRACTS

### WorkflowEngineContract_v1

Core interface for workflow engines:

```typescript
interface WorkflowEngineContract_v1 {
  // State management
  getState(): WorkflowState
  setState(state: Partial<WorkflowState>): void
  
  // Phase management
  getCurrentPhase(): PhaseConfig | null
  transitionTo(phase: string): ValidationResult
  
  // Validation
  validate(): ValidationResult
  canTransitionTo(phase: string): boolean
}
```

### Key Types

| Type | Purpose |
|------|---------|
| `WorkflowState` | Current workflow state (phase, metadata, history) |
| `PhaseConfig` | Configuration for a workflow phase |
| `ValidationResult` | Result of validation (success, errors, warnings) |
| `TransitionRule` | Rules for phase transitions |

## ADAPTERS

### SisyphusAdapter

Wraps existing boulder-state functionality for compatibility:
- Preserves existing Sisyphus workflow behavior
- Implements WorkflowEngineContract_v1

### MaestroAdapter

Implements Maestro design and implementation methodology:
- 10-phase Double Diamond pipeline
- TDD (RED-GREEN-REFACTOR) gates
- Parallel execution support

## ENGINES

### MaestroEngine

Layered plugin combining both adapters:
- Uses SisyphusAdapter for base workflow
- Uses MaestroAdapter for Maestro-specific phases
- Provides unified interface for skill implementations

## TESTING

55 contract tests covering:
- State management
- Phase transitions
- Validation logic
- Error handling

Run tests:
```bash
npm test -- --testPathPattern="contract.test"
```

## WHERE TO LOOK

| Task | Location |
|------|----------|
| Add new phase type | `contracts/v1/types.ts` |
| Modify contract interface | `contracts/v1/engine.contract.ts` |
| Add adapter | `adapters/` (create new directory) |
| Modify engine behavior | `engines/maestro-engine.ts` |
| Access workflow singleton | `service.ts` |

## ANTI-PATTERNS

- Modifying contracts without updating tests
- Breaking contract interface (use versioning: v2, v3, etc.)
- Bypassing adapters for direct state access
- Creating adapter without contract compliance tests
