# Development Workflow

## TDD Workflow (Default)

This project follows Test-Driven Development for all feature work.

### The Cycle

```
1. RED    → Write failing test
2. GREEN  → Write minimal code to pass
3. REFACTOR → Clean up, tests stay green
4. VERIFY → Run full test suite
```

### Commands

```bash
# Run all tests
bun test

# Run specific test file
bun test src/hooks/my-hook.test.ts

# Run with watch mode
bun test --watch

# Type check
bun run typecheck
```

## Pre-Implementation Checklist

Before writing any code:

- [ ] Define success criteria (what "working" means)
- [ ] Identify affected files and modules
- [ ] Check for existing patterns in similar code
- [ ] Write test cases FIRST

## Implementation Flow

### 1. Spec Phase
Define what "working" means:
- Functional: What specific behavior must work?
- Observable: What can be measured/seen?
- Pass/Fail: Binary criteria, no ambiguity

### 2. Test Phase (RED)
```typescript
describe("myFeature", () => {
  it("#given condition #when action #then result", () => {
    // Arrange
    const input = setupTestData();
    
    // Act
    const result = myFeature(input);
    
    // Assert
    expect(result).toBe(expected);
  });
});
```

### 3. Implementation Phase (GREEN)
- Write minimal code to pass the test
- Don't over-engineer
- Keep the test green

### 4. Refactor Phase
- Clean up code structure
- Extract utilities if needed
- Tests MUST stay green

### 5. Verification Phase
```bash
# Full test suite
bun test

# Type check
bun run typecheck

# Build to verify no errors
bun run build
```

## Commit Guidelines

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code restructuring
- `test`: Adding/updating tests
- `docs`: Documentation
- `chore`: Maintenance

### Scope Examples
- `hooks`: Hook-related changes
- `tools`: Tool implementations
- `agents`: Agent definitions
- `cli`: CLI changes
- `auth`: Authentication

## Branch Strategy

- `master`: Stable releases
- `dev`: Development integration
- `feature/*`: Feature branches
- `fix/*`: Bug fix branches

## Quality Gates

Before merging:

1. **All tests pass**: `bun test` exits 0
2. **Type check passes**: `bun run typecheck` exits 0
3. **Build succeeds**: `bun run build` exits 0
4. **No regressions**: Existing functionality works

## Hook Development Pattern

When adding new hooks:

1. Create directory: `src/hooks/my-hook/`
2. Create main file: `src/hooks/my-hook/index.ts`
3. Create test file: `src/hooks/my-hook/my-hook.test.ts`
4. Follow factory pattern: `createMyHook(ctx)`
5. Wrap in try/catch for safety
6. Register in plugin entry point

## Tool Development Pattern

When adding new tools:

1. Define Zod schema for inputs
2. Implement tool handler
3. Add error handling
4. Write integration tests
5. Register with tool manager
