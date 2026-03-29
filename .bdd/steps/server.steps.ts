/**
 * Step definitions for the server/tool-registration feature.
 *
 * NOTE: Given("the MCP server is running in dry-run mode") is defined in
 * notify.steps.ts and is shared automatically across all feature files.
 */
import { Given, When, Then } from "@cucumber/cucumber";
import assert from "node:assert/strict";
import type { AppWorld } from "../support/world.js";
import { createBddClient } from "../support/client.js";

// ── Given ────────────────────────────────────────────────────────────────────

Given("the MCP server is running with metrics enabled", function (
  this: AppWorld
) {
  this.setEnv("NOTIFICATION_DRY_RUN", "true");
  assert.ok(
    this.metricsCollector,
    "MetricsCollector must be present (check CONFIG.metricsEnabled)"
  );
});

Given("the MCP server is running with metrics disabled", async function (
  this: AppWorld
) {
  this.setEnv("NOTIFICATION_DRY_RUN", "true");
  this.setEnv("MCP_METRICS_ENABLED", "false");

  // Recreate the server with metrics disabled
  if (this.cleanup) {
    await this.cleanup();
  }

  const ctx = await createBddClient();
  this.client = ctx.client;
  this.metricsCollector = ctx.metricsCollector;
  this.issueCollector = ctx.issueCollector;
  this.cleanup = ctx.cleanup;
});

// ── When ─────────────────────────────────────────────────────────────────────

When("I list the available tools", async function (this: AppWorld) {
  this.lastToolList = await this.client.listTools();
});

// ── Then ─────────────────────────────────────────────────────────────────────

Then("the tool list includes {string}", function (
  this: AppWorld,
  toolName: string
) {
  assert.ok(this.lastToolList, "Expected a tool list result");
  const names = this.lastToolList.tools.map((t) => t.name);
  assert.ok(
    names.includes(toolName),
    `Expected tool list to include "${toolName}" but got: [${names.join(", ")}]`
  );
});

Then("the tool list does not include {string}", function (
  this: AppWorld,
  toolName: string
) {
  assert.ok(this.lastToolList, "Expected a tool list result");
  const names = this.lastToolList.tools.map((t) => t.name);
  assert.ok(
    !names.includes(toolName),
    `Expected tool list to NOT include "${toolName}" but it was present`
  );
});

Then(
  "the {string} tool description mentions {string}",
  function (this: AppWorld, toolName: string, keyword: string) {
    assert.ok(this.lastToolList, "Expected a tool list result");
    const tool = this.lastToolList.tools.find((t) => t.name === toolName);
    assert.ok(tool, `Tool "${toolName}" not found in list`);
    assert.ok(
      tool.description?.toLowerCase().includes(keyword.toLowerCase()),
      `Expected "${toolName}" description to mention "${keyword}" but got: "${tool.description}"`
    );
  }
);

Then(
  "the {string} tool schema has a required {string} parameter",
  function (this: AppWorld, toolName: string, paramName: string) {
    const schema = getToolSchema(this, toolName);
    assert.ok(
      paramName in schema.properties,
      `Expected "${toolName}" schema to have "${paramName}" but got: [${Object.keys(
        schema.properties
      ).join(", ")}]`
    );
  }
);

Then(
  "the {string} tool schema has an optional {string} parameter",
  function (this: AppWorld, toolName: string, paramName: string) {
    const schema = getToolSchema(this, toolName);
    assert.ok(
      paramName in schema.properties,
      `Expected "${toolName}" schema to have "${paramName}" (optional)`
    );
    const required: string[] = schema.required ?? [];
    assert.ok(
      !required.includes(paramName),
      `Expected "${paramName}" to be optional but it is listed as required`
    );
  }
);

Then(
  "the {string} tool schema does not have a {string} parameter",
  function (this: AppWorld, toolName: string, paramName: string) {
    const schema = getToolSchema(this, toolName);
    assert.ok(
      !(paramName in schema.properties),
      `Expected "${toolName}" schema to NOT have "${paramName}"`
    );
  }
);

// ── Helpers ──────────────────────────────────────────────────────────────────

function getToolSchema(
  world: AppWorld,
  toolName: string
): { properties: Record<string, unknown>; required?: string[] } {
  assert.ok(world.lastToolList, "Expected a tool list result");
  const tool = world.lastToolList.tools.find((t) => t.name === toolName);
  assert.ok(tool, `Tool "${toolName}" not found`);
  const schema = tool.inputSchema as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  assert.ok(schema.properties, `Expected "${toolName}" to have a schema`);
  return schema as { properties: Record<string, unknown>; required?: string[] };
}
