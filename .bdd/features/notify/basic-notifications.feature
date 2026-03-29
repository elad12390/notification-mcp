Feature: Basic Notifications
  As an AI assistant using the notify MCP tool
  I want to send spoken notifications to the user
  So that users are alerted when tasks complete without watching the screen

  Background:
    Given the MCP server is running in dry-run mode

  Scenario: Send a simple text notification
    When I call notify with message "Task complete"
    Then the notification is accepted
    And the response contains "Notification sent"
    And the response contains "Task complete"

  Scenario: Send a notification with a title
    When I call notify with message "Build succeeded" and title "CI Complete"
    Then the notification is accepted
    And the response contains "Notification sent"

  Scenario: Title is prepended to message
    When I call notify with message "All tests passed" and title "Build"
    Then the notification is accepted

  Scenario: Send a notification with a named voice
    When I call notify with message "Hello" and voice "bella"
    Then the notification is accepted

  Scenario: Send a notification with all parameters
    When I call notify with message "Done!" and title "Summary" and voice "george"
    Then the notification is accepted

  Scenario: message parameter is required
    When I call notify without a message
    Then the call is rejected with a validation error

  Scenario: message must be a string
    When I call notify with a non-string message
    Then the call is rejected with a validation error

  Scenario: reasoning is required when metrics are enabled
    When I call notify with message "test" but without reasoning
    Then the call is rejected with a validation error

  Scenario Outline: Expressive punctuation in messages is accepted
    When I call notify with message "<message>"
    Then the notification is accepted

    Examples:
      | message                                           |
      | Hey! Your task is done. Everything went smoothly. |
      | Wait... something looks off. Check the logs.      |
      | Done, the build succeeded, and all tests passed.  |
      | Really? That worked on the first try?             |
