import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const allowedRoles = ["store_manager", "order_officer", "finance_officer", "marketing_manager", "analyst"];

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed." }), { status: 405, headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !anonKey || !serviceKey) throw new Error("The Supabase admin invitation function is not configured.");
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Please sign in again." }), { status: 401, headers: corsHeaders });
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userResult, error: authError } = await userClient.auth.getUser();
    if (authError || !userResult.user) return new Response(JSON.stringify({ error: "Your admin session is invalid or expired." }), { status: 401, headers: corsHeaders });
    const adminClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: actor, error: actorError } = await adminClient.from("admin_profiles").select("role,is_active,email").eq("user_id", userResult.user.id).maybeSingle();
    if (actorError || !actor?.is_active || actor.role !== "owner") return new Response(JSON.stringify({ error: "Only the active owner can invite and manage administrators." }), { status: 403, headers: corsHeaders });
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const displayName = String(body.display_name || "").trim().slice(0, 100);
    const role = String(body.role || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return new Response(JSON.stringify({ error: "Enter a valid staff email address." }), { status: 400, headers: corsHeaders });
    if (!allowedRoles.includes(role)) return new Response(JSON.stringify({ error: "Choose a valid staff role." }), { status: 400, headers: corsHeaders });
    if (email === String(actor.email || userResult.user.email || "").toLowerCase()) return new Response(JSON.stringify({ error: "That email belongs to the current owner account." }), { status: 400, headers: corsHeaders });
    const appUrl = Deno.env.get("SITE_URL") || "https://ecuisinefoods.onrender.com";
    const { data: inviteResult, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      redirectTo: appUrl + "/admin",
      data: { display_name: displayName },
    });
    if (inviteError || !inviteResult.user) return new Response(JSON.stringify({ error: inviteError?.message || "Supabase did not return an invited user. Check whether this email already has an account." }), { status: 400, headers: corsHeaders });
    const { error: profileError } = await adminClient.from("admin_profiles").upsert({
      user_id: inviteResult.user.id,
      email,
      display_name: displayName || null,
      role,
      permissions: {},
      is_active: true,
      created_by: userResult.user.id,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (profileError) {
      await adminClient.auth.admin.deleteUser(inviteResult.user.id);
      return new Response(JSON.stringify({ error: "Invitation was sent but the admin profile could not be saved: " + profileError.message }), { status: 500, headers: corsHeaders });
    }
    await adminClient.from("admin_audit_logs").insert({
      actor_user_id: userResult.user.id,
      actor_email: userResult.user.email,
      action: "invite_admin",
      resource_type: "admin_profile",
      resource_id: inviteResult.user.id,
      details: { email, display_name: displayName || null, role },
    });
    return new Response(JSON.stringify({
      success: true,
      message: "Invitation email sent. The administrator can sign in after accepting it.",
      email,
      role,
    }), { status: 200, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to complete administrator invitation.";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: corsHeaders });
  }
});
