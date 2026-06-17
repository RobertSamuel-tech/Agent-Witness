import { NextRequest, NextResponse } from "next/server";
import { embedText } from "@/lib/ai/embedder";
import { searchSimilarActions } from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEFAULT_LIMIT = 10;

interface SearchRequestBody {
  query: string;
  limit: number;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSearchBody(value: unknown): SearchRequestBody | null {
  if (!isPlainObject(value)) return null;
  if (typeof value.query !== "string" || value.query.trim().length === 0) return null;

  let limit = DEFAULT_LIMIT;
  if (value.limit !== undefined) {
    if (typeof value.limit !== "number" || !Number.isFinite(value.limit) || value.limit <= 0) {
      return null;
    }
    limit = Math.floor(value.limit);
  }

  return { query: value.query, limit };
}

function suggestQuery(query: string): string {
  return `No semantically similar actions found for "${query}". Try a shorter or more general phrase, or remove specific identifiers (names, IDs, dates).`;
}

/**
 * Semantic search over `agent_actions.embedding`.
 *
 * This query relies on the HNSW (vector_cosine_ops) index defined in
 * lib/db/schema.sql on `agent_actions.embedding`, evaluated entirely inside
 * Aurora Postgres via the `<=>` cosine-distance operator. RLS (set via
 * setTenantContext, invoked by searchSimilarActions) restricts the index
 * scan to the requesting tenant's rows before ranking, so the approximate
 * nearest-neighbor search and the multi-tenant filter happen in a single
 * indexed query.
 *
 * This is not possible in DynamoDB: DynamoDB has no vector index type, no
 * `ORDER BY` on a computed expression, and no operator equivalent to `<=>`.
 * A DynamoDB-backed implementation would require exporting every candidate
 * item, computing cosine similarity in application code, and sorting
 * client-side — an O(n) scan per query with no way to push the ranking
 * down to the database.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseSearchBody(rawBody);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    const embedding = await embedText(body.query);
    const matches = await searchSimilarActions(tenantId, embedding, body.limit);

    const results = matches.map((match) => ({
      id: match.id,
      agent_id: match.agent_id,
      agentName: match.agentName,
      action_type: match.action_type,
      input_summary: match.input_summary,
      output_summary: match.output_summary,
      policy_result: match.policy_result,
      similarity: match.similarity,
      created_at: match.created_at,
    }));

    if (results.length === 0) {
      return NextResponse.json({ results: [], suggestedQuery: suggestQuery(body.query) });
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("POST /api/search failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
