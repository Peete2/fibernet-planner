import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, Clock, Truck, ClipboardCheck, FileText, Shield, Wrench, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";
import { STAGES, stageLabel } from "@/lib/stage-engine";
import SEO from "@/components/SEO";

const stageIcons: Record<string, typeof Clock> = {
  moderation: Shield,
  service_delivery: ClipboardCheck,
  technical: Wrench,
  billing: Receipt,
  completed: CheckCircle,
};

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  Submitted: { icon: FileText, color: "bg-status-submitted" },
  "Site Survey": { icon: Search, color: "bg-status-survey" },
  Approved: { icon: ClipboardCheck, color: "bg-status-approved" },
  "Installation Scheduled": { icon: Truck, color: "bg-status-scheduled" },
  Completed: { icon: CheckCircle, color: "bg-status-completed" },
};

const allStatuses = ["Submitted", "Site Survey", "Approved", "Installation Scheduled", "Completed"];

interface AppResult {
  id: string;
  ref_code: string;
  customer_name: string;
  service: string;
  location: string | null;
  district: string;
  status: string;
  technician: string | null;
  scheduled_date: string | null;
  created_at: string;
  stage: string;
  rejection_reason: string | null;
}

interface HistoryEntry {
  status: string;
  created_at: string;
  changed_by_name: string | null;
  note: string | null;
}

export default function Track() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AppResult | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);
    setHistory([]);

    const code = query.trim().toUpperCase();
    const { data: rows, error } = await supabase
      .rpc("lookup_application_by_ref_code", { _code: code });
    const data = Array.isArray(rows) ? rows[0] : null;

    if (error || !data) {
      setLoading(false);
      setNotFound(true);
      return;
    }
    setResult(data as AppResult);

    const { data: hist } = await supabase
      .rpc("lookup_application_history_by_ref_code", { _code: code });
    setHistory((hist as HistoryEntry[]) || []);
    setLoading(false);
  };

  const currentIndex = result ? allStatuses.indexOf(result.status) : -1;
  const stageIndex = result ? STAGES.findIndex((s) => s.key === result.stage) : -1;

  return (
    <div className="pt-20 min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-4 py-8 max-w-2xl flex-1">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Track Your Application
          </h1>
          <p className="text-muted-foreground mb-8">Enter your application ID to check the status.</p>

          <form onSubmit={handleSearch} className="flex gap-3 mb-8">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. ETL-2026-001"
              className="flex-1"
            />
            <Button type="submit" variant="default" disabled={loading}>
              <Search className="w-4 h-4 mr-2" /> {loading ? "Searching..." : "Search"}
            </Button>
          </form>

          {notFound && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
              No application found with that reference code.
            </div>
          )}

          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6 shadow-telecom"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Application ID</p>
                  <p className="text-xl font-display font-bold text-foreground">{result.ref_code}</p>
                </div>
                <div className="px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground bg-secondary">
                  {stageLabel(result.stage)}
                </div>
              </div>

              {/* Stage stepper */}
              <div className="flex items-center gap-1 mb-6">
                {STAGES.map((s, i) => {
                  const active = i <= stageIndex;
                  const Icon = stageIcons[s.key] || Clock;
                  return (
                    <div key={s.key} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          active ? "bg-secondary" : "bg-muted"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 ${
                            active ? "text-primary-foreground" : "text-muted-foreground"
                          }`}
                        />
                      </div>
                      <p
                        className={`text-[10px] mt-1 text-center ${
                          active ? "text-foreground font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {s.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {result.rejection_reason && result.stage !== "completed" && (
                <div className="mb-6 p-3 rounded-md bg-destructive/10 border border-destructive/30 text-xs text-destructive">
                  <span className="font-semibold">Action needed: </span>
                  {result.rejection_reason}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Customer:</span> <span className="text-foreground font-medium">{result.customer_name}</span></div>
                <div><span className="text-muted-foreground">Service:</span> <span className="text-foreground font-medium">{result.service}</span></div>
                <div><span className="text-muted-foreground">Location:</span> <span className="text-foreground font-medium">{result.location || "—"}, {result.district}</span></div>
                <div><span className="text-muted-foreground">Applied:</span> <span className="text-foreground font-medium">{new Date(result.created_at).toLocaleDateString()}</span></div>
                {result.technician && (
                  <div><span className="text-muted-foreground">Technician:</span> <span className="text-foreground font-medium">{result.technician}</span></div>
                )}
                {result.scheduled_date && (
                  <div><span className="text-muted-foreground">Scheduled:</span> <span className="text-foreground font-medium">{new Date(result.scheduled_date).toLocaleDateString()}</span></div>
                )}
              </div>

              {history.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border">
                  <h3 className="text-sm font-display font-semibold text-foreground mb-4 uppercase tracking-wide">
                    Status Timeline
                  </h3>
                  <ol className="relative border-l-2 border-border ml-3 space-y-5">
                    {history.map((h, i) => {
                      const cfg = statusConfig[h.status];
                      const Icon = cfg?.icon || FileText;
                      const isLatest = i === history.length - 1;
                      const next = history[i + 1];
                      const durationMs = next ? +new Date(next.created_at) - +new Date(h.created_at) : null;
                      const durationLabel = durationMs
                        ? durationMs < 36e5
                          ? `${Math.round(durationMs / 6e4)}m`
                          : durationMs < 864e5
                          ? `${(durationMs / 36e5).toFixed(1)}h`
                          : `${(durationMs / 864e5).toFixed(1)}d`
                        : null;
                      return (
                        <li key={i} className="ml-6">
                          <span
                            className={`absolute -left-[13px] flex items-center justify-center w-6 h-6 rounded-full ring-4 ring-background ${
                              cfg?.color || "bg-muted"
                            }`}
                          >
                            <Icon className="w-3 h-3 text-primary-foreground" />
                          </span>
                          <div className="flex flex-wrap items-baseline gap-x-2">
                            <p className="font-medium text-foreground text-sm">{h.status}</p>
                            {isLatest && (
                              <span className="text-[10px] uppercase tracking-wide text-secondary font-semibold">
                                Current
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(h.created_at).toLocaleString()}
                            {durationLabel && <span className="ml-2">• stayed {durationLabel}</span>}
                          </p>
                          {h.changed_by_name && (
                            <p className="text-xs text-muted-foreground mt-0.5">by {h.changed_by_name}</p>
                          )}
                          {h.note && <p className="text-xs text-foreground mt-1">{h.note}</p>}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
