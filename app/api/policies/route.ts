import { NextRequest, NextResponse } from "next/server";
import { getPoliciesByTenant, insertPolicy } from "@/lib/db/queries";
import type { PolicyRuleType } from "@/lib/db/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_RULE_TYPES: PolicyRuleType[] = ["cost_limit", "data_masking", "domain_block"];

interface CreatePolicyBody {
  ruleType: PolicyRuleType;
  ruleConfig: Record<string, unknown>;
  isActive: boolean;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPolicyRuleType(value: unknown): value is PolicyRuleType {
  return typeof value === "string" && (VALID_RULE_TYPES as string[]).includes(value);
}

function parseCreatePolicyBody(value: unknown): CreatePolicyBody | null {
  if (!isPlainObject(value)) return null;
  if (!isPolicyRuleType(value.ruleType)) return null;
  if (!isPlainObject(value.ruleConfig)) return null;

  let isActive = true;
  if (value.isActive !== undefined) {
    if (typeof value.isActive !== "boolean") return null;
    isActive = value.isActive;
  }

  return { ruleType: value.ruleType, ruleConfig: value.ruleConfig, isActive };
}

function getTenantId(request: NextRequest): string | null {
  const tenantId = request.headers.get("x-tenant-id");
  if (!tenantId || !UUID_PATTERN.test(tenantId)) return null;
  return tenantId;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  try {
    const policies = await getPoliciesByTenant(tenantId);
    return NextResponse.json({ policies });
  } catch (error) {
    console.error("GET /api/policies failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const tenantId = getTenantId(request);
  if (!tenantId) {
    return NextResponse.json({ error: "Missing or invalid x-tenant-id header" }, { status: 400 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = parseCreatePolicyBody(rawBody);
  if (!body) {
    return NextResponse.json(
      { error: "Invalid request body: ruleType must be one of cost_limit, data_masking, domain_block and ruleConfig must be an object" },
      { status: 400 }
    );
  }

  try {
    const policy = await insertPolicy({
      tenant_id: tenantId,
      rule_type: body.ruleType,
      rule_config: body.ruleConfig,
      is_active: body.isActive,
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (error) {
    console.error("POST /api/policies failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
