import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CheckCircle2, ArrowLeftCircle, Clock } from "lucide-react";

/**
 * KPIs for a stage worker (or aggregated when stage='*').
 * - approved today / week
 * - sent back today / week
 * - average time-to-action (last 30 actions)
 */
export default function StagePerformancePanel({
  stage,
  scope = "self",
}: {
  stage: string | "*";
  scope?: "self" | "all";
}) {
  const [kpi, setKpi] = useState({
    approvedToday: 0,
    rejectedToday: 0,
    approvedWeek: 0,
    rejectedWeek: 0,
    avgMinutes: 0,
  });

  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      let q = supabase.from("application_stage_actions").select("*").limit(500).order("created_at", { ascending: false });
      if (stage !== "*") q = q.eq("from_stage", stage);
      if (scope === "self" && uid) q = q.eq("actor_id", uid);
      const { data } = await q;
      const rows = data || [];
      const now = Date.now();
      const dayMs = 86400000;
      const inToday = (d: string) => now - new Date(d).getTime() < dayMs;
      const inWeek = (d: string) => now - new Date(d).getTime() < 7 * dayMs;
      const approves = rows.filter((r) => r.action === "approve" || r.action === "complete");
      const rejects = rows.filter((r) => r.action === "reject");
      // Naive throughput proxy: median minutes between consecutive actions
      const times = rows.map((r) => new Date(r.created_at).getTime()).sort((a, b) => a - b);
      let avg = 0;
      if (times.length > 1) {
        const diffs: number[] = [];
        for (let i = 1; i < times.length; i++) diffs.push((times[i] - times[i - 1]) / 60000);
        avg = Math.round(diffs.reduce((s, x) => s + x, 0) / diffs.length);
      }
      setKpi({
        approvedToday: approves.filter((r) => inToday(r.created_at)).length,
        rejectedToday: rejects.filter((r) => inToday(r.created_at)).length,
        approvedWeek: approves.filter((r) => inWeek(r.created_at)).length,
        rejectedWeek: rejects.filter((r) => inWeek(r.created_at)).length,
        avgMinutes: avg,
      });
    };
    load();
  }, [stage, scope]);

  const cards = [
    { icon: CheckCircle2, label: "Approved today", value: kpi.approvedToday, sub: `${kpi.approvedWeek} this week`, color: "text-emerald-500" },
    { icon: ArrowLeftCircle, label: "Sent back today", value: kpi.rejectedToday, sub: `${kpi.rejectedWeek} this week`, color: "text-amber-500" },
    { icon: Clock, label: "Avg time between actions", value: `${kpi.avgMinutes}m`, sub: "across recent actions", color: "text-primary" },
    { icon: Activity, label: "Scope", value: scope === "self" ? "You" : "All staff", sub: stage === "*" ? "all stages" : stage, color: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
      {cards.map((c) => (
        <div key={c.label} className="bg-card border border-border rounded-lg p-3">
          <div className={`flex items-center gap-2 text-xs uppercase tracking-wide font-semibold ${c.color}`}>
            <c.icon className="w-3.5 h-3.5" /> {c.label}
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{c.value}</p>
          <p className="text-[11px] text-muted-foreground">{c.sub}</p>
        </div>
      ))}
    </div>
  );
}