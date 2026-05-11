import { supabase } from "@/integrations/supabase/client";

export type Stage = "moderation" | "service_delivery" | "technical" | "billing" | "completed";

export const STAGES: { key: Stage; label: string }[] = [
  { key: "moderation", label: "Moderation" },
  { key: "service_delivery", label: "Service Delivery" },
  { key: "technical", label: "Technical" },
  { key: "billing", label: "Billing" },
  { key: "completed", label: "Completed" },
];

export const stageLabel = (s: string) =>
  STAGES.find((x) => x.key === s)?.label || s;

export async function advanceStage(opts: {
  applicationId: string;
  action: "approve" | "reject";
  comment?: string;
  patch?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.rpc("advance_application_stage", {
    _app_id: opts.applicationId,
    _action: opts.action,
    _comment: opts.comment ?? null,
    _patch: (opts.patch ?? {}) as any,
  });
  if (error) throw error;
  return data;
}