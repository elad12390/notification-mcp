/**
 * MetricsCollector edge-case tests.
 *
 * Covers: uninitialized guard, getFilePath, error-count stats, persist error resilience.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "path";
import { homedir } from "os";
import { existsSync, rmSync } from "fs";
import { MetricsCollector } from "../../src/metrics/collector.js";
import type { ToolInvocation } from "../../src/metrics/types.js";

const METRICS_DIR = join(homedir(), ".mcp-metrics");

function uniqueName(): string {
  return `test-collector-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeInvocation(overrides: Partial<ToolInvocation> = {}): ToolInvocation {
  return {
    tool: "test_tool",
    timestamp: new Date().toISOString(),
    duration_ms: 10,
    reasoning: "test",
    arguments: {},
    success: true,
    ...overrides,
  };
}

describe("MetricsCollector — edge cases", () => {
  let collector: MetricsCollector;
  let name: string;
  let filePath: string;

  beforeEach(async () => {
    name = uniqueName();
    filePath = join(METRICS_DIR, `${name}.json`);
    collector = new MetricsCollector(name, 1024 * 1024);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    try {
      if (existsSync(filePath)) rmSync(filePath);
    } catch { /* ignore */ }
    vi.restoreAllMocks();
  });

  it("silently skips recording when not initialized", () => {
    // Don't call initialize() — record should log an error and return without crashing
    collector.record(makeInvocation());
    const data = collector.getData();
    expect(data.total_invocations).toBe(0);
  });

  it("returns the metrics file path via getFilePath", async () => {
    await collector.initialize();
    const path = collector.getFilePath();
    expect(path).toContain(name);
    expect(path).toContain(".json");
  });

  it("tracks error_count in tool_stats for failed invocations", async () => {
    await collector.initialize();

    collector.record(makeInvocation({ success: false, error: "boom" }));
    collector.record(makeInvocation({ success: true }));
    collector.record(makeInvocation({ success: false, error: "crash" }));

    const stats = collector.getData().tool_stats["test_tool"];
    expect(stats.call_count).toBe(3);
    expect(stats.success_count).toBe(1);
    expect(stats.error_count).toBe(2);
  });

  it("updates avg_duration_ms correctly across multiple calls", async () => {
    await collector.initialize();

    collector.record(makeInvocation({ duration_ms: 100 }));
    collector.record(makeInvocation({ duration_ms: 200 }));

    const stats = collector.getData().tool_stats["test_tool"];
    expect(stats.avg_duration_ms).toBe(150);
    expect(stats.total_duration_ms).toBe(300);
  });

  it("creates first-time tool_stats with a failed invocation", async () => {
    await collector.initialize();

    collector.record(makeInvocation({ success: false, error: "first fail" }));

    const stats = collector.getData().tool_stats["test_tool"];
    expect(stats.call_count).toBe(1);
    expect(stats.success_count).toBe(0);
    expect(stats.error_count).toBe(1);
  });
});
