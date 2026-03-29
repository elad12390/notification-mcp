# notification-mcp — Project Intent

## Anchor

**What:** An MCP server that allows AI assistants to send spoken audio
notifications to the user.

**Why:** Users running long AI tasks shouldn't have to watch the screen.
A spoken notification at completion lets them work on other things and be
alerted naturally, without polling or constant attention.

**Who:** Developers and AI power-users running extended workflows on macOS.

## Layer 1: Module Map

| Module | Responsibility |
|--------|---------------|
| `notify` | The `notify` MCP tool — converts text to speech and plays it aloud |
| `metrics` | Records tool usage analytics; provides `report_issue` tool |
| `server` | Assembles and configures the MCP server instance |

Each module has its own INTENT.md in `.idd/modules/{module}/`.
Each module has a corresponding feature file in `.bdd/features/{module}/`.

## Layer 2: System Constraints

| ID | Constraint | Enforcement |
|----|-----------|-------------|
| S1 | macOS only — audio playback via `afplay` (built into macOS) | README requirement; `say` fallback also macOS-only |
| S2 | Never write to stdout — would corrupt MCP stdio transport | All logging goes to stderr via logger utility |
| S3 | TTS engines invoked via `uv run` — no pre-installed Python required | `spawn("uv", ["run", "--with", ...])` |
| S4 | Dry-run mode skips all audio without changing any other behavior | `NOTIFICATION_DRY_RUN=true` env var, checked at call time |
| S5 | Metrics file capped at configured size — oldest entries trimmed on overflow | `MetricsCollector` size enforcement |
| S6 | All MCP tool responses must be non-throwing — errors returned as `isError: true` | Tool handler try/catch wraps all TTS calls |
| S7 | Metrics wrapper requires `reasoning` param — all tool calls must explain their purpose | `createMetricsWrapper` injects reasoning into schema |

## Layer 3: Cross-Cutting Examples

| Input | Expected Output |
|-------|----------------|
| `notify({ message: "Hello" })` (dry-run) | `Notification sent: "Hello"` |
| `notify({ message: "Done", title: "Build" })` | Speaks `"Build. Done"` |
| `notify({ message: "Hi", voice: "bella" })` | Uses af_bella voice |
| TTS engine exits non-zero | `isError: true`, text: `Failed to send notification: ...` |
| Missing `message` | MCP validation error (`isError: true`) |
| Missing `reasoning` when metrics enabled | MCP validation error (`isError: true`) |
| Wrong type for `message` (e.g. number) | MCP validation error (`isError: true`) |

## BDD Traceability

Every Layer 3 example above maps to at least one Gherkin scenario in `.bdd/features/`.
Every Layer 2 constraint maps to either a Gherkin scenario or a CI lint rule.
