import {
  World,
  setWorldConstructor,
  setDefaultTimeout,
  type IWorldOptions,
} from "@cucumber/cucumber";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { MetricsCollector, IssueCollector } from "../../src/metrics/index.js";

// TTS calls (especially kokoro) can take up to 30 seconds
setDefaultTimeout(30 * 1000);

export class AppWorld extends World {
  // MCP client for the scenario
  client!: Client;
  metricsCollector: MetricsCollector | null = null;
  issueCollector: IssueCollector | null = null;

  // Last results for Then assertions
  lastToolResult: Awaited<ReturnType<Client["callTool"]>> | null = null;
  lastToolList: Awaited<ReturnType<Client["listTools"]>> | null = null;

  // Cleanup callback provided by the client factory
  cleanup: (() => Promise<void>) | null = null;

  // Temp directory created for a fake TTS binary (error-handling tests)
  fakeTtsDir: string | undefined = undefined;

  // Snapshots taken at Before hook for delta-based metric assertions
  issueCountBefore = 0;
  invocationCountBefore = 0;

  // Environment variable overrides — restored in After hook
  private readonly savedEnv = new Map<string, string | undefined>();

  constructor(options: IWorldOptions) {
    super(options);
  }

  /** Override an env var and save the original for restoration. */
  setEnv(key: string, value: string | undefined): void {
    if (!this.savedEnv.has(key)) {
      this.savedEnv.set(key, process.env[key]);
    }
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  /** Restore all env vars to their state before the scenario. */
  restoreEnv(): void {
    for (const [key, original] of this.savedEnv) {
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
    this.savedEnv.clear();
  }
}

setWorldConstructor(AppWorld);
