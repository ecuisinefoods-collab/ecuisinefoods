import { createClient } from "https://esm.sh/@supabase/supabase-js@2.119.0";

const allowedRoles = ["store_manager", "order_officer", "finance_officer", "marketing_manager", "analyst"];
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function responseHeaders(requestOrigin: string | null, allowedOrigins: Set<string>, fallbackOrigin: string) {
  return {
    "Access-Control-Allow-Origin": requestOrigin && allowedOrigins.has(requestOrigin) ? requestOrigin : fallbackOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json",
  };
}

Deno.serve(async (request: Request) => {
  const appOrigin = (Deno.env.get("SITE_URL") || "https://ecuisinefoods.onrender.com").replace(/\/$/, "");
  const renderOrigin = "https://ecuisinefoods.onrender.com";
  const allowedOrigins = new Set([appOrigin, renderOrigin]);
  const origin = request.headers.get("Origin");
  const headers = responseHeaders(origin, allowedOrigins, appOrigin);

  if (origin && !allowedOrigins.has(origin)) {
    return new Response(JSON.stringify({ error: "This origin is not allowed to manage administrator accounts." }), { status: 403, headers });
  }
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) {
      throw new Error("The administrator removal service is not configured.");
    }

    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Please sign in again." }), { status: 401, headers });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: authError } = await userClient.auth.getUser();
    if (authError || !userResult.user) {
      return new Response(JSON.stringify({ error: "Your admin session is invalid or expired." }), { status: 401, headers });
    }

    const adminClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: actor, error: actorError } = await adminClient
      .from("admin_profiles")
      .select("user_id,email,role,is_active")
      .eq("user_id", userResult.user.id)
      .maybeSingle();

    if (actorError || !actor?.is_active || actor.role !== "owner") {
      return new Response(JSON.stringify({ error: "Only the active owner account can remove administrators." }), { status: 403, headers });
    }

    const body = await request.json();
    const targetUserId = String(body.user_id || "").trim();
    if (!UUID_PATTERN.test(targetUserId)) {
      return new Response(JSON.stringify({ error: "Choose a valid administrator account." }), { status: 400, headers });
    }
    if (targetUserId === userResult.user.id) {
      return new Response(JSON.stringify({ error: "Your own owner account is protected and cannot be removed here." }), { status: 400, headers });
    }

    const { data: target, error: targetError } = await adminClient
      .from("admin_profiles")
      .select("user_id,email,display_name,role,is_active")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (targetError || !target) {
      return new Response(JSON.stringify({ error: "That administrator account could not be found." }), { status: 404, headers });
    }
    if (target.role === "owner") {
      return new Response(JSON.stringify({ error: "Owner accounts are protected. Remove staff accounts only." }), { status: 403, headers });
    }
    if (!allowedRoles.includes(target.role)) {
      return new Response(JSON.stringify({ error: "This account has a protected or unsupported role and cannot be removed from this screen." }), { status: 403, headers });
    }

    // Disable the profile first: RLS policies check is_active, so any still-valid access JWT
    // immediately loses its admin permissions before the Auth identity is deleted.
    const { error: disableError } = await adminClient
      .from("admin_profiles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("user_id", targetUserId);
    if (disableError) {
      return new Response(JSON.stringify({ error: "Could not disable this account safely: " + disableError.message }), { status: 500, headers });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      await adminClient.from("admin_audit_logs").insert({
        actor_user_id: userResult.user.id,
        actor_email: userResult.user.email,
        action: "disable_admin_delete_failed",
        resource_type: "admin_profile",
        resource_id: targetUserId,
        details: { email: target.email, role: target.role, reason: deleteError.message },
      });
      return new Response(JSON.stringify({
        error: "Admin access has been disabled, but Supabase could not fully delete this login: " + deleteError.message + ". The account remains disabled; retry after resolving any linked storage ownership.",
      }), { status: 409, headers });
    }

    const { error: profileDeleteError } = await adminClient
      .from("admin_profiles")
      .delete()
      .eq("user_id", targetUserId);

    await adminClient.from("admin_audit_logs").insert({
      actor_user_id: userResult.user.id,
      actor_email: userResult.user.email,
      action: "delete_admin_account",
      resource_type: "admin_profile",
      resource_id: targetUserId,
      details: {
        email: target.email,
        display_name: target.display_name,
        role: target.role,
        profile_cleanup_error: profileDeleteError?.message || null,
      },
    });

    return new Response(JSON.stringify({
      success: true,
      message: profileDeleteError
        ? "The login was permanently removed. Its disabled admin profile could not be cleaned up automatically."
        : "Administrator account permanently removed. Its refresh sessions have been revoked.",
    }), { status: 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove this administrator account.";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers });
  }
});
