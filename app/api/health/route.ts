import { NextResponse } from "next/server";
import { executeSql } from "@/lib/db";
import { embedText } from "@/lib/ai/embedder";

type ServiceStatus = "connected" | "disconnected";

interface HealthResponse {
  status: "ok" | "degraded";
  services: {
    aurora: ServiceStatus;
    openrouter: ServiceStatus;
  };
  timestamp: string;
}

async function checkAurora(): Promise<ServiceStatus> {
  try {
    await executeSql("SELECT 1");
    return "connected";
  } catch (error) {
    console.error("Health check: Aurora connectivity failed", error);
    return "disconnected";
  }
}

async function checkOpenRouter(): Promise<ServiceStatus> {
  try {
    await embedText("health_check");
    return "connected";
  } catch (error) {
    console.error("Health check: OpenRouter connectivity failed", error);
    return "disconnected";
  }
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [aurora, openrouter] = await Promise.all([checkAurora(), checkOpenRouter()]);

  const timestamp = new Date().toISOString();
  const status: HealthResponse["status"] =
    aurora === "connected" && openrouter === "connected" ? "ok" : "degraded";

  const body: HealthResponse = {
    status,
    services: { aurora, openrouter },
    timestamp,
  };

  return NextResponse.json(body, {
    status: status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
