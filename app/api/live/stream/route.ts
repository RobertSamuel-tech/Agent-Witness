import { NextRequest } from "next/server";
import { getRecentLiveEvents, getLiveEventsSince, getLiveKpis } from "@/lib/db/live-stream";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POLL_INTERVAL_MS = 3000;

function getTenantId(request: NextRequest): string | null {
  const id = request.headers.get("x-tenant-id");
  if (!id || !UUID_PATTERN.test(id)) return null;
  return id;
}

function encode(encoder: TextEncoder, event: string, data: unknown): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function GET(request: NextRequest): Promise<Response> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return new Response(JSON.stringify({ error: "Missing or invalid x-tenant-id header" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let lastTimestamp = new Date().toISOString();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial batch of recent events
        const initial = await getRecentLiveEvents(tenantId, 25);
        if (initial.length > 0) {
          lastTimestamp = initial[0].createdAt;
        }
        controller.enqueue(encode(encoder, "init", initial));

        // Send initial KPIs
        const kpis = await getLiveKpis(tenantId);
        controller.enqueue(encode(encoder, "kpis", kpis));
      } catch (err) {
        console.error("SSE init failed", err);
        controller.enqueue(encode(encoder, "error", { message: "Failed to load initial events" }));
      }

      let kpiTick = 0;

      pollTimer = setInterval(async () => {
        if (request.signal.aborted) {
          if (pollTimer) clearInterval(pollTimer);
          try { controller.close(); } catch { /* already closed */ }
          return;
        }

        try {
          const newEvents = await getLiveEventsSince(tenantId, lastTimestamp);
          if (newEvents.length > 0) {
            lastTimestamp = newEvents[0].createdAt;
            controller.enqueue(encode(encoder, "events", newEvents));
          }

          // Refresh KPIs every 5 poll cycles (~15 seconds)
          kpiTick++;
          if (kpiTick % 5 === 0) {
            const kpis = await getLiveKpis(tenantId);
            controller.enqueue(encode(encoder, "kpis", kpis));
          }

          // Keep-alive heartbeat
          controller.enqueue(encoder.encode(": heartbeat\n\n"));
        } catch (err) {
          console.error("SSE poll failed", err);
          controller.enqueue(encoder.encode(": poll-error\n\n"));
        }
      }, POLL_INTERVAL_MS);

      request.signal.addEventListener("abort", () => {
        if (pollTimer) clearInterval(pollTimer);
        try { controller.close(); } catch { /* already closed */ }
      });
    },

    cancel() {
      if (pollTimer) clearInterval(pollTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
