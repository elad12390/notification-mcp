/**
 * Storage module edge-case tests.
 *
 * Covers: corrupted files, missing files, size measurement, issues storage,
 * and all error recovery paths.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { join } from "path";
import { homedir } from "os";
import { writeFileSync, existsSync, rmSync, mkdirSync } from "fs";
import {
  loadMetrics,
  saveMetrics,
  getMetricsFilePath,
  getMetricsFileSize,
  initializeMetricsFile,
  loadIssues,
  saveIssues,
  getIssuesFilePath,
  initializeIssuesFile,
  trimInvocationsForSize,
} from "../../src/metrics/storage.js";
import { createEmptyMetricsData, createEmptyIssuesData } from "../../src/metrics/types.js";

const METRICS_DIR = join(homedir(), ".mcp-metrics");

function uniqueName(): string {
  return `test-storage-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function cleanupFile(path: string): void {
  try {
    if (existsSync(path)) rmSync(path);
  } catch { /* ignore */ }
}

describe("loadMetrics", () => {
  let name: string;
  let filePath: string;

  beforeEach(() => {
    name = uniqueName();
    filePath = getMetricsFilePath(name);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanupFile(filePath);
    vi.restoreAllMocks();
  });

  it("returns empty data when file does not exist", async () => {
    const data = await loadMetrics(name);
    expect(data.server_name).toBe(name);
    expect(data.total_invocations).toBe(0);
    expect(data.invocations).toEqual([]);
  });

  it("returns empty data when file contains invalid JSON", async () => {
    mkdirSync(METRICS_DIR, { recursive: true });
    writeFileSync(filePath, "not-valid-json{{{", "utf-8");

    const data = await loadMetrics(name);
    expect(data.server_name).toBe(name);
    expect(data.total_invocations).toBe(0);
  });

  it("returns empty data when file is structurally invalid", async () => {
    mkdirSync(METRICS_DIR, { recursive: true });
    // Valid JSON but missing required fields
    writeFileSync(filePath, JSON.stringify({ server_name: 123, invocations: "not-array" }), "utf-8");

    const data = await loadMetrics(name);
    expect(data.server_name).toBe(name);
    expect(data.invocations).toEqual([]);
  });

  it("loads valid metrics from disk", async () => {
    const saved = createEmptyMetricsData(name);
    saved.total_invocations = 5;
    mkdirSync(METRICS_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify(saved), "utf-8");

    const loaded = await loadMetrics(name);
    expect(loaded.total_invocations).toBe(5);
  });
});

describe("loadIssues", () => {
  let name: string;
  let filePath: string;

  beforeEach(() => {
    name = uniqueName();
    filePath = getIssuesFilePath(name);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanupFile(filePath);
    vi.restoreAllMocks();
  });

  it("returns empty data when file does not exist", async () => {
    const data = await loadIssues(name);
    expect(data.server_name).toBe(name);
    expect(data.total_issues).toBe(0);
  });

  it("returns empty data when file contains invalid JSON", async () => {
    mkdirSync(METRICS_DIR, { recursive: true });
    writeFileSync(filePath, "corrupted!!", "utf-8");

    const data = await loadIssues(name);
    expect(data.server_name).toBe(name);
    expect(data.total_issues).toBe(0);
  });

  it("returns empty data when file is structurally invalid", async () => {
    mkdirSync(METRICS_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify({ server_name: 42, issues: "not-array" }), "utf-8");

    const data = await loadIssues(name);
    expect(data.server_name).toBe(name);
    expect(data.issues).toEqual([]);
  });

  it("loads valid issues from disk", async () => {
    const saved = createEmptyIssuesData(name);
    saved.total_issues = 3;
    mkdirSync(METRICS_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify(saved), "utf-8");

    const loaded = await loadIssues(name);
    expect(loaded.total_issues).toBe(3);
  });
});

describe("getMetricsFileSize", () => {
  let name: string;
  let filePath: string;

  beforeEach(() => {
    name = uniqueName();
    filePath = getMetricsFilePath(name);
  });

  afterEach(() => {
    cleanupFile(filePath);
  });

  it("returns 0 when file does not exist", async () => {
    const size = await getMetricsFileSize(name);
    expect(size).toBe(0);
  });

  it("returns actual size when file exists", async () => {
    await initializeMetricsFile(name);
    const size = await getMetricsFileSize(name);
    expect(size).toBeGreaterThan(0);
    cleanupFile(filePath);
  });
});

describe("initializeMetricsFile", () => {
  let name: string;
  let filePath: string;

  beforeEach(() => {
    name = uniqueName();
    filePath = getMetricsFilePath(name);
  });

  afterEach(() => {
    cleanupFile(filePath);
  });

  it("creates the file if it does not exist", async () => {
    expect(existsSync(filePath)).toBe(false);
    await initializeMetricsFile(name);
    expect(existsSync(filePath)).toBe(true);
  });

  it("does not overwrite existing file", async () => {
    await initializeMetricsFile(name);
    const data = await loadMetrics(name);
    data.total_invocations = 99;
    await saveMetrics(data);

    // Re-initialize should NOT reset the data
    await initializeMetricsFile(name);
    const reloaded = await loadMetrics(name);
    expect(reloaded.total_invocations).toBe(99);
    cleanupFile(filePath);
  });
});

describe("initializeIssuesFile", () => {
  let name: string;
  let filePath: string;

  beforeEach(() => {
    name = uniqueName();
    filePath = getIssuesFilePath(name);
  });

  afterEach(() => {
    cleanupFile(filePath);
  });

  it("creates the file if it does not exist", async () => {
    expect(existsSync(filePath)).toBe(false);
    await initializeIssuesFile(name);
    expect(existsSync(filePath)).toBe(true);
  });

  it("does not overwrite existing file", async () => {
    await initializeIssuesFile(name);
    const data = await loadIssues(name);
    data.total_issues = 42;
    await saveIssues(data);

    await initializeIssuesFile(name);
    const reloaded = await loadIssues(name);
    expect(reloaded.total_issues).toBe(42);
    cleanupFile(filePath);
  });
});

describe("saveIssues", () => {
  let name: string;
  let filePath: string;

  beforeEach(() => {
    name = uniqueName();
    filePath = getIssuesFilePath(name);
  });

  afterEach(() => {
    cleanupFile(filePath);
  });

  it("roundtrips issue data to disk", async () => {
    const data = createEmptyIssuesData(name);
    data.total_issues = 1;
    data.issues.push({
      id: "test-id",
      title: "Test",
      description: "Test description",
      severity: "high",
      category: "bug",
      created_at: new Date().toISOString(),
    });

    await saveIssues(data);
    const loaded = await loadIssues(name);
    expect(loaded.total_issues).toBe(1);
    expect(loaded.issues[0].title).toBe("Test");
  });
});

describe("trimInvocationsForSize — edge cases", () => {
  it("handles empty invocations array", () => {
    const data = createEmptyMetricsData("test");
    const result = trimInvocationsForSize(data, 10);  // Very small limit
    expect(result.invocations).toEqual([]);
  });

  it("trims multiple rounds if needed", () => {
    const data = createEmptyMetricsData("test");
    for (let i = 0; i < 100; i++) {
      data.invocations.push({
        tool: "test",
        timestamp: new Date().toISOString(),
        duration_ms: 1,
        reasoning: "test",
        arguments: { i },
        success: true,
      });
    }
    // Force a very small limit to trigger multiple trim rounds
    const result = trimInvocationsForSize(data, 100);
    expect(result.invocations.length).toBeLessThan(100);
  });
});
