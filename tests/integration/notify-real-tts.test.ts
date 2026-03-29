/**
 * Real TTS integration tests — macOS only.
 *
 * These tests exercise the actual TTS execution branches in notify.ts
 * (the code paths that NOTIFICATION_DRY_RUN=true never reaches) and the
 * error-handling catch block.
 *
 * They WILL play audio when run on macOS with speakers attached.
 * In CI (Linux), all tests are skipped via the runIf guard.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createTestClient, extractTextContent, type TestContext } from "../helpers.js";

const isMacOS = process.platform === "darwin";

describe("notify tool — real TTS (macOS only)", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestClient();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await ctx.cleanup();
    vi.restoreAllMocks();
    // helpers.ts sets NOTIFICATION_DRY_RUN=true at import; restore it
    process.env.NOTIFICATION_DRY_RUN = "true";
    delete process.env.NOTIFICATION_METHOD;
  });

  it.runIf(isMacOS)(
    "say engine: speaks a short message and returns success",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "say";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "hi",
          reasoning: "real TTS test — say engine",
        },
      });

      expect(result.isError).not.toBe(true);
      expect(extractTextContent(result)).toContain("Notification sent");
    }
  );

  it.runIf(isMacOS)(
    "say engine: message with title prepends title correctly",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "say";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "done",
          title: "Build",
          reasoning: "real TTS test — title prepend",
        },
      });

      expect(result.isError).not.toBe(true);
      // The full spoken text is "Build. done" but what's returned is just
      // the original message
      expect(extractTextContent(result)).toContain("Notification sent");
    }
  );

  it.runIf(isMacOS)(
    "say engine with explicit voice parameter",
    async () => {
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "say";

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "hi",
          voice: "Samantha",
          reasoning: "real TTS test — explicit voice",
        },
      });

      expect(result.isError).not.toBe(true);
    }
  );

  it.runIf(isMacOS)(
    "TTS failure: returns isError:true — never throws",
    async () => {
      // Create a fake `say` binary that always exits with code 1.
      // This is a real executable on the filesystem — not a mock.
      const fakeDir = mkdtempSync(join(tmpdir(), "fake-tts-vitest-"));
      const fakeSay = join(fakeDir, "say");
      writeFileSync(fakeSay, "#!/bin/sh\nexit 1\n", "utf8");
      chmodSync(fakeSay, "755");

      const savedPath = process.env.PATH;
      process.env.PATH = `${fakeDir}:${savedPath ?? ""}`;
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "say";

      try {
        const result = await ctx.client.callTool({
          name: "notify",
          arguments: {
            message: "test",
            reasoning: "real TTS error-path test",
          },
        });

        expect(result.isError).toBe(true);
        expect(extractTextContent(result)).toContain(
          "Failed to send notification"
        );
      } finally {
        process.env.PATH = savedPath;
        rmSync(fakeDir, { recursive: true, force: true });
      }
    }
  );

  it.runIf(isMacOS)(
    "TTS failure: MCP connection remains open after error",
    async () => {
      const fakeDir = mkdtempSync(join(tmpdir(), "fake-tts-vitest-conn-"));
      const fakeSay = join(fakeDir, "say");
      writeFileSync(fakeSay, "#!/bin/sh\nexit 1\n", "utf8");
      chmodSync(fakeSay, "755");

      const savedPath = process.env.PATH;
      process.env.PATH = `${fakeDir}:${savedPath ?? ""}`;
      process.env.NOTIFICATION_DRY_RUN = "false";
      process.env.NOTIFICATION_METHOD = "say";

      try {
        // First call fails
        const failed = await ctx.client.callTool({
          name: "notify",
          arguments: { message: "will fail", reasoning: "error test" },
        });
        expect(failed.isError).toBe(true);

        // Server is still responsive — switch back to dry-run
        process.env.NOTIFICATION_DRY_RUN = "true";
        process.env.PATH = savedPath ?? "";

        const ok = await ctx.client.callTool({
          name: "notify",
          arguments: { message: "still works", reasoning: "recovery test" },
        });
        expect(ok.isError).not.toBe(true);
      } finally {
        process.env.PATH = savedPath;
        rmSync(fakeDir, { recursive: true, force: true });
      }
    }
  );
});
