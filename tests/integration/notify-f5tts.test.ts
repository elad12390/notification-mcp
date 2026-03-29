/**
 * Real F5-TTS integration test — requires uv + Python + ffmpeg.
 *
 * Exercises the F5-TTS code path in notify.ts. The f5-tts Python package
 * currently has a numba/coverage dependency conflict on Python 3.13+.
 * When f5tts fails, we verify the error is caught gracefully (isError:true)
 * rather than crashing the MCP server. This covers the error handling path.
 *
 * When/if f5-tts fixes the upstream issue, the success path will be tested too.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { createTestClient, extractTextContent, type TestContext } from "../helpers.js";

const isMacOS = process.platform === "darwin";

function hasCommand(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

const hasUv = hasCommand("uv");
const hasFfmpeg = hasCommand("ffmpeg");
const canRunF5 = isMacOS && hasUv && hasFfmpeg;

describe("notify tool — F5-TTS code path", () => {
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
    delete process.env.F5TTS_SPEED;
  });

  it.runIf(canRunF5)(
    "f5tts engine: invocation completes without crashing the server",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "f5tts";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "hi",
          reasoning: "f5tts code path test",
        },
      });

      // f5tts may succeed OR fail due to upstream Python dep issues.
      // Either way, the server must handle it gracefully.
      const text = extractTextContent(result);
      expect(text).toMatch(/Notification sent|Failed to send notification/);

      // Verify the MCP connection is still alive after the call
      const tools = await ctx.client.listTools();
      expect(tools.tools.length).toBeGreaterThan(0);
    },
    120_000
  );
});
