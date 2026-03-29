Feature: Usage Metrics Collection
  As a server maintainer
  I want to track how the notify tool is being used
  So that I can understand usage patterns and optimize the server

  Background:
    Given the MCP server is running in dry-run mode

  Scenario: A successful invocation is recorded
    When I call notify with message "test"
    Then 1 invocation has been recorded
    And the last invocation was successful
    And the last invocation recorded the reasoning

  Scenario: Invocation counts accumulate across multiple calls
    When I call notify with message "call one"
    And I call notify with message "call two"
    And I call notify with message "call three"
    Then at least 3 invocations have been recorded
    And the notify tool call count is at least 3

  Scenario: Duration is tracked for each invocation
    When I call notify with message "timed call"
    Then the last invocation has a non-negative duration

  Scenario: The reasoning is stored but not included in arguments
    When I call notify with message "hello" and voice "bella"
    Then the last invocation arguments contain message "hello"
    And the last invocation arguments contain voice "bella"
    But the last invocation arguments do not contain reasoning

  Scenario: A failed TTS call is recorded as a failure
    Given metrics are enabled
    When the notify tool fails internally
    Then the last invocation was not successful
    And the last invocation has an error message
