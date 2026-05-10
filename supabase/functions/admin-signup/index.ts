import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, password, fullName, inviteCode, role } = await req.json();

    const allowedRoles = [
      "main_admin",
      "moderator",
      "service_delivery",
      "technical",
      "billing",
    ];
    const assignedRole = allowedRoles.includes(role) ? role : "main_admin";

    const expectedCode = Deno.env.get("ADMIN_INVITE_CODE");
    if (!expectedCode || inviteCode !== expectedCode) {
      return new Response(
        JSON.stringify({ error: "Invalid invite code" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Create user
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // The handle_new_user trigger creates profile + customer role automatically.
    // Add the requested staff role (and legacy 'admin' alias when main_admin, for backward-compat RLS).
    const rolesToAdd: { user_id: string; role: string }[] = [
      { user_id: userId, role: assignedRole },
    ];
    if (assignedRole === "main_admin") {
      rolesToAdd.push({ user_id: userId, role: "admin" });
    }
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert(rolesToAdd);

    if (roleError) {
      return new Response(
        JSON.stringify({ error: roleError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: "Admin account created" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
