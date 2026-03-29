/**
 * Server factory edge-case tests.
 *
 * Covers: metrics-disabled path, config branch.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { createServer } from "../../src/server.js";

describe("createServer — metrics disabled", () => {
  const savedEnv = process.env.MCP_METRICS_ENABLED;

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.MCP_METRICS_ENABLED;
    } else {
      process.env.MCP_METRICS_ENABLED = savedEnv;
    }
    vi.restoreAllMocks();
  });

  it("creates server without metrics when MCP_METRICS_ENABLED=false", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.MCP_METRICS_ENABLED = "false";

    const ctx = await createServer();

    expect(ctx.server).toBeDefined();
    expect(ctx.metricsCollector).toBeNull();
    expect(ctx.issueCollector).toBeNull();
  });
});

describe("createServer — config.ts isMetricsEnabled env=false", () => {
  const savedEnv = process.env.MCP_METRICS_ENABLED;

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.MCP_METRICS_ENABLED;
    } else {
      process.env.MCP_METRICS_ENABLED = savedEnv;
    }
  });

  it("env var false overrides config metricsEnabled=true", async () => {
    process.env.MCP_METRICS_ENABLED = "false";
    const { isMetricsEnabled } = await import("../../src/config.js");
    expect(isMetricsEnabled()).toBe(false);
  });
});
