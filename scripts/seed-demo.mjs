/**
 * Seeds 300 historical agent actions across the last 7 days.
 * Requires the dev server to be running: npm run dev
 * Requires BOOTSTRAP_TOKEN env var to match the server.
 *
 * Usage:
 *   BOOTSTRAP_TOKEN=your-token node scripts/seed-demo.mjs
 */

const TENANT_ID = "6ac20ecd-5f9e-44cf-b94f-41b9a219c82a";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
const TOKEN = process.env.BOOTSTRAP_TOKEN;

if (!TOKEN) {
  console.error("ERROR: BOOTSTRAP_TOKEN env var is required.");
  console.error("  Usage: BOOTSTRAP_TOKEN=your-token node scripts/seed-demo.mjs");
  process.exit(1);
}

console.log(`Seeding demo data for tenant ${TENANT_ID} ...`);
console.log(`Target: ${BASE_URL}/api/simulate/seed\n`);

const res = await fetch(`${BASE_URL}/api/simulate/seed`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-tenant-id": TENANT_ID,
    "x-bootstrap-token": TOKEN,
  },
  body: JSON.stringify({ count: 300, days: 7 }),
});

const body = await res.json();

if (!res.ok) {
  console.error("Seed failed:", body);
  process.exit(1);
}

if (body.skipped) {
  console.log(`Already seeded: ${body.existing} events exist (target ${300}).`);
  console.log("To re-seed, delete existing events or increase the target count.");
} else {
  console.log(`Done. ${body.inserted} events inserted (${body.total} total) in ${body.totalMs}ms.`);
}
