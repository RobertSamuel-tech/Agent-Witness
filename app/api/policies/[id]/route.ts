import { NextRequest, NextResponse } from "next/server";
import { deletePolicy, updatePolicy } from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface UpdatePolicyBody {
  ruleConfig?: Record<string, unknown>;
  isActive?: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseUpdatePolicyBody(value: unknown): UpdatePolicyBody | null {
  if (!isPlainObject(value)) return null;

  const body: UpdatePolicyBody = {};

  if (value.ruleConfig !== undefined) {
    if (!isPlainObject(value.ruleConfig)) return null;
    body.ruleConfig = value.ruleConfig;
  }

  if (value.isActive !== undefined) {
    if (typeof value.isActive !== "boolean") return null;
    body.isActive = value.isActive;
  }

  if (body.ruleConfig === undefined && body.isActive === undefined) return null;

  return body;
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return null;
  return tenantId;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function DELETE(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
  }

  try {
    const deleted = await deletePolicy(id, tenantId);
    if (!deleted) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("DELETE /api/policies/[id] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "Invalid policy id" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseUpdatePolicyBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body: provide ruleConfig (object) and/or isActive (boolean)" },
      { status: 400 }
    );
  }

  try {
    const policy = await updatePolicy(id, tenantId, {
      rule_config: body.ruleConfig,
      is_active: body.isActive,
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json({ policy });
  } catch (error) {
    console.error("PATCH /api/policies/[id] failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
