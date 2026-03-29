Feature: TTS Engine Selection
  As a user configuring notification-mcp
  I want to choose which TTS engine is used
  So that I can balance speed, quality, and available dependencies

  @say
  Scenario: macOS say engine speaks a message
    Given the MCP server is running with real TTS
    And the notification method is "say"
    When I call notify with message "hi"
    Then the notification is accepted
    And audio was produced

  @say
  Scenario: say engine accepts an explicit voice
    Given the MCP server is running with real TTS
    And the notification method is "say"
    When I call notify with message "hi" and voice "Samantha"
    Then the notification is accepted

  @say
  Scenario: say engine with title prepends title to spoken message
    Given the MCP server is running with real TTS
    And the notification method is "say"
    When I call notify with message "task done" and title "Build"
    Then the notification is accepted

  @say
  Scenario: say engine with a Kokoro voice alias falls back gracefully
    Given the MCP server is running with real TTS
    And the notification method is "say"
    When I call notify with message "hi" and voice "bella"
    Then the notification is accepted

  @requires-uv
  Scenario: kokoro engine generates speech with the default voice
    Given the MCP server is running with real TTS
    And the notification method is "kokoro"
    When I call notify with message "hello"
    Then the notification is accepted

  @requires-uv
  Scenario: kokoro resolves the friendly alias "heart" to af_heart
    Given the MCP server is running with real TTS
    And the notification method is "kokoro"
    When I call notify with message "hello" and voice "heart"
    Then the notification is accepted

  @requires-uv
  Scenario: kokoro resolves the friendly alias "george" to bm_george
    Given the MCP server is running with real TTS
    And the notification method is "kokoro"
    When I call notify with message "hello" and voice "george"
    Then the notification is accepted

  @requires-uv @requires-ffmpeg
  Scenario: f5tts engine generates speech
    Given the MCP server is running with real TTS
    And the notification method is "f5tts"
    When I call notify with message "hello"
    Then the notification is accepted
