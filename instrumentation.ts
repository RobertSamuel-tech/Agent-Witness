/**
 * Runs once when a new Next.js server instance starts, before it accepts
 * requests. Used to validate that EMBEDDING_MODEL produces the
 * 1536-dimension vectors required by agent_actions.embedding, failing fast
 * on a misconfigured EMBEDDING_MODEL rather than corrupting data at runtime.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { validateEmbeddingDimensions } = await import("@/lib/ai/embedder");
  await validateEmbeddingDimensions();
}
