/**
 * Step definitions for the metrics and issue-reporting features.
 *
 * NOTE: Given("the MCP server is running in dry-run mode"),
 * When("I call notify ..."), and Then("the call is rejected ...")
 * are defined in notify.steps.ts and are shared across all feature files.
 */
import { Given, When, Then, DataTable } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { AppWorld } from "../support/world.js";
import { extractText } from "../support/client.js";

// ── Given ────────────────────────────────────────────────────────────────────

Given("metrics are enabled", function (this: AppWorld) {
  assert.ok(
    this.metricsCollector,
    "MetricsCollector must be present (check CONFIG.metricsEnabled)"
  );
});

// ── When ─────────────────────────────────────────────────────────────────────

When(
  "I report an issue with title {string} and description {string}",
  async function (this: AppWorld, title: string, description: string) {
    this.issueCountBefore = this.issueCollector?.getData().total_issues ?? 0;
    this.lastToolResult = await this.client.callTool({
      name: "report_issue",
      arguments: {
        title,
        description,
        ...(this.metricsCollector ? { reasoning: "BDD test" } : {}),
      },
    });
  }
);

When(
  "I report a feature request with title {string} and description {string}",
  async function (this: AppWorld, title: string, description: string) {
    this.issueCountBefore = this.issueCollector?.getData().total_issues ?? 0;
    this.lastToolResult = await this.client.callTool({
      name: "report_issue",
      arguments: {
        title,
        description,
        category: "feature_request",
        ...(this.metricsCollector ? { reasoning: "BDD test" } : {}),
      },
    });
  }
);

When(
  "I report an issue with title {string} and description {string} and category {string}",
  async function (
    this: AppWorld,
    title: string,
    description: string,
    category: string
  ) {
    this.issueCountBefore = this.issueCollector?.getData().total_issues ?? 0;
    this.lastToolResult = await this.client.callTool({
      name: "report_issue",
      arguments: {
        title,
        description,
        category,
        ...(this.metricsCollector ? { reasoning: "BDD test" } : {}),
      },
    });
  }
);

When(
  "I report an issue with title {string} and description {string} and severity {string}",
  async function (
    this: AppWorld,
    title: string,
    description: string,
    severity: string
  ) {
    this.issueCountBefore = this.issueCollector?.getData().total_issues ?? 0;
    this.lastToolResult = await this.client.callTool({
      name: "report_issue",
      arguments: {
        title,
        description,
        severity,
        ...(this.metricsCollector ? { reasoning: "BDD test" } : {}),
      },
    });
  }
);

When("I report an issue with all fields:", async function (
  this: AppWorld,
  dataTable: DataTable
) {
  const rows = dataTable.rowsHash();
  this.issueCountBefore = this.issueCollector?.getData().total_issues ?? 0;
  this.lastToolResult = await this.client.callTool({
    name: "report_issue",
    arguments: {
      ...rows,
      ...(this.metricsCollector ? { reasoning: "BDD test" } : {}),
    },
  });
});

When("the notify tool fails internally", async function (this: AppWorld) {
  // The TTS error path is thoroughly tested in error-handling.feature.
  // This step exists to document the intent; mark pending to avoid false-green.
  return "pending";
});

// ── Then ─────────────────────────────────────────────────────────────────────

Then("{int} invocation has been recorded", async function (
  this: AppWorld,
  expected: number
) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  assert.ok(data, "MetricsCollector should exist");
  const delta = data.total_invocations - this.invocationCountBefore;
  assert.equal(
    delta,
    expected,
    `Expected ${expected} new invocation(s) but got ${delta} (total: ${data.total_invocations}, baseline: ${this.invocationCountBefore})`
  );
});

Then("at least {int} invocations have been recorded", async function (
  this: AppWorld,
  minimum: number
) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  assert.ok(data, "MetricsCollector should exist");
  assert.ok(
    data.total_invocations >= minimum,
    `Expected at least ${minimum} invocations but got ${data.total_invocations}`
  );
});

Then("the notify tool call count is at least {int}", async function (
  this: AppWorld,
  minimum: number
) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  const count = data?.tool_stats["notify"]?.call_count ?? 0;
  assert.ok(
    count >= minimum,
    `Expected notify call count >= ${minimum} but got ${count}`
  );
});

Then("the last invocation was successful", async function (this: AppWorld) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  assert.ok(data?.invocations.length, "Expected at least one invocation");
  const last = data!.invocations[data!.invocations.length - 1];
  assert.equal(last.success, true, "Expected the last invocation to succeed");
});

Then("the last invocation was not successful", async function (
  this: AppWorld
) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  assert.ok(data?.invocations.length, "Expected at least one invocation");
  const last = data!.invocations[data!.invocations.length - 1];
  assert.equal(
    last.success,
    false,
    "Expected the last invocation to have failed"
  );
});

Then("the last invocation has an error message", async function (
  this: AppWorld
) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  const last = data?.invocations[data!.invocations.length - 1];
  assert.ok(last?.error, "Expected an error message on the last invocation");
});

Then("the last invocation recorded the reasoning", async function (
  this: AppWorld
) {
  await waitForAsyncWrite();
  const data = this.metricsCollector?.getData();
  const last = data?.invocations[data!.invocations.length - 1];
  assert.ok(last?.reasoning, "Expected reasoning to be recorded");
});

Then(
  "the last invocation has a non-negative duration",
  async function (this: AppWorld) {
    await waitForAsyncWrite();
    const data = this.metricsCollector?.getData();
    const last = data?.invocations[data!.invocations.length - 1];
    assert.ok(
      (last?.duration_ms ?? -1) >= 0,
      `Expected duration >= 0ms but got ${last?.duration_ms}`
    );
  }
);

Then(
  "the last invocation arguments contain message {string}",
  async function (this: AppWorld, expected: string) {
    await waitForAsyncWrite();
    const data = this.metricsCollector?.getData();
    const last = data?.invocations[data!.invocations.length - 1];
    const args = last?.arguments as Record<string, unknown> | undefined;
    assert.equal(
      args?.["message"],
      expected,
      `Expected arguments.message to be "${expected}"`
    );
  }
);

Then(
  "the last invocation arguments contain voice {string}",
  async function (this: AppWorld, expected: string) {
    await waitForAsyncWrite();
    const data = this.metricsCollector?.getData();
    const last = data?.invocations[data!.invocations.length - 1];
    const args = last?.arguments as Record<string, unknown> | undefined;
    assert.equal(
      args?.["voice"],
      expected,
      `Expected arguments.voice to be "${expected}"`
    );
  }
);

Then(
  "the last invocation arguments do not contain reasoning",
  async function (this: AppWorld) {
    await waitForAsyncWrite();
    const data = this.metricsCollector?.getData();
    const last = data?.invocations[data!.invocations.length - 1];
    const args = last?.arguments as Record<string, unknown> | undefined;
    assert.ok(
      !("reasoning" in (args ?? {})),
      "reasoning should not be stored in arguments"
    );
  }
);

Then("the issue is accepted", function (this: AppWorld) {
  assert.ok(this.lastToolResult, "Expected a tool result");
  assert.notEqual(
    this.lastToolResult.isError,
    true,
    `Expected issue to be accepted: ${extractText(this.lastToolResult)}`
  );
});

Then("the response confirms the issue was reported", function (
  this: AppWorld
) {
  const text = extractText(this.lastToolResult);
  assert.ok(
    text.includes("Issue reported successfully"),
    `Expected confirmation message but got: "${text}"`
  );
});

Then("the response mentions {string}", function (
  this: AppWorld,
  expected: string
) {
  const text = extractText(this.lastToolResult);
  assert.ok(
    text.includes(expected),
    `Expected response to mention "${expected}" but got: "${text}"`
  );
});

Then("the total issue count increased by {int}", async function (
  this: AppWorld,
  delta: number
) {
  await waitForAsyncWrite();
  const data = this.issueCollector?.getData();
  const newCount = data?.total_issues ?? 0;
  assert.equal(
    newCount,
    this.issueCountBefore + delta,
    `Expected issue count to increase by ${delta}: was ${this.issueCountBefore}, now ${newCount}`
  );
});

Then("the saved issue has all the provided fields", async function (
  this: AppWorld
) {
  await waitForAsyncWrite();
  const data = this.issueCollector?.getData();
  assert.ok(data?.issues.length, "Expected at least one issue");
  const issue = data!.issues[0];
  assert.ok(issue.title, "Issue should have a title");
  assert.ok(issue.description, "Issue should have a description");
  assert.ok(issue.severity, "Issue should have a severity");
  assert.ok(issue.category, "Issue should have a category");
  assert.ok(issue.steps_to_reproduce, "Issue should have steps_to_reproduce");
  assert.ok(issue.expected_behavior, "Issue should have expected_behavior");
  assert.ok(issue.actual_behavior, "Issue should have actual_behavior");
  assert.ok(issue.environment, "Issue should have environment");
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForAsyncWrite(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 60));
}
