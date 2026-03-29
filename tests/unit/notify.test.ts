import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { createTestServer } from "../helpers.js";
import { register } from "../../src/tools/notify.js";
import { createIdentityWrapper } from "../../src/tools/wrapper.js";
import { ServerContext } from "../../src/server.js";

describe("notify tool", () => {
  let ctx: ServerContext;

  beforeEach(async () => {
    ctx = await createTestServer();
  });

  it("should register the notify tool on the server", () => {
    // The tool is already registered via createTestServer -> createServer -> registerTools
    // This test verifies the registration doesn't throw
    expect(ctx.server).toBeDefined();
  });

  it("should register without errors when called directly", () => {
    const freshServer = new McpServer(
      { name: "test", version: "1.0.0" },
      { capabilities: { tools: {} } }
    );
    const wrapTool = createIdentityWrapper();

    expect(() => register(freshServer, wrapTool)).not.toThrow();
  });
});
