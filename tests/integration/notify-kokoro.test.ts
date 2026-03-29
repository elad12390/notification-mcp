/**
 * Real Kokoro TTS integration test — requires uv + Python.
 *
 * This test exercises the actual Kokoro TTS code path in notify.ts,
 * which spawns a Python process via `uv run --with kokoro`.
 *
 * It WILL play audio and takes ~5-15 seconds on first run
 * (uv downloads kokoro + misaki packages).
 *
 * Skipped automatically on Linux or when uv is not installed.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { createTestClient, extractTextContent, type TestContext } from "../helpers.js";

const isMacOS = process.platform === "darwin";
let hasUv = false;
try {
  execSync("uv --version", { stdio: "ignore" });
  hasUv = true;
} catch {
  hasUv = false;
}

const canRunKokoro = isMacOS && hasUv;

describe("notify tool — real Kokoro TTS", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestClient();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await ctx.cleanup();
    vi.restoreAllMocks();
    process.env.NOTIFICATION_DRY_RUN = "true";
    delete process.env.NOTIFICATION_METHOD;
    delete process.env.KOKORO_VOICE;
    delete process.env.KOKORO_SPEED;
  });

  it.runIf(canRunKokoro)(
    "kokoro engine: speaks a short message with default voice",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "kokoro";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "ok",
          reasoning: "real kokoro TTS test",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(extractTextContent(result)).toContain("Notification sent");
    },
    120_000 // kokoro first-run can take 2 minutes to download packages
  );

  it.runIf(canRunKokoro)(
    "kokoro engine: resolves voice alias to full name",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "kokoro";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "hi",
          voice: "heart",
          reasoning: "testing kokoro voice alias resolution",
        },
      });

      expect(result.isError).not.toBe(true);
    },
    120_000
  );

  it.runIf(canRunKokoro)(
    "kokoro engine: title is prepended to message",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "kokoro";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "done",
          title: "Build",
          reasoning: "testing kokoro with title",
        },
      });

      expect(result.isError).not.toBe(true);
    },
    120_000
  );
});
