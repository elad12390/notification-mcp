# Module: server

## Anchor

**What:** Assembles the MCP server instance, wires together tools, metrics, and
transport, and exposes it for connection via stdio.

**Why:** The server factory is the composition root — it decides which tools are
registered, whether metrics are active, and how tools are wrapped.

## Layer 1: Interface

### createServer()

Returns `{ server: McpServer, metricsCollector, issueCollector }`.

- When `metricsEnabled = true`: wraps tools with `createMetricsWrapper`, registers `report_issue`
- When `metricsEnabled = false`: wraps tools with `createIdentityWrapper`, no `report_issue`

### Tool Registry

| Tool | Always registered | Condition |
|------|------------------|-----------|
| `notify` | yes | — |
| `report_issue` | no | only when metrics enabled |

## Layer 2: Constraints

| ID | Constraint |
|----|-----------|
| S1 | `notify` tool is always present regardless of metrics setting |
| S2 | `report_issue` tool is present if and only if metrics are enabled |
| S3 | `notify` tool schema includes `reasoning` if and only if metrics are enabled |
| S4 | Server name is `notification-mcp` |
| S5 | MCP protocol version compliance — server responds to `tools/list` and `tools/call` |

## Layer 3: Examples

| Condition | notify in list? | report_issue in list? | reasoning in notify schema? |
|-----------|-----------------|----------------------|----------------------------|
| metrics enabled (default) | yes | yes | yes |
| metrics disabled | yes | no | no |
