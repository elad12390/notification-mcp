Feature: Tool Registration
  As an MCP client connecting to notification-mcp
  I want a predictable, documented set of tools
  So that I know exactly what capabilities are available

  Scenario: notify tool is always registered
    Given the MCP server is running in dry-run mode
    When I list the available tools
    Then the tool list includes "notify"

  Scenario: notify tool description mentions its purpose
    Given the MCP server is running in dry-run mode
    When I list the available tools
    Then the "notify" tool description mentions "notification"

  Scenario: notify tool requires a message parameter
    Given the MCP server is running in dry-run mode
    When I list the available tools
    Then the "notify" tool schema has a required "message" parameter

  Scenario: notify tool has optional title parameter
    Given the MCP server is running in dry-run mode
    When I list the available tools
    Then the "notify" tool schema has an optional "title" parameter

  Scenario: notify tool has optional voice parameter
    Given the MCP server is running in dry-run mode
    When I list the available tools
    Then the "notify" tool schema has an optional "voice" parameter

  Scenario: reasoning parameter is present when metrics are enabled
    Given the MCP server is running with metrics enabled
    When I list the available tools
    Then the "notify" tool schema has a required "reasoning" parameter

  Scenario: report_issue tool is present when metrics are enabled
    Given the MCP server is running with metrics enabled
    When I list the available tools
    Then the tool list includes "report_issue"

  Scenario: report_issue tool is absent when metrics are disabled
    Given the MCP server is running with metrics disabled
    When I list the available tools
    Then the tool list does not include "report_issue"

  Scenario: reasoning parameter is absent when metrics are disabled
    Given the MCP server is running with metrics disabled
    When I list the available tools
    Then the "notify" tool schema does not have a "reasoning" parameter
