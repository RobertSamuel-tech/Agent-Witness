import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";

// ── Configuration ─────────────────────────────────────────────────────────────

const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME ?? "AgentEvents";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AgentEvent {
  agentId: string;
  timestamp: string;
  eventType: string;
  tenantId: string;
  payload: Record<string, unknown>;
  ttl?: number;
}

export interface PutAgentEventParams {
  agentId: string;
  eventType: string;
  tenantId: string;
  payload?: Record<string, unknown>;
  /** Days until DynamoDB auto-expires the item. Defaults to 30. */
  ttlDays?: number;
}

// ── Client singleton ──────────────────────────────────────────────────────────

let _docClient: DynamoDBDocumentClient | null = null;

function getDocClient(): DynamoDBDocumentClient {
  if (!_docClient) {
    const region = process.env.AWS_REGION;
    if (!region) {
      throw new Error("Missing required environment variable: AWS_REGION");
    }
    const base = new DynamoDBClient({ region });
    _docClient = DynamoDBDocumentClient.from(base, {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _docClient;
}

// ── Row decoder ───────────────────────────────────────────────────────────────

function toAgentEvent(item: Record<string, unknown>): AgentEvent {
  return {
    agentId:   item["agentId"]   as string,
    timestamp: item["timestamp"] as string,
    eventType: item["eventType"] as string,
    tenantId:  item["tenantId"]  as string,
    payload:  (item["payload"]   as Record<string, unknown>) ?? {},
    ttl:       item["ttl"]       as number | undefined,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Writes a single agent event to DynamoDB with an automatic ISO timestamp
 * and a TTL that defaults to 30 days from now.
 */
export async function putAgentEvent(params: PutAgentEventParams): Promise<AgentEvent> {
  const client = getDocClient();

  const timestamp = new Date().toISOString();
  const ttlDays   = params.ttlDays ?? 30;
  const ttl       = Math.floor(Date.now() / 1000) + ttlDays * 86_400;

  const item: AgentEvent = {
    agentId:   params.agentId,
    timestamp,
    eventType: params.eventType,
    tenantId:  params.tenantId,
    payload:   params.payload ?? {},
    ttl,
  };

  await client.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item:      item,
    })
  );

  return item;
}

/**
 * Returns the most recent agent events across all agents, sorted by timestamp
 * descending. Scans up to 4× the requested limit to improve recency accuracy
 * without requiring a GSI; add a (tenantId, timestamp) GSI for production use
 * at scale.
 */
export async function getAllRecentEvents(limit = 50): Promise<AgentEvent[]> {
  const client    = getDocClient();
  const scanLimit = Math.max(limit * 4, 200);

  const result = await client.send(
    new ScanCommand({
      TableName: TABLE_NAME,
      Limit:     scanLimit,
    })
  );

  return (result.Items ?? [])
    .map((item) => toAgentEvent(item as Record<string, unknown>))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit);
}
