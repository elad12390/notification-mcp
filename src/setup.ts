#!/usr/bin/env node
/**
 * Setup script for notification-mcp
 * Downloads Kokoro TTS model files for high-quality AI voices
 */

import { existsSync, mkdirSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { get } from "node:https";
import { pipeline } from "node:stream/promises";

const KOKORO_DIR = join(homedir(), ".kokoro-tts");
const MODEL_URL =
  "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx";
const VOICES_URL =
  "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin";

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const followRedirect = (currentUrl: string) => {
      get(currentUrl, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            followRedirect(redirectUrl);
            return;
          }
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }

        const totalSize = parseInt(response.headers["content-length"] || "0", 10);
        let downloadedSize = 0;

        response.on("data", (chunk) => {
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const percent = ((downloadedSize / totalSize) * 100).toFixed(1);
            const mb = (downloadedSize / 1024 / 1024).toFixed(1);
            const totalMb = (totalSize / 1024 / 1024).toFixed(1);
            process.stdout.write(`\r  Downloading: ${mb}MB / ${totalMb}MB (${percent}%)`);
          }
        });

        const fileStream = createWriteStream(dest);
        pipeline(response, fileStream)
          .then(() => {
            console.log(" Done!");
            resolve();
          })
          .catch(reject);
      }).on("error", reject);
    };

    followRedirect(url);
  });
}

async function setup(): Promise<void> {
  console.log("🔊 notification-mcp Setup");
  console.log("========================\n");

  // Create directory
  if (!existsSync(KOKORO_DIR)) {
    console.log(`Creating directory: ${KOKORO_DIR}`);
    mkdirSync(KOKORO_DIR, { recursive: true });
  }

  const modelPath = join(KOKORO_DIR, "kokoro-v1.0.onnx");
  const voicesPath = join(KOKORO_DIR, "voices-v1.0.bin");

  // Download model if not exists
  if (!existsSync(modelPath)) {
    console.log("\n📦 Downloading Kokoro TTS model (~310MB)...");
    await downloadFile(MODEL_URL, modelPath);
  } else {
    console.log("✅ Kokoro model already downloaded");
  }

  // Download voices if not exists
  if (!existsSync(voicesPath)) {
    console.log("\n🎤 Downloading voice files (~27MB)...");
    await downloadFile(VOICES_URL, voicesPath);
  } else {
    console.log("✅ Voice files already downloaded");
  }

  console.log("\n✨ Setup complete!");
  console.log("\nAvailable Kokoro voices:");
  console.log("  American Female: heart, bella, nicole, sarah, jessica, nova, river, sky");
  console.log("  American Male:   adam, michael, echo, eric, liam, onyx");
  console.log("  British Female:  emma, isabella, lily, alice");
  console.log("  British Male:    george, lewis, daniel, fable");
  console.log("\nSet KOKORO_VOICE environment variable to change the default voice.");
  console.log("Example: KOKORO_VOICE=bf_emma");
}

// Run if called directly
setup().catch((err) => {
  console.error("Setup failed:", err.message);
  process.exit(1);
});
