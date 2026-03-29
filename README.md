# notification-mcp

An MCP server that lets AI assistants send spoken audio notifications using high-quality AI voices. When an AI finishes a long task, it can call the `notify` tool to speak a message aloud — so you don't have to stare at the screen waiting.

Powered by [Kokoro TTS](https://github.com/remsky/kokoro) (fast, expressive, 26 voices), with optional [F5-TTS](https://github.com/SWivid/F5-TTS) (higher quality, voice cloning) and macOS `say` (instant, no setup).

## Quick Start

### Prerequisites

- **macOS** (notifications play via `afplay`)
- **Node.js 18+**
- **[uv](https://docs.astral.sh/uv/)** — Python package runner (for Kokoro/F5-TTS)
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```

### Install via npx

No installation needed — run directly with `npx`:

```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "npx",
      "args": ["-y", "@elad12390/notification-mcp"]
    }
  }
}
```

### Install from source

```bash
git clone https://github.com/elad12390/notification-mcp.git
cd notification-mcp
npm install
npm run build
```

Then configure your MCP client (see [Configuration](#configuration) below).

## Configuration

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "npx",
      "args": ["-y", "@elad12390/notification-mcp"]
    }
  }
}
```

### OpenCode / Cursor / Other MCP Clients

```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "npx",
      "args": ["-y", "@elad12390/notification-mcp"]
    }
  }
}
```

### From source

```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "node",
      "args": ["/path/to/notification-mcp/dist/index.js"]
    }
  }
}
```

## The `notify` Tool

Once configured, the AI can call:

```
notify(message: "Hey! Build succeeded, all tests passed.")
notify(message: "Done. Your file has been exported.", title: "Export Complete")
notify(message: "Hmm... something looks off. Check the logs.", voice: "george")
```

### Writing Expressive Messages

Kokoro reads punctuation expressively. Write like you'd want it spoken:

| Punctuation | Effect | Example |
|---|---|---|
| `!` | Excited/energetic | `"Great job!"` |
| `...` | Long pause, thoughtful | `"Wait... what?"` |
| `,` | Brief natural pause | `"Well, I think so"` |
| `?` | Rising intonation | `"Really?"` |
| `.` | Sentence break | `"Done. Everything worked."` |

**Good examples:**
```
"Hey! Your task is complete. Everything went smoothly."
"Hmm... I found something interesting. Check this out!"
"Done! The build succeeded, and all 47 tests passed."
```

### Custom Pronunciation (IPA)

For words that need specific pronunciation, use `[word](/IPA/]` syntax:

```
"[Chaim](/χaim/) said hello"     → Hebrew name with guttural ח
"[Elad](/ɛlɑd/) is working"      → Pronounce as "eh-lahd"  
"The [route](/ruːt/) is clear"    → British-style pronunciation
```

Common IPA symbols: `χ` (Hebrew ח), `ʃ` (sh), `ð` (the), `θ` (think), `ŋ` (ng), `ɹ` (American r)

## Voices

### Kokoro Voices (default engine)

Use friendly aliases or full voice names:

| Alias | Full Name | Accent |
|---|---|---|
| `heart` | `af_heart` | American Female |
| `bella` | `af_bella` | American Female |
| `nicole` | `af_nicole` | American Female |
| `sarah` | `af_sarah` | American Female |
| `adam` | `am_adam` | American Male |
| `michael` | `am_michael` | American Male |
| `emma` | `bf_emma` | British Female |
| `george` | `bm_george` | British Male |

Additional full names: `af_alloy`, `af_aoede`, `af_jessica`, `af_kore`, `af_nova`, `af_river`, `af_sky`, `am_echo`, `am_eric`, `am_fenrir`, `am_liam`, `am_onyx`, `am_puck`, `bf_alice`, `bf_isabella`, `bf_lily`, `bm_daniel`, `bm_fable`, `bm_lewis`

## TTS Engines

Set `NOTIFICATION_METHOD` to choose your engine:

| Engine | Speed | Quality | Requires |
|---|---|---|---|
| `kokoro` (default) | ~3–5s | Great, expressive | `uv` |
| `f5tts` | ~10–15s | Highest, voice cloning | `uv` + FFmpeg |
| `say` | Instant | Robotic | Nothing (macOS built-in) |

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NOTIFICATION_METHOD` | `kokoro` | TTS engine: `kokoro`, `f5tts`, or `say` |
| `KOKORO_VOICE` | `af_heart` | Default Kokoro voice (alias or full name) |
| `KOKORO_SPEED` | `1.0` | Kokoro speech speed multiplier |
| `F5TTS_SPEED` | `1.0` | F5-TTS speech speed multiplier |
| `F5TTS_REF_AUDIO` | — | Path to reference audio file for voice cloning |
| `F5TTS_REF_TEXT` | — | Transcript of the reference audio |
| `SAY_VOICE` | `Samantha` | macOS `say` voice name |
| `LOG_LEVEL` | `info` | Log level: `debug`, `info`, `warn`, `error`, `silent` |
| `MCP_METRICS_ENABLED` | `true` | Enable/disable usage metrics |

### Example: Use a British male voice by default

```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "npx",
      "args": ["-y", "@elad12390/notification-mcp"],
      "env": {
        "KOKORO_VOICE": "bm_george",
        "KOKORO_SPEED": "1.1"
      }
    }
  }
}
```

### Example: Use F5-TTS with custom voice cloning

```json
{
  "mcpServers": {
    "notification-mcp": {
      "command": "npx",
      "args": ["-y", "@elad12390/notification-mcp"],
      "env": {
        "NOTIFICATION_METHOD": "f5tts",
        "F5TTS_REF_AUDIO": "/path/to/your-voice.wav",
        "F5TTS_REF_TEXT": "Transcript of what is said in that audio file."
      }
    }
  }
}
```

## Development

```bash
# Install dependencies
npm install

# Development with hot reload
npm run dev

# Build
npm run build

# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## License

MIT
