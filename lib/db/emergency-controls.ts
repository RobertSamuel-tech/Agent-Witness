import {
  executeSql,
  uuidParam,
  textParam,
  getString,
  getNullableString,
  getBoolean,
  type DbRecord,
} from "./index";

export interface EmergencyControl {
  id: string;
  tenant_id: string;
  is_agent_execution_paused: boolean;
  reason: string | null;
  paused_by: string | null;
  created_at: string;
  updated_at: string;
}

function toEmergencyControl(row: DbRecord): EmergencyControl {
  return {
    id: getString(row, "id"),
    tenant_id: getString(row, "tenant_id"),
    is_agent_execution_paused: getBoolean(row, "is_agent_execution_paused"),
    reason: getNullableString(row, "reason"),
    paused_by: getNullableString(row, "paused_by"),
    created_at: getString(row, "created_at"),
    updated_at: getString(row, "updated_at"),
  };
}

async function ensureControlRecord(tenantId: string): Promise<EmergencyControl> {
  const rows = await executeSql(
    `INSERT INTO emergency_controls (tenant_id, is_agent_execution_paused)
     VALUES (:tenantId, false)
     ON CONFLICT (tenant_id) DO NOTHING
     RETURNING *`,
    [uuidParam("tenantId", tenantId)]
  );

  if (rows.length > 0) return toEmergencyControl(rows[0]);

  const existing = await executeSql(
    `SELECT * FROM emergency_controls WHERE tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  if (existing.length === 0) throw new Error("Failed to create emergency control record");
  return toEmergencyControl(existing[0]);
}

export async function getControlStatus(tenantId: string): Promise<EmergencyControl> {
  return ensureControlRecord(tenantId);
}

export async function pauseAgentExecution(
  tenantId: string,
  reason: string,
  pausedBy: string
): Promise<EmergencyControl> {
  await ensureControlRecord(tenantId);

  const rows = await executeSql(
    `UPDATE emergency_controls
     SET is_agent_execution_paused = true,
         reason = :reason,
         paused_by = :pausedBy,
         updated_at = now()
     WHERE tenant_id = :tenantId
     RETURNING *`,
    [
      uuidParam("tenantId", tenantId),
      textParam("reason", reason),
      textParam("pausedBy", pausedBy),
    ]
  );

  if (rows.length === 0) throw new Error("Failed to update emergency control");
  return toEmergencyControl(rows[0]);
}

export async function resumeAgentExecution(tenantId: string): Promise<EmergencyControl> {
  await ensureControlRecord(tenantId);

  const rows = await executeSql(
    `UPDATE emergency_controls
     SET is_agent_execution_paused = false,
         reason = null,
         paused_by = null,
         updated_at = now()
     WHERE tenant_id = :tenantId
     RETURNING *`,
    [uuidParam("tenantId", tenantId)]
  );

  if (rows.length === 0) throw new Error("Failed to update emergency control");
  return toEmergencyControl(rows[0]);
}

export async function isExecutionPaused(tenantId: string): Promise<boolean> {
  const rows = await executeSql(
    `SELECT is_agent_execution_paused FROM emergency_controls WHERE tenant_id = :tenantId`,
    [uuidParam("tenantId", tenantId)]
  );

  if (rows.length === 0) return false;
  return getBoolean(rows[0], "is_agent_execution_paused");
}
