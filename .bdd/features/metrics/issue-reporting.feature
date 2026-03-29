Feature: Issue Reporting
  As a user of notification-mcp
  I want to report bugs and feature requests through the MCP interface
  So that I can give feedback without leaving my workflow

  Background:
    Given the MCP server is running in dry-run mode

  Scenario: Report a bug
    When I report an issue with title "Server crashes on empty message" and description "When an empty string is passed as message, the server crashes."
    Then the issue is accepted
    And the response confirms the issue was reported

  Scenario: Report a feature request
    When I report a feature request with title "Add Windows support" and description "Please add support for Windows platform notifications."
    Then the issue is accepted
    And the response mentions "Feature request"

  Scenario: Issue is saved to the collector
    When I report an issue with title "Test issue for persistence" and description "Verifying that issues are saved to the collector."
    Then the issue is accepted
    And the total issue count increased by 1

  Scenario: All optional fields are saved
    When I report an issue with all fields:
      | title             | Complete issue with all fields populated              |
      | description       | Testing that every optional field is saved correctly. |
      | severity          | critical                                              |
      | category          | security                                              |
      | steps_to_reproduce| 1. Do this\n2. Do that                               |
      | expected_behavior | Should not crash                                      |
      | actual_behavior   | Crashes immediately                                   |
      | environment       | Node.js 20, macOS 14                                  |
    Then the issue is accepted
    And the saved issue has all the provided fields

  Scenario: Title too short is rejected
    When I report an issue with title "Hi" and description "This is a valid description that meets the minimum length requirement."
    Then the call is rejected with a validation error

  Scenario: Description too short is rejected
    When I report an issue with title "Valid long title here" and description "Too short"
    Then the call is rejected with a validation error

  Scenario Outline: All issue categories are accepted
    When I report an issue with title "Test <category> issue" and description "Testing the <category> category for issue reporting." and category "<category>"
    Then the issue is accepted

    Examples:
      | category         |
      | bug              |
      | feature_request  |
      | documentation    |
      | performance      |
      | security         |
      | other            |

  Scenario Outline: All severity levels are accepted
    When I report an issue with title "Test <severity> issue" and description "Testing the <severity> severity level for issue reporting." and severity "<severity>"
    Then the issue is accepted

    Examples:
      | severity |
      | low      |
      | medium   |
      | high     |
      | critical |
