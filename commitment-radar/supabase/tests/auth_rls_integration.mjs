#!/usr/bin/env node
/**
 * Real Supabase Auth + PostgREST integration tests for Commitment Radar.
 *
 * SAFETY: Run ONLY against a dedicated disposable Supabase project.
 * Uses the service-role key only for creating test users/memberships and cleanup.
 * Creates uniquely named temporary records and deletes them in finally.
 * Never prints API keys, passwords, or access tokens.
 *
 * Required environment:
 *   SUPABASE_TEST_URL
 *   SUPABASE_TEST_ANON_KEY
 *   SUPABASE_TEST_SERVICE_ROLE_KEY
 */
import { randomUUID } from "node:crypto";

const required = [
  "SUPABASE_TEST_URL",
  "SUPABASE_TEST_ANON_KEY",
  "SUPABASE_TEST_SERVICE_ROLE_KEY",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error("Missing required environment variable:", key);
    process.exit(2);
  }
}

const baseUrl = process.env.SUPABASE_TEST_URL.replace(/\/+$/, "");
const anonKey = process.env.SUPABASE_TEST_ANON_KEY;
const serviceKey = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const runId = randomUUID().slice(0, 8);
const users = [];
const organizationIds = [];
const results = [];
let failed = false;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, { key = anonKey, token, method = "GET", body, prefer } = {}) {
  const headers = {
    apikey: key,
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = "Bearer " + token;
  else headers.Authorization = "Bearer " + key;
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); } catch { data = raw; }
  }
  return { status: response.status, ok: response.ok, data };
}

function assertOk(result, label) {
  assert(result.ok, label + " failed (HTTP " + result.status + "): " + safeError(result.data));
  return result.data;
}

function safeError(data) {
  if (!data) return "empty response";
  if (typeof data === "string") return data.slice(0, 300);
  return String(data.message || data.msg || data.error_description || data.error || JSON.stringify(data)).slice(0, 300);
}

async function test(name, fn) {
  try {
    await fn();
    results.push({ name, status: "PASS" });
    console.log("PASS - " + name);
  } catch (error) {
    failed = true;
    results.push({ name, status: "FAIL", error: error.message });
    console.error("FAIL - " + name + ": " + error.message);
  }
}

async function createUser(roleLabel) {
  const email = "cr-security-" + runId + "-" + roleLabel + "@example.test";
  const password = randomUUID() + "Aa9!";
  const created = assertOk(await request("/auth/v1/admin/users", {
    key: serviceKey,
    method: "POST",
    body: {
      email,
      password,
      email_confirm: true,
      user_metadata: { commitment_radar_security_test: true, test_run: runId },
    },
  }), "Create temporary " + roleLabel + " Auth user");
  const user = created.user || created;
  assert(user.id, "Auth admin API did not return a user ID");
  users.push(user.id);

  const signedIn = assertOk(await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  }), "Sign in temporary " + roleLabel + " user");
  assert(signedIn.access_token && signedIn.user?.id === user.id, "Password sign-in did not return the expected identity");
  return { id: user.id, token: signedIn.access_token, email };
}

async function createOrganization(user, name) {
  const data = assertOk(await request("/rest/v1/rpc/cr_create_organization", {
    token: user.token,
    method: "POST",
    body: { p_name: name },
  }), "Create organization through authenticated RPC");
  const id = typeof data === "string" ? data : data?.id;
  assert(typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id), "Organization RPC did not return a UUID");
  organizationIds.push(id);
  return id;
}

async function addMembership(organizationId, userId, role) {
  const result = await request("/rest/v1/cr_memberships", {
    key: serviceKey,
    method: "POST",
    prefer: "return=minimal",
    body: { organization_id: organizationId, user_id: userId, role },
  });
  assertOk(result, "Provision temporary " + role + " membership");
}

async function visibleRows(user, path) {
  const data = assertOk(await request(path, { token: user.token }), "Read " + path);
  assert(Array.isArray(data), "Expected an array response for " + path);
  return data;
}

async function createProject(user, organizationId, name, shouldAllow, createdBy = user.id) {
  const result = await request("/rest/v1/cr_projects?select=id,name,organization_id", {
    token: user.token,
    method: "POST",
    prefer: "return=representation",
    body: { organization_id: organizationId, name, created_by: createdBy },
  });
  const created = result.ok && Array.isArray(result.data) && result.data.length > 0;
  if (shouldAllow) {
    assert(result.ok && created, "Expected project creation to succeed; HTTP " + result.status + ": " + safeError(result.data));
  } else {
    assert(!result.ok || !created, "Project creation unexpectedly succeeded");
  }
}

async function updateOrganization(user, organizationId, name, shouldAllow) {
  const result = await request("/rest/v1/cr_organizations?id=eq." + organizationId + "&select=id,name", {
    token: user.token,
    method: "PATCH",
    prefer: "return=representation",
    body: { name },
  });
  const changed = result.ok && Array.isArray(result.data) && result.data.length > 0;
  if (shouldAllow) {
    assert(result.ok && changed, "Expected organization update to succeed; HTTP " + result.status + ": " + safeError(result.data));
  } else {
    assert(!result.ok || !changed, "Organization update unexpectedly succeeded");
  }
}

async function cleanup() {
  const errors = [];
  if (organizationIds.length) {
    const filter = encodeURIComponent("in.(" + organizationIds.join(",") + ")");
    const result = await request("/rest/v1/cr_organizations?id=" + filter, {
      key: serviceKey,
      method: "DELETE",
      prefer: "return=minimal",
    });
    if (!result.ok) errors.push("organization cleanup HTTP " + result.status + ": " + safeError(result.data));
  }
  for (const id of [...users].reverse()) {
    const result = await request("/auth/v1/admin/users/" + id, {
      key: serviceKey,
      method: "DELETE",
    });
    if (!result.ok && result.status !== 404) {
      errors.push("Auth user cleanup HTTP " + result.status + ": " + safeError(result.data));
    }
  }
  return errors;
}

async function main() {
  const ownerA = await createUser("owner-a");
  const ownerB = await createUser("owner-b");
  const adminA = await createUser("admin-a");
  const editorA = await createUser("editor-a");
  const viewerA = await createUser("viewer-a");

  const orgA = await createOrganization(ownerA, "CR Security A " + runId);
  const orgB = await createOrganization(ownerB, "CR Security B " + runId);
  await addMembership(orgA, adminA.id, "admin");
  await addMembership(orgA, editorA.id, "editor");
  await addMembership(orgA, viewerA.id, "viewer");

  await test("owner can read own organization", async () => {
    const rows = await visibleRows(ownerA, "/rest/v1/cr_organizations?id=eq." + orgA + "&select=id");
    assert(rows.length === 1, "Owner could not see their organization");
  });

  await test("cross-tenant reads are isolated in both directions", async () => {
    const aReadingB = await visibleRows(ownerA, "/rest/v1/cr_organizations?id=eq." + orgB + "&select=id");
    const bReadingA = await visibleRows(ownerB, "/rest/v1/cr_organizations?id=eq." + orgA + "&select=id");
    assert(aReadingB.length === 0, "User A read organization B");
    assert(bReadingA.length === 0, "User B read organization A");
  });

  await test("membership listing cannot disclose another tenant", async () => {
    const rows = await visibleRows(ownerA, "/rest/v1/cr_memberships?organization_id=eq." + orgB + "&select=id,user_id,role");
    assert(rows.length === 0, "User A read memberships belonging to organization B");
  });

  await test("owner, admin, and editor can create projects in their organization", async () => {
    await createProject(ownerA, orgA, "Owner project " + runId, true);
    await createProject(adminA, orgA, "Admin project " + runId, true);
    await createProject(editorA, orgA, "Editor project " + runId, true);
  });

  await test("viewer cannot create projects", async () => {
    await createProject(viewerA, orgA, "Viewer must not create " + runId, false);
  });

  await test("cross-tenant project writes are denied", async () => {
    await createProject(ownerA, orgB, "Cross-tenant write must fail " + runId, false);
  });

  await test("creator identity cannot be spoofed", async () => {
    await createProject(ownerA, orgA, "Spoofed creator must fail " + runId, false, ownerB.id);
  });

  await test("admin cannot self-elevate membership role", async () => {
    const result = await request("/rest/v1/cr_memberships?organization_id=eq." + orgA + "&user_id=eq." + adminA.id + "&select=role", {
      token: adminA.token,
      method: "PATCH",
      prefer: "return=representation",
      body: { role: "owner" },
    });
    const changed = result.ok && Array.isArray(result.data) && result.data.length > 0;
    assert(!result.ok || !changed, "Admin unexpectedly changed their own membership role");
    const rows = await visibleRows(adminA, "/rest/v1/cr_memberships?organization_id=eq." + orgA + "&user_id=eq." + adminA.id + "&select=role");
    assert(rows.length === 1 && rows[0].role === "admin", "Membership role changed despite denied self-elevation");
  });

  await test("only owner/admin can update organization settings", async () => {
    await updateOrganization(ownerA, orgA, "CR Security owner update " + runId, true);
    await updateOrganization(adminA, orgA, "CR Security admin update " + runId, true);
    await updateOrganization(editorA, orgA, "CR Security editor must fail " + runId, false);
    await updateOrganization(viewerA, orgA, "CR Security viewer must fail " + runId, false);
  });

  await test("anonymous caller cannot invoke organization creation RPC", async () => {
    const result = await request("/rest/v1/rpc/cr_create_organization", {
      method: "POST",
      body: { p_name: "Anonymous must fail " + runId },
    });
    assert(!result.ok, "Anonymous RPC call unexpectedly succeeded (HTTP " + result.status + ")");
  });

  await test("authenticated owner RPC creates owner membership atomically", async () => {
    const org = await createOrganization(ownerA, "CR Security RPC " + runId);
    const memberships = await visibleRows(ownerA,
      "/rest/v1/cr_memberships?organization_id=eq." + org + "&user_id=eq." + ownerA.id + "&select=role");
    assert(memberships.length === 1 && memberships[0].role === "owner",
      "RPC-created organization does not expose exactly one owner membership");
  });

  const cleanupErrors = await cleanup();
  if (cleanupErrors.length) {
    failed = true;
    console.error("CLEANUP FAILURE - " + cleanupErrors.join("; "));
  }

  console.log("\nIntegration test summary: " + results.filter(x => x.status === "PASS").length + "/" + results.length + " passed.");
  if (failed) process.exitCode = 1;
}

main().catch(async (error) => {
  console.error("Integration setup failed: " + error.message);
  const cleanupErrors = await cleanup();
  if (cleanupErrors.length) console.error("CLEANUP FAILURE - " + cleanupErrors.join("; "));
  process.exitCode = 1;
});
