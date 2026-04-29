import { supabase } from "@/integrations/supabase/client";

export type AuditAction = "create" | "update" | "delete" | "status_change" | "toggle" | "assign";
export type AuditTarget = "service_plan" | "application" | "fiber_node" | "fiber_route";

interface LogParams {
  action: AuditAction;
  target_type: AuditTarget;
  target_id?: string | null;
  target_label?: string | null;
  before?: any;
  after?: any;
}

/** Fire-and-forget audit log entry. Failures are swallowed so they never break UX. */
export async function logAudit(params: LogParams) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;
    let actorName: string | null = null;
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      actorName = profile?.full_name || user.email || null;
    }
    await supabase.from("admin_audit_log").insert({
      actor_id: user?.id ?? null,
      actor_name: actorName,
      action: params.action,
      target_type: params.target_type,
      target_id: params.target_id ?? null,
      target_label: params.target_label ?? null,
      before: params.before ?? null,
      after: params.after ?? null,
    });
  } catch (e) {
    console.warn("audit log failed:", e);
  }
}