# TypeScript Style Guide

## Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| **Files** | `kebab-case.ts` | `tool-output-truncator.ts` |
| **Directories** | `kebab-case` | `background-agent/` |
| **Functions** | `camelCase` | `processFilePathForInjection` |
| **Variables** | `camelCase` | `sessionId`, `hookResult` |
| **Classes** | `PascalCase` | `BackgroundManager` |
| **Interfaces** | `PascalCase` | `RuleMetadata` |
| **Types** | `PascalCase` | `HookResponse` |
| **Constants** | `SCREAMING_SNAKE_CASE` | `DEFAULT_TARGET_MAX_TOKENS` |

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler"
  }
}
```

## Import Style

```typescript
// External packages first
import { z } from "zod";
import type { Plugin } from "@opencode-ai/plugin";

// Internal imports with relative paths
import { log } from "../shared/logger";
import type { HookContext } from "./types";
```

## Type Definitions

```typescript
// Use interface for data structures
interface BackgroundTask {
  id: string;
  status: "pending" | "running" | "completed";
  result?: unknown;
}

// Use type for unions/aliases
type TaskStatus = "pending" | "running" | "completed";
type HookResult = void | { block: boolean };
```

## Error Handling

### In Hooks (Critical)
```typescript
export function createMyHook(ctx: PluginContext) {
  return {
    async "tool.execute.before"(event: ToolEvent) {
      try {
        // Hook logic here
        return await processEvent(event);
      } catch (error) {
        // NEVER let errors bubble up - crashes the session
        log("error", "MyHook failed", { error });
        return undefined; // Safe fallback
      }
    }
  };
}
```

### In Tools
```typescript
export async function myTool(input: ToolInput): Promise<ToolResult> {
  try {
    const result = await performOperation(input);
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}
```

## Zod Schema Patterns

```typescript
// Tool input validation
const MyToolInputSchema = z.object({
  filePath: z.string().describe("Absolute path to file"),
  options: z.object({
    recursive: z.boolean().default(false),
    maxDepth: z.number().optional()
  }).optional()
});

type MyToolInput = z.infer<typeof MyToolInputSchema>;
```

## Factory Pattern for Hooks

```typescript
export function createMyHook(ctx: PluginContext) {
  // Private state
  const processedFiles = new Set<string>();
  
  return {
    name: "my-hook",
    
    async "tool.execute.before"(event: ToolEvent) {
      // Implementation
    },
    
    async "tool.execute.after"(event: ToolEvent) {
      // Implementation
    }
  };
}
```

## Async/Await Best Practices

```typescript
// Good: Parallel execution when independent
const [result1, result2] = await Promise.all([
  fetchData1(),
  fetchData2()
]);

// Good: Sequential when dependent
const data = await fetchData();
const processed = await processData(data);

// Avoid: Unnecessary sequential
// Bad:
const r1 = await fetch1();
const r2 = await fetch2(); // Could be parallel
```

## Context Window Awareness

```typescript
import { dynamicTruncate } from "../shared/dynamic-truncator";

// Always truncate large outputs
export async function myTool(input: Input): Promise<string> {
  const rawOutput = await fetchLargeData();
  
  // Keep 50% headroom for agent thinking
  return dynamicTruncate(rawOutput, {
    targetTokens: ctx.remainingTokens * 0.5,
    maxTokens: 50000
  });
}
```

## Logging

```typescript
import { log } from "../shared/logger";

// Debug logging (internal only)
log("debug", "Processing file", { path: filePath });

// Warning to user
console.warn("[oh-my-opencode] Config validation failed");

// Error logging
log("error", "Hook failed", { error, context });
```

## Testing Patterns

```typescript
import { describe, it, expect, spyOn, mock } from "bun:test";

describe("myFeature", () => {
  describe("#given valid input", () => {
    it("#then should return expected result", () => {
      const result = myFeature({ valid: true });
      expect(result).toBe(expected);
    });
  });
  
  describe("#given invalid input", () => {
    it("#then should handle gracefully", () => {
      const result = myFeature({ valid: false });
      expect(result).toBeUndefined();
    });
  });
});
```
