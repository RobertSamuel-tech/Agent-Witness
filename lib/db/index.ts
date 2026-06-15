import { Pool, type QueryResultRow } from "pg";

export type DbRecord = Record<string, unknown>;

export interface QueryParameter {
  name: string;
  value: unknown;
}

let cachedPool: Pool | null = null;

function getPool(): Pool {
  if (!cachedPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Missing required environment variable: DATABASE_URL");
    }
    cachedPool = new Pool({ connectionString });
  }
  return cachedPool;
}

/**
 * Rewrites named placeholders (":name") into pg's positional "$N" syntax and
 * builds the matching values array. A negative lookbehind keeps type casts
 * like "::vector" or "::UUID" from being misread as placeholders, and a
 * placeholder repeated within the same statement (e.g. ":embedding" used in
 * both SELECT and ORDER BY) is mapped to a single "$N".
 */
function toPositionalQuery(sql: string, parameters: QueryParameter[]): { text: string; values: unknown[] } {
  const indexByName = new Map<string, number>();
  const values: unknown[] = [];

  const text = sql.replace(/(?<!:):(\w+)/g, (_match, name: string) => {
    let index = indexByName.get(name);
    if (index === undefined) {
      const parameter = parameters.find((candidate) => candidate.name === name);
      if (!parameter) {
        throw new Error(`Missing value for query parameter ":${name}"`);
      }
      values.push(parameter.value);
      index = values.length;
      indexByName.set(name, index);
    }
    return `$${index}`;
  });

  return { text, values };
}

function decodeRow(row: QueryResultRow): DbRecord {
  const result: DbRecord = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = value instanceof Date ? value.toISOString() : value;
  }
  return result;
}

/**
 * Executes a single SQL statement against the Aurora PostgreSQL cluster and
 * returns the result set as plain JS objects keyed by column name.
 */
export async function executeSql(sql: string, parameters: QueryParameter[] = []): Promise<DbRecord[]> {
  const { text, values } = toPositionalQuery(sql, parameters);

  try {
    const result = await getPool().query(text, values);
    return result.rows.map(decodeRow);
  } catch (error) {
    console.error("Database query failed", { sql, error });
    throw new Error(`Database query failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// --- SQL parameter builders -------------------------------------------------

export function textParam(name: string, value: string | null): QueryParameter {
  return { name, value };
}

export function uuidParam(name: string, value: string | null): QueryParameter {
  return { name, value };
}

export function intParam(name: string, value: number | null): QueryParameter {
  return { name, value };
}

export function boolParam(name: string, value: boolean | null): QueryParameter {
  return { name, value };
}

export function jsonParam(name: string, value: unknown): QueryParameter {
  return { name, value: JSON.stringify(value) };
}

export function decimalParam(name: string, value: number | null): QueryParameter {
  return { name, value: value === null ? null : value.toString() };
}

export function vectorParam(name: string, value: number[] | null): QueryParameter {
  return { name, value: value === null ? null : `[${value.join(",")}]` };
}

// --- Row decoding helpers ----------------------------------------------------

export function getString(row: DbRecord, key: string): string {
  const value = row[key];
  if (typeof value !== "string") {
    throw new Error(`Expected string for column "${key}", received ${typeof value}`);
  }
  return value;
}

export function getNullableString(row: DbRecord, key: string): string | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    throw new Error(`Expected string or null for column "${key}", received ${typeof value}`);
  }
  return value;
}

export function getNumber(row: DbRecord, key: string): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  throw new Error(`Expected number for column "${key}", received ${typeof value}`);
}

export function getNullableNumber(row: DbRecord, key: string): number | null {
  const value = row[key];
  if (value === null || value === undefined) return null;
  return getNumber(row, key);
}

export function getBoolean(row: DbRecord, key: string): boolean {
  const value = row[key];
  if (typeof value !== "boolean") {
    throw new Error(`Expected boolean for column "${key}", received ${typeof value}`);
  }
  return value;
}

export function getJsonObject(row: DbRecord, key: string): Record<string, unknown> {
  const value = row[key];
  if (typeof value === "string") {
    const parsed: unknown = JSON.parse(value);
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`Expected JSON object for column "${key}"`);
    }
    return parsed as Record<string, unknown>;
  }
  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  throw new Error(`Expected JSON object for column "${key}", received ${typeof value}`);
}

export function getNullableNumberArray(row: DbRecord, key: string): number[] | null {
  const value = row[key];
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const trimmed = value.trim().replace(/^\[/, "").replace(/\]$/, "");
    if (trimmed.length === 0) return [];
    return trimmed.split(",").map((part) => {
      const parsed = Number(part);
      if (Number.isNaN(parsed)) {
        throw new Error(`Expected numeric vector component for column "${key}"`);
      }
      return parsed;
    });
  }

  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item !== "number") {
        throw new Error(`Expected numeric vector component for column "${key}"`);
      }
      return item;
    });
  }

  throw new Error(`Expected number array for column "${key}", received ${typeof value}`);
}
