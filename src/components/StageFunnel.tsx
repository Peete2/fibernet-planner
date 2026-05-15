import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, Clock, TrendingDown, RotateCcw } from "lucide-react";

const STAGES = [
  { key: "moderation", label: "Moderation" },
  { key: "service_delivery", label: "Service Delivery" },
  { key: "technical", label: "Technical" },
  { key: "billing", label: "Billing" },
  { key: "completed", label: "Completed" },
] as const;

const COLORS = [
  "hsl(45 90% 50%)",
  "hsl(200 80% 50%)",
  "hsl(270 60% 55%)",
  "hsl(30 85% 55%)",
  "hsl(140 70% 40%)",
];

type StageKey = typeof STAGES[number]["key"];

interface ActionRow {
  application_id: string;
  from_stage: string;
  to_stage: string;
  action: string;
  created_at: string;
}

interface AppRow {
  id: string;
  stage: string;
  created_at: string;
}

function fmtDur(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function StageFunnel() {
  const [apps, setApps] = useState<AppRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [a, s] = await Promise.all([
        supabase.from("applications").select("id, stage, created_at"),
        supabase
          .from("application_stage_actions")
          .select("application_id, from_stage, to_stage, action, created_at")
          .order("created_at", { ascending: true }),
      ]);
      setApps((a.data as AppRow[]) || []);
      setActions((s.data as ActionRow[]) || []);
      setLoading(false);
    })();
  }, []);

  // Apps that ever reached each stage (current stage + any to_stage)
  const reached = useMemo(() => {
    const sets: Record<StageKey, Set<string>> = {
      moderation: new Set(),
      service_delivery: new Set(),
      technical: new Set(),
      billing: new Set(),
      completed: new Set(),
    };
    // Every app has reached at least moderation when created
    apps.forEach((app) => {
      sets.moderation.add(app.id);
      const idx = STAGES.findIndex((s) => s.key === app.stage);
      if (idx >= 0) {
        for (let i = 0; i <= idx; i++) sets[STAGES[i].key].add(app.id);
      }
    });
    actions.forEach((act) => {
      const k = act.to_stage as StageKey;
      if (sets[k]) sets[k].add(act.application_id);
    });
    return sets;
  }, [apps, actions]);

  // Average dwell time at each stage (hours), based on transitions
  const avgDwell = useMemo(() => {
    const totals: Record<string, { sum: number; n: number }> = {};
    const byApp: Record<string, ActionRow[]> = {};
    actions.forEach((r) => {
      (byApp[r.application_id] ||= []).push(r);
    });
    Object.entries(byApp).forEach(([appId, rows]) => {
      rows.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      const app = apps.find((x) => x.id === appId);
      if (!app) return;
      // Time entering moderation = app.created_at
      let prevStage: string = "moderation";
      let prevAt = +new Date(app.created_at);
      for (const r of rows) {
        const t = +new Date(r.created_at);
        const dur = (t - prevAt) / 36e5;
        totals[prevStage] ||= { sum: 0, n: 0 };
        totals[prevStage].sum += dur;
        totals[prevStage].n += 1;
        prevStage = r.to_stage;
        prevAt = t;
      }
    });
    return STAGES.map((s) => ({
      key: s.key,
      label: s.label,
      avg: totals[s.key]?.n ? totals[s.key].sum / totals[s.key].n : 0,
    }));
  }, [actions, apps]);

  // Send-back counts per stage
  const sendBacks = useMemo(() => {
    const counts: Record<string, number> = {};
    actions.forEach((a) => {
      if (a.action === "reject") counts[a.from_stage] = (counts[a.from_stage] || 0) + 1;
    });
    return STAGES.map((s) => ({ key: s.key, label: s.label, count: counts[s.key] || 0 }));
  }, [actions]);

  const funnel = useMemo(() => {
    return STAGES.map((s, i) => {
      const count = reached[s.key].size;
      const prev = i === 0 ? count : reached[STAGES[i - 1].key].size;
      const dropoff = prev > 0 && i > 0 ? ((prev - count) / prev) * 100 : 0;
      return { key: s.key, label: s.label, count, dropoff };
    });
  }, [reached]);

  const completionRate = useMemo(() => {
    const total = apps.length;
    if (!total) return 0;
    return (reached.completed.size / total) * 100;
  }, [reached, apps]);

  const totalLeadTime = useMemo(
    () => avgDwell.slice(0, 4).reduce((s, t) => s + t.avg, 0),
    [avgDwell]
  );

  const worstDrop = useMemo(
    () => funnel.slice(1).reduce((a, b) => (b.dropoff > a.dropoff ? b : a), { label: "—", dropoff: 0 } as any),
    [funnel]
  );

  const totalSendBacks = useMemo(() => sendBacks.reduce((s, x) => s + x.count, 0), [sendBacks]);

  if (loading) return <div className="text-sm text-muted-foreground p-6">Loading funnel…</div>;

  if (apps.length === 0) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
        No applications yet — the funnel will populate once customers start applying.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Activity className="w-4 h-4" /> Completion Rate
          </div>
          <p className="text-3xl font-display font-bold mt-2 text-foreground">{completionRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Applications fully completed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Clock className="w-4 h-4" /> Avg Lead Time
          </div>
          <p className="text-3xl font-display font-bold mt-2 text-foreground">{fmtDur(totalLeadTime)}</p>
          <p className="text-xs text-muted-foreground mt-1">Moderation → Billing</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <TrendingDown className="w-4 h-4" /> Biggest Drop-off
          </div>
          <p className="text-3xl font-display font-bold mt-2 text-foreground">{worstDrop.dropoff.toFixed(0)}%</p>
          <p className="text-xs text-muted-foreground mt-1">at {worstDrop.label}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <RotateCcw className="w-4 h-4" /> Total Send-backs
          </div>
          <p className="text-3xl font-display font-bold mt-2 text-foreground">{totalSendBacks}</p>
          <p className="text-xs text-muted-foreground mt-1">Rejections sent to previous stage</p>
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
        <h3 className="font-display font-semibold text-foreground mb-4">Stage Funnel</h3>
        <div className="space-y-3">
          {funnel.map((f, i) => {
            const max = funnel[0].count || 1;
            const pct = (f.count / max) * 100;
            return (
              <div key={f.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{f.label}</span>
                  <span className="text-muted-foreground">
                    {f.count}
                    {i > 0 && f.dropoff > 0 && (
                      <span className="ml-2 text-destructive">↓ {f.dropoff.toFixed(0)}%</span>
                    )}
                  </span>
                </div>
                <div className="h-8 rounded-md bg-muted overflow-hidden">
                  <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Avg dwell per stage */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <h3 className="font-display font-semibold text-foreground mb-4">Average Time per Stage</h3>
          <div className="space-y-2">
            {avgDwell.slice(0, 4).map((d, i) => {
              const max = Math.max(...avgDwell.slice(0, 4).map((x) => x.avg), 1);
              const pct = (d.avg / max) * 100;
              return (
                <div key={d.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{d.label}</span>
                    <span className="text-muted-foreground">{fmtDur(d.avg)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Send-backs per stage */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <h3 className="font-display font-semibold text-foreground mb-4">Send-backs by Stage</h3>
          <div className="space-y-2">
            {sendBacks.slice(0, 4).map((d, i) => {
              const max = Math.max(...sendBacks.map((x) => x.count), 1);
              const pct = (d.count / max) * 100;
              return (
                <div key={d.key}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground">{d.label}</span>
                    <span className="text-muted-foreground">{d.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, backgroundColor: COLORS[i] }} />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            High send-back counts indicate quality issues being caught at that stage.
          </p>
        </div>
      </div>
    </div>
  );
}