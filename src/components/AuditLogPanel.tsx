import { useEffect, useState, useMemo } from "react";
import { Search, RefreshCw, ChevronDown, ChevronRight, Shield, Package, FileText, Wifi, Route as RouteIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_name: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  target_label: string | null;
  before: any;
  after: any;
  created_at: string;
}

const TARGET_ICONS: Record<string, any> = {
  service_plan: Package,
  application: FileText,
  fiber_node: Wifi,
  fiber_route: RouteIcon,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-secondary/15 text-secondary border-secondary/30",
  update: "bg-primary/15 text-primary border-primary/30",
  delete: "bg-destructive/15 text-destructive border-destructive/30",
  status_change: "bg-accent/15 text-accent border-accent/30",
  toggle: "bg-amber-500/15 text-amber-700 border-amber-500/30",
  assign: "bg-violet-500/15 text-violet-700 border-violet-500/30",
};

export default function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [targetFilter, setTargetFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase.from("admin_audit_log").select("*").order("created_at", { ascending: false }).limit(500);
    setEntries((data as AuditEntry[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const filtered = useMemo(() => entries.filter((e) => {
    if (actionFilter !== "all" && e.action !== actionFilter) return false;
    if (targetFilter !== "all" && e.target_type !== targetFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (![e.actor_name, e.target_label, e.target_id, e.action, e.target_type].some((x) => (x || "").toLowerCase().includes(s))) return false;
    }
    return true;
  }), [entries, search, actionFilter, targetFilter]);

  const toggle = (id: string) => {
    const next = new Set(expanded);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpanded(next);
  };

  const renderDiff = (entry: AuditEntry) => {
    if (!entry.before && !entry.after) return <p className="text-xs text-muted-foreground">No payload recorded.</p>;
    return (
      <div className="grid md:grid-cols-2 gap-3 text-xs">
        <div>
          <p className="font-medium text-muted-foreground mb-1">Before</p>
          <pre className="bg-muted/50 border border-border rounded-md p-2 overflow-x-auto whitespace-pre-wrap">{entry.before ? JSON.stringify(entry.before, null, 2) : "—"}</pre>
        </div>
        <div>
          <p className="font-medium text-muted-foreground mb-1">After</p>
          <pre className="bg-muted/50 border border-border rounded-md p-2 overflow-x-auto whitespace-pre-wrap">{entry.after ? JSON.stringify(entry.after, null, 2) : "—"}</pre>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-telecom overflow-hidden">
      <div className="p-5 border-b border-border space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Admin Audit Log</h3>
            <Badge variant="outline" className="text-xs">{filtered.length}</Badge>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5">
            <RefreshCw className="w-4 h-4" /> Refresh
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by user, label, ID..." className="pl-9 h-9 text-sm" />
          </div>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 w-40 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="status_change">Status change</SelectItem>
              <SelectItem value="toggle">Toggle</SelectItem>
              <SelectItem value="assign">Assign</SelectItem>
            </SelectContent>
          </Select>
          <Select value={targetFilter} onValueChange={setTargetFilter}>
            <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All targets</SelectItem>
              <SelectItem value="service_plan">Service plans</SelectItem>
              <SelectItem value="application">Applications</SelectItem>
              <SelectItem value="fiber_node">Fiber nodes</SelectItem>
              <SelectItem value="fiber_route">Fiber routes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-8"></th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">When</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Who</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Label</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No audit entries match your filters.</td></tr>
            ) : filtered.map((e) => {
              const Icon = TARGET_ICONS[e.target_type] || FileText;
              const isOpen = expanded.has(e.id);
              return (
                <>
                  <tr key={e.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(e.id)} className="text-muted-foreground hover:text-foreground">
                        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-foreground">{e.actor_name || <span className="text-muted-foreground italic">unknown</span>}</td>
                    <td className="px-4 py-3">
                      <Badge className={`text-[10px] border ${ACTION_COLORS[e.action] || "bg-muted text-muted-foreground border-border"}`} variant="outline">
                        {e.action.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <Icon className="w-3.5 h-3.5" />
                        {e.target_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground text-xs">{e.target_label || <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                  {isOpen && (
                    <tr key={`${e.id}-detail`} className="bg-muted/20 border-b border-border">
                      <td colSpan={6} className="px-4 py-3">{renderDiff(e)}</td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}