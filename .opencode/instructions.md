# notification-mcp — OpenCode Instructions

## Methodology: Bulletproof (IDD + BDD)

Every change follows: INTENT → RED → GREEN → REFACTOR

1. Update `.idd/modules/{module}/INTENT.md` with the expected behavior
2. Write a failing test (Gherkin in `.bdd/features/` or vitest in `tests/`)
3. Run the test — it FAILS (RED)
4. Write minimal code to make it pass (GREEN)
5. Refactor — tests still green

**Never open source files before writing a test.** Define correct behavior first.
**Never fix code without a failing test.** The test is your proof.
**Never weaken a test to match broken code.** Fix the application.
**Never use mocks.** All tests run against real systems.

## Commands

- `npm test` — vitest (unit + integration)
- `npm run test:unit` — unit tests only
- `npm run bdd` — BDD scenarios (Cucumber)
- `npm run test:all` — vitest + BDD
- `npm run build` — compile TypeScript

## Code Rules

- **Never `console.log()`** — use `createLogger()` from `src/utils/logger.ts` (stderr only)
- **Imports:** always use `.js` extension (`import { foo } from "./bar.js"`)
- **Tool errors:** return `{ isError: true }` — never throw from tool handlers
- **Tool names:** `snake_case` (e.g., `notify`, `report_issue`)
- **Parameters:** add `.describe()` on every zod field
- **Dry run:** `NOTIFICATION_DRY_RUN=true` skips TTS without changing behavior

## Testing Rules

- Test through MCP client interface (blackbox), not internal functions
- No mocks — use real TTS binaries, real filesystems, real MCP transport
- Error paths use real failing binaries (`#!/bin/sh\nexit 1`), not mocks
- `NOTIFICATION_DRY_RUN=true` is set automatically in test helpers
- Real TTS tests are guarded by `process.platform === "darwin"`

## Project Structure

- `src/tools/notify.ts` — the notify MCP tool (3 TTS engines)
- `src/metrics/` — usage analytics + issue reporting
- `src/server.ts` — server factory (composition root)
- `.idd/modules/{module}/INTENT.md` — behavioral specs
- `.bdd/features/{module}/` — Gherkin scenarios
- `tests/unit/` — isolated vitest tests
- `tests/integration/` — full MCP request/response + real TTS

## Bug Fix Protocol

1. Read the bug report
2. Update `.idd/modules/{module}/INTENT.md`
3. Write a Gherkin scenario or vitest describing correct behavior
4. Run test — FAILS (RED)
5. NOW read the code, find the bug, fix it
6. Run test — PASSES (GREEN)
