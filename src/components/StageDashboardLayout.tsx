import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2, Inbox, ArrowRight, ArrowLeft, CheckCircle2, FileDown, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { advanceStage, stageLabel, type Stage } from "@/lib/stage-engine";
import Footer from "@/components/Footer";
import RoleReminder from "@/components/RoleReminder";
import StagePerformancePanel from "@/components/StagePerformancePanel";
import { generateApplicationPDF } from "@/lib/pdf-generator";

export interface StageApp {
  id: string;
  ref_code: string;
  customer_name: string;
  email: string | null;
  phone: string | null;
  service: string;
  district: string;
  location: string | null;
  account_type: string;
  national_id: string | null;
  address: string | null;
  document_url: string | null;
  affirmation_letter_url: string | null;
  advisory_note: string | null;
  assigned_sim: string | null;
  assigned_port: string | null;
  assigned_equipment: any;
  technician: string | null;
  scheduled_date: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_amount: number | null;
  payment_receipt_url: string | null;
  rejection_reason: string | null;
  stage: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface Props {
  stage: Stage;
  title: string;
  description: string;
  approveLabel: string;
  rejectLabel: string;
  /** Checklist of repeating duties for this role (shown in the 3-min reminder). */
  reminderTasks?: string[];
  /** Render stage-specific detail panel content (above the action bar). */
  renderDetail?: (app: StageApp) => ReactNode;
  /** Build the patch payload sent to advance_application_stage on approve. Return null to block. */
  buildApprovePatch?: (app: StageApp) => Record<string, unknown> | null;
  /** Optional extra header content (stats, create button). */
  headerExtra?: ReactNode;
  /** Force a comment on approve (default false). */
  requireApproveComment?: boolean;
  /** Allow approve at all (billing's last stage uses 'complete'). */
  canApprove?: boolean;
  /** Allow sending back. */
  canReject?: boolean;
  /** Restrict reject reasons to a fixed list (e.g. billing). */
  rejectReasons?: string[];
}

export default function StageDashboardLayout({
  stage,
  title,
  description,
  approveLabel,
  rejectLabel,
  renderDetail,
  buildApprovePatch,
  headerExtra,
  reminderTasks = [],
  requireApproveComment = false,
  canApprove = true,
  canReject = true,
  rejectReasons,
}: Props) {
  const [apps, setApps] = useState<StageApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approveComment, setApproveComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [rejectReason, setRejectReason] = useState(rejectReasons?.[0] || "");
  const [acting, setActing] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("stage", stage)
      .order("created_at", { ascending: true });
    if (error) toast.error(error.message);
    setApps((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`stage-${stage}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "applications" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  const selected = useMemo(() => apps.find((a) => a.id === selectedId) || null, [apps, selectedId]);

  useEffect(() => {
    if (!selected && apps.length > 0) setSelectedId(apps[0].id);
    if (selected) {
      setApproveComment("");
      setRejectComment("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apps]);

  const handleApprove = async () => {
    if (!selected) return;
    if (requireApproveComment && !approveComment.trim()) {
      toast.error("A note is required to approve at this stage.");
      return;
    }
    const patch = buildApprovePatch ? buildApprovePatch(selected) : {};
    if (patch === null) return;
    setActing(true);
    try {
      await advanceStage({
        applicationId: selected.id,
        action: "approve",
        comment: approveComment.trim() || undefined,
        patch,
      });
      toast.success("Application advanced");
      setSelectedId(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to advance");
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    const finalComment = rejectReasons
      ? `${rejectReason}${rejectComment.trim() ? ` — ${rejectComment.trim()}` : ""}`
      : rejectComment.trim();
    if (!finalComment) {
      toast.error("A comment is required to send the application back.");
      return;
    }
    setActing(true);
    try {
      await advanceStage({
        applicationId: selected.id,
        action: "reject",
        comment: finalComment,
      });
      toast.success("Sent back to previous stage");
      setSelectedId(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Failed to send back");
    } finally {
      setActing(false);
    }
  };

  const downloadDoc = async (path: string, label: string) => {
    const { data, error } = await supabase.storage
      .from("fwa-documents")
      .createSignedUrl(path, 300, { download: true });
    if (error || !data?.signedUrl) {
      toast.error("Could not generate download link");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = `${label}-${path.split("/").pop()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadApplicationForm = (a: StageApp) => {
    try {
      generateApplicationPDF(a as any);
    } catch (e: any) {
      toast.error(e.message || "Could not generate PDF");
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-6 flex-1">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">{title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Inbox className="w-3 h-3" /> {apps.length} in queue
              </Badge>
              {headerExtra}
            </div>
          </div>

          <StagePerformancePanel stage={stage} scope="self" />
          {reminderTasks.length > 0 && (
            <RoleReminder role={title} tasks={reminderTasks} pendingCount={apps.length} />
          )}

          <div className="grid lg:grid-cols-[320px_1fr] gap-4">
            {/* Queue */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30">
                <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">Queue</p>
              </div>
              <div className="max-h-[70vh] overflow-y-auto divide-y divide-border">
                {loading ? (
                  <div className="p-6 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : apps.length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">
                    Nothing waiting in your queue.
                  </div>
                ) : (
                  apps.map((a) => (
                    (() => {
                      const hoursInStage = (Date.now() - new Date(a.updated_at).getTime()) / 36e5;
                      const slaTone =
                        hoursInStage >= 48
                          ? "text-destructive"
                          : hoursInStage >= 24
                          ? "text-orange-500"
                          : "text-muted-foreground";
                      const slaText =
                        hoursInStage < 1
                          ? "just now"
                          : hoursInStage < 24
                          ? `${Math.round(hoursInStage)}h in stage`
                          : `${Math.round(hoursInStage / 24)}d in stage`;
                      return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className={`w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors ${
                        selectedId === a.id ? "bg-muted" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm text-foreground">{a.ref_code}</p>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(a.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-foreground truncate">{a.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{a.service}</p>
                      <p className={`text-[10px] mt-0.5 ${slaTone}`}>⏱ {slaText}</p>
                      {a.rejection_reason && (
                        <p className="text-[10px] text-destructive mt-1 truncate">
                          ↩ {a.rejection_reason}
                        </p>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detail */}
            <div className="bg-card border border-border rounded-xl p-5">
              {!selected ? (
                <div className="text-center text-sm text-muted-foreground py-12">
                  Select an application to review.
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">{selected.ref_code}</p>
                      <h2 className="text-lg font-display font-bold text-foreground">
                        {selected.customer_name}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {selected.account_type} • {selected.service}
                      </p>
                    </div>
                    <Badge>{stageLabel(selected.stage)}</Badge>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3 text-sm">
                    <Field label="Email" value={selected.email} />
                    <Field label="Phone" value={selected.phone} />
                    <Field label="District" value={selected.district} />
                    <Field label="Location" value={selected.location} />
                    <Field label="National ID" value={selected.national_id} />
                    <Field label="Address" value={selected.address} />
                  </div>

                  {selected.rejection_reason && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                      <span className="font-semibold">Returned: </span>
                      {selected.rejection_reason}
                    </div>
                  )}

                  {/* Document downloads */}
                  <div className="flex flex-wrap gap-2 border-t border-dashed border-border pt-3">
                    <Button size="sm" variant="outline" onClick={() => downloadApplicationForm(selected)}>
                      <FileDown className="w-4 h-4 mr-1" /> Application form (PDF)
                    </Button>
                    {selected.document_url && (
                      <Button size="sm" variant="outline" onClick={() => downloadDoc(selected.document_url!, "id-document")}>
                        <Download className="w-4 h-4 mr-1" /> ID / supporting doc
                      </Button>
                    )}
                    {selected.affirmation_letter_url && (
                      <Button size="sm" variant="outline" onClick={() => downloadDoc(selected.affirmation_letter_url!, "affirmation-letter")}>
                        <Download className="w-4 h-4 mr-1" /> Affirmation letter
                      </Button>
                    )}
                    {selected.payment_receipt_url && (
                      <Button size="sm" variant="outline" onClick={() => downloadDoc(selected.payment_receipt_url!, "payment-receipt")}>
                        <Download className="w-4 h-4 mr-1" /> Payment receipt
                      </Button>
                    )}
                  </div>

                  {renderDetail?.(selected)}

                  {/* Action bar */}
                  <div className="border-t border-border pt-4 space-y-4">
                    {canApprove && (
                      <div>
                        <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                          Note {requireApproveComment ? "(required)" : "(optional)"}
                        </label>
                        <Textarea
                          value={approveComment}
                          onChange={(e) => setApproveComment(e.target.value)}
                          rows={2}
                          placeholder="Add an internal note for the next stage…"
                          className="mt-1"
                        />
                        <Button
                          onClick={handleApprove}
                          disabled={acting}
                          className="mt-2 w-full sm:w-auto"
                        >
                          {stage === "billing" ? (
                            <CheckCircle2 className="w-4 h-4 mr-2" />
                          ) : (
                            <ArrowRight className="w-4 h-4 mr-2" />
                          )}
                          {approveLabel}
                        </Button>
                      </div>
                    )}

                    {canReject && (
                      <div className="border-t border-dashed border-border pt-3">
                        <label className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
                          Send back (comment required)
                        </label>
                        {rejectReasons && (
                          <select
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="mt-1 w-full h-9 px-2 rounded-md bg-background border border-input text-sm"
                          >
                            {rejectReasons.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        )}
                        <Textarea
                          value={rejectComment}
                          onChange={(e) => setRejectComment(e.target.value)}
                          rows={2}
                          placeholder="Reason / what's missing…"
                          className="mt-2"
                        />
                        <Button
                          variant="outline"
                          onClick={handleReject}
                          disabled={acting}
                          className="mt-2 w-full sm:w-auto"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          {rejectLabel}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground font-medium">{value || "—"}</p>
    </div>
  );
}