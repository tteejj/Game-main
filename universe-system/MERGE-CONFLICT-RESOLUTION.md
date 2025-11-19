# Merge Conflict Resolution Guide

## Summary

The merge conflict occurs in `universe-system/package.json` when merging this branch into `claude/copy-the-g-018gCnhpK1CU3rCLWE45pSFw`.

## Conflict Details

**Location**: `universe-system/package.json` lines 11-18

**Conflicting Section**:
```json
<<<<<<< HEAD (copy-the-g branch)
    "test:coverage": "jest --coverage"
=======
    "test:coverage": "jest --coverage",
    "example:integrated": "ts-node examples/fully-integrated-test.ts",
    "example:live": "ts-node examples/epic-universe-live.ts"
>>>>>>> claude/space-universe-framework-013sVBxaXiUvK9CeTsh964jq
```

## Resolution

**Keep BOTH sets of scripts** - the jest test scripts from the base branch AND the example scripts from our branch.

**Resolved package.json scripts section**:
```json
{
  "scripts": {
    "build": "tsc",
    "demo": "ts-node src/examples.ts",
    "demo:full": "ts-node --transpile-only demo-runner.ts",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "example:integrated": "ts-node examples/fully-integrated-test.ts",
    "example:live": "ts-node examples/epic-universe-live.ts"
  }
}
```

**Resolved package.json devDependencies section**:
```json
{
  "devDependencies": {
    "@types/jest": "^30.0.0",
    "@types/node": "^20.19.25",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.5",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

## How to Resolve Manually

If you encounter this conflict when merging:

1. **Open** `universe-system/package.json`

2. **Replace** the conflicted section (lines 11-19) with:
```json
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "example:integrated": "ts-node examples/fully-integrated-test.ts",
    "example:live": "ts-node examples/epic-universe-live.ts"
```

3. **Ensure** devDependencies includes all jest packages:
```json
    "@types/jest": "^30.0.0",
    "jest": "^30.2.0",
    "ts-jest": "^29.4.5",
```

4. **Mark resolved**:
```bash
git add universe-system/package.json
git commit -m "Merge: Resolve package.json conflict"
```

## Why This Conflict Exists

- **Base branch (`copy-the-g`)** added jest test infrastructure with test scripts
- **Our branch** added example runner scripts for the living universe demos
- Both modified the same `scripts` section in `package.json`
- Git cannot auto-merge because both add scripts after the existing ones

## Solution Rationale

**Keeping both** is correct because:
- ✅ Jest tests are needed for testing the codebase
- ✅ Example scripts are needed to demonstrate the living universe
- ✅ They don't conflict - they serve different purposes
- ✅ All scripts can coexist

## After Resolution

Once resolved, you'll have access to:

**Jest Tests**:
```bash
npm test              # Run all tests
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

**Living Universe Examples**:
```bash
npm run example:integrated  # Simple integration test
npm run example:live        # Epic 60-second live demo with dashboard
```

**Build & Demo**:
```bash
npm run build      # Build TypeScript
npm run demo       # Run basic demo
npm run demo:full  # Run full demo
```

## Verification

After merging, verify the resolution:

```bash
# Check package.json is valid
cat universe-system/package.json | jq .

# Verify all scripts are present
npm run  # Shows all available scripts
```

Expected output should show all 8 scripts:
- build
- demo
- demo:full
- test
- test:watch
- test:coverage
- example:integrated
- example:live
