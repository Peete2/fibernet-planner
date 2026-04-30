import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { TrendingDown, Clock, Activity } from "lucide-react";

const FUNNEL_STAGES = ["Submitted", "Site Survey", "Approved", "Installation Scheduled", "Completed"] as const;
const STAGE_COLORS = ["hsl(45 90% 50%)", "hsl(200 80% 50%)", "hsl(160 70% 45%)", "hsl(270 60% 55%)", "hsl(140 70% 40%)"];

interface HistoryRow {
  application_id: string;
  status: string;
  created_at: string;
}

interface NodeRow {
  id: string;
  name: string;
  capacity: number;
  connected_customers: number;
  status: string;
}

function formatDuration(hours: number): string {
  if (!isFinite(hours) || hours <= 0) return "—";
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

export default function AnalyticsPanel() {
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [nodes, setNodes] = useState<NodeRow[]>([]);
  const [totalApps, setTotalApps] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [h, n, a] = await Promise.all([
        supabase.from("application_status_history").select("application_id,status,created_at").order("created_at", { ascending: true }),
        supabase.from("fiber_nodes").select("id,name,capacity,connected_customers,status"),
        supabase.from("applications").select("id", { count: "exact", head: true }),
      ]);
      setHistory((h.data as HistoryRow[]) || []);
      setNodes((n.data as NodeRow[]) || []);
      setTotalApps(a.count || 0);
      setLoading(false);
    };
    load();
  }, []);

  // Funnel: count distinct apps that ever reached each stage
  const funnel = useMemo(() => {
    const reached: Record<string, Set<string>> = {};
    FUNNEL_STAGES.forEach((s) => (reached[s] = new Set()));
    history.forEach((h) => {
      if (reached[h.status]) reached[h.status].add(h.application_id);
    });
    const data = FUNNEL_STAGES.map((s, i) => {
      const count = reached[s].size;
      const prev = i === 0 ? Math.max(count, totalApps) : reached[FUNNEL_STAGES[i - 1]].size;
      const dropoff = prev > 0 ? ((prev - count) / prev) * 100 : 0;
      return { stage: s, count, dropoff: i === 0 ? 0 : dropoff };
    });
    return data;
  }, [history, totalApps]);

  // Average time spent in each status (hours), based on transitions
  const avgTimes = useMemo(() => {
    const totals: Record<string, { sum: number; n: number }> = {};
    const byApp: Record<string, HistoryRow[]> = {};
    history.forEach((h) => {
      (byApp[h.application_id] ||= []).push(h);
    });
    Object.values(byApp).forEach((rows) => {
      rows.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
      for (let i = 0; i < rows.length - 1; i++) {
        const dur = (+new Date(rows[i + 1].created_at) - +new Date(rows[i].created_at)) / 36e5;
        const s = rows[i].status;
        totals[s] ||= { sum: 0, n: 0 };
        totals[s].sum += dur;
        totals[s].n += 1;
      }
    });
    return FUNNEL_STAGES.map((s) => ({
      stage: s,
      avg: totals[s] && totals[s].n > 0 ? totals[s].sum / totals[s].n : 0,
    }));
  }, [history]);

  const overallConversion = useMemo(() => {
    if (totalApps === 0) return 0;
    const completed = funnel.find((f) => f.stage === "Completed")?.count || 0;
    return (completed / totalApps) * 100;
  }, [funnel, totalApps]);

  if (loading) {
    return <div className="text-sm text-muted-foreground p-6">Loading analytics…</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Activity className="w-4 h-4" /> Overall Conversion
          </div>
          <p className="text-3xl font-display font-bold mt-2 text-foreground">{overallConversion.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground mt-1">Submitted → Completed</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Clock className="w-4 h-4" /> Avg Total Lead Time
          </div>
          <p className="text-3xl font-display font-bold mt-2 text-foreground">
            {formatDuration(avgTimes.reduce((s, t) => s + t.avg, 0))}
          </p>
          <p className="text-xs text-muted-foreground mt-1">Sum of average stage durations</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <TrendingDown className="w-4 h-4" /> Biggest Dropoff
          </div>
          {(() => {
            const worst = funnel.slice(1).reduce((a, b) => (b.dropoff > a.dropoff ? b : a), { stage: "—", dropoff: 0, count: 0 });
            return (
              <>
                <p className="text-3xl font-display font-bold mt-2 text-foreground">{worst.dropoff.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground mt-1">at {worst.stage}</p>
              </>
            );
          })()}
        </div>
      </div>

      {/* Funnel */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
        <h3 className="font-display font-semibold text-foreground mb-4">Conversion Funnel</h3>
        <div className="space-y-3">
          {funnel.map((f, i) => {
            const max = funnel[0].count || 1;
            const pct = (f.count / max) * 100;
            return (
              <div key={f.stage}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-foreground">{f.stage}</span>
                  <span className="text-muted-foreground">
                    {f.count} {i > 0 && f.dropoff > 0 && (
                      <span className="ml-2 text-destructive">↓ {f.dropoff.toFixed(0)}%</span>
                    )}
                  </span>
                </div>
                <div className="h-8 rounded-md bg-muted overflow-hidden">
                  <div
                    className="h-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: STAGE_COLORS[i] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Avg time per status */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
        <h3 className="font-display font-semibold text-foreground mb-4">Average Time in Each Status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={avgTimes.map((t) => ({ stage: t.stage, hours: +t.avg.toFixed(2), label: formatDuration(t.avg) }))}>
            <XAxis dataKey="stage" tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} />
            <YAxis tick={{ fontSize: 11, fill: "hsl(220 10% 45%)" }} label={{ value: "hours", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: "hsl(220 10% 45%)" } }} />
            <Tooltip formatter={(_v, _n, p: any) => [p.payload.label, "Avg time"]} />
            <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
              {avgTimes.map((_, i) => (
                <Cell key={i} fill={STAGE_COLORS[i]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* AP Utilization */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-telecom">
        <h3 className="font-display font-semibold text-foreground mb-4">AP / Node Utilization</h3>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nodes yet.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nodes.map((n) => {
              const cap = n.capacity || 0;
              const used = n.connected_customers || 0;
              const pct = cap > 0 ? Math.min(100, (used / cap) * 100) : 0;
              const color = pct >= 90 ? "hsl(0 75% 55%)" : pct >= 70 ? "hsl(35 90% 55%)" : "hsl(140 70% 40%)";
              return (
                <div key={n.id} className="border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm text-foreground truncate">{n.name}</p>
                      <p className="text-xs text-muted-foreground">{n.status}</p>
                    </div>
                    <span className="text-lg font-display font-bold" style={{ color }}>{pct.toFixed(0)}%</span>
                  </div>
                  {/* Gauge */}
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {used} / {cap || "∞"} connected
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}