import { useState } from "react";
import { motion } from "framer-motion";
import { Search, CheckCircle, Clock, Truck, ClipboardCheck, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import Footer from "@/components/Footer";

const statusConfig: Record<string, { icon: typeof Clock; color: string }> = {
  Submitted: { icon: FileText, color: "bg-status-submitted" },
  "Site Survey": { icon: Search, color: "bg-status-survey" },
  Approved: { icon: ClipboardCheck, color: "bg-status-approved" },
  "Installation Scheduled": { icon: Truck, color: "bg-status-scheduled" },
  Completed: { icon: CheckCircle, color: "bg-status-completed" },
};

const allStatuses = ["Submitted", "Site Survey", "Approved", "Installation Scheduled", "Completed"];

interface AppResult {
  ref_code: string;
  customer_name: string;
  service: string;
  location: string | null;
  district: string;
  status: string;
  technician: string | null;
  scheduled_date: string | null;
  created_at: string;
}

export default function Track() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AppResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setNotFound(false);
    setResult(null);

    const { data, error } = await supabase
      .from("applications")
      .select("ref_code, customer_name, service, location, district, status, technician, scheduled_date, created_at")
      .eq("ref_code", query.trim().toUpperCase())
      .maybeSingle();

    setLoading(false);

    if (error || !data) {
      setNotFound(true);
    } else {
      setResult(data);
    }
  };

  const currentIndex = result ? allStatuses.indexOf(result.status) : -1;

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
                <div className={`px-3 py-1 rounded-full text-xs font-semibold text-primary-foreground ${statusConfig[result.status]?.color || "bg-muted"}`}>
                  {result.status}
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-1 mb-8">
                {allStatuses.map((s, i) => {
                  const active = i <= currentIndex;
                  const cfg = statusConfig[s];
                  const Icon = cfg.icon;
                  return (
                    <div key={s} className="flex-1 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${active ? cfg.color : "bg-muted"}`}>
                        <Icon className={`w-4 h-4 ${active ? "text-primary-foreground" : "text-muted-foreground"}`} />
                      </div>
                      <p className={`text-[10px] mt-1 text-center ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                        {s}
                      </p>
                    </div>
                  );
                })}
              </div>

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
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
