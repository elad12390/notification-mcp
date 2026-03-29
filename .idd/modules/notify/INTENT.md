# Module: notify

## Anchor

**What:** The `notify` MCP tool converts a text message to speech and plays it
aloud on the user's macOS system.

**Why:** AI assistants need a way to alert users when long-running tasks complete.
This tool bridges the gap between AI workflow completion and human attention.

## Layer 1: Interface

### Tool Name
`notify`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | yes | The text to speak. Punctuation is used expressively. |
| `title` | string | no | Prepended to message with a pause: `"<title>. <message>"` |
| `voice` | string | no | Voice name or alias. Interpretation depends on TTS engine. |
| `reasoning` | string | yes (when metrics on) | Why the tool is being called. |

### Return Value

On success: `{ content: [{ type: "text", text: "Notification sent: \"<message>\"" }] }`

On failure: `{ content: [...], isError: true }`

## Layer 2: Constraints

| ID | Constraint |
|----|-----------|
| N1 | `message` is required; missing it returns MCP validation error |
| N2 | `title` is prepended as `"<title>. <message>"` when present |
| N3 | TTS engine is selected at call time via `NOTIFICATION_METHOD` env var |
| N4 | Default TTS engine is `kokoro` |
| N5 | `NOTIFICATION_DRY_RUN=true` skips all audio, returns success |
| N6 | All TTS failures are caught and returned as `isError: true` |
| N7 | Voice aliases are resolved: `heart` → `af_heart`, `george` → `bm_george` |
| N8 | IPA markup `[word](/phonemes/)` is passed through to kokoro unchanged |

## Layer 3: Examples

### Basic usage

| message | title | voice | engine | Expected |
|---------|-------|-------|--------|----------|
| "Task complete" | — | — | dry-run | `Notification sent: "Task complete"` |
| "Build succeeded" | "CI" | — | dry-run | `Notification sent: "Build succeeded"` |
| "Hello" | — | "bella" | dry-run | `Notification sent: "Hello"` |
| "Done!" | "Deploy" | "george" | dry-run | `Notification sent: "Done!"` |

### TTS engines

| engine | NOTIFICATION_METHOD | Notes |
|--------|-------------------|-------|
| kokoro | `kokoro` | Default. Fast (~3-5s). IPA support. Requires `uv`. |
| f5tts | `f5tts` | Highest quality (~10-15s). Voice cloning. Requires `uv` + FFmpeg. |
| say | `say` (or any other value) | Instant. No deps. macOS built-in. |

### Kokoro voice aliases

| Alias | Full name | Accent |
|-------|-----------|--------|
| heart | af_heart | American Female |
| bella | af_bella | American Female |
| nicole | af_nicole | American Female |
| sarah | af_sarah | American Female |
| adam | am_adam | American Male |
| michael | am_michael | American Male |
| emma | bf_emma | British Female |
| george | bm_george | British Male |

### Error cases

| Condition | Expected response |
|-----------|-----------------|
| uv not installed, method=kokoro | `isError: true`, message contains `Failed to send notification` |
| TTS binary not found | `isError: true`, message contains `Failed to send notification` |
| TTS process exits non-zero | `isError: true`, message contains `Failed to send notification` |
