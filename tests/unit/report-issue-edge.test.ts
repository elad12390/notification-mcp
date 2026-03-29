/**
 * report_issue_tool error path test.
 *
 * Covers the catch block (lines 145-160) when issueCollector.report() throws.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestClient, extractTextContent, type TestContext } from "../helpers.js";

describe("report_issue — error path", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestClient();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await ctx.cleanup();
    vi.restoreAllMocks();
  });

  it("returns isError:true when issueCollector.report() throws", async () => {
    if (!ctx.issueCollector) return;

    // Force the collector to throw by resetting its internal initialized flag
    // This simulates a persistence failure during report()
    // @ts-expect-error: accessing private property for test
    ctx.issueCollector.initialized = false;

    const result = await ctx.client.callTool({
      name: "report_issue",
      arguments: {
        title: "Test error handling",
        description: "This should trigger the error catch block.",
        reasoning: "Testing the error path in report_issue_tool.ts",
      },
    });

    expect(result.isError).toBe(true);
    expect(extractTextContent(result)).toContain("Failed to save issue report");
  });
});
