import { Before, After } from "@cucumber/cucumber";
import { rmSync } from "node:fs";
import type { AppWorld } from "./world.js";
import { createBddClient } from "./client.js";

Before(async function (this: AppWorld) {
  // Default to dry-run for every scenario — individual steps override when needed
  process.env.NOTIFICATION_DRY_RUN = "true";

  const ctx = await createBddClient();
  this.client = ctx.client;
  this.metricsCollector = ctx.metricsCollector;
  this.issueCollector = ctx.issueCollector;
  this.cleanup = ctx.cleanup;
  this.lastToolResult = null;
  this.lastToolList = null;
  this.fakeTtsDir = undefined;
  this.issueCountBefore = 0;
  this.invocationCountBefore = this.metricsCollector?.getData().total_invocations ?? 0;
});

After(async function (this: AppWorld) {
  // Restore any environment variable changes made during the scenario
  this.restoreEnv();

  // Clean up fake TTS directory created for error-path tests
  if (this.fakeTtsDir) {
    try {
      rmSync(this.fakeTtsDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors — temp dir cleanup is best-effort
    }
    this.fakeTtsDir = undefined;
  }

  // Disconnect the MCP client and server
  if (this.cleanup) {
    await this.cleanup();
  }

  // Always reset to dry-run to prevent accidental audio in subsequent tests
  process.env.NOTIFICATION_DRY_RUN = "true";
});
