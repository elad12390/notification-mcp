# Agent Guidelines — notification-mcp

## What This Is

An MCP server that sends spoken audio notifications using AI TTS voices (Kokoro, F5-TTS, macOS say). When an AI finishes a task, it calls `notify` to speak a message aloud.

## Tech Stack

- **Runtime:** Node.js 18+ (ESM)
- **Language:** TypeScript 5.x (strict mode)
- **MCP SDK:** `@modelcontextprotocol/sdk`
- **Validation:** `zod`
- **Testing:** `vitest` (unit + integration) + `@cucumber/cucumber` (BDD)
- **TTS:** Kokoro via `uv run`, F5-TTS via `uv run`, macOS `say`

## Commands

```bash
npm run build          # Compile TypeScript to dist/
npm run dev            # Dev with hot reload
npm test               # Unit + integration tests (vitest)
npm run test:unit      # Unit tests only
npm run test:integration  # Integration tests (includes real TTS on macOS)
npm run test:coverage  # Tests with coverage report
npm run bdd            # BDD scenarios (Cucumber, no real TTS)
npm run bdd:say        # BDD + macOS say tests
npm run bdd:full       # BDD + all TTS engines
npm run test:all       # vitest + BDD combined
```

## Development Methodology: Bulletproof (IDD + BDD)

This project follows the **Bulletproof** methodology. You MUST follow this workflow.

### The Rule

**Behavior before code. RED before GREEN. Intent drives tests. Tests verify code.**

### The Loop

Every change — bug fix, feature, refactor — follows:

```
INTENT → RED → GREEN → REFACTOR
```

1. **INTENT** — Update `.idd/modules/{module}/INTENT.md` with the expected behavior
2. **RED** — Write a failing test (Gherkin scenario or vitest) that captures the behavior
3. **GREEN** — Write the minimal code to make the test pass
4. **REFACTOR** — Clean up, tests still green

### What This Means For You

- **Do NOT open source files to investigate before writing a test.** Define what correct behavior looks like first, then investigate with a target.
- **Do NOT fix code without a failing test.** The test proves the fix works and prevents regression.
- **Do NOT weaken a test to match broken code.** Fix the application.
- **Do NOT introduce mocks.** All tests run against real systems. If a dependency is unavailable, stop and tell the user.
- **Do NOT skip the workflow because "it's simple."** The simpler the fix, the faster the workflow.

### Bug Fix Protocol

1. Read the bug report
2. Update `.idd/modules/{module}/INTENT.md` — add the correct behavior
3. Write a Gherkin scenario or vitest — describe what SHOULD happen
4. Run the test — it FAILS (RED)
5. NOW read the code, find the bug, fix it
6. Run the test — it PASSES (GREEN)

### New Feature Protocol

1. Update INTENT.md with examples
2. Write Gherkin scenarios
3. Run tests — they FAIL
4. Build until tests PASS

## Project Structure

```
src/
├── index.ts              # Entry point (stdio transport)
├── server.ts             # Server factory
├── config.ts             # Server name, version, metrics toggle
├── setup.ts              # One-time Kokoro model download script
├── tools/
│   ├── index.ts          # Tool registry
│   ├── notify.ts         # The notify MCP tool (3 TTS engines)
│   └── wrapper.ts        # Metrics wrapper / identity wrapper
├── metrics/              # Usage analytics + issue reporting
├── types/                # TypeScript types
└── utils/                # Logger (stderr-only), env helpers

.idd/                     # Intent-Driven Development specs
├── project.intent.md
└── modules/{notify,metrics,server}/INTENT.md

.bdd/                     # Behavior-Driven Development tests
├── features/{notify,metrics,server}/*.feature
├── steps/*.steps.ts
└── support/              # World, hooks, client factory

tests/
├── unit/                 # Isolated function/module tests
└── integration/          # Full MCP request/response cycle + real TTS
```

## Code Conventions

- **Never use `console.log()`** — breaks MCP stdio. Use `createLogger()` from `src/utils/logger.ts`
- **Tool names:** `snake_case` (e.g., `notify`, `report_issue`)
- **Imports:** use `.js` extension (ESM requirement)
- **Tool errors:** return `{ isError: true }` — never throw from tool handlers
- **Metrics:** when enabled, all tools require a `reasoning` parameter
- **Dry run:** `NOTIFICATION_DRY_RUN=true` skips TTS without changing behavior

## Tool Design

Tools should feel natural to an LLM:
- **Name:** action + subject (`notify`, `report_issue`)
- **Description:** describe the outcome, not the implementation
- **Parameters:** everyday language with `.describe()` on every field
- **Errors:** return graceful `isError: true` responses, never crash
- **Hide complexity:** handle auth, IDs, formats internally

## Testing Rules

- **Blackbox only** — test through the MCP client interface, not internal functions
- **No mocks** — use real systems (real TTS binaries, real filesystems, real MCP transport)
- **Error paths** — use real failing binaries (e.g., `#!/bin/sh\nexit 1`) not mocks
- **Dry run for speed** — `NOTIFICATION_DRY_RUN=true` is set automatically in test helpers
- **Real TTS tests** — guarded by `process.platform === "darwin"`, skipped on Linux/CI

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `NOTIFICATION_METHOD` | `kokoro` | TTS engine: `kokoro`, `f5tts`, `say` |
| `NOTIFICATION_DRY_RUN` | `false` | Skip TTS (used in tests) |
| `KOKORO_VOICE` | `af_heart` | Default Kokoro voice |
| `KOKORO_SPEED` | `1.0` | Kokoro speed multiplier |
| `F5TTS_SPEED` | `1.0` | F5-TTS speed multiplier |
| `SAY_VOICE` | `Samantha` | macOS say voice |
| `LOG_LEVEL` | `info` | `debug`, `info`, `warn`, `error`, `silent` |
| `MCP_METRICS_ENABLED` | `true` | Toggle metrics collection |
