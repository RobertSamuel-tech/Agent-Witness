import OpenAI from "openai";
import { createHash } from "crypto";

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? DEFAULT_EMBEDDING_MODEL;
const EMBEDDING_DIMENSIONS = 1536;
const MAX_INPUT_LENGTH = 8000;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15000;
const RETRY_BASE_DELAY_MS = 250;

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!cachedClient) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error("Missing required environment variable: OPENROUTER_API_KEY");
    }

    const defaultHeaders: Record<string, string> = {};
    const siteUrl = process.env.OPENROUTER_SITE_URL;
    const appName = process.env.OPENROUTER_APP_NAME;
    if (siteUrl) defaultHeaders["HTTP-Referer"] = siteUrl;
    if (appName) defaultHeaders["X-Title"] = appName;

    cachedClient = new OpenAI({
      apiKey,
      baseURL: OPENROUTER_BASE_URL,
      timeout: REQUEST_TIMEOUT_MS,
      defaultHeaders,
    });
  }
  return cachedClient;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Verifies that EMBEDDING_MODEL produces EMBEDDING_DIMENSIONS-dimension
 * vectors, by generating a single test embedding for "health_check". Intended
 * for use at server startup so a misconfigured EMBEDDING_MODEL is caught
 * immediately rather than silently corrupting the agent_actions.embedding
 * column (vector(1536)).
 *
 * If OPENROUTER_API_KEY is not configured, or the OpenRouter request itself
 * fails (network outage, rate limit, etc.), validation is skipped — those
 * cases are already handled by embedText()'s local fallback embedding, which
 * is always EMBEDDING_DIMENSIONS-dimensional by construction. This function
 * only throws when OpenRouter responds successfully with the wrong
 * dimensionality, which indicates EMBEDDING_MODEL is misconfigured.
 */
export async function validateEmbeddingDimensions(): Promise<void> {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      "validateEmbeddingDimensions: OPENROUTER_API_KEY not set, skipping startup embedding check"
    );
    return;
  }

  let embedding: number[];

  try {
    const client = getClient();
    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: "health_check",
    });

    const result = response.data[0]?.embedding;
    if (!result) {
      throw new Error("OpenRouter embeddings response did not contain an embedding");
    }
    embedding = result;
  } catch (error) {
    console.warn(
      "validateEmbeddingDimensions: OpenRouter request failed, skipping startup embedding check",
      error
    );
    return;
  }

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `EMBEDDING_MODEL "${EMBEDDING_MODEL}" returns ${embedding.length}-dimension embeddings, ` +
        `but agent_actions.embedding requires exactly ${EMBEDDING_DIMENSIONS} dimensions. ` +
        `Set EMBEDDING_MODEL to a model that produces ${EMBEDDING_DIMENSIONS}-dimension vectors.`
    );
  }

  console.info(
    `validateEmbeddingDimensions: "${EMBEDDING_MODEL}" returns ${EMBEDDING_DIMENSIONS}-dimension embeddings`
  );
}

/**
 * Returns a 1536-dimension embedding for `text`, using the configured
 * EMBEDDING_MODEL via OpenRouter with up to 3 attempts. If every attempt
 * fails (e.g. no API key, network outage, rate limit), falls back to a
 * deterministic local embedding so ingestion never blocks on OpenRouter
 * availability.
 */
export async function embedText(text: string): Promise<number[]> {
  const input = text.slice(0, MAX_INPUT_LENGTH);

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const client = getClient();
      const response = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input,
      });

      const embedding = response.data[0]?.embedding;
      if (!embedding) {
        throw new Error("OpenRouter embeddings response did not contain an embedding");
      }
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Unexpected embedding dimensionality: expected ${EMBEDDING_DIMENSIONS}, received ${embedding.length}`
        );
      }

      return embedding;
    } catch (error) {
      lastError = error;
      console.error(`embedText attempt ${attempt}/${MAX_ATTEMPTS} failed`, error);

      if (attempt < MAX_ATTEMPTS) {
        await delay(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
      }
    }
  }

  console.error("embedText: all OpenRouter attempts failed, using local fallback embedding", lastError);
  return localEmbedding(input);
}

/**
 * Instant local embedding for bulk/seed workloads where OpenRouter latency is
 * unacceptable. Same SHA-256 → mulberry32 PRNG algorithm as the fallback path
 * in embedText(), guaranteed to be exactly EMBEDDING_DIMENSIONS-dimensional.
 */
export function embedTextLocal(text: string): number[] {
  return localEmbedding(text.slice(0, MAX_INPUT_LENGTH));
}

/**
 * Deterministic, dependency-free embedding used when OpenAI is unavailable.
 * The same input text always produces the same 1536-dimension unit vector
 * (seeded from a SHA-256 digest of the text, expanded via a mulberry32 PRNG).
 */
function localEmbedding(text: string): number[] {
  const digest = createHash("sha256").update(text, "utf8").digest();

  let state = 0;
  for (const byte of digest) {
    state = (state * 31 + byte) >>> 0;
  }
  if (state === 0) {
    state = 0x9e3779b9;
  }

  const vector = new Array<number>(EMBEDDING_DIMENSIONS);
  let sumSquares = 0;

  for (let i = 0; i < EMBEDDING_DIMENSIONS; i++) {
    state = mulberry32Step(state);
    const normalized = (state / 0xffffffff) * 2 - 1;
    vector[i] = normalized;
    sumSquares += normalized * normalized;
  }

  const magnitude = Math.sqrt(sumSquares) || 1;
  return vector.map((value) => value / magnitude);
}

function mulberry32Step(state: number): number {
  let t = (state + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (t ^ (t >>> 14)) >>> 0;
}
