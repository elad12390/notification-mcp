import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestClient, extractTextContent, TestContext } from "../helpers.js";

describe("MCP Server Integration", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await createTestClient();
    // Suppress logger output during tests
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(async () => {
    await ctx.cleanup();
    vi.restoreAllMocks();
  });

  describe("tool listing", () => {
    it("should list available tools", async () => {
      const result = await ctx.client.listTools();

      expect(result.tools).toBeDefined();
      expect(result.tools.length).toBeGreaterThan(0);
    });

    it("should include notify tool in the list", async () => {
      const result = await ctx.client.listTools();

      const notifyTool = result.tools.find((t) => t.name === "notify");
      expect(notifyTool).toBeDefined();
      expect(notifyTool?.description).toContain("notification");
    });

    it("should include reasoning parameter when metrics enabled", async () => {
      const result = await ctx.client.listTools();
      const notifyTool = result.tools.find((t) => t.name === "notify");

      // When metrics are enabled, reasoning should be in the schema
      if (ctx.metricsCollector) {
        const schema = notifyTool?.inputSchema as { properties?: Record<string, unknown> };
        expect(schema?.properties?.reasoning).toBeDefined();
      }
    });
  });

  describe("notify tool", () => {
    it("should send a notification successfully", async () => {
      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "Test notification",
          reasoning: "Testing notify tool functionality",
        },
      });

      // The tool should either succeed or fail gracefully if 'say' is not available
      const text = extractTextContent(result);
      expect(text).toMatch(/Notification sent|Failed to send notification/);
    });

    it("should accept optional title parameter", async () => {
      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "Task completed",
          title: "Build Success",
          reasoning: "Testing title parameter",
        },
      });

      const text = extractTextContent(result);
      expect(text).toMatch(/Notification sent|Failed to send notification/);
    });

    it("should accept optional voice parameter", async () => {
      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "Hello there",
          voice: "Alex",
          reasoning: "Testing voice parameter",
        },
      });

      const text = extractTextContent(result);
      expect(text).toMatch(/Notification sent|Failed to send notification/);
    });

    it("should record metrics when enabled", async () => {
      if (!ctx.metricsCollector) {
        // Skip if metrics not enabled
        return;
      }

      await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: "metrics test",
          reasoning: "Testing that metrics are recorded",
        },
      });

      // Give async write a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = ctx.metricsCollector.getData();
      expect(data.total_invocations).toBeGreaterThan(0);
      expect(data.tool_stats.notify).toBeDefined();
      expect(data.tool_stats.notify.call_count).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("should return error for unknown tool", async () => {
      const result = await ctx.client.callTool({
        name: "nonexistent_tool",
        arguments: {},
      });

      expect(result.isError).toBe(true);
      expect(extractTextContent(result)).toContain("not found");
    });

    it("should return error for missing required argument", async () => {
      const result = await ctx.client.callTool({
        name: "notify",
        arguments: { reasoning: "Testing missing argument" },
      });

      expect(result.isError).toBe(true);
    });

    it("should return error for missing reasoning when metrics enabled", async () => {
      if (!ctx.metricsCollector) {
        // Skip if metrics not enabled
        return;
      }

      const result = await ctx.client.callTool({
        name: "notify",
        arguments: { message: "test" },
      });

      expect(result.isError).toBe(true);
    });

    it("should return error for invalid argument type", async () => {
      const result = await ctx.client.callTool({
        name: "notify",
        arguments: {
          message: 123, // Should be string
          reasoning: "Testing invalid type",
        },
      });

      expect(result.isError).toBe(true);
    });
  });

  describe("report_issue tool", () => {
    it("should be available when metrics are enabled", async () => {
      if (!ctx.metricsCollector) {
        return;
      }

      const result = await ctx.client.listTools();
      const reportIssueTool = result.tools.find((t) => t.name === "report_issue");

      expect(reportIssueTool).toBeDefined();
      expect(reportIssueTool?.description).toContain("bug");
      expect(reportIssueTool?.description).toContain("feature request");
    });

    it("should not be available when metrics are disabled", async () => {
      if (ctx.metricsCollector) {
        // This test only applies when metrics are disabled
        return;
      }

      const result = await ctx.client.listTools();
      const reportIssueTool = result.tools.find((t) => t.name === "report_issue");

      expect(reportIssueTool).toBeUndefined();
    });

    it("should report a bug successfully", async () => {
      if (!ctx.issueCollector) {
        return;
      }

      const result = await ctx.client.callTool({
        name: "report_issue",
        arguments: {
          title: "Test bug report",
          description: "This is a test bug report for integration testing purposes.",
          severity: "low",
          category: "bug",
          reasoning: "Testing issue reporting functionality",
        },
      });

      expect(result.isError).not.toBe(true);
      const text = extractTextContent(result);
      expect(text).toContain("Issue reported successfully");
      expect(text).toContain("Test bug report");
      expect(text).toContain("Bug");
      expect(text).toContain("low");
    });

    it("should report a feature request successfully", async () => {
      if (!ctx.issueCollector) {
        return;
      }

      const result = await ctx.client.callTool({
        name: "report_issue",
        arguments: {
          title: "Add dark mode support",
          description: "It would be great to have a dark mode option for better visibility at night.",
          severity: "medium",
          category: "feature_request",
          expected_behavior: "A toggle to switch between light and dark themes",
          reasoning: "Testing feature request reporting",
        },
      });

      expect(result.isError).not.toBe(true);
      const text = extractTextContent(result);
      expect(text).toContain("Issue reported successfully");
      expect(text).toContain("Feature request");
    });

    it("should save issue to collector data", async () => {
      if (!ctx.issueCollector) {
        return;
      }

      const initialCount = ctx.issueCollector.getData().total_issues;

      await ctx.client.callTool({
        name: "report_issue",
        arguments: {
          title: "Test issue for data verification",
          description: "Verifying that issues are saved to the collector.",
          severity: "high",
          category: "performance",
          reasoning: "Testing issue data persistence",
        },
      });

      // Give async write a moment to complete
      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = ctx.issueCollector.getData();
      expect(data.total_issues).toBe(initialCount + 1);
      expect(data.issues[0].title).toBe("Test issue for data verification");
      expect(data.issues[0].severity).toBe("high");
      expect(data.issues[0].category).toBe("performance");
    });

    it("should reject title that is too short", async () => {
      if (!ctx.issueCollector) {
        return;
      }

      const result = await ctx.client.callTool({
        name: "report_issue",
        arguments: {
          title: "Hi", // Too short (min 5 chars)
          description: "This is a valid description that meets the minimum length requirement.",
          reasoning: "Testing validation",
        },
      });

      expect(result.isError).toBe(true);
    });

    it("should reject description that is too short", async () => {
      if (!ctx.issueCollector) {
        return;
      }

      const result = await ctx.client.callTool({
        name: "report_issue",
        arguments: {
          title: "Valid title here",
          description: "Too short", // Too short (min 10 chars)
          reasoning: "Testing validation",
        },
      });

      expect(result.isError).toBe(true);
    });

    it("should include all optional fields in saved issue", async () => {
      if (!ctx.issueCollector) {
        return;
      }

      await ctx.client.callTool({
        name: "report_issue",
        arguments: {
          title: "Complete issue with all fields",
          description: "Testing that all optional fields are saved correctly.",
          severity: "critical",
          category: "security",
          steps_to_reproduce: "1. Do this\n2. Do that\n3. Observe the issue",
          expected_behavior: "Should not crash",
          actual_behavior: "Crashes immediately",
          environment: "Node.js 20, macOS 14",
          reasoning: "Testing all optional fields",
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 50));

      const data = ctx.issueCollector.getData();
      const issue = data.issues[0];

      expect(issue.steps_to_reproduce).toBe("1. Do this\n2. Do that\n3. Observe the issue");
      expect(issue.expected_behavior).toBe("Should not crash");
      expect(issue.actual_behavior).toBe("Crashes immediately");
      expect(issue.environment).toBe("Node.js 20, macOS 14");
    });
  });
});
