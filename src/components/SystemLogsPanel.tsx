import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, AlertOctagon, Info, ShieldAlert, CheckCircle, RefreshCw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { format } from "date-fns";

interface SystemLog {
  id: string;
  created_at: string;
  level: string;
  source: string;
  message: string;
  details: Record<string, unknown>;
  resolved: boolean;
}

const levelConfig: Record<string, { icon: typeof Info; color: string; badge: string }> = {
  info: { icon: Info, color: "text-blue-400", badge: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  warning: { icon: AlertTriangle, color: "text-yellow-400", badge: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  error: { icon: AlertOctagon, color: "text-red-400", badge: "bg-red-500/20 text-red-400 border-red-500/30" },
  critical: { icon: ShieldAlert, color: "text-red-600", badge: "bg-red-600/20 text-red-300 border-red-600/30" },
};

export default function SystemLogsPanel() {
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showResolved, setShowResolved] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("system_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (!showResolved) query = query.eq("resolved", false);
    if (levelFilter !== "all") query = query.eq("level", levelFilter);
    if (sourceFilter !== "all") query = query.eq("source", sourceFilter);

    const { data, error } = await query;
    if (error) toast.error("Failed to load logs");
    else setLogs((data as SystemLog[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [levelFilter, sourceFilter, showResolved]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("system-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "system_logs" }, () => fetchLogs())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [levelFilter, sourceFilter, showResolved]);

  const resolveLog = async (id: string) => {
    const { error } = await supabase.from("system_logs").update({ resolved: true }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Log resolved"); fetchLogs(); }
  };

  const deleteLog = async (id: string) => {
    const { error } = await supabase.from("system_logs").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Log deleted"); fetchLogs(); }
  };

  const sources = [...new Set(logs.map((l) => l.source))];

  const criticalCount = logs.filter((l) => l.level === "critical" && !l.resolved).length;
  const errorCount = logs.filter((l) => l.level === "error" && !l.resolved).length;
  const warningCount = logs.filter((l) => l.level === "warning" && !l.resolved).length;

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Critical", count: criticalCount, cls: "border-red-600/40 bg-red-600/10 text-red-400" },
          { label: "Errors", count: errorCount, cls: "border-red-500/40 bg-red-500/10 text-red-400" },
          { label: "Warnings", count: warningCount, cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-400" },
          { label: "Total Logs", count: logs.length, cls: "border-border bg-card text-muted-foreground" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.cls}`}>
            <p className="text-xs uppercase tracking-wider opacity-80">{s.label}</p>
            <p className="text-2xl font-display font-bold mt-1">{s.count}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="All levels" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue placeholder="All sources" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => setShowResolved(!showResolved)} className="h-9 text-sm">
          {showResolved ? "Hide Resolved" : "Show Resolved"}
        </Button>
        <Button variant="outline" size="sm" onClick={fetchLogs} className="h-9 ml-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Log entries */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No logs found</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => {
              const config = levelConfig[log.level] || levelConfig.info;
              const Icon = config.icon;
              return (
                <div key={log.id} className={`p-4 hover:bg-muted/30 transition-colors ${log.resolved ? "opacity-50" : ""}`}>
                  <div className="flex items-start gap-3">
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded-full border ${config.badge}`}>
                          {log.level}
                        </span>
                        <Badge variant="outline" className="text-xs">{log.source}</Badge>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                        </span>
                      </div>
                      <p className="text-sm text-foreground font-medium">{log.message}</p>
                      {log.details && Object.keys(log.details).length > 0 && (
                        <pre className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!log.resolved && (
                        <Button variant="ghost" size="sm" onClick={() => resolveLog(log.id)} title="Mark resolved">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => deleteLog(log.id)} title="Delete log">
                        <AlertOctagon className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
