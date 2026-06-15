import { executeSql } from "./index";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Best-effort: sets the `app.current_tenant` session variable used by the
 * tenant_isolation RLS policies as defense-in-depth. With pg.Pool, this SET
 * and subsequent queries are not guaranteed to share a connection, so it may
 * not take effect — primary tenant isolation is the explicit
 * `WHERE tenant_id = :tenantId` predicate on every tenant-scoped query in
 * lib/db/queries.ts. The RLS policies fall back to a no-op when
 * app.current_tenant is unset, so a miss here does not cause query errors.
 *
 * The tenant id is validated as a UUID before being interpolated, since
 * Postgres `SET` does not support bind parameters.
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  if (!UUID_PATTERN.test(tenantId)) {
    throw new Error(`Invalid tenant id: "${tenantId}"`);
  }

  await executeSql(`SET app.current_tenant = '${tenantId}'`);
}
