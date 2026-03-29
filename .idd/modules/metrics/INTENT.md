# Module: metrics

## Anchor

**What:** Tracks tool usage analytics and provides an issue-reporting tool for
users to submit feedback directly through the MCP interface.

**Why:** Server maintainers need visibility into how tools are used and a
zero-friction path for users to report issues without leaving their workflow.

## Layer 1: Interface

### MetricsCollector

Records every tool invocation with: tool name, timestamp, duration, reasoning,
arguments (without reasoning), result or error, success flag.

Persists to `~/.mcp-metrics/{serverName}.json`.

### IssueCollector

Records user-submitted issues to `~/.mcp-metrics/{serverName}.issues.json`.

### report_issue Tool

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string (min 5 chars) | yes | Brief issue title |
| `description` | string (min 10 chars) | yes | Detailed description |
| `severity` | enum | no | `low`, `medium`, `high`, `critical` |
| `category` | enum | no | `bug`, `feature_request`, `documentation`, `performance`, `security`, `other` |
| `steps_to_reproduce` | string | no | Step-by-step reproduction |
| `expected_behavior` | string | no | What should happen |
| `actual_behavior` | string | no | What actually happens |
| `environment` | string | no | OS, Node version, etc. |
| `reasoning` | string | yes (when metrics on) | Why the tool is being called |

## Layer 2: Constraints

| ID | Constraint |
|----|-----------|
| M1 | When enabled: all tools require a `reasoning` parameter |
| M2 | When disabled: tools work without `reasoning`; `report_issue` not available |
| M3 | Metrics file is capped at `metricsMaxSizeBytes`; oldest 25% trimmed on overflow |
| M4 | Maximum 100 issues stored; oldest removed when limit reached |
| M5 | `reasoning` is stored separately; not included in recorded `arguments` |
| M6 | Invocation recording is non-blocking (async write queue) |
| M7 | Metrics storage failures are silent (logged to stderr, do not affect tool result) |
| M8 | `title` min length: 5 characters |
| M9 | `description` min length: 10 characters |

## Layer 3: Examples

### Metrics recording

| Action | Expected state |
|--------|---------------|
| Call notify once | `total_invocations = 1`, `tool_stats.notify.call_count = 1` |
| Call notify 3 times | `total_invocations = 3`, `tool_stats.notify.call_count = 3` |
| Call fails | `invocations[0].success = false`, `invocations[0].error` is set |
| Call succeeds | `invocations[0].success = true`, `invocations[0].result` is set |
| Reasoning provided | `invocations[0].reasoning` stores the reasoning string |
| Arguments recorded | `invocations[0].arguments` contains all args except `reasoning` |

### Issue reporting

| Input | Expected |
|-------|----------|
| Valid bug report | Saved to collector, response contains "Issue reported successfully" |
| Valid feature request | Saved to collector, response contains "Feature request" |
| Title "Hi" (4 chars) | `isError: true` |
| Description "Too short" (9 chars) | `isError: true` |
| All optional fields provided | All fields saved correctly |
