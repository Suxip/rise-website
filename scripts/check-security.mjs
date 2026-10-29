// Pre-launch security check. Uses only the public (publishable) key, exactly
// what any visitor has, and confirms the database refuses what it should.
//
//   npm run check:security        (reads VITE_SUPABASE_* from .env)
//
// Every write attempt targets a row that can't exist or a value the table
// rejects, so even if a permission rule were missing nothing would change.

import { execFileSync } from "node:child_process";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env first (see .env.example).");
  process.exit(1);
}

const PERMISSION_DENIED = "42501";
const results = [];
const check = (name, ok, detail = "") => results.push({ name, ok, detail });

// Legacy Supabase keys are JWTs; the secret one has role "service_role".
function isSecretKey(value) {
  if (value.startsWith("sb_secret_")) return true;
  const parts = value.split(".");
  if (parts.length !== 3) return false;
  try {
    return JSON.parse(Buffer.from(parts[1], "base64url").toString()).role === "service_role";
  } catch {
    return false;
  }
}

check("The key in .env is the publishable key, not the secret key", !isSecretKey(key));

try {
  await fetch(`${url}/auth/v1/health`, { headers: { apikey: key } });
} catch (err) {
  console.error(`Can't reach ${url}: ${err.cause?.message ?? err.message}. Check VITE_SUPABASE_URL.`);
  process.exit(1);
}

// Talk to Supabase's REST API directly, the same requests the site makes.
async function rest(method, path, body) {
  const res = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: { apikey: key, "Content-Type": "application/json", Prefer: "count=exact" },
    body: body && JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  const count = Number(res.headers.get("content-range")?.split("/")[1]);
  return res.ok ? { data: json, count } : { error: json ?? { message: `HTTP ${res.status}` } };
}

{
  const { count, error } = await rest("GET", "programs?select=id&limit=1");
  check("Public can read programs", !error && count > 0, error?.message ?? `${count} visible`);
}
{
  const { count, error } = await rest("GET", "programs?select=id&limit=1&is_published=eq.false");
  check("Public cannot see hidden programs", !error && count === 0, error?.message ?? `${count} hidden rows visible`);
}
{
  const { error } = await rest("POST", "programs", { name: "security check", category: "not-a-category", level: "state" });
  check("Public cannot add programs", error?.code === PERMISSION_DENIED, error ? error.message : "insert was allowed");
}
{
  const { error } = await rest("PATCH", "programs?id=eq.-1", { name: "security check" });
  check("Public cannot edit programs", error?.code === PERMISSION_DENIED, error ? error.message : "update was allowed");
}
{
  const { error } = await rest("DELETE", "programs?id=eq.-1");
  check("Public cannot delete programs", error?.code === PERMISSION_DENIED, error ? error.message : "delete was allowed");
}
{
  const { data, error } = await rest("GET", "admins?select=user_id");
  check("Public cannot see the admins list", Boolean(error) || data.length === 0, error?.message ?? `${data.length} rows visible`);
}
{
  const { error } = await rest("POST", "admins", { user_id: "00000000-0000-0000-0000-000000000000", display_name: "x" });
  check("Public cannot add admins", Boolean(error), error?.message ?? "insert was allowed");
}
{
  const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key } });
  const settings = res.ok ? await res.json() : {};
  check("Public sign-ups are turned off", settings.disable_signup === true,
    res.ok ? `disable_signup = ${settings.disable_signup}` : `HTTP ${res.status}`);
}
{
  // Search every committed file for real secret keys (not mentions of the name).
  const pattern = "sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{10,}\\.eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9_-]{10,}";
  let hits = [];
  try {
    hits = execFileSync("git", ["grep", "-n", "-o", "-E", pattern], { encoding: "utf8" }).trim().split("\n");
  } catch {
    // git grep exits 1 when nothing matches.
  }
  const secrets = hits.filter((line) => isSecretKey(line.split(":").slice(2).join(":")));
  check("No secret key committed to this repo", secrets.length === 0, secrets.map((s) => s.split(":").slice(0, 2).join(":")).join(", "));
}

for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail ? `  (${r.detail})` : ""}`);
const failed = results.filter((r) => !r.ok).length;
console.log(failed ? `\n${failed} check(s) failed.` : "\nAll checks passed.");
process.exit(failed ? 1 : 0);
