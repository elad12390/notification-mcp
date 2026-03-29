import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  writeFileSync,
  chmodSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AppWorld } from "../support/world.js";
import { extractText } from "../support/client.js";

// ── Given ────────────────────────────────────────────────────────────────────

Given("the MCP server is running in dry-run mode", function (this: AppWorld) {
  this.setEnv("NOTIFICATION_DRY_RUN", "true");
});

Given("the MCP server is running with real TTS", function (this: AppWorld) {
  if (process.platform !== "darwin") {
    return "pending";
  }
  this.setEnv("NOTIFICATION_DRY_RUN", "false");
});

Given("the notification method is {string}", function (
  this: AppWorld,
  method: string
) {
  this.setEnv("NOTIFICATION_METHOD", method);
});

Given(
  "the TTS binary will fail with exit code 1",
  function (this: AppWorld) {
    if (process.platform !== "darwin") {
      return "pending";
    }

    // Create a temp directory with a fake `say` binary that always exits 1.
    // Prepend that directory to PATH so it shadows the real /usr/bin/say.
    // This is a real executable — not a mock — it just fails unconditionally.
    const fakeDir = mkdtempSync(join(tmpdir(), "fake-tts-"));
    const fakeSay = join(fakeDir, "say");
    writeFileSync(fakeSay, "#!/bin/sh\nexit 1\n", "utf8");
    chmodSync(fakeSay, "755");

    this.fakeTtsDir = fakeDir;
    this.setEnv("NOTIFICATION_DRY_RUN", "false");
    this.setEnv("NOTIFICATION_METHOD", "say");
    this.setEnv("PATH", `${fakeDir}:${process.env.PATH ?? ""}`);
  }
);

Given("the TTS binary is restored", function (this: AppWorld) {
  // Remove the fake TTS directory and restore PATH
  if (this.fakeTtsDir) {
    try {
      rmSync(this.fakeTtsDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    this.fakeTtsDir = undefined;
  }
  // Restore env overrides (PATH, NOTIFICATION_METHOD, NOTIFICATION_DRY_RUN)
  this.restoreEnv();
});

// ── When ─────────────────────────────────────────────────────────────────────

When("I call notify with message {string}", async function (
  this: AppWorld,
  message: string
) {
  this.lastToolResult = await this.client.callTool({
    name: "notify",
    arguments: buildArgs({ message }, this),
  });
});

When(
  "I call notify with message {string} and title {string}",
  async function (this: AppWorld, message: string, title: string) {
    this.lastToolResult = await this.client.callTool({
      name: "notify",
      arguments: buildArgs({ message, title }, this),
    });
  }
);

When(
  "I call notify with message {string} and voice {string}",
  async function (this: AppWorld, message: string, voice: string) {
    this.lastToolResult = await this.client.callTool({
      name: "notify",
      arguments: buildArgs({ message, voice }, this),
    });
  }
);

When(
  "I call notify with message {string} and title {string} and voice {string}",
  async function (
    this: AppWorld,
    message: string,
    title: string,
    voice: string
  ) {
    this.lastToolResult = await this.client.callTool({
      name: "notify",
      arguments: buildArgs({ message, title, voice }, this),
    });
  }
);

When("I call notify without a message", async function (this: AppWorld) {
  this.lastToolResult = await this.client.callTool({
    name: "notify",
    arguments: buildArgs({}, this),
  });
});

When(
  "I call notify with a non-string message",
  async function (this: AppWorld) {
    this.lastToolResult = await this.client.callTool({
      name: "notify",
      arguments: buildArgs({ message: 42 as unknown as string }, this),
    });
  }
);

When(
  "I call notify with message {string} but without reasoning",
  async function (this: AppWorld, message: string) {
    // Deliberately omit reasoning to test validation
    this.lastToolResult = await this.client.callTool({
      name: "notify",
      arguments: { message },
    });
  }
);

When(
  "I call notify with message {string} in dry-run mode",
  async function (this: AppWorld, message: string) {
    this.setEnv("NOTIFICATION_DRY_RUN", "true");
    this.lastToolResult = await this.client.callTool({
      name: "notify",
      arguments: buildArgs({ message }, this),
    });
  }
);

// ── Then ─────────────────────────────────────────────────────────────────────

Then("the notification is accepted", function (this: AppWorld) {
  assert.ok(this.lastToolResult, "Expected a tool result");
  assert.notEqual(
    this.lastToolResult.isError,
    true,
    `Expected notification to be accepted but got error: ${extractText(
      this.lastToolResult
    )}`
  );
});

Then("the response contains {string}", function (
  this: AppWorld,
  expected: string
) {
  const text = extractText(this.lastToolResult);
  assert.ok(
    text.includes(expected),
    `Expected response to contain "${expected}" but got: "${text}"`
  );
});

Then("the call is rejected with a validation error", function (
  this: AppWorld
) {
  assert.ok(this.lastToolResult, "Expected a tool result");
  assert.equal(
    this.lastToolResult.isError,
    true,
    `Expected an error response but notification was accepted: ${extractText(
      this.lastToolResult
    )}`
  );
});

Then("the call returns an error response", function (this: AppWorld) {
  assert.ok(this.lastToolResult, "Expected a tool result");
  assert.equal(
    this.lastToolResult.isError,
    true,
    "Expected isError to be true"
  );
});

Then("the MCP connection is still open", async function (this: AppWorld) {
  // Verify the server still responds — the error did not close the connection
  const result = await this.client.listTools();
  assert.ok(
    result.tools.length > 0,
    "Server should still respond after a TTS error"
  );
});

Then("audio was produced", function (this: AppWorld) {
  // We verify the call completed without error.
  // Direct audio capture is not practical in automated tests.
  assert.notEqual(
    this.lastToolResult?.isError,
    true,
    "Expected audio to be produced without error"
  );
});

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildArgs(
  base: Record<string, unknown>,
  world: AppWorld
): Record<string, unknown> {
  // Always include reasoning when metrics are enabled
  const reasoning = world.metricsCollector ? "BDD scenario" : undefined;
  return reasoning ? { ...base, reasoning } : base;
}
