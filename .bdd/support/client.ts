/**
 * BDD test client factory.
 *
 * Deliberately does NOT set NOTIFICATION_DRY_RUN=true so individual
 * scenarios can control the TTS mode themselves.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";
import type { MetricsCollector, IssueCollector } from "../../src/metrics/index.js";

export interface BddTestClient {
  client: Client;
  metricsCollector: MetricsCollector | null;
  issueCollector: IssueCollector | null;
  cleanup: () => Promise<void>;
}

export async function createBddClient(): Promise<BddTestClient> {
  const { server, metricsCollector, issueCollector } = await createServer();

  const client = new Client(
    { name: "bdd-test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);

  return {
    client,
    metricsCollector,
    issueCollector,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

export function extractText(
  result: Awaited<ReturnType<Client["callTool"]>> | null
): string {
  if (!result) return "";
  const content = "content" in result ? result.content : [];
  if (!Array.isArray(content)) return "";
  const item = content.find(
    (c): c is { type: "text"; text: string } =>
      typeof c === "object" && c !== null && "type" in c && c.type === "text"
  );
  return item?.text ?? "";
}
