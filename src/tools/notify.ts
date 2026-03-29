import { z } from "zod";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { ToolRegistrar } from "../types/tool.js";
import { createLogger } from "../utils/logger.js";
import { getEnv, getEnvAsBoolean } from "../utils/env.js";
import * as os from "node:os";
import * as path from "node:path";
import * as fs from "node:fs";

const log = createLogger("notify");
const execFileAsync = promisify(execFile);

/**
 * Available Kokoro voices
 * American Female: af_alloy, af_aoede, af_bella, af_heart, af_jessica, af_kore, af_nicole, af_nova, af_river, af_sarah, af_sky
 * American Male: am_adam, am_echo, am_eric, am_fenrir, am_liam, am_michael, am_onyx, am_puck, am_santa
 * British Female: bf_alice, bf_emma, bf_isabella, bf_lily
 * British Male: bm_daniel, bm_fable, bm_george, bm_lewis
 */
const KOKORO_VOICE_MAP: Record<string, string> = {
  // Friendly aliases
  heart: "af_heart",
  bella: "af_bella",
  nicole: "af_nicole",
  sarah: "af_sarah",
  adam: "am_adam",
  michael: "am_michael",
  emma: "bf_emma",
  george: "bm_george",
  // Direct voice names also work
};

/**
 * F5-TTS voice options (reference audio files)
 * Users can provide their own reference audio via F5TTS_REF_AUDIO env var
 */
const F5TTS_VOICES: Record<string, { refText: string; description: string }> = {
  // Built-in voices from F5-TTS package
  nature: {
    refText: "Some call me nature, others call me mother nature.",
    description: "Calm female voice (default)",
  },
};

/**
 * Send notification using F5-TTS (higher quality, flow matching)
 * Requires FFmpeg installed. Uses bundled or custom reference audio.
 */
async function notifyWithF5TTS(
  message: string,
  speed: number
): Promise<void> {
  log.debug("Using F5-TTS", { speed });

  // Python script using F5-TTS API
  const pythonScript = `
import sys
import os
import tempfile
import subprocess
import importlib.util

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

# Get arguments
text = sys.argv[1]
speed = float(sys.argv[2])
ref_audio_override = sys.argv[3] if len(sys.argv) > 3 and sys.argv[3] else None
ref_text_override = sys.argv[4] if len(sys.argv) > 4 and sys.argv[4] else None

# Find F5-TTS package path for bundled reference audio
f5_path = None
spec = importlib.util.find_spec('f5_tts.infer.examples.basic')
if spec and spec.submodule_search_locations:
    for loc in spec.submodule_search_locations:
        candidate = os.path.join(loc, 'basic_ref_en.wav')
        if os.path.exists(candidate):
            f5_path = candidate
            break

# Use custom or bundled reference
ref_audio = ref_audio_override or f5_path
ref_text = ref_text_override or "Some call me nature, others call me mother nature."

if not ref_audio or not os.path.exists(ref_audio):
    print(f"Error: Reference audio not found: {ref_audio}", file=sys.stderr)
    sys.exit(1)

from f5_tts.api import F5TTS
import soundfile as sf

# Initialize F5-TTS
tts = F5TTS(model='F5TTS_v1_Base')

# Generate speech
wav, sr, _ = tts.infer(
    ref_file=ref_audio,
    ref_text=ref_text,
    gen_text=text,
    speed=speed,
    show_info=lambda x: None,
)

# Save and play
with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
    sf.write(f.name, wav, sr)
    subprocess.run(['afplay', f.name])
    os.unlink(f.name)
`;

  // Get custom reference audio if provided
  const refAudio = getEnv("F5TTS_REF_AUDIO", "");
  const refText = getEnv("F5TTS_REF_TEXT", "");

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "uv",
      [
        "run",
        "--with",
        "f5-tts",
        "--with",
        "soundfile",
        "python",
        "-c",
        pythonScript,
        message,
        speed.toString(),
        refAudio,
        refText,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          // Set library path for FFmpeg on macOS
          DYLD_LIBRARY_PATH: "/opt/homebrew/lib:" + (process.env.DYLD_LIBRARY_PATH || ""),
        },
      }
    );

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`F5-TTS failed: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Send notification using full Kokoro TTS with misaki G2P
 * Supports IPA pronunciation markup: [word](/IPA/)
 */
async function notifyWithKokoro(
  message: string,
  voice: string,
  speed: number
): Promise<void> {
  // Resolve voice alias if needed
  const resolvedVoice = KOKORO_VOICE_MAP[voice.toLowerCase()] ?? voice;

  log.debug("Using Kokoro TTS with misaki G2P", { voice: resolvedVoice, speed });

  // Python script using full kokoro package with misaki G2P
  // This supports IPA markup: [word](/phonemes/)
  const pythonScript = `
import sys
import tempfile
import subprocess
import numpy as np

# Suppress warnings
import warnings
warnings.filterwarnings('ignore')

from kokoro import KPipeline
import soundfile as sf

# Get arguments
text = sys.argv[1]
voice = sys.argv[2]
speed = float(sys.argv[3])

# Determine language code from voice prefix
# a = American English, b = British English
lang_code = 'a' if voice.startswith('a') else 'b'

# Initialize pipeline
pipeline = KPipeline(lang_code=lang_code)

# Generate speech
generator = pipeline(text, voice=voice, speed=speed)

# Collect all audio chunks
all_audio = []
for gs, ps, audio in generator:
    all_audio.append(audio)

# Concatenate audio
if all_audio:
    full_audio = np.concatenate(all_audio)
    
    # Save and play
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        sf.write(f.name, full_audio, 24000)
        subprocess.run(['afplay', f.name])
`;

  return new Promise((resolve, reject) => {
    const proc = spawn(
      "uv",
      [
        "run",
        "--with",
        "kokoro>=0.9.4",
        "--with",
        "misaki[en]",
        "--with",
        "soundfile",
        "python",
        "-c",
        pythonScript,
        message,
        resolvedVoice,
        speed.toString(),
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    let stderr = "";
    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Kokoro TTS failed: ${stderr}`));
      }
    });

    proc.on("error", (err) => {
      reject(err);
    });
  });
}

/**
 * Send notification using macOS say command (fallback)
 */
async function notifyWithSay(message: string, voice: string): Promise<void> {
  await execFileAsync("say", ["-v", voice, message]);
}

/**
 * Notification tool - sends a notification to the user.
 *
 * Supports multiple TTS engines:
 * - kokoro (default): Fast with IPA pronunciation support. Good for quick notifications.
 * - f5tts: Higher quality (flow matching), slower. Best voice quality.
 * - say: macOS built-in TTS. Fastest but robotic.
 *
 * Set NOTIFICATION_METHOD to choose: kokoro | f5tts | say
 * Set KOKORO_VOICE for Kokoro voices (default: af_heart)
 * Set F5TTS_REF_AUDIO + F5TTS_REF_TEXT for custom F5-TTS voice cloning
 */
export const register: ToolRegistrar = (server, wrapTool) => {
  const tool = wrapTool(
    "notify",
    `Sends a notification to the user. Use this when you complete a task and want to alert the user.

IMPORTANT - Writing expressive messages:
- Use punctuation naturally: "Hello!" sounds excited, "Hello..." sounds thoughtful
- Use commas for pauses: "Well, I think so" has a natural pause
- Use ellipsis for longer pauses: "Wait... what?"
- Exclamation marks add energy: "Great job!" vs "Great job."
- Question marks affect intonation: "Really?" sounds curious
- Break long messages into sentences for natural rhythm
- The model reads punctuation expressively, so write like you'd want it spoken!

Example good messages:
- "Hey! Your task is complete. Everything went smoothly."
- "Hmm... I found something interesting. Check this out!"
- "Done! The build succeeded, and all tests passed."

CUSTOM PRONUNCIATION (IPA):
For words that need specific pronunciation, use: [word](/IPA phonemes/)
Common IPA symbols:
- χ = Hebrew ח (chet), guttural "kh" sound
- ʃ = "sh" sound
- ð = "th" in "the"
- θ = "th" in "think"  
- ŋ = "ng" sound
- ɹ = American "r"

Examples:
- "[Chaim](/χaim/)" - Hebrew name with guttural ח
- "[Elad](/ɛlɑd/)" - Pronounce as "eh-lahd"
- "Hello [world](/wɜːld/)!" - Custom pronunciation for "world"

TTS ENGINE OPTIONS (set via NOTIFICATION_METHOD env var):
- "kokoro" (default): Fast (~3-5s), built-in voices, IPA pronunciation support
- "f5tts": Higher quality (flow matching), slower (~10-15s), voice cloning capable
- "say": macOS built-in, fastest but robotic`,
    {
      message: z.string().describe(
        "The notification message. Write naturally with punctuation for expressive speech: use '!' for excitement, '...' for pauses, ',' for brief pauses, '?' for questions. Example: 'Hey! Your task is done. Everything worked perfectly.'"
      ),
      title: z
        .string()
        .optional()
        .describe("Optional title for the notification (spoken before the message with a pause)"),
      voice: z
        .string()
        .optional()
        .describe(
          "Voice to use. For Kokoro: heart, bella, nicole, sarah, adam, michael, emma, george (or full names like af_heart, bm_george). For macOS say: Samantha, Daniel, etc. For F5-TTS: uses bundled voice or custom via F5TTS_REF_AUDIO env."
        ),
    },
    async ({ message, title, voice }) => {
      const fullMessage = title ? `${title}. ${message}` : message;
      const method = getEnv("NOTIFICATION_METHOD", "kokoro").toLowerCase();

      log.debug("Sending notification", { message, title, voice, method });

      try {
        // Check dry run at runtime (for testing)
        const isDryRun = getEnvAsBoolean("NOTIFICATION_DRY_RUN", false);
        if (isDryRun) {
          // Dry run mode for testing - skip actual TTS
          log.debug("Dry run mode - skipping actual TTS");
        } else if (method === "f5tts") {
          // F5-TTS: Higher quality flow matching TTS
          const speed = parseFloat(getEnv("F5TTS_SPEED", "1.0"));
          await notifyWithF5TTS(fullMessage, speed);
          log.info("Notification sent via F5-TTS", { message: fullMessage });
        } else if (method === "kokoro") {
          // Kokoro: Fast with IPA support
          const kokoroVoice = voice ?? getEnv("KOKORO_VOICE", "af_heart");
          const speed = parseFloat(getEnv("KOKORO_SPEED", "1.0"));
          await notifyWithKokoro(fullMessage, kokoroVoice, speed);
          log.info("Notification sent via Kokoro", { message: fullMessage, voice: kokoroVoice });
        } else {
          // Use macOS say (fallback)
          const sayVoice = voice ?? getEnv("SAY_VOICE", "Samantha");
          await notifyWithSay(fullMessage, sayVoice);
          log.info("Notification sent via macOS say", { message: fullMessage, voice: sayVoice });
        }

        return {
          content: [{ type: "text" as const, text: `Notification sent: "${message}"` }],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        log.error("Failed to send notification", { error: errorMessage });
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to send notification: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  server.tool(tool.name, tool.description, tool.schema, tool.handler);
};
