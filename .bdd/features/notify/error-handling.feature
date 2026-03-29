Feature: Notification Error Handling
  As a system using notification-mcp
  I want TTS failures to be handled gracefully
  So that the MCP protocol is never broken by an audio error

  @say
  Scenario: TTS failure returns an error response — not a thrown exception
    Given the MCP server is running with real TTS
    And the TTS binary will fail with exit code 1
    When I call notify with message "test"
    Then the call returns an error response
    And the response contains "Failed to send notification"
    And the MCP connection is still open

  @say
  Scenario: Server remains fully operational after a TTS failure
    Given the MCP server is running with real TTS
    And the TTS binary will fail with exit code 1
    When I call notify with message "first call"
    Then the call returns an error response
    When the TTS binary is restored
    And I call notify with message "second call" in dry-run mode
    Then the notification is accepted
